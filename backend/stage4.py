# -*- coding: utf-8 -*-
"""
ASAMA 4: Parallel Machine Scheduling - Varyans Minimizasyonu
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


def _calc_variance(values):
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    return sum((v - mean) ** 2 for v in values) / len(values)


def run(engine):
    engine.log("\n" + "=" * 60)
    engine.log("AŞAMA 4: TRANSFER VE YÜK DENGELEME BAŞLIYOR...")
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

    # 2. Her istasyonun iscisi ve hizi
    station_worker = {}
    for s in sorted_stations:
        info = engine.all_assignments.get(s, {})
        station_worker[s] = (info.get("worker", ""), _worker_speed(engine, s))

    # 3. Op listesi
    ops      = []
    op_by_id = {}
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        info      = engine.all_assignments[s]
        ops_split = info.get("ops_split", None)
        spd_main  = _worker_speed(engine, s)

        for (op_name, op_std) in engine.final_stations[s]["sub_ops"]:
            orig_time = next((t for (n, t, _, _) in ops_split if n == op_name), op_std * spd_main) if ops_split else op_std * spd_main
            entry = {"id": f"{s}__{op_name}", "s_orig": s, "op_name": op_name, "op_std": op_std, "orig_time": orig_time}
            ops.append(entry)
            op_by_id[entry["id"]] = entry

    # 4. Her op icin gidebilecegi (istasyon, sure) ciftleri
    op_dest = {}
    for op in ops:
        oid    = op["id"]
        s_orig = op["s_orig"]
        idx    = station_index[s_orig]
        op_std = op["op_std"]
        if s_orig in fixed_stations or op_std <= 2.0:
            op_dest[oid] = [(s_orig, op["orig_time"])]
        else:
            dest_list = [(s_orig, op["orig_time"])]
            for delta in (-2, -1, 1, 2):
                nb = idx + delta
                if 0 <= nb < len(sorted_stations):
                    s_dest = sorted_stations[nb]
                    if s_dest in engine.all_assignments and s_dest not in fixed_stations:
                        _, spd_dest = station_worker[s_dest]
                        dest_list.append((s_dest, op_std * spd_dest))
            op_dest[oid] = dest_list

    # DEBUG: OP_A020220 ve OP_A020190_A icin ozel debug
    for op in ops:
        if "OP_A020220" in op["s_orig"] or "OP_A020190_A" in op["s_orig"]:
            dests = [s for (s, _) in op_dest[op["id"]]]
            engine.log(f"  DEBUG {op['op_name']} (std={op['op_std']:.2f}) | s_orig={op['s_orig']} | gidebilir={dests}")

    # 5. Baslangic yukleri
    init_loads = {}
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        info      = engine.all_assignments[s]
        ops_split = info.get("ops_split", None)
        if ops_split:
            for (op_name, op_time, who, note) in ops_split:
                init_loads[who] = init_loads.get(who, 0.0) + op_time
        else:
            w   = info["worker"]
            t   = info.get("type", "NORMAL")
            spd = engine.active_workers.get(w, 1.0) if t == "NORMAL" else (0.8 if t == "MASTER" else 1.2)
            for (op_name, op_std) in engine.final_stations[s]["sub_ops"]:
                init_loads[w] = init_loads.get(w, 0.0) + op_std * spd

    init_vals     = list(init_loads.values())
    init_variance = _calc_variance(init_vals)
    init_mean     = sum(init_vals) / len(init_vals)
    init_max      = max(init_vals)

    # 6. Sabit istasyonlarin islerini modelden cikar
    ops_for_model = [op for op in ops if op["s_orig"] not in fixed_stations]

    engine.log(f"  fixed_stations sayısı: {len(fixed_stations)}")
    engine.log(f"  ops_for_model sayısı: {len(ops_for_model)}")
    engine.log(f"  Toplam binary değişken: {sum(len(op_dest[op['id']]) for op in ops_for_model)}")
    
    # 7. MILP Modeli (Tekrar eden solver yaratma kısmı düzeltildi)
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        return

    x = {}
    for op in ops_for_model:
        oid = op["id"]
        for (s_dest, _) in op_dest[oid]:
            x[(oid, s_dest)] = solver.BoolVar(f"x__{oid}__{s_dest}")

    worker_terms = {}
    for op in ops_for_model:
        oid    = op["id"]
        s_orig = op["s_orig"]
        for (s_dest, sure_dest) in op_dest[oid]:
            if s_dest == s_orig:
                info_orig = engine.all_assignments.get(s_orig, {})
                ops_split = info_orig.get("ops_split", None)
                if ops_split:
                    real_who  = next((who for (n, _, who, _) in ops_split if n == op["op_name"]), info_orig["worker"])
                    real_time = next((t   for (n, t, _, _)   in ops_split if n == op["op_name"]), op["orig_time"])
                else:
                    real_who  = info_orig["worker"]
                    real_time = op["orig_time"]
                worker_terms.setdefault(real_who, []).append(real_time * x[(oid, s_dest)])
            else:
                w_dest = station_worker[s_dest][0]
                worker_terms.setdefault(w_dest, []).append(sure_dest * x[(oid, s_dest)])

    all_workers = list(worker_terms.keys())

    dev_pos = {w: solver.NumVar(0, solver.infinity(), f"dp_{w}") for w in all_workers}
    dev_neg = {w: solver.NumVar(0, solver.infinity(), f"dn_{w}") for w in all_workers}

    for op in ops_for_model:
        oid = op["id"]
        solver.Add(solver.Sum(x[(oid, s)] for (s, _) in op_dest[oid]) == 1)

    for w in all_workers:
        load_expr = solver.Sum(worker_terms[w])
        solver.Add(dev_pos[w] - dev_neg[w] == load_expr - init_mean)
        # Darbogaz kisiti: hicbir isci stage3 darbogaz suresini gecemez
        solver.Add(load_expr <= init_max)

    solver.Minimize(solver.Sum(dev_pos[w] + dev_neg[w] for w in all_workers))

    # 8. Coz
    solver.EnableOutput()
    status = solver.Solve()

    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        engine.moved_ops = set()
        engine.stage4_stats = {
            "init_variance": init_variance, "final_variance": init_variance,
            "variance_reduction_pct": 0.0, "init_bottleneck": init_max,
            "final_bottleneck": init_max, "bottleneck_improvement": 0.0, "total_improvements": 0,
        }
        engine.print_stage_summary("STAGE 4")
        return

    # 9. Sonuclari uygula
    new_station_ops = {s: [] for s in sorted_stations}
    moved_ops_set   = set()

    for op in ops:
        if op["s_orig"] in fixed_stations:
            new_station_ops[op["s_orig"]].append((op["op_name"], op["op_std"]))

    for op in ops_for_model:
        oid    = op["id"]
        s_orig = op["s_orig"]
        for (s_dest, _) in op_dest[oid]:
            if x[(oid, s_dest)].solution_value() > 0.5:
                new_station_ops[s_dest].append((op["op_name"], op["op_std"]))
                if s_dest != s_orig:
                    moved_ops_set.add((s_dest, op["op_name"]))
                break

    # final_loads hesabi
    final_loads = {}
    for op in ops_for_model:
        oid    = op["id"]
        s_orig = op["s_orig"]
        for (s_dest, sure_dest) in op_dest[oid]:
            if x[(oid, s_dest)].solution_value() > 0.5:
                if s_dest == s_orig:
                    info_orig = engine.all_assignments.get(s_orig, {})
                    os2       = info_orig.get("ops_split", None)
                    if os2:
                        real_who  = next((who for (n,_,who,_) in os2 if n == op["op_name"]), info_orig["worker"])
                        real_time = next((t   for (n,t,_,_)   in os2 if n == op["op_name"]), op["orig_time"])
                    else:
                        real_who  = info_orig["worker"]
                        real_time = op["orig_time"]
                    final_loads[real_who] = final_loads.get(real_who, 0.0) + real_time
                else:
                    w_dest = station_worker[s_dest][0]
                    final_loads[w_dest] = final_loads.get(w_dest, 0.0) + op["op_std"] * station_worker[s_dest][1]
                break

    # Sabit istasyon isci yuklerini init_loads'dan ekle
    for w, load in init_loads.items():
        if w not in final_loads:
            final_loads[w] = load

    final_vals     = list(final_loads.values())
    final_variance = _calc_variance(final_vals)
    engine.log(f"  Stage4 Varyans: {init_variance:.4f} -> {final_variance:.4f} | Transfer: {len(moved_ops_set)} op")

    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        engine.final_stations[s]["sub_ops"] = new_station_ops[s]
        spd      = _worker_speed(engine, s)
        new_time = sum(op_std * spd for _, op_std in new_station_ops[s])
        engine.all_assignments[s]["time"] = new_time

    # ARAYÜZ İÇİN AKTARIM
    engine.moved_ops = moved_ops_set

    final_mean     = sum(final_vals) / len(final_vals)
    final_max      = max(final_vals)
    final_bn_w     = max(final_loads, key=final_loads.get)

    # Senin harika sıfıra bölünme (ZeroDivisionError) koruman
    reduction_pct  = (init_variance - final_variance) / init_variance * 100 if init_variance > 0 else 0.0
    bn_improvement = init_max - final_max

    engine.print_stage_summary("STAGE 4")

    engine.stage4_stats = {
        "init_variance"          : init_variance,
        "final_variance"         : final_variance,
        "variance_reduction_pct" : reduction_pct,
        "init_bottleneck"        : init_max,
        "final_bottleneck"       : final_max,
        "bottleneck_improvement" : bn_improvement,
        "total_improvements"     : len(moved_ops_set),
    }