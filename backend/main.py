import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import pandas as pd
import os, sys, threading, re, tempfile
from datetime import datetime

kod_klasoru = os.path.dirname(os.path.abspath(__file__))
if kod_klasoru not in sys.path:
    sys.path.append(kod_klasoru)

cplex_temp = r"C:\CPX_Temp"
if not os.path.exists(cplex_temp):
    os.makedirs(cplex_temp)
os.chdir(cplex_temp)
tempfile.tempdir = cplex_temp

import matplotlib
matplotlib.use("TkAgg")
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

from optimizer import OptimizationEngine

URUN_KODLARI = ["78446", "97653", "77558", "40132", "77514", "78472", "77777"]

TAG_COLORS = {
    "ATANDI":            {"background": "#E8F5E9", "foreground": "#2E7D32"},
    "TAKVIYE (YEDEK)":   {"background": "#E3F2FD", "foreground": "#1565C0", "font": ("Segoe UI", 10, "bold")},
    "TAKVIYE (USTA)":    {"background": "#F3E5F5", "foreground": "#7B1FA2", "font": ("Segoe UI", 10, "bold")},
    "BOŞ / KAPALI":      {"background": "#FFEBEE", "foreground": "#C62828"},
    "DEVRE DIŞI":        {"background": "#bdc3c7", "foreground": "#7f8c8d"},
    "DETAY":             {"background": "white",   "foreground": "black"},
    "STAGE3_MAIN":       {"background": "#e8daef", "foreground": "#4a235a", "font": ("Segoe UI", 10, "bold")},
    "STAGE3_HELPER_ROW": {"background": "#FFF3E0", "foreground": "#E65100", "font": ("Segoe UI", 9, "bold")},
    "STAGE4_MOVED":      {"background": "#0D3B6E", "foreground": "#FFFFFF"},
    "STAGE4_ROW":        {"background": "#d1f2eb", "foreground": "#117a65", "font": ("Segoe UI", 9, "bold")},
    "SABIT":             {"background": "#F5CBA7", "foreground": "#784212"},
    "BEKLEMEDE":         {"background": "#FFF9C4", "foreground": "#795548"},
    "CMP_NEW":           {"background": "#C8E6C9", "foreground": "#1B5E20", "font": ("Segoe UI", 10, "bold")},
    "CMP_CLOSED":        {"background": "#FFCDD2", "foreground": "#B71C1C", "font": ("Segoe UI", 10, "bold")},
    "CMP_CHANGED":       {"background": "#FFF9C4", "foreground": "#E65100", "font": ("Segoe UI", 10, "bold")},
}


def make_tree(parent, extra_cols=None):
    if extra_cols:
        cols = extra_cols
    else:
        cols = ("NO", "IST", "OP", "SURE", "DURUM", "PER", "YONTEM", "DETAY")
    tree = ttk.Treeview(parent, columns=cols, show="headings")
    widths = {"NO": 40, "IST": 200, "OP": 200, "SURE": 90,
              "DURUM": 150, "PER": 130, "YONTEM": 160, "DETAY": 380,
              "DURUM_CMP": 120, "ONCEKI": 140, "SONRAKI": 140, "ACIKLAMA": 300}
    anchors = {"NO": "center", "SURE": "center", "DURUM": "center",
               "PER": "center", "YONTEM": "center", "DURUM_CMP": "center",
               "ONCEKI": "center", "SONRAKI": "center"}
    labels = {"NO":"No","IST":"İstasyon","OP":"Operasyon","SURE":"Süre (sn)",
              "DURUM":"İşlem Tipi","PER":"Atanan Personel","YONTEM":"Atama Yöntemi",
              "DETAY":"Detay Açıklama","DURUM_CMP":"Değişim",
              "ONCEKI":"Önceki İşçi","SONRAKI":"Yeni İşçi","ACIKLAMA":"Açıklama"}
    for col in cols:
        tree.heading(col, text=labels.get(col, col))
        tree.column(col, width=widths.get(col, 150),
                    anchor=anchors.get(col, "w"))
    for tag, cfg in TAG_COLORS.items():
        tree.tag_configure(tag, **cfg)
    return tree


