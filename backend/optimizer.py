import pandas as pd
import json
import os
import time

# Modüler yapıdaki aşamalar
import backend.stage1 as stage1
import backend.stage2 as stage2
import backend.stage3 as stage3
import backend.stage4 as stage4

EXCEL_DOSYA_YOLU = r"./Üretim Dataları.xlsx"

class OptimizationEngine:
    def __init__(self):
        self.excel_path = EXCEL_DOSYA_YOLU
        self.selected_product = "78446"
        self.shift_hours = 8.0
        self.target_qty = 247 # Varsayılan üretim adedi
        
        self.total_iterations = 0 
        self.total_subproblems_solved = 0
        self.start_time = 0
        
        # Ortak Veri Yapıları
        self.active_workers = {}
        self.master_db = {}
        self.final_stations = {}
        self.all_assignments = {}
        self.empty_stations = []

    def set_params(self, product_code, hours, qty):
        """Ara yüzden gelen parametreleri günceller"""
        self.selected_product = str(product_code)
        self.shift_hours = float(hours)
        self.target_qty = int(qty)

    def log(self, msg):
        print(f"[LOG] {msg}") 

    def print_stage_summary(self, stage_name):
        """Her stage sonunda 2D array olusturur, engine.stage_summaries'e kaydeder ve terminale basar.
        2D array formati: ilk satir baslik, geri kalan satirlar veri.
        [[SEQ, ISTASYON, ANA_ISCI, TIP, SURE_SN, YARDIMCI], ...]
        """
        if not hasattr(self, "stage_summaries"):
            self.stage_summaries = {}

        sorted_stations = sorted(
            [s for s in self.all_assignments if s in self.final_stations],
            key=lambda x: self.final_stations[x]["seq"]
        )

        # 2D array: ilk satir baslik, sadece istasyon ve calisan
        table = [["ISTASYON", "ANA_ISCI", "YARDIMCI"]]
        for s in sorted_stations:
            info = self.all_assignments[s]
            table.append([
                s,
                info["worker"],
                info.get("helper", "-") or "-",
            ])

        # engine uzerinde sakla
        self.stage_summaries[stage_name] = table

        # Terminale bas
        print(f"\n{'='*55}")
        print(f"  {stage_name} SONU - ISTASYON / ISCI ({len(table)-1} istasyon)")
        print(f"{'='*55}")
        print(f"  {'ISTASYON':<25} {'ANA_ISCI':<15} {'YARDIMCI'}")
        print(f"  {'-'*50}")
        for row in table[1:]:
            print(f"  {row[0]:<25} {row[1]:<15} {row[2]}")
        print(f"{'='*55}\n")

        return table

    def export_json(self, output_path="stage_output.json"):
        """
        Tum stage ozetlerini ve final istatistikleri tek bir JSON dosyasina yazar.
        React frontend bu dosyayi okur.

        Yapi:
        {
            "stages": {
                "STAGE 1": [["ISTASYON","ANA_ISCI","YARDIMCI"], [...], ...],
                "STAGE 2": [...],
                ...
            },
            "stats": { ... }   # son run_solver stats degerleri (varsa)
        }
        """
        data = {
            "stages": getattr(self, "stage_summaries", {}),
            "stats":  getattr(self, "last_stats", {}),
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self.log(f"JSON kaydedildi: {output_path}")

    def get_iterations(self, results):
        try:
            if len(results.solver) > 0:
                if 'Iterations' in results.solver[0]: return int(results.solver[0]['Iterations'])
                elif 'Number of iterations' in results.solver[0]: return int(results.solver[0]['Number of iterations'])
                elif 'Branch and bound nodes' in results.solver[0]: return int(results.solver[0]['Branch and bound nodes'])
        except: return 0
        return 0

    def load_excel_data(self):
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

        # Performans katsayılarını oku
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

        # Vardiyaya gelen işçileri çek
        self.active_workers = {}
        if "Gelen İşçiler" in xls.sheet_names:
            df_inc = pd.read_excel(xls, sheet_name="Gelen İşçiler", header=None)
            for _, row in df_inc.iterrows():
                if _ == 0: continue
                w_name = super_temizle(row[0])
                if w_name and w_name != 'NAN': 
                    self.active_workers[w_name] = perf_db.get(w_name, 1.0)
        else: return "Gelen İşçiler sayfası yok!"

        # Usta yeteneklerini çek
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

        # Reçete ve İstasyon verilerini çek
        recipe_data = {}
        sheet_name = ""
        for s_name in xls.sheet_names:
            if f"{self.selected_product} için istasyonlar".replace(" ", "").lower() in s_name.replace(" ", "").lower():
                sheet_name = s_name; break
        
        if not sheet_name: return f"Reçete sayfası bulunamadı!"
        df_rec = pd.read_excel(xls, sheet_name=sheet_name, header=None)
        
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

            adaylar = set(super_temizle(c) for c in row.values if super_temizle(c) in self.active_workers)
            
            if st_id not in recipe_data:
                recipe_data[st_id] = {"sub_ops": [], "adaylar": adaylar, "aktif": True, "seq": seq_val, "penalty": p_val}
            else:
                recipe_data[st_id]["adaylar"] = recipe_data[st_id]["adaylar"].intersection(adaylar)
                if seq_val != 999: recipe_data[st_id]["seq"] = seq_val
            recipe_data[st_id]["sub_ops"].append((op_name, std_time))

        self.final_stations = recipe_data

        # Sabit istasyonlari Istasyonlar sheetinden oku (7. sutun = index 6)
        self.fixed_stations = set()
        if "Istasyonlar" in xls.sheet_names or any("stasyon" in s.lower() for s in xls.sheet_names):
            # sheet adini bul
            ist_sheet = next((s for s in xls.sheet_names if "stasyon" in s.lower() and "icin" not in s.lower()), None)
            if ist_sheet:
                df_ist = pd.read_excel(xls, sheet_name=ist_sheet, header=None)
                for idx, row in df_ist.iterrows():
                    if idx == 0: continue
                    st_id = super_temizle(row[0])
                    try: tip = str(row[6]).strip().upper()
                    except: tip = ""
                    if st_id and st_id != "NAN" and "SABIT" in tip.replace(chr(304), "I").replace(chr(130), "I"):
                        self.fixed_stations.add(st_id)
        self.log(f"Sabit istasyonlar ({len(self.fixed_stations)} adet): "
                 f"{', '.join(sorted(self.fixed_stations)) if self.fixed_stations else 'Yok'}")

        return None

    def generate_final_report(self):
        """Final raporu, istatistikleri ve toplam üretim süresini hesaplar"""
        real_worker_loads = {}
        for s, info in self.all_assignments.items():
            op_rows = info.get("ops_split", [])
            if op_rows:
                for (op_n, op_t, who, note) in op_rows:
                    real_worker_loads[who] = real_worker_loads.get(who, 0.0) + op_t
            else:
                spd = 1.0
                if info["type"] == "NORMAL": spd = self.active_workers.get(info["worker"], 1.0)
                elif info["type"] == "MASTER": spd = 0.8
                elif info["type"] == "POOL": spd = 1.2 # POOL çarpanı
                
                t_sum = sum(op_std * spd for op_name, op_std in self.final_stations[s]["sub_ops"])
                real_worker_loads[info["worker"]] = real_worker_loads.get(info["worker"], 0.0) + t_sum

        # --- KRİTİK METRİKLER (GÜNCELLENDİ) ---
        true_max_cycle = max(real_worker_loads.values()) if real_worker_loads else 0.0
        active_count = sum(1 for info in self.all_assignments.values())
        
        # Formül: ((Adet * Darboğaz) + (İstasyon Sayısı * 2.5 sn Kayıp)) / 3600
        total_production_hours = ((self.target_qty * true_max_cycle) + (active_count * 2.5)) / 3600
        # --------------------------------------

        end_time = time.time()
        sorted_stations = sorted(list(self.final_stations.keys()), key=lambda x: self.final_stations[x]["seq"])
        results_flat = []
        
        stat_normal = sum(1 for info in self.all_assignments.values() if info["type"] == "NORMAL")
        stat_master = sum(1 for info in self.all_assignments.values() if info["type"] == "MASTER")
        stat_pool = sum(1 for info in self.all_assignments.values() if info["type"] == "POOL")
        stat_helpers = sum(1 for info in self.all_assignments.values() if info.get("helper"))

        fixed_stations = getattr(self, "fixed_stations", set())

        for s in sorted_stations:
            if s not in self.all_assignments:
                ist_tip = "SABİT" if s in fixed_stations else "NORMAL"
                results_flat.append((self.final_stations[s]["seq"], s, "KAPALI", "0.00", "BOŞ", "-", "BOŞ / KAPALI", ist_tip))
                continue
            
            info = self.all_assignments[s]
            main_w = info["worker"]
            cycle_time = info["time"] 
            asg_type = info["type"]
            helper_w = info.get("helper", None)
            
            status_text = "ATANDI"
            if asg_type == "POOL": status_text = "TAKVIYE (YEDEK)"
            elif asg_type == "MASTER": status_text = "TAKVIYE (USTA)"
            if helper_w: status_text = f"HIZLANDIRILDI (+{helper_w})"

            # Sabit istasyon işareti
            is_fixed = s in fixed_stations
            if is_fixed: status_text = "SABİT | " + status_text

            display_station = f"{'🔒 ' if is_fixed else ''}{s} ({cycle_time:.2f} sn)"
            op_rows = info.get("ops_split", [])
            
            if not op_rows:
                spd = 1.0
                if asg_type == "NORMAL": spd = self.active_workers.get(main_w, 1.0)
                elif asg_type == "MASTER": spd = 0.8 
                elif asg_type == "POOL": spd = 1.2
                for (op_name, op_std) in self.final_stations[s]["sub_ops"]:
                    op_rows.append((op_name, op_std * spd, main_w, ""))
            
            moved_ops = getattr(self, "moved_ops", set())

            for i, (op_n, op_t, who, note) in enumerate(op_rows):
                is_hdr = (i == 0)
                tag = "DETAY"
                if is_hdr:
                    if is_fixed: tag = "SABIT"
                    elif asg_type == "POOL": tag = "TAKVIYE (YEDEK)"
                    elif asg_type == "MASTER": tag = "TAKVIYE (USTA)"
                    else: tag = "ATANDI"
                else:
                    if note == "YARDIMCI DESTEĞİ": tag = "STAGE3_HELPER_ROW"

                # Stage 4'te başka istasyondan taşınan işler
                if (s, op_n) in moved_ops:
                    tag = "STAGE4_MOVED"

                ist_tip = "SABİT" if is_fixed else "NORMAL"
                results_flat.append((
                    self.final_stations[s]["seq"] if is_hdr else "", 
                    display_station if is_hdr else "", 
                    op_n, f"{op_t:.2f}", status_text if is_hdr else note, who, tag,
                    ist_tip if is_hdr else ""
                ))
        
        assigned_worker_count = len(real_worker_loads)

        stats = {
            "active_stations": active_count,
            "solve_duration": end_time - self.start_time,
            "bottleneck_time": true_max_cycle,
            "assigned_count": assigned_worker_count,
            "total_production_hours": total_production_hours,
            "target_qty": self.target_qty,
            "count_normal": stat_normal,
            "count_master": stat_master,
            "count_pool": stat_pool,
            "count_helpers": stat_helpers,
            "total_iterations": self.total_iterations,
            "total_sub_problems": self.total_subproblems_solved if hasattr(self, 'total_subproblems_solved') else 0,
            # Stage 4 Tabu Search metrikleri
            **getattr(self, "stage4_stats", {}),
        }
        return results_flat, stats

    def run_solver(self):
        self.start_time = time.time()
        self.total_iterations = 0
        self.all_assignments = {}
        
        self.log(f"Optimizasyon Başlatıldı | Üretim Hedefi: {self.target_qty} Adet")
        
        err = self.load_excel_data()
        if err:
            self.log(f"KRITIK HATA - Excel yuklenemedi: {err}")
            return None, err, {}
        
        self.log(f"Excel yuklendi: {len(self.final_stations)} istasyon, {len(self.active_workers)} isci")
        if not self.final_stations:
            self.log("KRITIK HATA: final_stations BOŞ! Excel sheet adini kontrol edin.")
            return None, "final_stations bos", {}
        if not self.active_workers:
            self.log("KRITIK HATA: active_workers BOŞ! Gelen Isciler sayfasini kontrol edin.")
            return None, "active_workers bos", {}

        pool = stage1.run(self)
        remaining_pool, remaining_masters = stage2.run(self, pool)
        stage3.run(self, remaining_pool, remaining_masters)

        # Stage 3 sonu: operatör bazlı darboğaz ve ortalama hesapla, stage4'e ilet
        # ops_split varsa her satırda (op_name, op_time, who, note) formatında
        # gerçek işçi ve gerçek süre zaten hesaplanmış olarak gelir.
        worker_loads = {}
        for s, info in self.all_assignments.items():
            if s not in self.final_stations:
                continue
            ops_split = info.get("ops_split", None)
            if ops_split:
                # Stage 3 yardımcı atamış: her satır kendi işçisine ait gerçek süreyi taşır
                for (op_name, op_time, who, note) in ops_split:
                    worker_loads[who] = worker_loads.get(who, 0.0) + op_time
            else:
                # Stage 3 yardımcı atamamış: ana işçi tüm işleri yapıyor
                w = info["worker"]
                t = info.get("type", "NORMAL")
                spd = self.active_workers.get(w, 1.0) if t == "NORMAL" else (0.8 if t == "MASTER" else 1.2)
                load = sum(op_std * spd for _, op_std in self.final_stations[s]["sub_ops"])
                worker_loads[w] = worker_loads.get(w, 0.0) + load
        s3_times = list(worker_loads.values())
        self.stage3_bottleneck = max(s3_times) if s3_times else 0.0
        self.stage3_mean = sum(s3_times) / len(s3_times) if s3_times else 0.0
        bn_worker = max(worker_loads, key=worker_loads.get) if worker_loads else "-"
        self.log("=" * 45)
        self.log(f"[STAGE 3 SONU] Operator Darbogaz : {bn_worker} -> {self.stage3_bottleneck:.2f} sn")
        self.log(f"[STAGE 3 SONU] Operator Ortalama : {self.stage3_mean:.2f} sn")
        self.log("=" * 45)

        stage4.run(self)  # MILP: Varyasyon minimizasyonu
        
        results, stats = self.generate_final_report()
        
        self.log("\n" + "="*45)
        self.log(f"DARBOĞAZ SÜRESİ: {stats['bottleneck_time']:.2f} sn")
        self.log(f"AKTİF İSTASYON SAYISI: {stats['active_stations']}")
        self.log(f"TOPLAM ÜRETİM SÜRESİ ({self.target_qty} Adet): {stats['total_production_hours']:.2f} SAAT")
        self.log("="*45 + "\n")
        
        self.last_stats = stats  # export_json icin sakla
        self.export_json("stage_output.json")
        stage_summaries = getattr(self, "stage_summaries", {})
        return results, stats, stage_summaries