# -*- coding: utf-8 -*-
"""
ASAMA 4: Global MILP - Toplam Sapma (Total MAD) Minimizasyonu
--------------------------------------------
Amac: min Σ_w |load[w] - stage3_mean| 
"""

import math
from ortools.linear_solver import pywraplp

def _worker_speed(engine, s):
    info = engine.all_assignments.get(s, {})
    t = info.get("type", "NORMAL")
    if t == "NORMAL":
        return engine.active_workers.get(info.get("worker", ""), 1.0)
    elif t == "MASTER":
        return 0.8
    return 1.2

# Varyans yerine doğrudan TOPLAM MAD hesaplayan fonksiyon
def _calc_total_mad(values):
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    return sum(abs(v - mean) for v in values)

def run(engine):
    engine.log("=" * 60)
    engine.log("ASAMA 4: GLOBAL MILP - TOPLAM SAPMA (TOTAL MAD) MİNİMİZASYONU")
    engine.log("=" * 60)

    # Sabit İstasyonları Çek ve Ekrana Yazdır
    fixed_stations = getattr(engine, "fixed_stations", set())
    
    engine.log(f"📌 SABİT İSTASYONLAR ({len(fixed_stations)} Adet):")
    if fixed_stations:
        # Alfabetik sıraya sokup aralarına virgül koyarak yazdırır
        engine.log(", ".join(sorted(list(fixed_stations))))
    else:
        engine.log("Sabit istasyon bulunmamaktadır (Tüm hat esnek).")
    engine.log("-" * 60)

    sorted_stations = sorted(
        [s for s in engine.all_assignments if s in engine.final_stations],
        key=lambda x: engine.final_stations[x]["seq"]
    )
    if len(sorted_stations) < 2:
        return

    station_index  = {s: i for i, s in enumerate(sorted_stations)}
    fixed_stations = getattr(engine, "fixed_stations", set())

    stage3_bottleneck = getattr(engine, "stage3_bottleneck", None)
    stage3_mean       = getattr(engine, "stage3_mean", None)

    # Isci hiz haritasi
    worker_speed_map = {}
    for s in sorted_stations:
        info = engine.all_assignments.get(s, {})
        w    = info.get("worker", "")
        if w:
            worker_speed_map[(w, s)] = _worker_speed(engine, s)
        h = info.get("helper", None)
        if h:
            h_spd = (engine.active_workers.get(h, 1.0) if h in engine.active_workers
                     else (0.8 if h in getattr(engine, "master_db", {}) else 1.2))
            worker_speed_map[(h, s)] = h_spd

    # Op listesi
    ops = []
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        info      = engine.all_assignments[s]
        ops_split = info.get("ops_split", None)
        main_w    = info["worker"]
        spd_main  = _worker_speed(engine, s)

        for (op_name, op_std) in engine.final_stations[s]["sub_ops"]:
            orig_time = next((t for (n,t,_,_) in ops_split if n==op_name),
                             op_std*spd_main) if ops_split else op_std*spd_main
            orig_w    = next((who for (n,_,who,_) in ops_split if n==op_name),
                             main_w) if ops_split else main_w
            ops.append({"id": f"{s}__{op_name}", "s_orig": s, "op_name": op_name,
                        "op_std": op_std, "orig_time": orig_time, "orig_w": orig_w})

    # Baslangic yukleri
    init_loads = {}
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        info      = engine.all_assignments[s]
        ops_split = info.get("ops_split", None)
        if ops_split:
            for (_, op_time, who, _) in ops_split:
                init_loads[who] = init_loads.get(who, 0.0) + op_time
        else:
            w   = info["worker"]
            t   = info.get("type", "NORMAL")
            spd = engine.active_workers.get(w,1.0) if t=="NORMAL" else (0.8 if t=="MASTER" else 1.2)
            for (_, op_std) in engine.final_stations[s]["sub_ops"]:
                init_loads[w] = init_loads.get(w, 0.0) + op_std * spd

    init_vals     = list(init_loads.values())
    init_mad      = _calc_total_mad(init_vals)  
    init_max      = max(init_vals) if init_vals else 0.0

    if stage3_bottleneck is None:
        stage3_bottleneck = init_max
    if stage3_mean is None:
        stage3_mean = sum(init_vals)/len(init_vals) if init_vals else 0.0

    engine.log(f"Stage3 Bottleneck: {stage3_bottleneck:.2f} sn | Mean: {stage3_mean:.2f} sn | init_max: {init_max:.2f} sn")
    engine.log(f"Baslangic TOPLAM SAPMA (Total MAD): {init_mad:.4f} sn | Makespan: {init_max:.2f} sn")

    valid    = []
    seen_set = set()

    def add_arc(oid, s_dest, w, sure):
        key = (oid, s_dest, w)
        if key not in seen_set:
            valid.append((oid, s_dest, w, sure))
            seen_set.add(key)

    for op in ops:
        oid    = op["id"]
        s_orig = op["s_orig"]
        idx    = station_index[s_orig]
        op_std = op["op_std"]

        # 1. Orijinal arc
        add_arc(oid, s_orig, op["orig_w"], op["orig_time"])

        # 2. Kendi istasyonundaki diger isci (ic dengeleme)
        info_orig = engine.all_assignments.get(s_orig, {})
        for w2 in [info_orig.get("worker"), info_orig.get("helper")]:
            if w2 and w2 != op["orig_w"]:
                op_adaylar = engine.final_stations.get(s_orig, {}).get("adaylar", set())
                spd2 = (worker_speed_map.get((w2, s_orig), engine.active_workers.get(w2, 1.0))
                        if w2 in op_adaylar else 1.2)
                add_arc(oid, s_orig, w2, op_std * spd2)

        # 3. Transfer
        if op_std <= 2.0 or s_orig in fixed_stations:
            continue

        for delta in (-2, -1, 1, 2):
            nb = idx + delta
            if nb < 0 or nb >= len(sorted_stations):
                continue
            s_dest = sorted_stations[nb]
            if s_dest not in engine.all_assignments or s_dest in fixed_stations:
                continue
            info_dest = engine.all_assignments[s_dest]
            for w in [info_dest.get("worker"), info_dest.get("helper")]:
                if not w:
                    continue
                op_adaylar = engine.final_stations.get(s_orig, {}).get("adaylar", set())
                spd  = (worker_speed_map.get((w, s_dest), engine.active_workers.get(w, 1.0))
                        if w in op_adaylar else 1.2)
                sure = op_std * spd
                add_arc(oid, s_dest, w, sure)

    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        engine.log("HATA: SCIP bulunamadi.")
        return

    x = {}
    for (oid, s_dest, w, sure) in valid:
        key = (oid, s_dest, w)
        if key not in x:
            x[key] = (solver.BoolVar(f"x_{oid}_{s_dest}_{w}"), sure)

    # --- MAD DENGELEMESİ (TÜM İŞÇİLER DAHİL) ---
    all_receiving_workers = set()
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        info = engine.all_assignments[s]
        if info.get("worker"):
            all_receiving_workers.add(info["worker"])
        if info.get("helper"):
            all_receiving_workers.add(info["helper"])
            
    # SCIP tüm hattın sapmasını görecek
    all_workers = list(all_receiving_workers)
    
    dev_pos = {w: solver.NumVar(0, solver.infinity(), f"dp_{w}") for w in all_workers}
    dev_neg = {w: solver.NumVar(0, solver.infinity(), f"dn_{w}") for w in all_workers}

    # K1: Her operasyon sadece bir yere atanır
    op_pairs = {}
    for (oid, s_dest, w, _) in valid:
        op_pairs.setdefault(oid, []).append((s_dest, w))

    for op in ops:
        oid = op["id"]
        pairs = op_pairs.get(oid, [])
        if pairs:
            solver.Add(solver.Sum(x[(oid, s, w)][0] for (s, w) in pairs) == 1)

    worker_terms = {}
    for (oid, s_dest, w, sure) in valid:
        key = (oid, s_dest, w)
        if key in x:
            worker_terms.setdefault(w, []).append((sure, x[key][0]))

    # K2: Darboğaz Aşılmasın
    for w, terms in worker_terms.items():
        load_expr = solver.Sum([sure * var for (sure, var) in terms])
        solver.Add(load_expr <= stage3_bottleneck + 0.005)

    # K3: MAD (Ortalamadan sapmalar)
    for w in all_workers:
        terms = worker_terms.get(w, [])
        if not terms:
            continue
        load_expr = solver.Sum([sure * var for (sure, var) in terms])
        solver.Add(dev_pos[w] - dev_neg[w] == load_expr - stage3_mean)

    # K4: KÖTÜLEŞMEME KISITI (No-Worsening Constraint)
    # Başlangıçtaki (Stage 3) sapmayı hesaplıyoruz
    init_scip_mad = sum(abs(init_loads.get(w, 0.0) - stage3_mean) for w in all_workers)
    
    # "Bulacağın yeni Toplam MAD, kesinlikle eskisinden küçük veya eşit olmak ZORUNDA!"
    solver.Add(solver.Sum(dev_pos[w] + dev_neg[w] for w in all_workers) <= init_scip_mad + 0.005)

    # AMAC: Toplam Mutlak Sapmayı Minimize Et
    solver.Minimize(solver.Sum(dev_pos[w] + dev_neg[w] for w in all_workers))

    engine.log("OR-Tools SCIP cozuyor...")
    solver.EnableOutput()
    solver.SetSolverSpecificParametersAsString("limits/gap=0.0")
    status = solver.Solve()

    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        engine.log(f"Cozum bulunamadi veya İyileşme Yok (status={status}). Stage 3 korunuyor.")
        engine.moved_ops = set()
        engine.stage4_stats = {
            "init_mad": init_mad, "final_mad": init_mad,
            "mad_reduction_pct": 0.0, "init_bottleneck": init_max,
            "final_bottleneck": init_max, "bottleneck_improvement": 0.0,
            "total_improvements": 0,
        }
        engine.print_stage_summary("STAGE 4")
        return

    # Post-solve hesaplamalar
    new_station_ops  = {s: [] for s in sorted_stations}
    moved_ops_set    = set()
    op_final_assign  = {}

    for op in ops:
        oid    = op["id"]
        s_orig = op["s_orig"]
        pairs  = op_pairs.get(oid, [])
        assigned = False
        for (s_dest, w) in pairs:
            key = (oid, s_dest, w)
            if key in x and x[key][0].solution_value() > 0.5:
                sure = x[key][1]
                op_final_assign[oid] = (s_dest, w, sure)
                new_station_ops[s_dest].append((op["op_name"], op["op_std"]))
                if s_dest != s_orig:
                    moved_ops_set.add((s_dest, op["op_name"]))
                assigned = True
                break
        if not assigned:
            op_final_assign[oid] = (op["s_orig"], op["orig_w"], op["orig_time"])
            new_station_ops[op["s_orig"]].append((op["op_name"], op["op_std"]))

    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        info      = engine.all_assignments[s]
        old_split = info.get("ops_split") or []
        old_map   = {n: (who, note) for (n, _, who, note) in old_split}

        new_split = []
        worker_loads_in_station = {}
        
        for op in ops:
            oid = op["id"]
            s_dest, w, sure = op_final_assign.get(
                oid, (op["s_orig"], op["orig_w"], op["orig_time"]))
            
            if s_dest != s:
                continue
                
            if s_dest == op["s_orig"]:
                old_who, old_note = old_map.get(op["op_name"], (None, None))
                if w == old_who:
                    who = w
                    note = old_note
                else:
                    who = w
                    note = "İÇ DENGELEME (ST4)"
            else:
                who  = w
                note = "GEZİCİ"
                
            new_split.append((op["op_name"], sure, who, note))
            worker_loads_in_station[who] = worker_loads_in_station.get(who, 0.0) + sure

        engine.final_stations[s]["sub_ops"] = new_station_ops[s]
        info["ops_split"] = new_split if new_split else old_split
        info["time"] = max(worker_loads_in_station.values()) if worker_loads_in_station else 0.0

    engine.moved_ops = moved_ops_set

    # Final metrikleri
    final_loads = {}
    for op in ops:
        oid = op["id"]
        for (s_dest, w) in op_pairs.get(oid, []):
            key = (oid, s_dest, w)
            if key in x and x[key][0].solution_value() > 0.5:
                final_loads[w] = final_loads.get(w, 0.0) + x[key][1]
                break
    for w, load in init_loads.items():
        if w not in final_loads:
            final_loads[w] = load

    final_vals     = list(final_loads.values())
    final_mad      = _calc_total_mad(final_vals) 
    final_max      = max(final_vals)
    final_bn_w     = max(final_loads, key=final_loads.get)
    reduction_pct  = ((init_mad - final_mad) / init_mad * 100
                      if init_mad > 0 else 0.0)

    engine.log(f"\nFINAL: TOPLAM SAPMA (Total MAD) {init_mad:.4f} -> {final_mad:.4f} sn (%{reduction_pct:.1f} İyileşme)")
    engine.log(f"       Makespan: {init_max:.2f} -> {final_max:.2f} sn ({final_bn_w})")
    engine.log(f"       Tasınan İş Sayısı: {len(moved_ops_set)} op")
    engine.log("=" * 60)

    engine.print_stage_summary("STAGE 4")
    
    # JSON Verisine aktarılacak istatistikler
    engine.stage4_stats = {
        "init_mad": init_mad, "final_mad": final_mad,
        "mad_reduction_pct": reduction_pct,
        "init_bottleneck": init_max, "final_bottleneck": final_max,
        "bottleneck_improvement": init_max - final_max,
        "total_improvements": len(moved_ops_set),
    }