def fill_tree(tree, results):
    for i in tree.get_children():
        tree.delete(i)
    for row in results:
        g = list(row) + [""] * 15
        tree.insert("", "end",
                    values=(g[0],g[1],g[2],g[3],g[4],g[5],g[7],g[8]),
                    tags=(g[6],))


def extract_assignments(results):
    """
    results'tan {istasyon: set(isciler)} haritasi cikar.
    O istasyonda calisan TUM iscileri (ana, yardimci, transfer) yakalar.
    """
    assignments = {}  # {istasyon: set(isci)}
    current_ist = None
    for row in results:
        ist = str(row[1])
        per = str(row[5])
        tag = str(row[6])
        op  = str(row[2])

        # Istasyon baslik satiri
        if "(İstasyon Yükü)" in ist:
            ist_clean = ist.replace(" (İstasyon Yükü)", "").strip()
            if tag not in ["DEVRE DIŞI", "BEKLEMEDE"]:
                current_ist = ist_clean
            else:
                current_ist = None
            continue

        # Op satiri — tum iscileri kaydet
        if current_ist and per not in ["-", "", "Personel"] and op not in ["---", ""]:
            assignments.setdefault(current_ist, set()).add(per)

    return assignments


def compare_assignments(assign_a, assign_b):
    """
    {ist: set(isci)} haritalarini karsilastir.
    Her istasyon icin kim geldi, kim gitti cikar.
    """
    tum_ist = sorted(set(list(assign_a.keys()) + list(assign_b.keys())))
    yeni, kapali, degisen = [], [], []

    for ist in tum_ist:
        a_set = assign_a.get(ist, set())
        b_set = assign_b.get(ist, set())

        if not a_set and b_set:
            yeni.append((ist, b_set))
        elif a_set and not b_set:
            kapali.append((ist, a_set))
        elif a_set != b_set:
            gelen   = b_set - a_set  # yeni gelenler
            giden   = a_set - b_set  # gidenler
            if gelen or giden:
                degisen.append((ist, a_set, b_set, giden, gelen))

    return yeni, kapali, degisen


