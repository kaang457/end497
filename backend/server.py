# -*- coding: utf-8 -*-
import os
import tempfile
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from optimizer import OptimizationEngine

# CPLEX Geçici Dosya Ayarları
cplex_temp = r"C:\CPX_Temp"
if not os.path.exists(cplex_temp):
    os.makedirs(cplex_temp)
os.chdir(cplex_temp)
tempfile.tempdir = cplex_temp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",    # Frontend adresin
        "http://127.0.0.1:8081",    # Alternatif localhost adresi
    ],
    allow_credentials=True,
    allow_methods=["*"],            # POST, GET, OPTIONS hepsine izin ver
    allow_headers=["*"],            # Content-Type vb. tüm başlıklara izin ver
)

engine = OptimizationEngine()

class PlanIstegi(BaseModel):
    sku: str
    vardiya: float
    demand: int

def _get_ikon(tag):
    mapping = {
        "NORMAL":            "🧩",
        "ATANDI":            "🧩",
        "POOL":              "🎓",
        "TAKVIYE (YEDEK)":   "🎓",
        "MASTER":            "⭐",
        "TAKVIYE (USTA)":    "⭐",
        "SABIT":             "⚖️",
        "STAGE3_HELPER_ROW": "⚡",
        "STAGE4_MOVED":      "⇄",
        "DETAY":             "🧩",
    }
    return mapping.get(tag, "🧩")

def frontend_formati_hazirla(sonuclar):
    tum_hattin_ozeti = {}   
    siralama = []           
    
    if not sonuclar:
        print("⚠️ UYARI: frontend_formati_hazirla'ya BOŞ sonuç geldi!")
        return []
        
    print(f"✅ BİLGİ: React için işlenen satır sayısı: {len(sonuclar)}")
    son_istasyon = None
    
    for row in sonuclar:
        # Güvenlik: Eğer satır beklediğimiz uzunlukta değilse atla
        if len(row) < 9:
            continue

        seq = str(row[0]).strip()
        raw_st_name = str(row[1]).strip()
        operasyon = str(row[2]).strip()
        sure = str(row[3]).strip()
        who = str(row[5]).strip()
        tag = str(row[6]).strip()
        yontem = str(row[7]).strip()
        detay = str(row[8]).strip()

        # İstasyon başlığı satırı
        if raw_st_name and raw_st_name != "" and raw_st_name != "---":
            clean_name = raw_st_name.replace("(İstasyon Yükü)", "").strip()
            son_istasyon = clean_name
            
            if clean_name not in tum_hattin_ozeti:
                try:
                    no_val = int(float(seq)) if seq else 999
                except:
                    no_val = 999
                    
                tum_hattin_ozeti[clean_name] = {
                    "no": no_val,
                    "id": clean_name,
                    "status": "red",
                    "durum": tag,
                    "rows": []
                }
                siralama.append(clean_name)
                
                if tag not in ("BOŞ / KAPALI", "DEVRE DIŞI", "KAPALI", "BOŞ"):
                    tum_hattin_ozeti[clean_name]["status"] = "green"
        
        # Operasyon alt satırı
        elif son_istasyon and operasyon and operasyon not in ("---", "DEVRE DIŞI", "KAPALI", "nan", "NAN"):
            tum_hattin_ozeti[son_istasyon]["rows"].append({
                "operasyon": operasyon,
                "personel": who,
                "ikon": _get_ikon(tag),
                "atama_amaci": yontem,
                "detay": detay,
                "sure": sure,
            })
            
    siralama_list = [tum_hattin_ozeti[k] for k in siralama]
    siralama_list.sort(key=lambda x: x["no"])
    
    print(f"🚀 BİLGİ: React'a gönderilen istasyon sayısı: {len(siralama_list)}")
    return siralama_list


@app.post("/api/plani-hesapla")
def plani_hesapla(istek: PlanIstegi):
    try:
        print(f"\n--- YENİ İSTEK GELDİ: SKU {istek.sku} ---")
        engine.set_params(istek.sku, istek.vardiya, istek.demand)
        
        sonuclar, istatistikler, snapshots = engine.run_solver()

        formatted_stages = {}
        for stage_key, stage_results in snapshots.items():
            formatted_stages[stage_key] = frontend_formati_hazirla(stage_results)

        final_data = frontend_formati_hazirla(sonuclar)
        
        formatted_stages["stage4"] = final_data
        formatted_stages["clean"] = final_data 

        final_list = formatted_stages["stage4"]
        
        aktif_sayi = sum(1 for s in final_list if s.get("status") == "green")
        istatistikler["total_stations"]  = len(final_list)
        istatistikler["active_stations"] = aktif_sayi

        print("🎉 BİLGİ: İşlem başarılı, React'a veri gönderiliyor!")
        return {"status": "success", "stages": formatted_stages, "stats": istatistikler}

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ HATA OLUŞTU: {str(e)}")
        return {"status": "error", "message": str(e)}