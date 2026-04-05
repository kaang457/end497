# -*- coding: utf-8 -*-
"""
ASAMA 4: Parallel Machine Scheduling - Toplam Sapma (Total MAD) Minimizasyonu
"""

import math
from ortools.linear_solver import pywraplp


def _worker_speed(engine, s, worker_id=None):
    """Hem ana işçilerin (worker) hem de yardımcıların (helper) hızını hesaplar."""
    info = engine.all_assignments.get(s, {})
    
    w = worker_id if worker_id else info.get("worker", "")
    if not w: 
        return 1.0

    # Ana işçi mi?
    if w == info.get("worker"):
        t = info.get("type", "NORMAL")
        if t == "NORMAL": return engine.active_workers.get(w, 1.0)
        elif t == "MASTER": return 0.8
        return 1.2
    else:
        # Helper ise
        return engine.active_workers.get(w, 1.0) if w in engine.active_workers else (0.8 if w in getattr(engine, "master_db", {}) else 1.2)


def _calc_total_mad(values):
    """Varyans yerine Mutlak Sapma Toplamı hesaplar."""
    if not values: 
        return 0.0
    mean = sum(values) / len(values)
    return sum(abs(v - mean) for v in values)


def run(engine):
    engine.log("\n" + "=" * 60)
    engine.log("AŞAMA 4: TRANSFER VE YÜK DENGELEME BAŞLIYOR (MAD ENTEGRE EDİLDİ)...")
    engine.log("Arka planda matematiksel çözücü (SCIP) çalışıyor, lütfen bekleyin...")

    # 1. Istasyonlari seq sirasina al
    sorted_stations = sorted(
        [s for s in engine.all_assignments if s in engine.final_stations],
        key=lambda x: engine.final_stations[x]["seq"]
    )
    if len(sorted_stations) < 2:
        return

    station_index = {s: i for i, s in enumerate(sorted_stations)}
    fixed_stations = getattr(engine, "fixed_stations", set())

    # 2. Operasyon listesini (ops) hazırla
    ops = []
    for s in sorted_stations:
        if s not in engine.all_assignments: 
            continue
        info = engine.all_assignments[s]
        ops_split = info.get("ops_split", None)
        main_w = info.get("worker", "")
        spd_main = _worker_speed(engine, s, main_w)

        for (op_name, op_std) in engine.final_stations[s]["sub_ops"]:
            orig_time = next((t for (n, t, _, _) in ops_split if n == op_name), op_std * spd_main) if ops_split else op_std * spd_main
            orig_w = next((who for (n, _, who, _) in ops_split if n == op_name), main_w) if ops_split else main_w
            ops.append({
                "id": f"{s}__{op_name}", "s_orig": s, "op_name": op_name, 
                "op_std": op_std, "orig_time": orig_time, "orig_w": orig_w
            })

    # 3. Her operasyon icin gidebilecegi (istasyon, isci, sure) rotalari
    op_dest = {}
    for op in ops:
        oid = op["id"]
        s_orig = op["s_orig"]
        idx = station_index[s_orig]
        op_std = op["op_std"]
        
        dest_list = []
        seen_dests = set()
        
        # Orijinal atama
        dest_list.append((s_orig, op["orig_w"], op["orig_time"]))
        seen_dests.add((s_orig, op["orig_w"]))

        # İÇ DENGELEME: Kendi istasyonundaki diğer işçilere (örn. Helper) atama
        info_orig = engine.all_assignments.get(s_orig, {})
        for w2 in [info_orig.get("worker"), info_orig.get("helper")]:
            if w2 and (s_orig, w2) not in seen_dests:
                spd2 = _worker_speed(engine, s_orig, w2)
                dest_list.append((s_orig, w2, op_std * spd2))
                seen_dests.add((s_orig, w2))

        # TRANSFER: Komşu istasyonlara atama ihtimalleri (Helperlar dahil)
        if s_orig not in fixed_stations and op_std > 2.0:
            for delta in (-2, -1, 1, 2):
                nb = idx + delta
                if 0 <= nb < len(sorted_stations):
                    s_dest = sorted_stations[nb]
                    if s_dest in engine.all_assignments and s_dest not in fixed_stations:
                        info_dest = engine.all_assignments[s_dest]
                        for w_dest in [info_dest.get("worker"), info_dest.get("helper")]:
                            if w_dest and (s_dest, w_dest) not in seen_dests:
                                spd_dest = _worker_speed(engine, s_dest, w_dest)
                                dest_list.append((s_dest, w_dest, op_std * spd_dest))
                                seen_dests.add((s_dest, w_dest))
        op_dest[oid] = dest_list

    # 4. Baslangic yukleri ve SCIP metrikleri
    init_loads = {}
    for s in sorted_stations:
        if s not in engine.all_assignments: continue
        info = engine.all_assignments[s]
        ops_split = info.get("ops_split", None)
        if ops_split:
            for (_, op_time, who, _) in ops_split:
                init_loads[who] = init_loads.get(who, 0.0) + op_time
        else:
            w = info.get("worker")
            if w:
                spd = _worker_speed(engine, s, w)
                for (_, op_std) in engine.final_stations[s]["sub_ops"]:
                    init_loads[w] = init_loads.get(w, 0.0) + op_std * spd

    init_vals = list(init_loads.values())
    init_mad = _calc_total_mad(init_vals)
    init_mean = sum(init_vals) / len(init_vals) if init_vals else 0.0
    init_max = max(init_vals) if init_vals else 0.0

    # K4 İçin Başlangıç MAD hesabı (SCIP'in gördüğü tüm işçiler)
    all_receiving_workers = set()
    for dests in op_dest.values():
        for (_, w, _) in dests:
            all_receiving_workers.add(w)
    all_workers = list(all_receiving_workers)
    init_scip_mad = sum(abs(init_loads.get(w, 0.0) - init_mean) for w in all_workers)

    # 5. MILP Modeli Kurulumu (SCIP)
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver: return

    x = {}
    worker_terms = {w: [] for w in all_workers}
    
    for op in ops:
        oid = op["id"]
        for (s_dest, w, sure) in op_dest[oid]:
            var = solver.BoolVar(f"x_{oid}_{s_dest}_{w}")
            x[(oid, s_dest, w)] = (var, sure)
            worker_terms[w].append(sure * var)

    # K1: Her operasyon sadece bir yere atanmali
    for op in ops:
        oid = op["id"]
        solver.Add(solver.Sum(x[(oid, s, w)][0] for (s, w, _) in op_dest[oid]) == 1)

    dev_pos = {w: solver.NumVar(0, solver.infinity(), f"dp_{w}") for w in all_workers}
    dev_neg = {w: solver.NumVar(0, solver.infinity(), f"dn_{w}") for w in all_workers}

    for w in all_workers:
        load_expr = solver.Sum(worker_terms[w])
        
        # K2: Darbogaz Kisiti
        solver.Add(load_expr <= init_max + 0.005)
        
        # K3: MAD (Ortalamadan sapmalarin dogrusallastirilmasi)
        solver.Add(dev_pos[w] - dev_neg[w] == load_expr - init_mean)

    # K4: KÖTÜLEŞMEME KISITI (No-Worsening Constraint)
    solver.Add(solver.Sum(dev_pos[w] + dev_neg[w] for w in all_workers) <= init_scip_mad + 0.005)

    # AMAC: Toplam Sapmayi Minimize Et
    solver.Minimize(solver.Sum(dev_pos[w] + dev_neg[w] for w in all_workers))

    # 6. Çözümü Başlat
    solver.EnableOutput()
    status = solver.Solve()

    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        engine.moved_ops = set()
        engine.stage4_stats = {
            "init_mad": init_mad, "final_mad": init_mad,
            "mad_reduction_pct": 0.0, "init_bottleneck": init_max,
            "final_bottleneck": init_max, "bottleneck_improvement": 0.0, "total_improvements": 0,
        }
        engine.print_stage_summary("STAGE 4")
        return

    # 7. Sonuclari Uygula (İç Dengeleme ve Gezici etiketleri eklendi)
    new_station_ops = {s: [] for s in sorted_stations}
    moved_ops_set = set()
    op_final_assign = {}

    for op in ops:
        oid = op["id"]
        assigned = False
        for (s_dest, w, sure) in op_dest[oid]:
            if x[(oid, s_dest, w)][0].solution_value() > 0.5:
                op_final_assign[oid] = (s_dest, w, sure)
                new_station_ops[s_dest].append((op["op_name"], op["op_std"]))
                if s_dest != op["s_orig"]:
                    moved_ops_set.add((s_dest, op["op_name"]))
                assigned = True
                break
        if not assigned:
            op_final_assign[oid] = (op["s_orig"], op["orig_w"], op["orig_time"])
            new_station_ops[op["s_orig"]].append((op["op_name"], op["op_std"]))

    final_loads = {}
    for s in sorted_stations:
        if s not in engine.all_assignments: continue
        info = engine.all_assignments[s]
        old_split = info.get("ops_split") or []
        old_map = {n: (who, note) for (n, _, who, note) in old_split}
        
        new_split = []
        worker_loads_in_station = {}
        
        for op in ops:
            oid = op["id"]
            s_dest, w, sure = op_final_assign.get(oid, (op["s_orig"], op["orig_w"], op["orig_time"]))
            
            if s_dest == s:
                if s_dest == op["s_orig"]:
                    old_who, old_note = old_map.get(op["op_name"], (None, None))
                    if w == old_who:
                        who, note = w, old_note
                    else:
                        who, note = w, "İÇ DENGELEME (ST4)"
                else:
                    who, note = w, "GEZİCİ"
                    
                new_split.append((op["op_name"], sure, who, note))
                worker_loads_in_station[who] = worker_loads_in_station.get(who, 0.0) + sure
                final_loads[who] = final_loads.get(who, 0.0) + sure

        engine.final_stations[s]["sub_ops"] = new_station_ops[s]
        info["ops_split"] = new_split if new_split else old_split
        info["time"] = max(worker_loads_in_station.values()) if worker_loads_in_station else 0.0

    # Sabit kalan iscilerin yuklerini ekle
    for w, load in init_loads.items():
        if w not in final_loads:
            final_loads[w] = load

    # 8. Istatistikler ve Raporlama (Arayüz İçin Aktarım)
    final_vals = list(final_loads.values())
    final_mad = _calc_total_mad(final_vals)
    final_max = max(final_vals) if final_vals else 0.0

    reduction_pct = (init_mad - final_mad) / init_mad * 100 if init_mad > 0 else 0.0
    bn_improvement = init_max - final_max

    engine.log(f"  Stage4 Toplam MAD: {init_mad:.4f} -> {final_mad:.4f} | Transfer: {len(moved_ops_set)} op")
    
    engine.moved_ops = moved_ops_set
    engine.print_stage_summary("STAGE 4")

    # Arayüze aktarılacak JSON istatistikleri (MAD'e göre güncellendi)
    engine.stage4_stats = {
        "init_mad": init_mad,
        "final_mad": final_mad,
        "mad_reduction_pct": reduction_pct,
        "init_bottleneck": init_max,
        "final_bottleneck": final_max,
        "bottleneck_improvement": bn_improvement,
        "total_improvements": len(moved_ops_set),
    }