class ResultTab:
    def __init__(self, notebook, label):
        self.results = None
        self.stats   = None
        self.label   = label

        self.frame = ttk.Frame(notebook)
        notebook.add(self.frame, text=f"  {label}  ")

        info = tk.Frame(self.frame, bg="#2c3e50", pady=6, padx=10)
        info.pack(fill=tk.X)
        self.lbl_status = tk.Label(info, text="Hesaplanıyor...",
                                   bg="#2c3e50", fg="white",
                                   font=("Segoe UI", 10, "bold"))
        self.lbl_status.pack(side=tk.LEFT)
        self.lbl_cycle = tk.Label(info, text="", bg="#2c3e50", fg="#f39c12",
                                  font=("Segoe UI", 10, "bold"))
        self.lbl_cycle.pack(side=tk.LEFT, padx=20)
        self.lbl_sure = tk.Label(info, text="", bg="#2c3e50", fg="#1abc9c",
                                 font=("Segoe UI", 10, "bold"))
        self.lbl_sure.pack(side=tk.LEFT)

        btn_f = tk.Frame(info, bg="#2c3e50")
        btn_f.pack(side=tk.RIGHT)
        self.btn_chart = tk.Button(btn_f, text="GRAFİK", state="disabled",
                                   bg="#e67e22", fg="white",
                                   font=("Segoe UI", 9, "bold"),
                                   command=self.show_chart)
        self.btn_chart.pack(side=tk.RIGHT, padx=5)
        self.btn_export = tk.Button(btn_f, text="EXCEL", state="disabled",
                                    bg="#27ae60", fg="white",
                                    font=("Segoe UI", 9, "bold"),
                                    command=self.export_excel)
        self.btn_export.pack(side=tk.RIGHT, padx=5)

        flt = tk.Frame(self.frame, bg="#eaf2f8", pady=5, padx=10)
        flt.pack(fill=tk.X)
        tk.Label(flt, text="Personel Filtresi:", bg="#eaf2f8",
                 font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT)
        self.combo_filter = ttk.Combobox(flt, values=["Tümü"],
                                         state="readonly", width=22)
        self.combo_filter.current(0)
        self.combo_filter.pack(side=tk.LEFT, padx=8)
        self.combo_filter.bind("<<ComboboxSelected>>", self.apply_filter)

        tf = tk.Frame(self.frame)
        tf.pack(fill=tk.BOTH, expand=True)
        self.tree = make_tree(tf)
        sb = ttk.Scrollbar(tf, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=sb.set)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(fill=tk.BOTH, expand=True)

    def set_results(self, results, stats):
        self.results = results
        self.stats   = stats
        fill_tree(self.tree, results)
        self.lbl_status.config(text=f"✓ {self.label} — Tamamlandı")
        self.lbl_cycle.config(text=f"Darboğaz: {stats['bottleneck_time']:.2f} sn")
        self.lbl_sure.config(text=f"Toplam: {stats['total_production_hours']:.2f} saat")
        self.btn_chart.config(state="normal")
        self.btn_export.config(state="normal")
        def wkey(w):
            nums = re.findall(r'\d+', w)
            return (int(nums[0]) if nums else 0, w)
        workers = sorted(
            {r[5] for r in results
             if r[5] not in ["-","Personel","DEVRE DIŞI","BOŞ / KAPALI"]},
            key=wkey)
        self.combo_filter.config(values=["Tümü"] + workers)
        self.combo_filter.current(0)

    def set_error(self, msg):
        self.lbl_status.config(text=f"✗ Hata: {msg}", fg="#e74c3c")

    def apply_filter(self, _=None):
        if not self.results: return
        f = self.combo_filter.get()
        for i in self.tree.get_children(): self.tree.delete(i)

        if f == "Tümü":
            for row in self.results:
                g = list(row) + [""] * 15
                self.tree.insert("", "end",
                                 values=(g[0],g[1],g[2],g[3],g[4],g[5],g[7],g[8]),
                                 tags=(g[6],))
            return

        # Personel filtresi: once bu personelin hangi istasyonlarda oldugunu bul
        # Sonra o istasyonun baslik satirini + ilgili op satirlarini goster
        current_ist_rows = []   # (baslik_row, [op_row, ...])
        pending_header = None
        pending_ops = []

        for row in self.results:
            ist = str(row[1])
            per = str(row[5])
            op  = str(row[2])

            if "(İstasyon Yükü)" in ist or op == "---":
                # Onceki istasyonu kaydet
                if pending_header is not None and pending_ops:
                    current_ist_rows.append((pending_header, pending_ops))
                pending_header = row
                pending_ops = []
            else:
                if per == f:
                    pending_ops.append(row)

        # Son istasyonu da ekle
        if pending_header is not None and pending_ops:
            current_ist_rows.append((pending_header, pending_ops))

        # Tabloya yaz
        for header, ops in current_ist_rows:
            g = list(header) + [""] * 15
            self.tree.insert("", "end",
                             values=(g[0],g[1],g[2],g[3],g[4],g[5],g[7],g[8]),
                             tags=(g[6],))
            for row in ops:
                g = list(row) + [""] * 15
                self.tree.insert("", "end",
                                 values=(g[0],g[1],g[2],g[3],g[4],g[5],g[7],g[8]),
                                 tags=(g[6],))

    def show_chart(self):
        if not self.results: return
        wd = {}
        for r in self.results:
            w, tag = r[5], r[6]
            if w in ["-","Personel","BOŞ / KAPALI","DEVRE DIŞI"]: continue
            try: tv = float(r[3])
            except: tv = 0.0
            wd.setdefault(w, {"base":0.,"helper":0.,"moved":0.,"pool":0.,"master":0.,"total":0.})
            note = str(r[4])
            if tag == "STAGE3_HELPER_ROW" or "YARDIMCI" in note: wd[w]["helper"] += tv
            elif tag in ("STAGE4_MOVED","STAGE4_ROW") or "GEZİCİ" in note: wd[w]["moved"] += tv
            elif tag == "TAKVIYE (YEDEK)": wd[w]["pool"] += tv
            elif tag == "TAKVIYE (USTA)": wd[w]["master"] += tv
            else: wd[w]["base"] += tv
            wd[w]["total"] += tv
        if not wd:
            messagebox.showwarning("Uyarı", "Veri yok."); return
        sw = sorted(wd.items(), key=lambda x: x[1]["total"], reverse=True)
        names = [i[0] for i in sw]
        base=[i[1]["base"] for i in sw]; pool=[i[1]["pool"] for i in sw]
        mast=[i[1]["master"] for i in sw]; hlp=[i[1]["helper"] for i in sw]
        mov=[i[1]["moved"] for i in sw]
        win = tk.Toplevel(); win.title(f"İş Yükü — {self.label}"); win.geometry("1200x650")
        fig = Figure(figsize=(14,6), dpi=100); ax = fig.add_subplot(111)
        xp = range(len(names))
        ax.bar(xp, base, color="#4CAF50", label="Ana İş")
        b2=[a+b for a,b in zip(base,pool)]; ax.bar(xp,pool,bottom=base,color="#8E44AD",label="Yedek")
        b3=[a+b for a,b in zip(b2,mast)]; ax.bar(xp,mast,bottom=b2,color="#C0392B",label="Usta")
        b4=[a+b for a,b in zip(b3,hlp)]; ax.bar(xp,hlp,bottom=b3,color="#FF9800",label="Yardımcı")
        ax.bar(xp,mov,bottom=b4,color="#1565C0",label="Transfer")
        ax.set_xticks(list(xp)); ax.set_xticklabels(names, rotation=90, fontsize=8)
        ax.set_ylabel("Süre (sn)"); ax.set_title(f"İş Yükü — {self.label}", fontsize=12, fontweight="bold")
        ax.legend(fontsize=9); fig.tight_layout()
        FigureCanvasTkAgg(fig, master=win).get_tk_widget().pack(fill=tk.BOTH, expand=1)

    def export_excel(self):
        if not self.results or not self.stats: return
        fp = filedialog.asksaveasfilename(
            defaultextension=".xlsx", filetypes=[("Excel files","*.xlsx")],
            initialfile=f"Arccelik_{self.label}_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx")
        if not fp: return
        cols = ["No","İstasyon","Operasyon","Süre (sn)","İşlem Tipi",
                "Atanan Personel","Atama Yöntemi","Detay Açıklama"]
        df = pd.DataFrame([list(r[:6])+[r[7],r[8]] for r in self.results], columns=cols)
        s = self.stats
        df2 = pd.DataFrame({
            "Metrik": ["Hedef","Darboğaz (sn)","Toplam (saat)","Normal","Usta","Pool","Yardımcı"],
            "Değer":  [s["target_qty"],round(s["bottleneck_time"],2),
                       round(s["total_production_hours"],2),
                       s["count_normal"],s["count_master"],s["count_pool"],s["count_helpers"]]})
        with pd.ExcelWriter(fp, engine="openpyxl") as w:
            df.to_excel(w, index=False, sheet_name="Atama Planı")
            df2.to_excel(w, index=False, sheet_name="Özet")
        messagebox.showinfo("Başarılı", f"Kaydedildi:\n{fp}")


