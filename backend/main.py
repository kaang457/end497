import tkinter as tk
from tkinter import ttk, messagebox, filedialog # filedialog eklendi
import pandas as pd
import os
import threading
from datetime import datetime
import re

# Grafik Kütüphaneleri
import matplotlib
matplotlib.use("TkAgg") 
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

# Optimizasyon motoru entegrasyonu
from backend.optimizer import OptimizationEngine

class ProductionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Arçelik Ankara - Hat Dengeleme Optimizasyon Paneli")
        self.root.geometry("1400x850")
        self.engine = OptimizationEngine()
        self.last_results = None
        self.last_stats = None # İstatistikleri saklamak için eklendi
        self.setup_ui()

    def setup_ui(self):
        # 1. ÜST PANEL (Kontroller)
        top_frame = tk.Frame(self.root, bg="#f4f6f7", pady=15, padx=15)
        top_frame.pack(fill=tk.X)
        
        tk.Label(top_frame, text="Ürün Kodu:", bg="#f4f6f7", font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT)
        self.combo_prod = ttk.Combobox(top_frame, values=["78446", "97653","77558","40132","77514","78472"], state="readonly", width=15)
        self.combo_prod.current(0)
        self.combo_prod.pack(side=tk.LEFT, padx=5)
        
        tk.Label(top_frame, text=" | Vardiya:", bg="#f4f6f7", font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT, padx=10)
        self.ent_hours = tk.Entry(top_frame, width=5)
        self.ent_hours.insert(0, "8")
        self.ent_hours.pack(side=tk.LEFT)
        
        tk.Label(top_frame, text=" | Hedef:", bg="#f4f6f7", font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT, padx=10)
        self.ent_qty = tk.Entry(top_frame, width=8)
        self.ent_qty.insert(0, "247")
        self.ent_qty.pack(side=tk.LEFT)
        
        self.btn_run = tk.Button(top_frame, text="HESAPLA", command=self.start_calculation, bg="#2c3e50", fg="white", font=("Segoe UI", 10, "bold"), padx=15)
        self.btn_run.pack(side=tk.RIGHT, padx=5)
        
        self.btn_export = tk.Button(top_frame, text="EXCEL", command=self.export_to_excel, bg="#27ae60", fg="white", font=("Segoe UI", 10, "bold"), padx=15, state="disabled")
        self.btn_export.pack(side=tk.RIGHT, padx=5)
        
        self.btn_chart = tk.Button(top_frame, text="GRAFİK ANALİZ", command=self.show_load_chart, bg="#e67e22", fg="white", font=("Segoe UI", 10, "bold"), padx=15, state="disabled")
        self.btn_chart.pack(side=tk.RIGHT, padx=5)

        # FİLTRE PANELİ
        filter_frame = tk.Frame(self.root, bg="#eaf2f8", pady=8, padx=15)
        filter_frame.pack(fill=tk.X, padx=10, pady=5)
        tk.Label(filter_frame, text="🔍 Personel Filtresi:", bg="#eaf2f8", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT)
        self.combo_filter = ttk.Combobox(filter_frame, values=["Tümü"], state="readonly", width=25)
        self.combo_filter.current(0)
        self.combo_filter.pack(side=tk.LEFT, padx=10)
        self.combo_filter.bind("<<ComboboxSelected>>", self.apply_filter)

        # 2. TABLO PANELİ
        tree_frame = tk.Frame(self.root)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        cols = ("NO", "IST", "OP", "SURE", "DURUM", "PER", "TIP")
        self.tree = ttk.Treeview(tree_frame, columns=cols, show="headings")
        
        # Sütun Ayarları
        self.tree.heading("NO", text="No"); self.tree.column("NO", width=50, anchor="center")
        self.tree.heading("IST", text="İstasyon Adı"); self.tree.column("IST", width=250)
        self.tree.heading("OP", text="Operasyon"); self.tree.column("OP", width=300)
        self.tree.heading("SURE", text="Süre (sn)"); self.tree.column("SURE", width=100, anchor="center")
        self.tree.heading("DURUM", text="İşlem Tipi"); self.tree.column("DURUM", width=150, anchor="center")
        self.tree.heading("PER", text="Atanan Personel"); self.tree.column("PER", width=200)
        self.tree.heading("TIP", text="İst. Tipi"); self.tree.column("TIP", width=90, anchor="center")
        
        # RENK KODLAMALARI
        self.tree.tag_configure("ATANDI", background="#E8F5E9", foreground="#2E7D32")
        self.tree.tag_configure("TAKVIYE (YEDEK)", background="#E3F2FD", foreground="#1565C0")
        self.tree.tag_configure("TAKVIYE (USTA)", background="#F3E5F5", foreground="#7B1FA2")
        self.tree.tag_configure("STAGE3_HELPER_ROW", background="#FFF3E0", foreground="#E65100")
        self.tree.tag_configure("BOŞ / KAPALI", background="#FFEBEE", foreground="#C62828")
        self.tree.tag_configure("STAGE4_MOVED", background="#0D3B6E", foreground="#FFFFFF")
        self.tree.tag_configure("SABIT", background="#F5CBA7", foreground="#784212")

        sb = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=sb.set)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # 3. DURUM ÇUBUĞU
        btm_frame = tk.Frame(self.root, bg="#ecf0f1", pady=10)
        btm_frame.pack(fill=tk.X, side=tk.BOTTOM)
        
        self.lbl_run_time = tk.Label(btm_frame, text="Süre: -", bg="#ecf0f1", font=("Segoe UI", 9))
        self.lbl_run_time.pack(side=tk.LEFT, padx=10)
        
        self.lbl_cycle = tk.Label(btm_frame, text="Darboğaz: -", bg="#ecf0f1", font=("Segoe UI", 10, "bold"), fg="#d35400")
        self.lbl_cycle.pack(side=tk.LEFT, padx=10)

        self.lbl_total_hours = tk.Label(btm_frame, text="Bitiş: -", bg="#ecf0f1", font=("Segoe UI", 10, "bold"), fg="#2980b9")
        self.lbl_total_hours.pack(side=tk.LEFT, padx=10)

        self.lbl_status = tk.Label(btm_frame, text="", bg="#ecf0f1", font=("Segoe UI", 10, "bold"))
        self.lbl_status.pack(side=tk.RIGHT, padx=20)

    # --- MANTIK FONKSİYONLARI ---
    def start_calculation(self):
        try:
            self.engine.set_params(self.combo_prod.get(), self.ent_hours.get(), self.ent_qty.get())
            self.btn_run.config(state="disabled", text="Hesaplanıyor...")
            self.clear_table()
            threading.Thread(target=self.run_logic, daemon=True).start()
        except Exception as e:
            messagebox.showerror("Hata", f"Giriş değerlerini kontrol edin: {e}")

    def run_logic(self):
        results, stats, stage_summaries = self.engine.run_solver()
        self.root.after(0, self.update_gui, results, stats, stage_summaries)

    def update_gui(self, results, stats, stage_summaries=None):
        self.last_stage_summaries = stage_summaries or {}
        self.btn_run.config(state="normal", text="HESAPLA")
        if results is None: return
        
        self.last_results = results
        self.last_stats = stats # Excel için istatistikleri saklıyoruz
        self.btn_export.config(state="normal")
        self.btn_chart.config(state="normal")

        workers = sorted(list(set(r[5] for r in results if r[5] not in ["-", "Personel"])))
        self.combo_filter.config(values=["Tümü"] + workers)
        self.apply_filter()
        
        self.lbl_run_time.config(text=f"Çözüm: {stats['solve_duration']:.2f} sn")
        self.lbl_cycle.config(text=f"Darboğaz: {stats['bottleneck_time']:.2f} sn")
        self.lbl_total_hours.config(text=f"Toplam: {stats['total_production_hours']:.2f} Saat")

        # Stage 4 Tabu Search metriği
        var_pct = stats.get("variance_reduction_pct", None)
        bn_imp  = stats.get("bottleneck_improvement", None)
        if var_pct is not None:
            self.lbl_status.config(
                text=f"▼ Varyans -%{var_pct:.1f}  |  Darboğaz İyileşme: {bn_imp:.2f} sn",
                fg="#1a5276"
            )

    def apply_filter(self, event=None):
        self.clear_table()
        if not self.last_results: return
        f = self.combo_filter.get()
        for row in self.last_results:
            if f == "Tümü" or row[5] == f:
                self.tree.insert("", "end", values=row[:7], tags=(row[6],))

    def show_load_chart(self):
        if not self.last_results: return

        worker_data = {}
        for r in self.last_results:
            w = r[5]
            if w in ["-", "Personel", "BOŞ / KAPALI"]: continue
            tag = r[6]
            try: time_val = float(r[3])
            except: time_val = 0.0

            if w not in worker_data:
                worker_data[w] = {"base": 0.0, "helper": 0.0, "moved": 0.0, "pool": 0.0, "master": 0.0, "total": 0.0}

            if tag == "STAGE3_HELPER_ROW":
                worker_data[w]["helper"] += time_val
            elif tag == "STAGE4_MOVED":
                worker_data[w]["moved"] += time_val
            elif tag == "TAKVIYE (YEDEK)":
                worker_data[w]["pool"] += time_val
            elif tag == "TAKVIYE (USTA)":
                worker_data[w]["master"] += time_val
            else:
                worker_data[w]["base"] += time_val
            worker_data[w]["total"] += time_val

        sorted_workers = sorted(worker_data.items(), key=lambda x: x[1]["total"], reverse=True)
        names        = [item[0] for item in sorted_workers]
        base_vals    = [item[1]["base"]   for item in sorted_workers]
        help_vals    = [item[1]["helper"] for item in sorted_workers]
        moved_vals   = [item[1]["moved"]  for item in sorted_workers]
        pool_vals    = [item[1]["pool"]   for item in sorted_workers]
        master_vals  = [item[1]["master"] for item in sorted_workers]

        new_win = tk.Toplevel(self.root)
        new_win.title("Sıralı İş Yükü Analizi")
        fig = Figure(figsize=(14, 7), dpi=100)
        ax  = fig.add_subplot(111)

        x_pos = range(len(names))

        # Katmanlar: base -> pool -> master -> helper -> moved
        ax.bar(x_pos, base_vals,  color="#4CAF50", label="Ana İş (St 1-2)")

        bot_pool = base_vals
        ax.bar(x_pos, pool_vals, bottom=bot_pool, color="#8E44AD", label="Yedek İşçi (St 2)")

        bot_master = [a + b for a, b in zip(bot_pool, pool_vals)]
        ax.bar(x_pos, master_vals, bottom=bot_master, color="#C0392B", label="Usta (St 2)")

        bot_help = [a + b for a, b in zip(bot_master, master_vals)]
        ax.bar(x_pos, help_vals, bottom=bot_help, color="#FF9800", label="Yardımcı (St 3)")

        bot_moved = [a + b for a, b in zip(bot_help, help_vals)]
        ax.bar(x_pos, moved_vals, bottom=bot_moved, color="#1565C0", label="Transfer (St 4)")

        # Taşınan iş süresi > 0 ise bar üzerine dakika yaz
        for i, (mv, bot) in enumerate(zip(moved_vals, bot_moved)):
            if mv > 0.01:
                dakika = mv / 60.0
                ax.text(i, bot + mv / 2, f"{dakika:.1f} dk",
                        ha="center", va="center",
                        fontsize=7, fontweight="bold", color="white")

        # Toplam süreyi her barın üstüne yaz
        for i, total in enumerate([item[1]["total"] for item in sorted_workers]):
            ax.text(i, total + 0.3, f"{total:.0f}s",
                    ha="center", va="bottom", fontsize=6.5, color="#333333")

        ax.set_xticks(list(x_pos))
        ax.set_xticklabels(names, rotation=90, fontsize=8)
        ax.set_ylabel("Süre (Saniye)")
        ax.set_title("Operatör İş Yükü Dağılımı")
        ax.legend(loc="upper right")
        fig.tight_layout()

        canvas = FigureCanvasTkAgg(fig, master=new_win)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=tk.BOTH, expand=1)

    def export_to_excel(self):
        """Atama Planı ve Genel İstatistikleri Excel'e aktarır"""
        if not self.last_results or not self.last_stats:
            messagebox.showwarning("Uyarı", "Dışa aktarılacak sonuç bulunamadı!")
            return

        file_path = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel files", "*.xlsx")],
            initialfile=f"Arçelik_Hat_Dengeleme_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        )
        if not file_path: return

        try:
            # 1. Sayfa: Detaylı Plan
            cols = ["No", "İstasyon (Darboğaz)", "Operasyon", "Süre (sn)", "İşlem Tipi", "Atanan Personel"]
            df_detail = pd.DataFrame([row[:6] for row in self.last_results], columns=cols)

            # 2. Sayfa: Özet İstatistikler
            s = self.last_stats
            summary_data = {
                "Metrik": ["Üretim Hedefi", "Aktif İstasyon", "Atanan Personel", "Darboğaz (sn)", "Toplam Süre (saat)", "Usta Sayısı"],
                "Değer": [s['target_qty'], s['active_stations'], s['assigned_count'], round(s['bottleneck_time'], 2), round(s['total_production_hours'], 2), s['count_master']]
            }
            df_summary = pd.DataFrame(summary_data)

            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                df_detail.to_excel(writer, index=False, sheet_name='Atama Planı')
                df_summary.to_excel(writer, index=False, sheet_name='Genel Özet')

                # Stage snapshot'larını ayrı sayfalara yaz
                snapshots = getattr(self.engine, "stage_snapshots", [])
                if snapshots:
                    df_snap = pd.DataFrame(snapshots)
                    for stage_name in df_snap["Stage"].unique():
                        df_s = df_snap[df_snap["Stage"] == stage_name].drop(columns=["Stage"])
                        sheet = stage_name.replace(" ", "_")
                        df_s.to_excel(writer, index=False, sheet_name=sheet)
                        ws2 = writer.sheets[sheet]
                        for idx2, col2 in enumerate(df_s.columns):
                            ws2.column_dimensions[chr(65+idx2)].width = 20

                # Biçimlendirme (Otomatik Sütun Genişliği)
                ws = writer.sheets['Atama Planı']
                for idx, col in enumerate(df_detail.columns):
                    ws.column_dimensions[chr(65+idx)].width = 25

            messagebox.showinfo("Başarılı", f"Rapor kaydedildi:\n{file_path}")
        except Exception as e:
            messagebox.showerror("Hata", f"Excel aktarımı başarısız: {e}")

    def clear_table(self):
        for i in self.tree.get_children(): self.tree.delete(i)

if __name__ == "__main__":
    root = tk.Tk()
    app = ProductionApp(root)
    root.mainloop()