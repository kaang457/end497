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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Outputs klasörünü statik olarak dışarıya açma (404 hatasını önlemek/debug için)
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
if not os.path.exists(OUTPUTS_DIR):
    os.makedirs(OUTPUTS_DIR) 

app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

@app.get("/api/debug-klasor")
def debug_klasor():
    return {
        "fastapi_dir": OUTPUTS_DIR,
        "dir_exists": os.path.exists(OUTPUTS_DIR),
        "dir_files": os.listdir(OUTPUTS_DIR) if os.path.exists(OUTPUTS_DIR) else "Klasor Yok"
    }

engine = OptimizationEngine()

class PlanIstegi(BaseModel):
    sku: str
    vardiya: float
    demand: int

@app.post("/api/plani-hesapla")
def plani_hesapla(istek: PlanIstegi):
    try:
        print(f"\n--- YENİ İSTEK GELDİ: SKU {istek.sku} ---")
        engine.set_params(istek.sku, istek.vardiya, istek.demand)
        
        # optimizer.py'yi çalıştır. Artık "snapshots" tam React'in istediği formattadır.
        sonuclar, istatistikler, snapshots = engine.run_solver()

        # Doğrudan optimize edilmiş stage'leri "data" anahtarıyla frontend'e gönderiyoruz
        return {"status": "success", "data": snapshots}

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ HATA OLUŞTU: {str(e)}")
        return {"status": "error", "message": str(e)}