class CompareTab:
    def __init__(self, notebook):
        self.frame = ttk.Frame(notebook)
        notebook.add(self.frame, text="  🔄 Karşılaştırma  ")

        hdr = tk.Frame(self.frame, bg="#34495e", pady=8, padx=12)
        hdr.pack(fill=tk.X)
        self.lbl_title = tk.Label(hdr, text="Karşılaştırma",
                                  bg="#34495e", fg="white",
                                  font=("Segoe UI", 11, "bold"))
        self.lbl_title.pack(side=tk.LEFT)

        tf = tk.Frame(self.frame)
        tf.pack(fill=tk.BOTH, expand=True)
        cols = ("DURUM_CMP", "IST", "ONCEKI", "SONRAKI", "ACIKLAMA")
        self.tree = make_tree(tf, extra_cols=cols)
        sb = ttk.Scrollbar(tf, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=sb.set)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(fill=tk.BOTH, expand=True)

    def update(self, label_a, results_a, label_b, results_b):
        for i in self.tree.get_children():
            self.tree.delete(i)

        self.lbl_title.config(
            text=f"Karşılaştırma:  {label_a}  →  {label_b}")

        assign_a = extract_assignments(results_a)
        assign_b = extract_assignments(results_b)
        yeni, kapali, degisen = compare_assignments(assign_a, assign_b)

        ayni = len([s for s in assign_a if s in assign_b and assign_a[s] == assign_b[s]])

        def section(text):
            self.tree.insert("", "end",
                             values=(text, "", "", "", ""),
                             tags=("STAGE3_MAIN",))

        # 1. Yeni açılan istasyonlar
        if yeni:
            section(f"🟢  YENİ AÇILAN İSTASYONLAR  ({len(yeni)} adet)")
            for ist, b_set in yeni:
                workers_str = ", ".join(sorted(b_set))
                self.tree.insert("", "end",
                                 values=("YENİ", ist, "—", workers_str,
                                         f"{label_b}'de yeni atandı"),
                                 tags=("CMP_NEW",))

        # 2. Kapatılan istasyonlar
        if kapali:
            section(f"🔴  KAPATILAN İSTASYONLAR  ({len(kapali)} adet)")
            for ist, a_set in kapali:
                workers_str = ", ".join(sorted(a_set))
                self.tree.insert("", "end",
                                 values=("KAPALI", ist, workers_str, "—",
                                         f"{label_b}'de bu istasyon yok"),
                                 tags=("CMP_CLOSED",))

        # 3. İşçi değişen istasyonlar
        if degisen:
            section(f"🟡  İŞÇİSİ DEĞİŞEN İSTASYONLAR  ({len(degisen)} adet)")
            for ist, a_set, b_set, giden, gelen in degisen:
                onceki = ", ".join(sorted(giden)) if giden else "—"
                sonraki = ", ".join(sorted(gelen)) if gelen else "—"
                aciklama = ""
                if giden and gelen:
                    aciklama = f"{', '.join(sorted(giden))} → {', '.join(sorted(gelen))}"
                elif giden:
                    aciklama = f"{', '.join(sorted(giden))} ayrıldı"
                elif gelen:
                    aciklama = f"{', '.join(sorted(gelen))} eklendi"
                self.tree.insert("", "end",
                                 values=("DEĞİŞTİ", ist, onceki, sonraki, aciklama),
                                 tags=("CMP_CHANGED",))

        # Özet
        section(
            f"✓ Özet:  Yeni: {len(yeni)}  |  Kapatılan: {len(kapali)}  "
            f"|  Değişen: {len(degisen)}  |  Aynı Kalan: {ayni}")


class ProductionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Arçelik Ankara — Hat Dengeleme Optimizasyon Paneli")
        self.root.geometry("1550x900")

        # Son iki çözüm hafızası
        self.last_two = []  # [(label, results, stats), ...]

        self.setup_ui()

    def setup_ui(self):
        # ÜST PANEL
        top = tk.Frame(self.root, bg="#f4f6f7", pady=12, padx=15)
        top.pack(fill=tk.X)

        tk.Label(top, text="Ürün Kodu:", bg="#f4f6f7",
                 font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT)
        self.combo_prod = ttk.Combobox(
            top, values=URUN_KODLARI, state="readonly", width=12)
        self.combo_prod.current(0)
        self.combo_prod.pack(side=tk.LEFT, padx=5)

        tk.Label(top, text=" | İşçi:", bg="#f4f6f7",
                 font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT, padx=(12,3))
        self.combo_workers = ttk.Combobox(
            top, values=["Gerçek İşçiler (A)", "Dummy İşçiler (B)"],
            state="readonly", width=18)
        self.combo_workers.current(0)
        self.combo_workers.pack(side=tk.LEFT)

        tk.Label(top, text=" | Vardiya:", bg="#f4f6f7",
                 font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT, padx=(12,3))
        self.ent_hours = tk.Entry(top, width=5)
        self.ent_hours.insert(0, "8")
        self.ent_hours.pack(side=tk.LEFT)

        tk.Label(top, text=" | Hedef:", bg="#f4f6f7",
                 font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT, padx=(12,3))
        self.ent_qty = tk.Entry(top, width=8)
        self.ent_qty.insert(0, "247")
        self.ent_qty.pack(side=tk.LEFT)

        self.btn_run = tk.Button(
            top, text="HESAPLA", command=self.start_calculation,
            bg="#2c3e50", fg="white", font=("Segoe UI", 10, "bold"), padx=15)
        self.btn_run.pack(side=tk.RIGHT, padx=5)

        self.btn_reset = tk.Button(
            top, text="SIFIRLA", command=self.reset,
            bg="#c0392b", fg="white", font=("Segoe UI", 10, "bold"), padx=10)
        self.btn_reset.pack(side=tk.RIGHT, padx=5)

        self.lbl_progress = tk.Label(
            self.root, text="Ürün seçip HESAPLA'ya basın.",
            bg="#ecf0f1", font=("Segoe UI", 9), fg="#555", pady=4)
        self.lbl_progress.pack(fill=tk.X, padx=10)

        # Notebook
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=8, pady=5)

        # Karşılaştırma sekmesi (başta gizli)
        self.cmp_tab = None

    def start_calculation(self):
        kod = self.combo_prod.get()
        worker_list = "B" if "Dummy" in self.combo_workers.get() else "A"
        try:
            hours = float(self.ent_hours.get())
            qty   = int(self.ent_qty.get())
        except:
            messagebox.showerror("Hata", "Vardiya ve hedef değerlerini kontrol edin.")
            return

        label = f"{kod} ({worker_list})"

        # Yeni sekme ekle (max 2 sonuç sekmesi + 1 karşılaştırma)
        # Karşılaştırma sekmesini sil
        if self.cmp_tab:
            try:
                self.notebook.forget(self.cmp_tab.frame)
            except:
                pass
            self.cmp_tab = None

        tab = ResultTab(self.notebook, label)

        self.btn_run.config(state="disabled", text="Hesaplanıyor...")
        self.lbl_progress.config(text=f"⏳ {label} çözülüyor...")

        threading.Thread(
            target=self._run_thread,
            args=(tab, label, kod, hours, qty, worker_list),
            daemon=True
        ).start()

    def _run_thread(self, tab, label, kod, hours, qty, worker_list):
        engine = OptimizationEngine()
        try:
            engine.set_params(kod, hours, qty, worker_list)
            results, stats, _ = engine.run_solver()
            if results is None:
                self.root.after(0, tab.set_error, str(stats))
                self.root.after(0, self._done)
            else:
                self.root.after(0, self._on_result, tab, label, results, stats)
        except Exception as e:
            self.root.after(0, tab.set_error, str(e))
            self.root.after(0, self._done)

    def _on_result(self, tab, label, results, stats):
        tab.set_results(results, stats)
        self.notebook.select(tab.frame)

        # Hafızaya ekle (max 2 tut)
        self.last_two.append((label, results, stats))
        if len(self.last_two) > 2:
            # En eski sonuç sekmesini de sil
            old_tabs = [t for t in self.notebook.tabs()
                        if "Karşılaştırma" not in self.notebook.tab(t, "text")]
            if len(old_tabs) > 2:
                try:
                    self.notebook.forget(old_tabs[0])
                except:
                    pass
            self.last_two = self.last_two[-2:]

        # 2 sonuç varsa karşılaştırma sekmesini aç
        if len(self.last_two) == 2:
            self.cmp_tab = CompareTab(self.notebook)
            lbl_a, res_a, _ = self.last_two[0]
            lbl_b, res_b, _ = self.last_two[1]
            self.cmp_tab.update(lbl_a, res_a, lbl_b, res_b)
            self.notebook.select(self.cmp_tab.frame)

        self._done()

    def _done(self):
        self.btn_run.config(state="normal", text="HESAPLA")
        self.lbl_progress.config(text="✓ Tamamlandı.")

    def reset(self):
        for tab in self.notebook.tabs():
            self.notebook.forget(tab)
        self.last_two.clear()
        self.cmp_tab = None
        self.lbl_progress.config(text="Sıfırlandı. Ürün seçip HESAPLA'ya basın.")


if __name__ == "__main__":
    root = tk.Tk()
    app = ProductionApp(root)
    root.mainloop()
