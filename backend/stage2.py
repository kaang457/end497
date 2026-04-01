# -*- coding: utf-8 -*-
"""
Created on Fri Feb 20 18:57:57 2026
@author: ozgur
"""

import pyomo.environ as pyo

def run(engine, pool):
    if not engine.empty_stations: 
        return pool, list(engine.master_db.keys())

    engine.log("AŞAMA 2: Eksikleri Havuz, Usta ve STRATEJİK MERGE (Stage 1 Mirası) ile Tamamlama...")
    solver_cplex = pyo.SolverFactory('cplex') 
    
    m2 = pyo.ConcreteModel()
    m2.S_EMPTY = pyo.Set(initialize=engine.empty_stations)
    p_dict_2 = {s: engine.final_stations[s]["penalty"] for s in engine.empty_stations}
    m2.P_cost = pyo.Param(m2.S_EMPTY, initialize=p_dict_2, default=1000000)
    
    # --- HAVUZ ARKLARI ---
    pool_arcs = []
    for s in engine.empty_stations:
        for h in pool: pool_arcs.append((s, h))
    
    # --- USTA ARKLARI (YETENEK KONTROLLÜ) ---
    master_arcs = []
    for s in engine.empty_stations:
        station_ops = [op[0] for op in engine.final_stations[s]["sub_ops"]]
        for mst, skills in engine.master_db.items():
            can_do = any(op_n in skills for op_n in station_ops)
            if can_do: master_arcs.append((s, mst))

    # --- GÜNCELLENEN KISIM: STRATEJİK MERGE ARKLARI ---
    # Artık offset ile hesaplamıyoruz, Stage 1'deki neighbor_map'e bakıyoruz.
    merge_arcs = []
    neighbor_map = getattr(engine, 'neighbor_map', {}) # Stage 1'den gelen harita

    for s in engine.empty_stations:
        # Sadece Stage 1'de "komşu" olarak tanımladığımız istasyonları alıyoruz
        valid_neighbors = neighbor_map.get(s, [])
        for n_st in valid_neighbors:
            merge_arcs.append((s, n_st))
    # ------------------------------------------------

    m2.ARCS_POOL = pyo.Set(initialize=pool_arcs, dimen=2)
    m2.ARCS_MAST = pyo.Set(initialize=master_arcs, dimen=2)
    m2.ARCS_MERGE = pyo.Set(initialize=merge_arcs, dimen=2) 
    
    m2.y_pool = pyo.Var(m2.ARCS_POOL, domain=pyo.Binary)
    m2.y_mast = pyo.Var(m2.ARCS_MAST, domain=pyo.Binary)
    m2.y_merge = pyo.Var(m2.ARCS_MERGE, domain=pyo.Binary)
    m2.y_miss = pyo.Var(m2.S_EMPTY, domain=pyo.Binary) 

    def obj_rule_2(model_obj):
        c_pool  = sum(1 * model_obj.y_pool[s, h] for (s, h) in model_obj.ARCS_POOL)
        c_mast  = sum(5000 * model_obj.y_mast[s, mst] for (s, mst) in model_obj.ARCS_MAST)
        c_merge = sum(10000 * model_obj.y_merge[s, n] for (s, n) in model_obj.ARCS_MERGE) 
        c_miss  = sum(model_obj.P_cost[s] * model_obj.y_miss[s] for s in model_obj.S_EMPTY)
        return c_pool + c_mast + c_merge + c_miss
    
    m2.obj = pyo.Objective(rule=obj_rule_2, sense=pyo.minimize)
    m2.cons = pyo.ConstraintList()

    # Kısıt 1: Her boş istasyon mutlaka bir şekilde kapatılmalı (veya missing olmalı)
    s_to_p = {}; s_to_m = {}; s_to_n = {}; n_to_s = {}
    for (s, h) in pool_arcs: s_to_p.setdefault(s, []).append(h)
    for (s, m) in master_arcs: s_to_m.setdefault(s, []).append(m)
    for (s, n) in merge_arcs: 
        s_to_n.setdefault(s, []).append(n)
        n_to_s.setdefault(n, []).append(s)
    
    for s in m2.S_EMPTY:
        term_p = sum(m2.y_pool[s, h] for h in s_to_p.get(s, []))
        term_m = sum(m2.y_mast[s, mst] for mst in s_to_m.get(s, []))
        term_n = sum(m2.y_merge[s, n] for n in s_to_n.get(s, []))
        m2.cons.add(term_p + term_m + term_n + m2.y_miss[s] == 1)

    # Kısıt 2: Bir işçi veya bir komşu sadece bir birleşmeye/atamaya yanıt verebilir
    h_to_s = {}
    for (s, h) in pool_arcs: h_to_s.setdefault(h, []).append(s)
    for h in h_to_s: m2.cons.add(sum(m2.y_pool[s, h] for s in h_to_s[h]) <= 1)
    
    m_to_s = {}
    for (s, m) in master_arcs: m_to_s.setdefault(m, []).append(s)
    for m in m_to_s: m2.cons.add(sum(m2.y_mast[s, m] for s in m_to_s[m]) <= 1)

    for n in n_to_s:
        m2.cons.add(sum(m2.y_merge[s, n] for s in n_to_s[n]) <= 1)
    
    try: 
        results_2 = solver_cplex.solve(m2, tee=False)
        engine.total_iterations += engine.get_iterations(results_2)
        engine.total_subproblems_solved += 1
    except: pass

    # --- SONUÇLARI İŞLEME ---
    stations_to_delete = []
    for s in engine.empty_stations:
        assigned = False
        # 1. Pool kontrolü
        if s in s_to_p:
            for h in s_to_p[s]:
                if pyo.value(m2.y_pool[s, h]) > 0.5:
                    std_total = sum(t for n, t in engine.final_stations[s]["sub_ops"])
                    engine.all_assignments[s] = {"worker": h, "time": std_total * 1.2, "type": "POOL"}
                    assigned = True; break
        
        # 2. Master kontrolü
        if not assigned and s in s_to_m:
            for mst in s_to_m[s]:
                if pyo.value(m2.y_mast[s, mst]) > 0.5:
                    std_total = sum(t for n, t in engine.final_stations[s]["sub_ops"])
                    engine.all_assignments[s] = {"worker": mst, "time": std_total * 0.8, "type": "MASTER"}
                    assigned = True; break

        # 3. Merge kontrolü (Stage 1'den gelen komşularla)
        if not assigned and s in s_to_n:
            for n_st in s_to_n[s]:
                if pyo.value(m2.y_merge[s, n_st]) > 0.5:
                    engine.log(f"   >>> STRATEJİK MERGE: {s} boş kaldı! Stage 1 komşusu {n_st}'e aktarıldı.")
                    engine.final_stations[n_st]["sub_ops"].extend(engine.final_stations[s]["sub_ops"])

                    if n_st in engine.all_assignments:
                        spd = 0.8 if engine.all_assignments[n_st]["type"] == "MASTER" else 1.2
                        added_time = sum(t for n, t in engine.final_stations[s]["sub_ops"]) * spd
                        engine.all_assignments[n_st]["time"] += added_time
                    
                    stations_to_delete.append(s)
                    assigned = True; break
        
        # 4. Hiçbiri olmadıysa: Missing (Hata Logu)
        if not assigned and pyo.value(m2.y_miss[s]) > 0.5:
            engine.log(f"   !!! DİKKAT: {s} İSTASYONU KURTARILAMADI! (Ne işçi bulundu ne de Stage 1 komşusu uygun.)")

    for s in stations_to_delete:
        if s in engine.final_stations: del engine.final_stations[s]

    busy_workers = set(info["worker"] for info in engine.all_assignments.values())
    remaining_pool = [h for h in pool if h not in busy_workers]
    remaining_masters = [m for m in engine.master_db.keys() if m not in busy_workers]

    return remaining_pool, remaining_masters