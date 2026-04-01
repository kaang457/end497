import pyomo.environ as pyo
from pyomo.opt import TerminationCondition

def solve_single_station_balance(engine, ops_list, speed_main, speed_helper, main_worker_name, helper_name):
    if not ops_list: return None, None

    m = pyo.ConcreteModel()
    num_ops = len(ops_list)
    m.I = pyo.RangeSet(0, num_ops - 1)
    m.W = pyo.Set(initialize=[0, 1])  # 0: Ana İşçi, 1: Yardımcı
    
    real_times = {}
    for i in m.I:
        std_time = ops_list[i][1]
        # Stage 1'deki gibi: Standart Süre * İşçi Hız Katsayısı
        real_times[(i, 0)] = std_time * speed_main
        real_times[(i, 1)] = std_time * speed_helper

    m.x = pyo.Var(m.I, m.W, domain=pyo.Binary)
    m.Z = pyo.Var(domain=pyo.NonNegativeReals)
    
    m.cons_assign = pyo.ConstraintList()
    for i in m.I: 
        m.cons_assign.add(sum(m.x[i, w] for w in m.W) == 1)
        
    m.cons_time = pyo.ConstraintList()
    for w in m.W:
        work_load = sum(real_times[(i, w)] * m.x[i, w] for i in m.I) 
        m.cons_time.add(work_load <= m.Z)
        
    m.obj = pyo.Objective(expr=m.Z, sense=pyo.minimize)
    solver = pyo.SolverFactory('cplex') 
    
    try:
        results = solver.solve(m, tee=False)
        engine.total_iterations += engine.get_iterations(results)
        engine.total_subproblems_solved += 1
        
        if (results.solver.status == pyo.SolverStatus.ok) and (results.solver.termination_condition == TerminationCondition.optimal):
            found_z = pyo.value(m.Z)
            if found_z > 500000: return None, None

            helper_tasks_count = sum(pyo.value(m.x[i, 1]) for i in m.I)
            if helper_tasks_count < 0.5:
                return None, None

            main_tasks = []
            helper_tasks = []
            
            for i in m.I:
                op_name = ops_list[i][0]
                if pyo.value(m.x[i, 0]) > 0.5:
                    main_tasks.append((op_name, real_times[(i, 0)], main_worker_name, ""))
                else:
                    helper_tasks.append((op_name, real_times[(i, 1)], helper_name, "YARDIMCI DESTEĞİ"))
            
            assignment_detail = main_tasks + helper_tasks
            return found_z, assignment_detail
        return None, None
    except Exception: 
        return None, None

