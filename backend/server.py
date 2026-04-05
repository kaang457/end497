# -*- coding: utf-8 -*-
import os
import tempfile
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from optimizer import OptimizationEngine
 
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
 
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
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],            # POST, GET, OPTIONS hepsine izin ver
    allow_headers=["*"],            # Content-Type vb. tüm başlıklara izin ver
)
 
# Outputs klasörü ayarları
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
if not os.path.exists(OUTPUTS_DIR):
    os.makedirs(OUTPUTS_DIR)
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")
 
engine = OptimizationEngine()
 
class PlanIstegi(BaseModel):
    sku: str
    vardiya: float
    demand: int
    absent_workers: list[str] = []   # Web'den işaretlenen devamsız personeller


@app.get("/api/personel-listesi")
def personel_listesi():
    """Excel'deki 'Gelen İşçiler' sayfasından tüm personel listesini döndürür."""
    try:
        import pandas as pd
        xls = pd.ExcelFile(engine.excel_path)
        workers = []
        if "Performans Çarpanları" in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name="Performans Çarpanları", header=None)
            for i, row in df.iterrows():
                if i == 0: continue
                name = str(row[0]).strip().upper() if not pd.isna(row[0]) else None
                if name and name != 'NAN':
                    workers.append(name)
        return {"status": "success", "workers": workers}
    except Exception as e:
        return {"status": "error", "message": str(e)}
 
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
 
 
@app.get("/api/debug-klasor")
def debug_klasor():
    return {
        "fastapi_dir": OUTPUTS_DIR,
        "dir_exists": os.path.exists(OUTPUTS_DIR),
        "dir_files": os.listdir(OUTPUTS_DIR) if os.path.exists(OUTPUTS_DIR) else "Klasör Yok"
    }
 
 
@app.post("/api/plani-hesapla")
def plani_hesapla(istek: PlanIstegi):
    try:
        print(f"\n--- YENİ İSTEK GELDİ: SKU {istek.sku} ---")
        engine.set_params(istek.sku, istek.vardiya, istek.demand, absent_workers=istek.absent_workers)
        
        sonuclar, istatistikler, snapshots = engine.run_solver()
 
        formatted_stages = {}
        for stage_key, stage_results in snapshots.items():
            formatted_stages[stage_key] = frontend_formati_hazirla(stage_results)
 
        final_data = frontend_formati_hazirla(sonuclar)
        
        formatted_stages["stage4"] = final_data
        formatted_stages["clean"] = final_data

        # stage3_before_s4 -> frontend'de "before_stage4" key'i olarak erişilir
        if "stage3_before_s4" in formatted_stages:
            formatted_stages["before_stage4"] = formatted_stages["stage3_before_s4"]
 
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
 
if __name__ == "__main__":
    import uvicorn
# Düzeltilmiş:
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)