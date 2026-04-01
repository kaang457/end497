
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
    engine.log("=" * 60)
    engine.log("ASAMA 4: PARALLEL MACHINE SCHEDULING (OR-Tools SCIP)")
    engine.log("=" * 60)

    # ── 1. Istasyonlari seq sirasina al ─────────────────────────────
    sorted_stations = sorted(
        [s for s in engine.all_assignments if s in engine.final_stations],
        key=lambda x: engine.final_stations[x]["seq"]
    )
    if len(sorted_stations) < 2:
        engine.log("ASAMA 4 IPTAL: Yeterli atanmis istasyon yok.")
        return

    station_index = {s: i for i, s in enumerate(sorted_stations)}

    # ── 2. Sabit istasyonlar (is veremez) ───────────────────────────
    fixed_stations = getattr(engine, "fixed_stations", set())
    engine.log(f"Sabit istasyonlar ({len(fixed_stations)} adet, is veremez): "
               f"{', '.join(sorted(fixed_stations)) if fixed_stations else 'Yok'}")

    # ── 3. Stage 3 darboğaz (ust sinir) ─────────────────────────────
    stage3_bottleneck = getattr(engine, "stage3_bottleneck", None)
    stage3_mean       = getattr(engine, "stage3_mean", None)

    # ── 4. Isci hiz haritasi ─────────────────────────────────────────
    # {worker -> speed}  -- sadece ana isciler
    worker_speed = {}
    for s in sorted_stations:
        info = engine.all_assignments.get(s, {})
        w    = info.get("worker", "")
        if w:
            worker_speed[w] = _worker_speed(engine, s)

    # ── 5. Op listesi ────────────────────────────────────────────────
    # Her op icin: orijinal istasyon, std sure, orijinal isci + sure
    ops      = []
    op_by_id = {}

    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        info      = engine.all_assignments[s]
        ops_split = info.get("ops_split", None)
        main_w    = info["worker"]
        spd_main  = worker_speed.get(main_w, 1.0)

        for (op_name, op_std) in engine.final_stations[s]["sub_ops"]:
            # Orijinal sure (ops_split'ten gercek, yoksa hesapla)
            if ops_split:
                orig_time = next(
                    (t for (n, t, _, _) in ops_split if n == op_name),
                    op_std * spd_main
                )
            else:
                orig_time = op_std * spd_main

            entry = {
                "id"       : f"{s}__{op_name}",
                "s_orig"   : s,
                "op_name"  : op_name,
                "op_std"   : op_std,
                "orig_w"   : main_w,
                "orig_time": orig_time,
            }
            ops.append(entry)
            op_by_id[entry["id"]] = entry

    # ── 6. Her op icin gecerli (isci, sure) ciftleri ────────────────
    # op -> [(worker, sure), ...]
    op_candidates = {}   # {op_id -> [(w, sure)]}

    for op in ops:
        oid    = op["id"]
        s_orig = op["s_orig"]
        idx    = station_index[s_orig]
        op_std = op["op_std"]
        cands  = []

        # Sabit istasyon veya cok kisa is: sadece kendi istasyonu
        if s_orig in fixed_stations or op_std <= 2.0:
            dest_stations = [s_orig]
        else:
            dest_stations = [s_orig]
            for delta in (-2, -1, 1, 2):
                nb = idx + delta
                if 0 <= nb < len(sorted_stations):
                    nb_s = sorted_stations[nb]
                    if nb_s in engine.all_assignments:
                        dest_stations.append(nb_s)

        for s_dest in dest_stations:
            w_dest = engine.all_assignments[s_dest]["worker"]
            spd    = worker_speed.get(w_dest, 1.0)
            # Orijinal istasyonunda orijinal iscisiyse gercek sure kullan
            if s_dest == s_orig and w_dest == op["orig_w"]:
                sure = op["orig_time"]
            else:
                sure = op_std * spd
            cands.append((w_dest, sure))

        # Tekrar eden iscileri temizle (bir isci birden fazla komsu istasyona sahip olabilir)
        seen = {}
        for (w, t) in cands:
            if w not in seen:
                seen[w] = t
        op_candidates[oid] = list(seen.items())  # [(w, sure)]

    # ── 7. Baslangic yukleri ─────────────────────────────────────────
    init_loads = {}
    for op in ops:
        w = op["orig_w"]
        init_loads[w] = init_loads.get(w, 0.0) + op["orig_time"]

    if stage3_bottleneck is None or stage3_mean is None:
        vals = list(init_loads.values())
        stage3_bottleneck = max(vals) if vals else 0.0
        stage3_mean       = sum(vals) / len(vals) if vals else 0.0

    engine.log(f"Stage 3 Darbogaz (Ust Sinir) : {stage3_bottleneck:.4f} sn")
    engine.log(f"Stage 3 Ortalama             : {stage3_mean:.4f} sn")
    init_vals     = list(init_loads.values())
    init_variance = _calc_variance(init_vals)
    engine.log(f"Baslangic: Makespan={max(init_vals):.2f} sn | "
               f"Varyans={init_variance:.4f} | Op sayisi={len(ops)}")
    engine.log("-" * 60)

    # ── 8. MILP Modeli ───────────────────────────────────────────────
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        engine.log("HATA: OR-Tools SCIP bulunamadi.")
        return
    solver.SetTimeLimit(120_000)  # 2 dakika

    all_workers = list(init_loads.keys())

    # x[op_id, w] = 1 eger op, w tarafindan yapilirsa
    x = {}
    for op in ops:
        oid = op["id"]
        for (w, sure) in op_candidates[oid]:
            x[(oid, w)] = solver.BoolVar(f"x__{oid}__{w}")

    # Makespan degiskeni
    makespan = solver.NumVar(0, stage3_bottleneck, "makespan")

    # Kisit 1: Her op tam olarak bir isciye atanir
    for op in ops:
        oid   = op["id"]
        cands = op_candidates[oid]
        if not cands:
            engine.log(f"  UYARI: {op['op_name']} icin aday isci yok!")
            continue
        solver.Add(solver.Sum(x[(oid, w)] for (w, _) in cands) == 1)

    # Kisit 2: Her iscinin toplam yuku hesapla
    # load[w] = sum_{op: w aday} sure * x[op, w]
    worker_load_expr = {}
    for w in all_workers:
        terms = []
        for op in ops:
            oid = op["id"]
            for (ww, sure) in op_candidates[oid]:
                if ww == w:
                    terms.append(sure * x[(oid, w)])
        if terms:
            worker_load_expr[w] = solver.Sum(terms)
        else:
            worker_load_expr[w] = solver.Sum([])

    # Kisit 3: load[w] <= makespan (makespan = max yuk)
    for w in all_workers:
        if worker_load_expr[w]:
            solver.Add(worker_load_expr[w] <= makespan)

    # Kisit 4: load[w] <= stage3_bottleneck (ust sinir)
    for w in all_workers:
        if worker_load_expr[w]:
            solver.Add(worker_load_expr[w] <= stage3_bottleneck)

    # Kisit 5: Her isci kendi istasyonundan en az 1 is yapar
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        main_w       = engine.all_assignments[s]["worker"]
        orig_op_ids  = [op["id"] for op in ops if op["s_orig"] == s]
        stay_terms   = [x[(oid, main_w)]
                        for oid in orig_op_ids
                        if (oid, main_w) in x]
        if stay_terms:
            solver.Add(solver.Sum(stay_terms) >= 1)

    # Amac: Makespan'i minimize et
    solver.Minimize(makespan)

    # ── 9. Coz ──────────────────────────────────────────────────────
    engine.log("OR-Tools SCIP cozuyor...")
    engine.log("-" * 60)
    solver.EnableOutput()
    status = solver.Solve()
    engine.log("-" * 60)

    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        engine.log(f"ASAMA 4: Cozum bulunamadi (status={status}). Orijinal atama korunuyor.")
        engine.print_stage_summary("STAGE 4")
        return

    engine.log(f"Cozum: {'OPTIMAL' if status == pywraplp.Solver.OPTIMAL else 'FEASIBLE'} | "
               f"Makespan={makespan.solution_value():.4f} sn")

    # ── 10. Sonuclari engine'e uygula ───────────────────────────────
    # Her op hangi isciye atandi -> o iscinin istasyonu ne?
    # Isi o istasyonun sub_ops listesine ekle
    worker_to_station = {
        engine.all_assignments[s]["worker"]: s
        for s in sorted_stations
        if s in engine.all_assignments
    }

    new_station_ops = {s: [] for s in sorted_stations}
    moved_ops_set   = set()

    for op in ops:
        oid    = op["id"]
        s_orig = op["s_orig"]
        assigned_w = None
        for (w, sure) in op_candidates[oid]:
            if (oid, w) in x and x[(oid, w)].solution_value() > 0.5:
                assigned_w = w
                break

        if assigned_w is None:
            # Fallback: orijinal istasyona birak
            new_station_ops[s_orig].append((op["op_name"], op["op_std"]))
            continue

        # Iscinin istasyonuna ekle
        s_dest = worker_to_station.get(assigned_w, s_orig)
        new_station_ops[s_dest].append((op["op_name"], op["op_std"]))
        if s_dest != s_orig:
            moved_ops_set.add((s_dest, op["op_name"]))

    # Engine'e yaz
    for s in sorted_stations:
        if s not in engine.all_assignments:
            continue
        engine.final_stations[s]["sub_ops"] = new_station_ops[s]
        spd      = _worker_speed(engine, s)
        new_time = sum(op_std * spd for _, op_std in new_station_ops[s])
        engine.all_assignments[s]["time"] = new_time

    engine.moved_ops = moved_ops_set

    # ── 11. Final metrikleri ─────────────────────────────────────────
    final_loads = {}
    for op in ops:
        oid = op["id"]
        for (w, sure) in op_candidates[oid]:
            if (oid, w) in x and x[(oid, w)].solution_value() > 0.5:
                final_loads[w] = final_loads.get(w, 0.0) + sure
                break

    final_vals     = list(final_loads.values())
    final_variance = _calc_variance(final_vals)
    final_mean     = sum(final_vals) / len(final_vals) if final_vals else 0
    final_max      = max(final_vals) if final_vals else 0
    final_bn_w     = max(final_loads, key=final_loads.get) if final_loads else "-"
    reduction_pct  = ((init_variance - final_variance) / init_variance * 100
                      if init_variance > 0 else 0.0)
    bn_improvement = max(init_vals) - final_max

    engine.log(f"\nFINAL DURUMU:")
    engine.log(f"  Makespan   : {final_max:.2f} sn  -> {final_bn_w}  "
               f"(Iyilesme: {bn_improvement:.2f} sn)")
    engine.log(f"  Varyans    : {final_variance:.4f}  (Azalma: %{reduction_pct:.1f})")
    engine.log(f"  Std Sapma  : {math.sqrt(final_variance):.4f} sn")
    engine.log(f"  Ortalama   : {final_mean:.2f} sn")
    engine.log(f"  Tasınan Op : {len(moved_ops_set)} adet")
    engine.log("=" * 60)

    engine.print_stage_summary("STAGE 4")

    engine.stage4_stats = {
        "init_variance"          : init_variance,
        "final_variance"         : final_variance,
        "variance_reduction_pct" : reduction_pct,
        "init_bottleneck"        : max(init_vals),
        "final_bottleneck"       : final_max,
        "bottleneck_improvement" : bn_improvement,
        "total_improvements"     : len(moved_ops_set),
    }