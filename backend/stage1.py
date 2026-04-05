# -*- coding: utf-8 -*-
"""
Created on Fri Feb 20 18:57:12 2026

@author: ozgur
"""

import pyomo.environ as pyo

def run(engine):
    engine.log("AŞAMA 1: Global Atama (Yetenekli Komşu Stratejisi & Miras Yönetimi)...")
    solver_cplex = pyo.SolverFactory('cplex') 
    
    m1 = pyo.ConcreteModel()
    m1.S = pyo.Set(initialize=engine.final_stations.keys())
    # Penalty Excel'den geliyor (orijinal değerler)
    p_dict = {s: engine.final_stations[s]["penalty"] for s in engine.final_stations}
    m1.P_cost = pyo.Param(m1.S, initialize=p_dict, default=1_000_000.0)
    m1.missing = pyo.Var(m1.S, domain=pyo.Binary)
    m1.w_active = pyo.Var(engine.active_workers.keys(), domain=pyo.Binary) 
    
    m1.has_skilled_neighbor = pyo.Var(m1.S, domain=pyo.Binary)
    
    valid_arcs = []
    time_map = {} 
    for s in engine.final_stations:
        if engine.final_stations[s]["aktif"]:
            ops_list = engine.final_stations[s]["sub_ops"]
            for w in engine.final_stations[s]["adaylar"]:
                valid_arcs.append((w, s))
                w_speed = engine.active_workers[w]
                time_map[(w, s)] = sum(op_std * w_speed for op_name, op_std in ops_list)

    m1.ARCS = pyo.Set(initialize=valid_arcs, dimen=2)
    m1.x = pyo.Var(m1.ARCS, domain=pyo.Binary)

    # İstasyonları fiziksel sıralarına (seq) göre diziyoruz
    active_sorted = sorted([s for s in engine.final_stations if engine.final_stations[s]["aktif"]], 
                           key=lambda x: engine.final_stations[x]["seq"])
    
    # KOMŞULUK HARİTASI (Neighbor Map) OLUŞTURMA
    N_s = {}
    for i, s in enumerate(active_sorted):
        neighbors = []
        for j in [i-2, i-1, i+1, i+2]:  # +/- 2 kuralı
            if 0 <= j < len(active_sorted):
                neighbors.append(active_sorted[j])
        N_s[s] = neighbors

    # KRİTİK: Stage 2'nin kullanımı için komşuluk haritasını engine'e kaydediyoruz
    engine.neighbor_map = N_s

    def obj_rule_1(m):
        # Katsayı: her atama maliyeti penalty ile aynı ölçekte olmalı.
        # term_reward kaldırıldı — büyük katsayı (5000) modeli bozuyordu.
        # term_neighbor_reward katsayısı 10 olarak ayarlandı.
        term_time = sum(time_map[w,s] * m.x[w,s] for (w,s) in m.ARCS)
        term_penalty = sum(m.P_cost[s] * m.missing[s] for s in m.S)
        term_neighbor_reward = sum(10 * m.has_skilled_neighbor[s] for s in m.S)
        return term_time + term_penalty - term_neighbor_reward
    
    m1.obj = pyo.Objective(rule=obj_rule_1, sense=pyo.minimize)
    m1.cons = pyo.ConstraintList()
    
    s_to_w = {}
    for (w, s) in valid_arcs: s_to_w.setdefault(s, []).append(w)
    
    for s in m1.S:
        if engine.final_stations[s]["aktif"]:
            cands = s_to_w.get(s, [])
            if cands: m1.cons.add(sum(m1.x[w, s] for w in cands) + m1.missing[s] == 1)
            else: m1.cons.add(m1.missing[s] == 1)
            
            cands_for_s = engine.final_stations[s]["adaylar"]
            neighbor_stations = N_s.get(s, [])
            
            skilled_neighbor_sum = sum(
                m1.x[w_n, s_n] 
                for s_n in neighbor_stations 
                for w_n in cands_for_s 
                if (w_n, s_n) in valid_arcs
            )
            
            m1.cons.add(m1.has_skilled_neighbor[s] <= skilled_neighbor_sum)
            m1.cons.add(m1.has_skilled_neighbor[s] <= 1 - m1.missing[s])
            
        else: 
            m1.cons.add(m1.missing[s] == 0)
            m1.cons.add(m1.has_skilled_neighbor[s] == 0)

    w_to_s_list = {}
    for (w, s) in valid_arcs: w_to_s_list.setdefault(w, []).append(s)

    for w, stations in w_to_s_list.items():
        assigned_count = sum(m1.x[w, s] for s in stations)
        m1.cons.add(assigned_count <= 1)  
        m1.cons.add(m1.w_active[w] <= assigned_count)

    try: 
        results_1 = solver_cplex.solve(m1, tee=False)
        engine.total_iterations += engine.get_iterations(results_1)
        engine.total_subproblems_solved += 1
    except Exception as e:
        engine.log(f"Stage 1 Hata: {e}")
        return []

    assigned_workers_set = set()
    engine.empty_stations = []

    for s in engine.final_stations:
        if not engine.final_stations[s]["aktif"]: continue
        if pyo.value(m1.missing[s]) > 0.5: engine.empty_stations.append(s)
        else:
            for w in s_to_w.get(s, []):
                if pyo.value(m1.x[w, s]) > 0.5:
                    engine.all_assignments[s] = {"worker": w, "time": time_map[(w, s)], "type": "NORMAL"}
                    assigned_workers_set.add(w)
                    break
    
    # Başarılı komşulukları listeleme
    successful_neighbors = []
    for s in engine.final_stations:
        if engine.final_stations[s]["aktif"]:
            if pyo.value(m1.has_skilled_neighbor[s]) > 0.5:
                successful_neighbors.append(s)
                
    engine.log(f"Stage 1 Sonucu: Komşusunda yetenekli işçi bulunan istasyonlar ({len(successful_neighbors)} Adet):")
    engine.log(", ".join(successful_neighbors))
    engine.log("-" * 50)
    
    # Atanamayan (boşta kalan) işçileri yazdırma
    unassigned_workers = [w for w in engine.active_workers if w not in assigned_workers_set]
    
    engine.log(f"Stage 1 Sonucu: Boşta Kalan (Atanamayan) İşçiler ({len(unassigned_workers)} Kişi):")
    if unassigned_workers:
        engine.log(", ".join(unassigned_workers))
    else:
        engine.log("Herkes bir istasyona başarıyla atandı. Boşta işçi kalmadı.")
    engine.log("-" * 50)
    engine.log(f"Stage 1: {len(engine.empty_stations)} bos istasyon, {len(unassigned_workers)} bosta isci")

    # --- STAGE 1 SONU MAD VE DARBOĞAZ HESABI ---
    assigned_times = [info["time"] for info in engine.all_assignments.values()]
    if assigned_times:
        mean_load = sum(assigned_times) / len(assigned_times)
        total_mad = sum(abs(t - mean_load) for t in assigned_times)
        bottleneck = max(assigned_times)
        
        engine.log("-" * 60)
        engine.log("STAGE 1 SONU METRİKLERİ (Sadece Atananlar İçin):")
        engine.log(f"  => Darboğaz (Max Süre): {bottleneck:.2f} sn")
        engine.log(f"  => Ortalama Yük (Mean): {mean_load:.2f} sn")
        engine.log(f"  => TOPLAM SAPMA (Total MAD): {total_mad:.4f} sn")
        engine.log("-" * 60)
    # ---------------------------------------------------------------

    engine.print_stage_summary("STAGE 1")

    return unassigned_workers