def run(engine, remaining_pool, remaining_masters):
    engine.log("\n" + "="*60)
    engine.log("AŞAMA 3: MATEMATİKSEL SEÇİM (GERÇEK YETENEK KATSAYILI) BAŞLIYOR")
    
    # 1. GÜVENLİK DUVARI: Mükerrer atamaları önle
    zaten_atananlar = set()
    for info in engine.all_assignments.values():
        zaten_atananlar.add(info["worker"])
        if "helper" in info and info["helper"]:
            zaten_atananlar.add(info["helper"])
            
    guvenli_pool = [w for w in remaining_pool if w not in zaten_atananlar]
    guvenli_masters = [m for m in remaining_masters if m not in zaten_atananlar and m not in guvenli_pool]
    
    helpers_list = guvenli_pool + guvenli_masters
    N = len(helpers_list)

    if N == 0:
        engine.log("AŞAMA 3 İPTAL: Yardım edecek kimse kalmadı.")
        return

    stations_to_optimize = [(s, info["time"]) for s, info in engine.all_assignments.items()]
    stations_to_optimize.sort(key=lambda x: x[1], reverse=True)
    target_stations = [s for s, t in stations_to_optimize[:N]]
    
    # 2. MAKRO SEÇİM MODELİ İÇİN MALİYET MATRİSİ
    cost_matrix = {}
    for h in helpers_list:
        for s in target_stations:
            # Stage 1'deki "adaylar" listesine göre hiyerarşi kuruyoruz
            if h in guvenli_pool and h in engine.final_stations[s]["adaylar"]:
                cost_matrix[(h, s)] = 10  # Öncelik 1: Yetenekli
            elif h in guvenli_masters:
                cost_matrix[(h, s)] = 50  # Öncelik 2: Master
            else:
                cost_matrix[(h, s)] = 100 # Öncelik 3: Yeteneksiz

    m_assign = pyo.ConcreteModel()
    m_assign.H = pyo.Set(initialize=helpers_list)
    m_assign.S = pyo.Set(initialize=target_stations)
    m_assign.y = pyo.Var(m_assign.H, m_assign.S, domain=pyo.Binary)

    m_assign.cons = pyo.ConstraintList()
    for h in m_assign.H:
        m_assign.cons.add(sum(m_assign.y[h, s] for s in m_assign.S) == 1)
    for s in m_assign.S:
        m_assign.cons.add(sum(m_assign.y[h, s] for h in m_assign.H) <= 1)

    m_assign.obj = pyo.Objective(
        expr=sum(cost_matrix[(h, s)] * m_assign.y[h, s] for h in m_assign.H for s in m_assign.S), 
        sense=pyo.minimize
    )

    solver = pyo.SolverFactory('cplex')
    solver.solve(m_assign, tee=False)

    # 3. ATAMALARI UYGULAMA (HIZ KATSAYILARINI STAGE 1 GİBİ ÇEKEREK)
    atama_sirasi = 1
    for s in target_stations:
        selected_helper = None
        for h in helpers_list:
            if pyo.value(m_assign.y[h, s]) > 0.5:
                selected_helper = h
                break
                
        if not selected_helper: continue

        # --- YETENEK MATRİSİNDEN HIZ ÇEKME (STAGE 1 MANTIĞI) ---
        cost_val = cost_matrix[(selected_helper, s)]
        
        if cost_val == 10:
            # Stage 1'deki gibi engine.active_workers[w] kullanıyoruz
            speed_help = engine.active_workers.get(selected_helper, 1.0)
            status_msg = f"YETENEKLİ (Hız: {speed_help})"
        elif cost_val == 50:
            speed_help = 0.8  # Ustalar standart usta hızıyla çalışır
            status_msg = "MASTER WORKER ATANIYOR"
        else:
            speed_help = 1.2  # Yeteneksizler için ceza katsayısı
            status_msg = "YETENEKSİZ (RASTGELE)"

        main_w = engine.all_assignments[s]["worker"]
        type_w = engine.all_assignments[s]["type"]
        ops = engine.final_stations[s]["sub_ops"]
        
        # Ana işçinin hızı da yine Stage 1'deki gibi çekiliyor
        speed_main = 1.0
        if type_w == "NORMAL": speed_main = engine.active_workers.get(main_w, 1.0)
        elif type_w == "POOL": speed_main = 1.2
        elif type_w == "MASTER": speed_main = 0.8

        new_cycle_time, ops_assignment_detail = solve_single_station_balance(
            engine, ops, speed_main, speed_help, main_w, selected_helper
        )
        
        # Sonuçları Kaydet ve Bas
        if new_cycle_time is not None and new_cycle_time < engine.all_assignments[s]["time"] - 0.01:
            old_t = engine.all_assignments[s]["time"]
            engine.all_assignments[s]["time"] = new_cycle_time
            engine.all_assignments[s]["helper"] = selected_helper
            engine.all_assignments[s]["ops_split"] = ops_assignment_detail 
            engine.log(f"{atama_sirasi}. [BAŞARILI] {selected_helper:<12} -> {s:<8} | {status_msg:<30} | {old_t:.2f} -> {new_cycle_time:.2f} sn")
        else:
            engine.all_assignments[s]["helper"] = selected_helper
            engine.all_assignments[s]["ops_split"] = [(op_n, op_t * speed_main, main_w, "") for op_n, op_t in ops]
            engine.log(f"{atama_sirasi}. [MECBURİ]  {selected_helper:<12} -> {s:<8} | {status_msg:<30} | (Değişim Yok)")
        
        atama_sirasi += 1

    engine.log(f"\n[BİLGİ] STAGE 3 TAMAMLANDI.")