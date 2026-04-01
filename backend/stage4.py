# -*- coding: utf-8 -*-
"""
ASAMA 4: Global MILP - MAD Minimizasyonu (OR-Tools pywraplp)
------------------------------------------------------------
min  Σ_w (dev_pos[w] + dev_neg[w])

s.t.
  K1: Σ_(s,w) x[op,s,w] = 1                          ∀op
  K2: Σ_op (sure[op,w,s] × x[op,s,w]) <= bottleneck  ∀w
  K3: dev_pos[w] - dev_neg[w] = load[w] - mean        ∀w (MAD iscileri)
  x[op,s,w] ∈ {0,1},  dev_pos, dev_neg >= 0
"""

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
    engine.log("=" * 60)
    engine.log("ASAMA 4: OR-TOOLS MILP - MAD MINIMIZASYONU")
    engine.log("=" * 60)

    # 1. Istasyonlari seq sirasina al
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

    # 2. Isci hiz haritasi
    worker_speed_map = {}
    for s in sorted_stations:
        info = engine.all_assignments.get(s, {})
        w = info.get("worker", "")
        if w:
            worker_speed_map[(w, s)] = _worker_speed(engine, s)
        h = info.get("helper", None)
        if h:
            h_spd = (engine.active_workers.get(h, 1.0) if h in engine.active_workers
                     else (0.8 if h in getattr(engine, "master_db", {}) else 1.2))
            worker_speed_map[(h, s)] = h_spd

    # 3. Op listesi
    ops = []
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        # Sabit istasyonlar modele girmiyor
        if s in fixed_stations:
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
            ops.append({
                "id":        f"{s}__{op_name}",
                "s_orig":    s,
                "op_name":   op_name,
                "op_std":    op_std,
                "orig_time": orig_time,
                "orig_w":    orig_w,
            })

    # 4. Baslangic yukleri
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
            spd = (engine.active_workers.get(w,1.0) if t=="NORMAL"
                   else (0.8 if t=="MASTER" else 1.2))
            for (_, op_std) in engine.final_stations[s]["sub_ops"]:
                init_loads[w] = init_loads.get(w, 0.0) + op_std * spd

    init_vals     = list(init_loads.values())
    init_variance = _calc_variance(init_vals)
    init_max      = max(init_vals) if init_vals else 0.0

    if stage3_bottleneck is None:
        stage3_bottleneck = init_max
    if stage3_mean is None:
        stage3_mean = sum(init_vals) / len(init_vals) if init_vals else 0.0

    engine.log(f"Bottleneck: {stage3_bottleneck:.2f} sn | Mean: {stage3_mean:.2f} sn")
    engine.log(f"Baslangic Varyans: {init_variance:.4f}")
    engine.log("-" * 60)

    # 5. Arc listesi: (op_id, s_dest, w, sure)
    arcs = []
    seen = set()

    for op in ops:
        oid    = op["id"]
        s_orig = op["s_orig"]
        idx    = station_index[s_orig]
        op_std = op["op_std"]

        # Orijinal atama her zaman gecerli (K1 icin infeasibility onle)
        key = (oid, s_orig, op["orig_w"])
        if key not in seen:
            arcs.append((oid, s_orig, op["orig_w"], op["orig_time"]))
            seen.add(key)

        # Sabit istasyon veya kisa is: sadece orijinal
        if s_orig in fixed_stations or op_std <= 2.0:
            continue

        # +-2 komsu istasyonlar
        for delta in (-2, -1, 1, 2):
            nb = idx + delta
            if nb < 0 or nb >= len(sorted_stations):
                continue
            s_dest = sorted_stations[nb]
            if s_dest not in engine.all_assignments:
                continue
            # Sabit istasyonlar is alamaz
            if s_dest in fixed_stations:
                continue

            info_dest    = engine.all_assignments[s_dest]
            workers_here = []
            if info_dest.get("worker"):
                workers_here.append(info_dest["worker"])
            if info_dest.get("helper"):
                workers_here.append(info_dest["helper"])

            for w in workers_here:
                key = (oid, s_dest, w)
                if key in seen:
                    continue
                spd  = worker_speed_map.get((w, s_dest), 1.0)
                sure = op_std * spd
                arcs.append((oid, s_dest, w, sure))
                seen.add(key)

    engine.log(f"Arc sayisi: {len(arcs)}")

    # Arc haritasi: sure'ye hizli erisim
    arc_sure = {(oid, s, w): sure for (oid, s, w, sure) in arcs}

    # Op -> gecerli (s,w) ciftleri
    op_pairs = {}
    for (oid, s, w, _) in arcs:
        op_pairs.setdefault(oid, []).append((s, w))

    # Worker -> gecerli (op, s) ciftleri
    worker_arcs = {}
    for (oid, s, w, _) in arcs:
        worker_arcs.setdefault(w, []).append((oid, s))

    # MAD iscileri: sadece sabit istasyon iscileri haric
    # Helper'lar modelde kalir
    fixed_workers = set()
    for s in sorted_stations:
        if s in fixed_stations and s in engine.all_assignments:
            fixed_workers.add(engine.all_assignments[s]["worker"])
    all_workers  = list(worker_arcs.keys())
    mad_workers  = [w for w in all_workers if w not in fixed_workers]

    engine.log(f"Toplam isci: {len(all_workers)} | MAD isci: {len(mad_workers)}")

    # 6. OR-Tools SCIP
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        engine.log("HATA: SCIP bulunamadi.")
        return
    solver.EnableOutput()

    # x[op_id, s_dest, w] ∈ {0,1}
    x = {}
    for (oid, s, w, _) in arcs:
        x[(oid, s, w)] = solver.BoolVar(f"x_{oid}_{s}_{w}")

    # dev_pos[w], dev_neg[w] >= 0
    dev_pos = {w: solver.NumVar(0, solver.infinity(), f"dp_{w}") for w in mad_workers}
    dev_neg = {w: solver.NumVar(0, solver.infinity(), f"dn_{w}") for w in mad_workers}

    # K1: Her op tam olarak bir (s,w) ye atanir
    for op in ops:
        oid   = op["id"]
        pairs = op_pairs.get(oid, [])
        if not pairs:
            engine.log(f"  UYARI: {op['op_name']} icin arc yok!")
            continue
        solver.Add(solver.Sum(x[(oid, s, w)] for (s, w) in pairs) == 1)

    # K2: load[w] <= bottleneck — TUM isciler icin
    for w in all_workers:
        pairs = worker_arcs.get(w, [])
        if not pairs:
            continue
        load_expr = solver.Sum(arc_sure[(oid, s, w)] * x[(oid, s, w)]
                               for (oid, s) in pairs)
        solver.Add(load_expr <= stage3_bottleneck)

    # K3: MAD tanimi — dev_pos[w] - dev_neg[w] = load[w] - mean
    for w in mad_workers:
        pairs = worker_arcs.get(w, [])
        if not pairs:
            continue
        load_expr = solver.Sum(arc_sure[(oid, s, w)] * x[(oid, s, w)]
                               for (oid, s) in pairs)
        solver.Add(dev_pos[w] - dev_neg[w] == load_expr - stage3_mean)

    # Amac: min Σ_w (dev_pos[w] + dev_neg[w])
    solver.Minimize(solver.Sum(dev_pos[w] + dev_neg[w] for w in mad_workers))

    engine.log("SCIP cozuyor...")
    engine.log("-" * 60)
    status = solver.Solve()
    engine.log("-" * 60)

    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        engine.log(f"Cozum bulunamadi (status={status}). Stage 3 korunuyor.")
        engine.moved_ops = set()
        engine.stage4_stats = {
            "init_variance": init_variance, "final_variance": init_variance,
            "variance_reduction_pct": 0.0, "init_bottleneck": init_max,
            "final_bottleneck": init_max, "bottleneck_improvement": 0.0,
            "total_improvements": 0,
        }
        engine.print_stage_summary("STAGE 4")
        return

    engine.log(f"Cozum: {'OPTIMAL' if status==0 else 'FEASIBLE'} | "
               f"MAD={solver.Objective().Value():.4f}")

    # 7. Sonuclari uygula
    new_station_ops = {s: [] for s in sorted_stations}
    moved_ops_set   = set()
    op_assignment   = {}  # {oid -> (s_dest, w, sure)}

    for op in ops:
        oid   = op["id"]
        pairs = op_pairs.get(oid, [])
        assigned = False
        for (s_dest, w) in pairs:
            if x[(oid, s_dest, w)].solution_value() > 0.5:
                sure = arc_sure[(oid, s_dest, w)]
                op_assignment[oid] = (s_dest, w, sure)
                new_station_ops[s_dest].append((op["op_name"], op["op_std"]))
                if s_dest != op["s_orig"]:
                    moved_ops_set.add((s_dest, op["op_name"]))
                assigned = True
                break
        if not assigned:
            op_assignment[oid] = (op["s_orig"], op["orig_w"], op["orig_time"])
            new_station_ops[op["s_orig"]].append((op["op_name"], op["op_std"]))

    # ops_split guncelle — helper bilgisini koru
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        # Sabit istasyonlar: ops_split ve sub_ops degismez, oldugu gibi kalir
        if s in fixed_stations:
            continue
        info   = engine.all_assignments[s]
        main_w = info["worker"]
        spd    = _worker_speed(engine, s)
        old_split = info.get("ops_split", None)
        old_map   = {n: (who, note) for (n,_,who,note) in old_split} if old_split else {}

        new_split = []
        for op in ops:
            oid = op["id"]
            s_dest, w, sure = op_assignment.get(
                oid, (op["s_orig"], op["orig_w"], op["orig_time"]))
            if s_dest != s:
                continue
            if s_dest == op["s_orig"]:
                who  = old_map.get(op["op_name"], (w, ""))[0]
                note = old_map.get(op["op_name"], (w, ""))[1]
            else:
                who  = w
                note = "TRANSFER ST4"
            new_split.append((op["op_name"], sure, who, note))

        engine.final_stations[s]["sub_ops"] = new_station_ops[s]
        info["time"]      = sum(op_std * spd for _, op_std in new_station_ops[s])
        info["ops_split"] = new_split if new_split else []

    engine.moved_ops = moved_ops_set

    # 8. Final metrikleri
    final_loads = {}
    for op in ops:
        oid = op["id"]
        _, w, sure = op_assignment.get(
            oid, (op["s_orig"], op["orig_w"], op["orig_time"]))
        final_loads[w] = final_loads.get(w, 0.0) + sure

    final_vals     = list(final_loads.values())
    final_variance = _calc_variance(final_vals)
    final_max      = max(final_vals)
    final_bn_w     = max(final_loads, key=final_loads.get)
    reduction_pct  = ((init_variance - final_variance) / init_variance * 100
                      if init_variance > 0 else 0.0)

    engine.log(f"\nFINAL: Varyans {init_variance:.4f} -> {final_variance:.4f} (%{reduction_pct:.1f})")
    engine.log(f"       Makespan: {init_max:.2f} -> {final_max:.2f} sn ({final_bn_w})")
    engine.log(f"       Tasınan: {len(moved_ops_set)} op")
    engine.log("=" * 60)

    engine.print_stage_summary("STAGE 4")
    engine.stage4_stats = {
        "init_variance": init_variance, "final_variance": final_variance,
        "variance_reduction_pct": reduction_pct,
        "init_bottleneck": init_max, "final_bottleneck": final_max,
        "bottleneck_improvement": init_max - final_max,
        "total_improvements": len(moved_ops_set),
    }