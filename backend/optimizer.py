import pandas as pd
import json
import os
import time
import re

# Modüler yapıdaki aşamalar
import stage1
import stage2
import stage3
import stage4

# Kodun çalıştığı klasörü otomatik bul ve Excel'i oradan çek (SENİN HARİKA EKLENTİN)
KLASOR_YOLU = os.path.dirname(os.path.abspath(__file__))
EXCEL_DOSYA_YOLU = os.path.join(KLASOR_YOLU, "Üretim Dataları.xlsx")

class OptimizationEngine:
    def __init__(self):
        self.excel_path = EXCEL_DOSYA_YOLU
        self.selected_product = "78446"
        self.shift_hours = 8.0
        self.target_qty = 247
        
        self.total_iterations = 0 
        self.total_subproblems_solved = 0
        self.start_time = 0
        
        # Ortak Veri Yapıları
        self.active_workers = {}
        self.master_db = {}
        self.final_stations = {}
        self.original_sub_ops = {} 
        self.all_assignments = {}
        self.empty_stations = []
        self.op_to_station = {}
        self.all_station_ids = []

    def set_params(self, product_code, hours, qty, worker_list='A'):
        """Ara yüzden gelen parametreleri günceller"""
        self.selected_product = str(product_code)
        self.shift_hours = float(hours)
        self.target_qty = int(qty)
        self.worker_list = worker_list

    def log(self, msg):
        print(f"[LOG] {msg}") 

    def load_excel_data(self):
        self.all_station_ids = []
        
        if self.target_qty <= 0: return "Hedef adet 0 olamaz!"
        if not os.path.exists(self.excel_path): return f"Dosya bulunamadı:\n{self.excel_path}"
        try: xls = pd.ExcelFile(self.excel_path)
        except Exception as e: return f"Excel hatası: {e}"

        def super_temizle(deger):
            if pd.isna(deger): return None
            s = str(deger).strip()
            while "  " in s: s = s.replace("  ", " ") 
            if s.endswith(".0"): s = s[:-2]
            return s.upper()

        # 1. Performans katsayılarını oku
        perf_db = {}
        if "Performans Çarpanları" in xls.sheet_names:
            df_p = pd.read_excel(xls, sheet_name="Performans Çarpanları", header=None)
            for _, row in df_p.iterrows():
                if _ == 0: continue
                w_name = super_temizle(row[0])
                try: val = float(str(row[1]).replace(',', '.'))
                except: val = 1.0
                if val <= 0.01: val = 1.0 
                if w_name and w_name != 'NAN': perf_db[w_name] = val

        # 2. Vardiyaya gelen işçileri çek
        self.active_workers = {}
        if "Gelen İşçiler" in xls.sheet_names:
            df_inc = pd.read_excel(xls, sheet_name="Gelen İşçiler", header=None)
            for _, row in df_inc.iterrows():
                if _ == 0: continue
                w_name = super_temizle(row[0])
                if w_name and w_name != 'NAN': 
                    self.active_workers[w_name] = perf_db.get(w_name, 1.0)
        else: return "Gelen İşçiler sayfası yok!"

        # 🚨 EKSİKTİ, GERİ EKLENDİ 🚨: 3. Usta yeteneklerini çek
        self.master_db = {} 
        if "Master Yetenekleri" in xls.sheet_names:
            df_mst = pd.read_excel(xls, sheet_name="Master Yetenekleri", header=None)
            for _, row in df_mst.iterrows():
                if _ == 0: continue
                op_name = super_temizle(row[0]) 
                master_name = super_temizle(row[1]) 
                if master_name and op_name and master_name != 'NAN':
                    if master_name not in self.master_db: self.master_db[master_name] = set()
                    self.master_db[master_name].add(op_name)

        # 4. Reçete ve İstasyon verilerini çek
        recipe_data = {}
        sheet_name = next((s for s in xls.sheet_names if f"{self.selected_product} için istasyonlar".replace(" ", "").lower() in s.replace(" ", "").lower()), "")
        if not sheet_name: return f"Reçete sayfası bulunamadı!"
        
        df_rec = pd.read_excel(xls, sheet_name=sheet_name, header=None)
        self.fixed_stations = set()

        for _, row in df_rec.iterrows():
            if _ == 0: continue
            st_id = super_temizle(row[0])
            if not st_id or st_id == 'NAN': continue
            op_name = str(row[1]).strip()
            try: std_time = float(str(row[7]).replace(',', '.'))
            except: std_time = 0.0
            try: p_val = float(str(row[8]).replace(',', '.'))
            except: p_val = 1_000_000.0
            try: seq_val = int(float(str(row[9]).replace(',', '.')))
            except: seq_val = 999

            # Sabit istasyon bulucu (Senin eklentilerinle)
            try:
                tip_val = str(row[10]).strip().upper()
                tip_val = tip_val.replace(chr(304), "I").replace(chr(130), "I").replace("İ", "I").replace("Î", "I")
                if "SABIT" in tip_val:
                    self.fixed_stations.add(st_id)
            except: pass

            adaylar = set(super_temizle(c) for c in row.values if super_temizle(c) in self.active_workers)

            if st_id not in recipe_data:
                recipe_data[st_id] = {"sub_ops": [], "adaylar": adaylar, "aktif": True, "seq": seq_val, "penalty": p_val}
            else:
                recipe_data[st_id]["adaylar"] = recipe_data[st_id]["adaylar"].union(adaylar)
                if seq_val != 999: recipe_data[st_id]["seq"] = seq_val
            recipe_data[st_id]["sub_ops"].append((op_name, std_time))

        self.final_stations = recipe_data
        self.original_sub_ops = {st: list(data["sub_ops"]) for st, data in recipe_data.items()}
        self.op_to_station = {op[0]: st for st, ops in self.original_sub_ops.items() for op in ops}

        # SENİN EKLENTİN: Mükerrer İstasyon Engelleme
        master_sheet = next(
            (s for s in xls.sheet_names if s.strip().replace(" ", "").lower() in ["istasyonlar", "i̇stasyonlar", "tümistasyonlar", "tumistasyonlar"]),
            ""
        )
        if master_sheet:
            df_master = pd.read_excel(xls, sheet_name=master_sheet, header=None)
            for idx, row in df_master.iterrows():
                if idx == 0: continue
                st_id = super_temizle(row[0])
                if st_id and st_id not in self.all_station_ids: 
                    self.all_station_ids.append(st_id)
        
        if not self.all_station_ids:
            self.all_station_ids = sorted(recipe_data.keys(), key=lambda x: recipe_data[x]["seq"])

        return None

    def generate_final_report(self):
        """
        Final rapor:
        - İstasyon süresi = o istasyondaki işçilerin yüklerinin max'ı
        - Transfer edilen işler HEDEF istasyonda gösterilir
        - Verilen işler kaynak istasyonda artık gösterilmez
        """
        moved_ops      = getattr(self, "moved_ops", set())
        fixed_stations = getattr(self, "fixed_stations", set())

        # Tüm worker yüklerini hesapla (darboğaz için)
        worker_loads = {}
        for s, info in self.all_assignments.items():
            main_w    = info["worker"]
            t_type    = info.get("type", "NORMAL")
            spd       = (self.active_workers.get(main_w, 1.0) if t_type == "NORMAL"
                         else (0.8 if t_type == "MASTER" else 1.2))
            ops_split = info.get("ops_split") or []
            if ops_split:
                for (_, t, who, _) in ops_split:
                    worker_loads[who] = worker_loads.get(who, 0.0) + t
            else:
                for (_, op_std) in self.final_stations[s]["sub_ops"]:
                    worker_loads[main_w] = worker_loads.get(main_w, 0.0) + op_std * spd

        max_c = max(worker_loads.values()) if worker_loads else 0.0
        hrs   = ((self.target_qty * max_c) + (len(self.all_assignments) * 2.5)) / 3600

        results_flat = []
        sorted_stations = sorted(
            self.all_assignments.keys(),
            key=lambda x: self.final_stations.get(x, {}).get("seq", 999)
        )

        # Devre disi ve beklemede istasyonlar
        assigned_set = set(self.all_assignments.keys())
        for s_orig in self.all_station_ids:
            if s_orig not in self.original_sub_ops:
                idx = self.all_station_ids.index(s_orig) + 1
                results_flat.append((idx, s_orig, "DEVRE DIŞI", "0.00", "BOŞ", "-", "DEVRE DIŞI", "-", "-", ""))
            elif s_orig not in assigned_set:
                idx = self.all_station_ids.index(s_orig) + 1
                results_flat.append((idx, f"{s_orig} (İstasyon Yükü)", "ATANMADI", "0.00", "BOŞ", "-", "BEKLEMEDE", "-", "-", ""))

        for idx, s in enumerate(sorted_stations, 1):
            info      = self.all_assignments[s]
            main_w    = info["worker"]
            t_type    = info.get("type", "NORMAL")
            spd       = (self.active_workers.get(main_w, 1.0) if t_type == "NORMAL"
                         else (0.8 if t_type == "MASTER" else 1.2))
            ops_split = info.get("ops_split") or []
            split_map = {n: (t, who, note) for (n, t, who, note) in ops_split} if ops_split else {}

            # Güncel oplar (Stage 4 sonrası bu istasyondaki gerçek işler)
            current_ops = self.final_stations[s]["sub_ops"]

            # İstasyon süresi: her işçinin yükü → max al
            station_worker_loads = {}
            for (op_n, op_std) in current_ops:
                if op_n in split_map:
                    t, who, note = split_map[op_n]
                else:
                    t, who, note = op_std * spd, main_w, ""
                station_worker_loads[who] = station_worker_loads.get(who, 0.0) + t
            istasyon_suresi = max(station_worker_loads.values()) if station_worker_loads else 0.0

            # Tag
            is_fixed = s in fixed_stations
            if is_fixed:             tag = "SABIT"
            elif t_type == "POOL":   tag = "TAKVIYE (YEDEK)"
            elif t_type == "MASTER": tag = "TAKVIYE (USTA)"
            else:                    tag = "ATANDI"

            main_yontem = ("Yetkinlik Odaklı Temel Atama" if t_type == "NORMAL"
                           else ("Eğitim Odaklı Temel Atama" if t_type == "POOL" else "Usta Ataması"))
            main_detay  = "Personel, sahip olduğu operasyon yetkinliği doğrultusunda istasyona ana operatör olarak atanmıştır."

            results_flat.append((idx, f"{s} (İstasyon Yükü)", "---",
                                  f"{istasyon_suresi:.2f}", "-", "-", tag, "-", "-", ""))

            # Op satırları — sadece bu istasyondaki GERÇEK oplar
            for (op_n, op_std) in current_ops:
                if op_n in split_map:
                    t_val, w_val, note_val = split_map[op_n]
                else:
                    t_val, w_val, note_val = op_std * spd, main_w, ""

                is_transfer = (s, op_n) in moved_ops
                is_help     = "YARDIMCI" in note_val

                if is_transfer:
                    row_tag   = "STAGE4_MOVED"
                    durum     = f"TRANSFER -> {s}"
                    adaylar   = self.final_stations.get(s, {}).get("adaylar", [])
                    op_yontem = ("Yetkinlikle İş Yükü Dengeleme" if w_val in adaylar
                                 else "Eğitimle İş Yükü Dengeleme")
                    op_detay  = "[TRANSFER] İş yükü dengeleme amacıyla bu istasyona taşındı."
                elif is_help:
                    row_tag   = "STAGE3_HELPER_ROW"
                    durum     = note_val
                    op_yontem = "Darboğaz Desteği"
                    op_detay  = "[YARDIMCI DESTEĞİ] Darboğaz istasyonunu hızlandırmak için destek sağlandı."
                else:
                    row_tag   = "DETAY"
                    durum     = "STANDART"
                    op_yontem, op_detay = main_yontem, main_detay

                results_flat.append(("", "", op_n, f"{t_val:.2f}",
                                     durum, w_val, row_tag, op_yontem, op_detay, ""))

        count_normal = sum(1 for info in self.all_assignments.values() if info.get("type") == "NORMAL")
        count_pool = sum(1 for info in self.all_assignments.values() if info.get("type") == "POOL")
        count_master = sum(1 for info in self.all_assignments.values() if info.get("type") == "MASTER")
        count_helpers = sum(1 for info in self.all_assignments.values() if info.get("helper"))

        # 🚨 EKSİKTİ, GERİ EKLENDİ 🚨: **getattr(self, "stage4_stats", {})
        stats = {
            "bottleneck_time": max_c, 
            "total_production_hours": hrs, 
            "active_stations": len(self.all_assignments), 
            "assigned_count": len(worker_loads), 
            "solve_duration": time.time() - self.start_time, 
            "target_qty": self.target_qty, 
            "count_normal": count_normal, 
            "count_master": count_master, 
            "count_pool": count_pool, 
            "count_helpers": count_helpers,
            **getattr(self, "stage4_stats", {}) 
        }
        return results_flat, stats

    def run_solver(self):
        self.start_time = time.time()
        self.total_iterations = 0
        self.all_assignments = {}
        self.stage_summaries = {} # Hafıza başlatıldı!
        if hasattr(self, 'moved_ops'): self.moved_ops = set()
        
        err = self.load_excel_data()
        if err:
            self.log(f"KRITIK HATA - Excel yuklenemedi: {err}")
            return None, err, {}

        pool = stage1.run(self)
        remaining_pool, remaining_masters = stage2.run(self, pool)
        self.print_stage_summary("STAGE 2")
        
        stage3.run(self, remaining_pool, remaining_masters)

        # 🚨 EKSİKTİ, GERİ EKLENDİ 🚨: Stage 3 sonu Darboğaz hesaplaması (Stage 4'ün çalışması için şart)
        worker_loads = {}
        for s, info in self.all_assignments.items():
            if s not in self.final_stations: continue
            ops_split = info.get("ops_split", None)
            if ops_split:
                for (op_name, op_time, who, note) in ops_split:
                    worker_loads[who] = worker_loads.get(who, 0.0) + op_time
            else:
                w = info["worker"]
                t = info.get("type", "NORMAL")
                spd = self.active_workers.get(w, 1.0) if t == "NORMAL" else (0.8 if t == "MASTER" else 1.2)
                load = sum(op_std * spd for _, op_std in self.final_stations[s]["sub_ops"])
                worker_loads[w] = worker_loads.get(w, 0.0) + load
        
        s3_times = list(worker_loads.values())
        self.stage3_bottleneck = max(s3_times) if s3_times else 0.0
        self.stage3_mean = sum(s3_times) / len(s3_times) if s3_times else 0.0

        stage4.run(self)  # MILP: Varyans minimizasyonu
        
        # Sonuçları senin harika raporlayıcın ile çıkartıyoruz
        results, stats = self.generate_final_report()
        
        self.last_stats = stats
        stage_summaries = getattr(self, "stage_summaries", {})
        
        return results, stats, stage_summaries

    def print_stage_summary(self, stage_name):
        # Hafızayı kontrol et ve başlat
        if not hasattr(self, "stage_summaries"):
            self.stage_summaries = {}
        
        # Backend isimlerini (STAGE 1) React'in beklediği isimlere (stage1) çevir
        mapping = {
            "STAGE 1": "stage1",
            "STAGE 2": "stage2",
            "STAGE 3": "stage3",
            "STAGE 4": "stage4"
        }
        key = mapping.get(stage_name, stage_name)
        
        # O anki atama tablosunun bir kopyasını al ve hafızaya at
        results_flat, _ = self.generate_final_report()
        self.stage_summaries[key] = results_flat

    def export_json(self, p): pass
    def get_iterations(self, r): return 0
