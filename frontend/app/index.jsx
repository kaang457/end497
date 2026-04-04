import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  TextInput, 
  PanResponder, 
  Animated, 
  Platform,
  ScrollView
} from "react-native";
import StationDetailModal from "./modal";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    sku: "78446", 
    vardiya: "8", 
    demand: "400" 
  });
  const [planData, setPlanData] = useState(null);

  const [allWorkers, setAllWorkers] = useState([]);          
  const [absentWorkers, setAbsentWorkers] = useState([]);    
  const [showWorkerPanel, setShowWorkerPanel] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");

  const [showSkuPicker, setShowSkuPicker] = useState(false);
  const mevcutSKUlar = ["78446", "10234", "55690", "88001"]; 

  useEffect(() => {
    fetch("http://localhost:8000/api/personel-listesi")
      .then(r => r.json())
      .then(d => { if (d.status === "success") setAllWorkers(d.workers); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #1e2736; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; border: 1px solid #0d1117; }
        ::-webkit-scrollbar-thumb:hover { background: #60a5fa; }
        * { scrollbar-width: thin; scrollbar-color: #3b82f6 #1e2736; }
      `;
      const applyClasses = () => {
        const scrollViews = document.querySelectorAll('[style*="overflow"]');
        scrollViews.forEach(el => {
          el.style.overflowY = 'auto';
          el.style.scrollbarWidth = 'thin';
          el.style.scrollbarColor = '#30363d #0d1117';
        });
      };
      setTimeout(applyClasses, 500);
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, []);

  const toggleAbsent = (worker) => {
    setAbsentWorkers(prev =>
      prev.includes(worker) ? prev.filter(w => w !== worker) : [...prev, worker]
    );
  };

  const [activeMenu, setActiveMenu] = useState("atama"); 
  const [expandedMenu, setExpandedMenu] = useState("atama");
  const [activeStage, setActiveStage] = useState("clean");
  
  const [activeTabloView, setActiveTabloView] = useState("kisi");
  const [activeGrafikView, setActiveGrafikView] = useState("kisi");
  
  const [selectedGraphStage, setSelectedGraphStage] = useState("final"); 
  const [workerChartFilter, setWorkerChartFilter] = useState("");
  const [stationChartFilter, setStationChartFilter] = useState("");
  
  const [allRows, setAllRows] = useState([]);
  const [topLine, setTopLine] = useState([]);
  const [sideLine, setSideLine] = useState([]);
  const [bottomLine, setBottomLine] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  
  const START_SCALE = 0.45;  
  const ZOOM_THRESHOLD = 0.55; 
  
  const [scale, setScale] = useState(START_SCALE);
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const mapContainerRef = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => { setIsDragging(false); pan.flattenOffset(); },
      onPanResponderTerminate: () => { setIsDragging(false); pan.flattenOffset(); }
    })
  ).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleGlobalWheel = (e) => {
        if (e.ctrlKey) {
          e.preventDefault(); 
          const mapEl = mapContainerRef.current;
          if (mapEl) {
            const rect = mapEl.getBoundingClientRect();
            const isInside = (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom);
            if (isInside) {
              const direction = e.deltaY > 0 ? -1 : 1;
              setScale(prev => Math.min(Math.max(0.15, prev + (direction * 0.05)), 4.0));
            }
          }
        }
      };
      window.addEventListener('wheel', handleGlobalWheel, { passive: false });
      return () => window.removeEventListener('wheel', handleGlobalWheel);
    }
  }, []);

  const resetMap = () => {
    setScale(START_SCALE);
    pan.setValue({x:0, y:0});
    pan.flattenOffset();
  };

  const hesapla = async () => {
    setLoading(true);
    setShowSkuPicker(false);
    try {
      const response = await fetch("http://localhost:8000/api/plani-hesapla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, absent_workers: absentWorkers })
      });
      const resData = await response.json();

      if (resData.status === "success") {
        setPlanData(resData.stages);
        changeStage("clean", resData.stages); 
        resetMap(); 
        setActiveMenu("atama");
        setExpandedMenu("atama");
        setSelectedGraphStage("final"); 
      } else {
        Alert.alert("Backend Hatası", resData.message);
      }
    } catch (err) {
      Alert.alert("Sistem Hatası", "Backende bağlanılamadı. API'nin çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  };

  const arrangeInFullU = (stageData) => {
    if (!stageData) return;
    const seen = new Set();
    const unique = [];
    for (const row of stageData) {
      if (!seen.has(row.id) && row.id) { seen.add(row.id); unique.push(row); }
    }
    const sideCount = Math.max(3, Math.floor(unique.length * 0.15));
    const remaining = unique.length - sideCount;
    const topCount = Math.ceil(remaining / 2);
    setTopLine(unique.slice(0, topCount));
    setSideLine(unique.slice(topCount, topCount + sideCount));
    setBottomLine(unique.slice(topCount + sideCount).reverse());
  };

  const changeStage = (stageKey, sourceData = planData) => {
    if (!sourceData) return;
    setActiveStage(stageKey);
    const dataKey = stageKey === "clean" ? "stage4" : stageKey;
    const targetData = sourceData[dataKey] || [];
    setAllRows(targetData);
    arrangeInFullU(targetData);
    setSelectedStation(null);
  };

  const calculateStats = () => {
    if (!allRows || allRows.length === 0) return { active: 0, passive: 0, cycle: "0.00", cycleWorker: "-", formattedTime: "00:00:00" };
    
    const uniqueStations = new Set();
    const activeSet = new Set();
    const workerLoads = {};
    
    allRows.forEach(r => {
      if (r.id) {
        const rawStId = r.id.split("(")[0].trim();
        uniqueStations.add(rawStId);
        
        const isActive = r.durum !== "BOŞ / KAPALI" && r.durum !== "DEVRE DIŞI" && r.durum !== "KAPALI";
        if (isActive) activeSet.add(rawStId);

        if (r.rows && r.rows.length > 0) {
          const stationWorkerLoad = {};
          r.rows.forEach(op => {
            const sureVal = parseFloat((op.sure || "0").toString().replace(",", ".")) || 0;
            const worker = op.personel?.trim();
            if (worker && worker !== "-" && !worker.includes("DEVRE") && !worker.includes("BOŞ")) {
              stationWorkerLoad[worker] = (stationWorkerLoad[worker] || 0) + sureVal;
            }
          });
          for (const [worker, load] of Object.entries(stationWorkerLoad)) {
            if (!workerLoads[worker]) workerLoads[worker] = { total: 0 };
            workerLoads[worker].total += load;
          }
        }
      }
    });

    let maxLoad = 0;
    let bottleneckWorker = null;

    allRows.forEach(r => {
      if (!r.rows || r.rows.length === 0) return;
      const stationWorkerLoad = {};
      r.rows.forEach(op => {
        const sureVal = parseFloat((op.sure || "0").toString().replace(",", ".")) || 0;
        const worker = op.personel?.trim();
        if (worker && worker !== "-" && !worker.includes("DEVRE") && !worker.includes("BOŞ")) {
          stationWorkerLoad[worker] = (stationWorkerLoad[worker] || 0) + sureVal;
        }
      });
      for (const [worker, load] of Object.entries(stationWorkerLoad)) {
        if (load > maxLoad) { maxLoad = load; bottleneckWorker = worker; }
      }
    });

    const demandVal = parseInt(formData.demand) || 0;
    const totalSeconds = maxLoad * demandVal;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return { active: activeSet.size, passive: uniqueStations.size - activeSet.size, cycle: maxLoad.toFixed(2), cycleWorker: bottleneckWorker, formattedTime };
  };

  const stats = calculateStats();

  const generateChartAndTableData = (sourceRows = null) => {
    const dataRows = sourceRows || allRows;
    const workerData = {};
    const stationData = {};

    const getCategory = (row) => {
      const detay = (row.detay || "").toUpperCase();
      const ikon  = row.ikon || "";
      const atama = (row.atama_amaci || "").toUpperCase();
      if (detay.includes("TRANSFER")) return "stage4";
      if (detay.includes("YARDIMCI")) return "stage3";
      if (ikon === "⭐" || atama.includes("MASTER") || atama.includes("USTA")) return "stage2";
      if (ikon === "🎓" || atama.includes("POOL") || atama.includes("YEDEK")) return "stage2";
      return "stage1";
    };

    dataRows.forEach(st => {
      if (!st.id) return;
      const stName = st.id.split("(")[0].trim();
      const stWorkers = new Set();
      const perWorkerLoad = {};

      st.rows?.forEach(r => {
        const val = parseFloat((r.sure || "0").toString().replace(",", ".")) || 0;
        const w = r.personel?.trim();
        if (w && w !== "-" && !w.includes("DEVRE") && !w.includes("BOŞ")) {
          stWorkers.add(w);
          perWorkerLoad[w] = (perWorkerLoad[w] || 0) + val;

          if (!workerData[w]) workerData[w] = { total: 0, stations: {}, cats: { stage1: 0, stage2: 0, stage3: 0, stage4: 0 }, stationTimes: {} };
          workerData[w].total += val;
          workerData[w].stationTimes[stName] = (workerData[w].stationTimes[stName] || 0) + val;
          const cat = getCategory(r);
          workerData[w].cats[cat] = (workerData[w].cats[cat] || 0) + val;

          if (!workerData[w].stations[stName]) workerData[w].stations[stName] = [];
          if (r.operasyon && r.operasyon !== "TÜM OPERASYONLAR") {
            workerData[w].stations[stName].push(r.operasyon);
          }
        }
      });

      const stCycleTime = Object.values(perWorkerLoad).length > 0 ? Math.max(...Object.values(perWorkerLoad)) : 0;
      if (stCycleTime > 0) { stationData[stName] = { total: stCycleTime, workers: Array.from(stWorkers).join(", ") }; }
    });

    const sortedWorkers = Object.entries(workerData)
      .map(([name, data]) => ({ name, time: data.total, stationsMap: data.stations, stationTimes: data.stationTimes, cats: data.cats }))
      .sort((a, b) => b.time - a.time);

    const sortedStations = Object.entries(stationData)
      .map(([name, data]) => ({ name, time: data.total, workers: data.workers }))
      .sort((a, b) => b.time - a.time);

    let variance = 0;
    let stdDev = 0;
    if (sortedWorkers.length > 0) {
      const mean = sortedWorkers.reduce((acc, w) => acc + (w.time || 0), 0) / sortedWorkers.length;
      variance = sortedWorkers.reduce((acc, w) => acc + Math.pow((w.time || 0) - mean, 2), 0) / sortedWorkers.length;
      stdDev = Math.sqrt(variance);
    }

    return { sortedWorkers, sortedStations, stdDev, maxWorkerTime: sortedWorkers[0]?.time || 1, maxStationTime: sortedStations[0]?.time || 1 };
  };

  const getGraphSourceData = () => {
    if (!planData) return allRows;
    switch (selectedGraphStage) {
      case "stage1": return planData.stage1 || [];
      case "stage2": return planData.stage2 || [];
      case "stage3": return planData.before_stage4 || planData.stage3 || [];
      case "final": return planData.clean || [];
      default: return planData.clean || [];
    }
  };

  const activeChartData = generateChartAndTableData(getGraphSourceData());
  // YENİ: Final ve Stage 4 Öncesi datalarını özel olarak hesaplıyoruz
  const finalChartData = generateChartAndTableData(planData?.clean || []); 
  const stage3ChartData = generateChartAndTableData(planData?.before_stage4 || planData?.stage3 || []); 

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const StageButton = ({ id, label }) => {
    const isActive = activeStage === id && activeMenu === "atama";
    return (
      <TouchableOpacity style={[styles.subMenuItem, isActive ? styles.subMenuItemActive : null]} onPress={() => { setActiveMenu("atama"); changeStage(id); }}>
        <Text style={[styles.subMenuText, isActive ? {color: "#fff", fontWeight: "bold"} : null]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderStageToggles = () => (
    <View style={{ flexDirection: 'row', backgroundColor: "#161b22", borderRadius: 8, borderWidth: 1, borderColor: "#30363d", overflow: 'hidden' }}>
      {[
        { id: "stage1", label: "Aşama 1" },
        { id: "stage2", label: "Aşama 2" },
        { id: "stage3", label: "Aşama 3" },
        { id: "final", label: "Final (Aşama 4)" }
      ].map(stg => {
        const isActive = selectedGraphStage === stg.id;
        const activeColor = stg.id === 'stage1' ? "#1d4ed8" : stg.id === 'stage2' ? "#7c3aed" : stg.id === 'stage3' ? "#d97706" : "#2d9a4e";
        return (
          <TouchableOpacity 
            key={stg.id} 
            onPress={() => setSelectedGraphStage(stg.id)} 
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isActive ? activeColor : "transparent" }}
          >
            <Text style={{ color: isActive ? "#fff" : "#8b949e", fontSize: 11, fontWeight: "bold" }}>{stg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // YENİ: İstediğin mantığa göre güncellenen Varyans Kartları
  const renderVarianceCards = () => {
    if (selectedGraphStage === 'final') {
      const preS4Dev = stage3ChartData?.stdDev || 0;
      const finalDev = activeChartData?.stdDev || 0;
      const impPct = preS4Dev > 0 ? (((preS4Dev - finalDev) / preS4Dev) * 100).toFixed(1) : "0.0";
      const isBetter = finalDev < preS4Dev;

      return (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(29,78,216,0.12)", borderWidth: 1, borderColor: "#1d4ed8", borderRadius: 7, padding: 8 }}>
            <Text style={{ color: "#93c5fd", fontSize: 9, marginBottom: 2 }}>✅ Final Sapma</Text>
            <Text style={{ color: "#60a5fa", fontSize: 14, fontWeight: "900" }}>{finalDev.toFixed(2)}s</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(124,58,237,0.12)", borderWidth: 1, borderColor: "#7c3aed", borderRadius: 7, padding: 8 }}>
            <Text style={{ color: "#c4b5fd", fontSize: 9, marginBottom: 2 }}>📉 Aşama 4 Öncesi Sapma (Aşama3)</Text>
            <Text style={{ color: "#a78bfa", fontSize: 14, fontWeight: "900" }}>{preS4Dev.toFixed(2)}s</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: isBetter ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: isBetter ? "#10b981" : "#ef4444", borderRadius: 7, padding: 8 }}>
            <Text style={{ color: isBetter ? "#6ee7b7" : "#fca5a5", fontSize: 9, marginBottom: 2 }}>📈 İyileşme (Aşama 4 Etkisi)</Text>
            <Text style={{ color: isBetter ? "#34d399" : "#f87171", fontSize: 14, fontWeight: "900" }}>
              {isBetter ? `%${impPct}` : `-%${Math.abs(impPct)}`}
            </Text>
          </View>
        </View>
      );
    }

    // Stage 1, 2, 3 için SADECE o anki sapma
    return (
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(29,78,216,0.12)", borderWidth: 1, borderColor: "#1d4ed8", borderRadius: 7, padding: 8 }}>
          <Text style={{ color: "#93c5fd", fontSize: 9, marginBottom: 2 }}>📊 Görüntülenen Aşama Sapması</Text>
          <Text style={{ color: "#60a5fa", fontSize: 14, fontWeight: "900" }}>{(activeChartData?.stdDev || 0).toFixed(2)}s</Text>
        </View>
        {/* Orantıyı korumak için sağ tarafa boşluk bırakıyoruz */}
        <View style={{ flex: 2 }} /> 
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* SOL SİDEBAR */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>🏭</Text>
          <Text style={[styles.sidebarTitle, {
            fontFamily: Platform.OS === 'web' ? "'Helvetica Neue', Helvetica, Arial, sans-serif" : undefined,
            fontSize: 18,
            fontWeight: "900",
            color: "#fff",
            letterSpacing: 1,
          }]}>BEKO A.Ş.</Text>
          <Text style={{ color: "#34d399", fontSize: 9, fontWeight: "600", letterSpacing: 1, marginTop: 2 }}>ÜRETİM YÖNETİM SİSTEMİ</Text>
        </View>

        <ScrollView style={{ flex: 1, ...(Platform.OS === 'web' ? { overflowY: 'auto' } : {}) }} contentContainerStyle={{ paddingBottom: 20, paddingRight: 15 }} showsVerticalScrollIndicator={true} persistentScrollbar={true}>
        <View style={styles.formSection}>
          <Text style={styles.sidebarLabel}>PLANLAMA PARAMETRELERİ</Text>
          
          <View style={[styles.inputGroup, { zIndex: 50 }]}>
            <Text style={styles.inputLabel}>SKU Seçimi:</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowSkuPicker(!showSkuPicker)}>
              <Text style={{ color: "#fff", fontSize: 12 }}>{formData.sku}</Text>
              <Text style={{ color: "#8b949e", fontSize: 12 }}>▼</Text>
            </TouchableOpacity>
            {showSkuPicker && (
              <View style={styles.dropdownList}>
                {mevcutSKUlar.map((s) => (
                  <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setFormData({ ...formData, sku: s }); setShowSkuPicker(false); }}>
                    <Text style={{ color: "#fff", fontSize: 12 }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hedef Talep (Adet):</Text>
            <TextInput style={styles.input} value={String(formData.demand)} onChangeText={(t) => setFormData({ ...formData, demand: t })} keyboardType="numeric" />
          </View>

          {/* DEVAMSIZ PERSONEL SEÇİMİ */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Operatör Devamlılığı:</Text>
            <TouchableOpacity
              onPress={() => setShowWorkerPanel(!showWorkerPanel)}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#161b22", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: absentWorkers.length > 0 ? "#ef4444" : "#30363d" }}
            >
              <Text style={{ color: absentWorkers.length > 0 ? "#fca5a5" : "#ffffff", fontSize: 12 }}>
                🚫 Devamsız Personel {absentWorkers.length > 0 ? `(${absentWorkers.length})` : ""}
              </Text>
              <Text style={{ color: "#8b949e", fontSize: 11 }}>{showWorkerPanel ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {showWorkerPanel && (
              <View style={{ backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#30363d", borderRadius: 4, marginTop: 4, maxHeight: 220 }}>
                <TextInput
                  style={{ backgroundColor: "#161b22", color: "#fff", paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderColor: "#30363d", fontSize: 11 }}
                  placeholder="İsim ara..."
                  placeholderTextColor="#8b949e"
                  value={workerSearch}
                  onChangeText={setWorkerSearch}
                />
                <ScrollView style={{ maxHeight: 160, ...(Platform.OS === 'web' ? { overflowY: 'auto' } : {}) }} showsVerticalScrollIndicator={true} persistentScrollbar={true}>
                  {allWorkers.length === 0 && (
                    <Text style={{ color: "#8b949e", fontSize: 10, padding: 10, textAlign: "center" }}>Personel listesi yüklenemedi.</Text>
                  )}
                  {allWorkers.filter(w => w.toLowerCase().includes(workerSearch.toLowerCase())).map(worker => {
                      const isAbsent = absentWorkers.includes(worker);
                      return (
                        <TouchableOpacity
                          key={worker}
                          onPress={() => toggleAbsent(worker)}
                          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderColor: "#1e293b", backgroundColor: isAbsent ? "rgba(239,68,68,0.1)" : "transparent" }}
                        >
                          <View style={{ width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: isAbsent ? "#ef4444" : "#555", backgroundColor: isAbsent ? "#ef4444" : "transparent", marginRight: 8, alignItems: "center", justifyContent: "center" }}>
                            {isAbsent && <Text style={{ color: "#fff", fontSize: 9, fontWeight: "bold" }}>✕</Text>}
                          </View>
                          <Text style={{ color: isAbsent ? "#fca5a5" : "#c9d1d9", fontSize: 11, flex: 1 }}>{worker}</Text>
                        </TouchableOpacity>
                      );
                  })}
                </ScrollView>
                {absentWorkers.length > 0 && (
                  <TouchableOpacity onPress={() => setAbsentWorkers([])} style={{ padding: 6, borderTopWidth: 1, borderColor: "#30363d", alignItems: "center" }}>
                    <Text style={{ color: "#ef4444", fontSize: 10 }}>Seçimleri Temizle</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.calcBtn} onPress={hesapla} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.calcBtnText}>HESAPLA</Text>}
          </TouchableOpacity>
        </View>

        <View style={[styles.menuSection, { zIndex: 1 }]}>
          <Text style={styles.sidebarLabel}>GÖRÜNÜMLER</Text>
          <View style={styles.menuGroup}>
            
            <TouchableOpacity activeOpacity={planData ? 0.2 : 1} style={[styles.menuItem, activeMenu === "atama" ? styles.menuItemActive : null, !planData && {opacity: 0.4}]} onPress={() => planData && handleMenuClick("atama")}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.menuItemText}>🏭 Atama Gösterimi (Hat)</Text>
                {planData && <Text style={{color: "#8b949e", fontSize: 10}}>{expandedMenu === "atama" ? "▼" : "▶"}</Text>}
              </View>
            </TouchableOpacity>

            {expandedMenu === "atama" && planData && (
              <View style={styles.subMenuContainer}>
                <Text style={{ color: "#8b949e", fontSize: 10, marginBottom: 5 }}>AŞAMA SEÇİCİ</Text>
                <StageButton id="clean" label="🎯 Final Planı" />
                <StageButton id="stage1" label="🧠 Aşama 1 (Yetkinlik)" />
                <StageButton id="stage2" label="🎓 Aşama 2 (Eğitim,Usta,Komşu)" />
                <StageButton id="stage3" label="⚠️ Aşama 3 (Darboğaz)" />
                <StageButton id="stage4" label="🔄 Aşama 4 (Sapma)" />
              </View>
            )}

            <TouchableOpacity activeOpacity={planData ? 0.2 : 1} style={[styles.menuItem, activeMenu === "tablo" ? styles.menuItemActive : null, !planData && {opacity: 0.4}, { marginTop: 5 }]} onPress={() => planData && handleMenuClick("tablo")}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.menuItemText}>📋 İstasyon/Operatör Listesi</Text>
                {planData && <Text style={{color: "#8b949e", fontSize: 10}}>{expandedMenu === "tablo" ? "▼" : "▶"}</Text>}
              </View>
            </TouchableOpacity>

            {expandedMenu === "tablo" && planData && (
              <View style={styles.subMenuContainer}>
                <TouchableOpacity style={[styles.subMenuItem, activeTabloView === "kisi" && activeMenu === "tablo" ? styles.subMenuItemActive : null]} onPress={() => { setActiveMenu("tablo"); setActiveTabloView("kisi"); }}>
                  <Text style={[styles.subMenuText, activeTabloView === "kisi" && activeMenu === "tablo" ? {color: "#fff", fontWeight: "bold"} : null]}>👥 Operatör Bazlı Liste</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.subMenuItem, activeTabloView === "istasyon" && activeMenu === "tablo" ? styles.subMenuItemActive : null]} onPress={() => { setActiveMenu("tablo"); setActiveTabloView("istasyon"); }}>
                  <Text style={[styles.subMenuText, activeTabloView === "istasyon" && activeMenu === "tablo" ? {color: "#fff", fontWeight: "bold"} : null]}>🏭 İstasyon Bazlı Liste</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity activeOpacity={planData ? 0.2 : 1} style={[styles.menuItem, activeMenu === "grafik" ? styles.menuItemActive : null, !planData && {opacity: 0.4}, { marginTop: 5 }]} onPress={() => planData && handleMenuClick("grafik")}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.menuItemText}>📈 Analiz Grafikleri</Text>
                {planData && <Text style={{color: "#8b949e", fontSize: 10}}>{expandedMenu === "grafik" ? "▼" : "▶"}</Text>}
              </View>
            </TouchableOpacity>
            
            {expandedMenu === "grafik" && planData && (
              <View style={styles.subMenuContainer}>
                <TouchableOpacity style={[styles.subMenuItem, activeGrafikView === "kisi" && activeMenu === "grafik" ? styles.subMenuItemActive : null]} onPress={() => { setActiveMenu("grafik"); setActiveGrafikView("kisi"); }}>
                  <Text style={[styles.subMenuText, activeGrafikView === "kisi" && activeMenu === "grafik" ? {color: "#fff", fontWeight: "bold"} : null]}>👥 Operatör Bazlı Grafik</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.subMenuItem, activeGrafikView === "istasyon" && activeMenu === "grafik" ? styles.subMenuItemActive : null]} onPress={() => { setActiveMenu("grafik"); setActiveGrafikView("istasyon"); }}>
                  <Text style={[styles.subMenuText, activeGrafikView === "istasyon" && activeMenu === "grafik" ? {color: "#fff", fontWeight: "bold"} : null]}>🏭 İstasyon Bazlı Grafik</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
        </ScrollView>
      </View>

      {/* ANA İÇERİK ALANI */}
      <View style={styles.mainContent}>
        
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Plan Hesaplanıyor...</Text>
          </View>
        ) : !planData ? (
          <View style={styles.centerBox}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>👋</Text>
            <Text style={styles.placeholderText}>Sol menüden SKU ve Hedef seçip HESAPLA butonuna basın.</Text>
          </View>
        ) : (
          <>
            {/* ÜST İSTATİSTİK BARI */}
            <View style={styles.statsHeader}>
              <View style={styles.statCard}><Text style={styles.statTitle}>Açık İstasyon</Text><Text style={[styles.statValue, {color: "#10b981"}]}>🟢 {stats.active}</Text></View>
              <View style={styles.statCard}><Text style={styles.statTitle}>Kapalı İstasyon</Text><Text style={[styles.statValue, {color: "#ef4444"}]}>🔴 {stats.passive}</Text></View>
              <View style={styles.statCard}><Text style={styles.statTitle}>Çevrim Süresi</Text><Text style={[styles.statValue, {color: "#3b82f6"}]}>⏱️ {stats.cycle}s</Text></View>
              <View style={[styles.statCard, { backgroundColor: "#1e1b4b", borderColor: "#8b5cf6", borderWidth: 1 }]}><Text style={[styles.statTitle, { color: "#c4b5fd" }]}>Hedef Süresi</Text><Text style={[styles.statValue, {color: "#a855f7"}]}>⏳ {stats.formattedTime}</Text></View>
              <View style={[styles.statCard, {borderColor: "#f59e0b", borderWidth: 1, flex: 1.5}]}><Text style={styles.statTitle}>🔥 Darboğaz Personeli</Text><Text style={[styles.statValue, {color: "#f59e0b"}]}>{stats.cycleWorker || "-"} <Text style={{fontSize: 12}}>({stats.cycle}s)</Text></Text></View>
            </View>

            <View style={styles.contentArea}>
              
              {/* HARİTA ALANI */}
              {activeMenu === "atama" && (
                <View ref={mapContainerRef} style={[styles.mapContainer, { cursor: isDragging ? 'grabbing' : 'grab' }]} {...panResponder.panHandlers}>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetMap}><Text style={{color: '#fff', fontSize: 10}}>📍 Merkezi Bul</Text></TouchableOpacity>
                  <Animated.View pointerEvents={isDragging ? "none" : "box-none"} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scale }] }}>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: "row", gap: 5, alignSelf: "flex-end" }}>
                          {topLine.map((st) => <StationBox key={st.id} st={st} scale={scale} threshold={ZOOM_THRESHOLD} showLabel={scale > ZOOM_THRESHOLD} onSelect={setSelectedStation} selectedId={selectedStation?.id} activeStage={activeStage} />)}
                        </View>
                        <View style={{ height: 50, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: "rgba(255,255,255,0.12)", fontSize: 28, fontWeight: "900", letterSpacing: 6, fontFamily: Platform.OS === 'web' ? "'Helvetica Neue', Helvetica, Arial, sans-serif" : undefined, textTransform: "uppercase", textAlign: "center", pointerEvents: "none" }}>
                            MONTAJ 2 İSTASYONLARI
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 5, alignSelf: "flex-end" }}>
                          {bottomLine.map((st) => <StationBox key={st.id} st={st} scale={scale} threshold={ZOOM_THRESHOLD} showLabel={scale > ZOOM_THRESHOLD} onSelect={setSelectedStation} selectedId={selectedStation?.id} activeStage={activeStage} />)}
                        </View>
                      </View>
                      <View style={{ marginLeft: 5, gap: 5, flexDirection: "column", justifyContent: 'center' }}>
                        {sideLine.map((st) => <StationBox key={st.id} st={st} scale={scale} threshold={ZOOM_THRESHOLD} showLabel={scale > ZOOM_THRESHOLD} onSelect={setSelectedStation} selectedId={selectedStation?.id} activeStage={activeStage} />)}
                      </View>
                    </View>
                  </Animated.View>
                </View>
              )}

              {/* YAN YANA DİZİLEN KİŞİ BAZLI KART LİSTESİ */}
              {activeMenu === "tablo" && activeTabloView === "kisi" && (
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: "#30363d", flexWrap: 'wrap', gap: 8 }}>
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>👥 Kişi Bazlı Atama Listesi</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#30363d", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: "#6b7280", fontSize: 13 }}>🔍</Text>
                        <TextInput
                          value={workerChartFilter}
                          onChangeText={setWorkerChartFilter}
                          placeholder="Personel ara..."
                          placeholderTextColor="#4b5563"
                          style={{ color: "#e5e7eb", fontSize: 13, minWidth: 150, ...(Platform.OS === 'web' ? { outline: 'none' } : {}), borderWidth: 0, backgroundColor: 'transparent' }}
                        />
                        {workerChartFilter.length > 0 && (
                          <TouchableOpacity onPress={() => setWorkerChartFilter("")}>
                            <Text style={{ color: "#6b7280", fontSize: 13, fontWeight: "bold" }}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {planData && renderStageToggles()}
                    </View>
                  </View>
                  <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 50 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                      {(activeChartData?.sortedWorkers || [])
                        .filter(w => !workerChartFilter.trim() || w.name.toLowerCase().includes(workerChartFilter.trim().toLowerCase()))
                        .map((w, i) => (
                        <View key={i} style={{ width: Platform.OS === 'web' ? '33.33%' : '100%', padding: 8, minWidth: 300 }}>
                          <View style={styles.workerCard}>
                            <View style={styles.workerCardHeader}>
                              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Text style={{fontSize: 18}}>👤</Text><Text style={styles.workerNameText}>{w.name}</Text></View>
                              <View style={styles.workerTimeBadge}><Text style={styles.workerTimeText}>⏱ {(w.time || 0).toFixed(2)}s</Text></View>
                            </View>
                            <View style={styles.workerCardBody}>
                              {Object.entries(w.stationsMap || {}).map(([st, ops], idx) => (
                                <View key={idx} style={styles.stationGroup}>
                                  <Text style={styles.stationGroupTitle}>📍 {st}</Text>
                                  <View style={styles.opBadgeContainer}>
                                    {(ops || []).map((op, opIdx) => (<View key={opIdx} style={styles.opBadge}><Text style={styles.opBadgeText}>{op}</Text></View>))}
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* YAN YANA DİZİLEN İSTASYON BAZLI KART LİSTESİ */}
              {activeMenu === "tablo" && activeTabloView === "istasyon" && (
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: "#30363d", flexWrap: 'wrap', gap: 8 }}>
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>🏭 İstasyon Bazlı Atama Listesi</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#30363d", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: "#6b7280", fontSize: 13 }}>🔍</Text>
                        <TextInput
                          value={stationChartFilter}
                          onChangeText={setStationChartFilter}
                          placeholder="İstasyon ara..."
                          placeholderTextColor="#4b5563"
                          style={{ color: "#e5e7eb", fontSize: 13, minWidth: 150, ...(Platform.OS === 'web' ? { outline: 'none' } : {}), borderWidth: 0, backgroundColor: 'transparent' }}
                        />
                        {stationChartFilter.length > 0 && (
                          <TouchableOpacity onPress={() => setStationChartFilter("")}>
                            <Text style={{ color: "#6b7280", fontSize: 13, fontWeight: "bold" }}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {planData && renderStageToggles()}
                    </View>
                  </View>
                  <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 50 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                      {(activeChartData?.sortedStations || [])
                        .filter(s => !stationChartFilter.trim() || s.name.toLowerCase().includes(stationChartFilter.trim().toLowerCase()))
                        .map((s, i) => (
                        <View key={i} style={{ width: Platform.OS === 'web' ? '33.33%' : '100%', padding: 8, minWidth: 300 }}>
                          <View style={styles.workerCard}>
                            <View style={styles.workerCardHeader}>
                              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Text style={{fontSize: 18}}>🏭</Text><Text style={styles.workerNameText}>{s.name}</Text></View>
                              <View style={[styles.workerTimeBadge, {borderColor: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.15)"}]}><Text style={{ color: "#6ee7b7", fontSize: 12, fontWeight: "bold" }}>⏱ {(s.time || 0).toFixed(2)}s</Text></View>
                            </View>
                            <View style={styles.workerCardBody}>
                              <Text style={styles.stationGroupTitle}>Çalışan Operatörler</Text>
                              <Text style={{color: '#c9d1d9', fontSize: 13}}>{s.workers || "-"}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* KİŞİ BAZLI GRAFİK */}
              {activeMenu === "grafik" && activeGrafikView === "kisi" && Platform.OS === 'web' && (() => {
                const workers = activeChartData.sortedWorkers || [];
                const maxT    = ((activeChartData?.maxWorkerTime) || 1) * 1.15; 
                const CAT_COLORS = { stage1: "#2d9a4e", stage2: "#7c3aed", stage3: "#d97706", stage4: "#1d4ed8" };
                const CAT_LABELS = { stage1: "Aşama 1 - Temel Atama (yetkin)", stage2: "Aşama 2 - Temel Atama (eğitimci,usta,komşu)", stage3: "Aşama 3 - Darboğaz Yardımı", stage4: "Aşama 4 - Sapma Azaltma" };
                const yTicks = [0,10,20,30,40,50,60,70,80,90,100].map(pct => ({ pct, val: (maxT * pct / 100).toFixed(1) }));
                const Y_AXIS_W = 44; 
                const X_LABEL_H = 100;

                return (
                  <View style={{ flex: 1, padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "bold" }}>
                        📊 Personel İş Yükü Dağılımı
                      </Text>
                      {planData && renderStageToggles()}
                    </View>

                    {planData && renderVarianceCards()}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                      {Object.entries(CAT_LABELS).map(([key, label]) => (
                        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <View style={{ width: 12, height: 12, backgroundColor: CAT_COLORS[key], borderRadius: 2 }} />
                          <Text style={{ color: "#c9d1d9", fontSize: 10 }}>{label}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={{ flex: 1, backgroundColor: "#0d1117", borderRadius: 8, borderWidth: 1, borderColor: "#21262d", padding: 12, paddingTop: 20, marginTop: 5, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row' }}>
                        <div style={{ width: `${Y_AXIS_W}px`, flexShrink: 0, position: 'relative', marginBottom: `${X_LABEL_H}px` }}>
                          {yTicks.slice(1).map(({ pct, val }) => (
                            <div key={pct} style={{ position: 'absolute', bottom: `${pct}%`, right: 6, transform: 'translateY(50%)', lineHeight: 1 }}>
                              <span style={{ color: '#6b7280', fontSize: '10px', whiteSpace: 'nowrap', fontWeight: '500' }}>{val}s</span>
                            </div>
                          ))}
                          <div style={{ position: 'absolute', bottom: 0, right: 6 }}><span style={{ color: '#6b7280', fontSize: '10px', whiteSpace: 'nowrap', fontWeight: '500' }}>0s</span></div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #374151', borderBottom: '1px solid #374151' }}>
                            {yTicks.slice(1).map(({ pct }) => (
                              <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct}%`, height: '1px', backgroundColor: pct === 100 ? '#4b5563' : 'rgba(55,65,81,0.5)', pointerEvents: 'none' }} />
                            ))}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '2px', padding: '0 2px' }}>
                              {workers.map((w, i) => {
                                const cats = w.cats || {};
                                const isPeak = w.time === activeChartData.maxWorkerTime;
                                const barH = (w.time / maxT) * 100;
                                return (
                                  <div
                                    key={i}
                                    title={`${w.name}  |  Toplam: ${(w.time||0).toFixed(2)}s\nAş.1: ${(cats.stage1||0).toFixed(1)}s  |  Aş.2: ${(cats.stage2||0).toFixed(1)}s  |  Aş.3: ${(cats.stage3||0).toFixed(1)}s  |  Aş.4: ${(cats.stage4||0).toFixed(1)}s`}
                                    style={{
                                      flex: 1, minWidth: 0, height: `${barH}%`, display: 'flex', flexDirection: 'column-reverse',
                                      borderRadius: '2px 2px 0 0', overflow: 'hidden', outline: isPeak ? '2px solid #f59e0b' : 'none', cursor: 'default',
                                    }}
                                  >
                                    {['stage1','stage2','stage3','stage4'].map(cat => {
                                      const v = cats[cat] || 0;
                                      if (v <= 0) return null;
                                      return (<div key={cat} style={{ width: '100%', height: `${(v / w.time) * 100}%`, backgroundColor: CAT_COLORS[cat], flexShrink: 0 }} />);
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ height: `${X_LABEL_H}px`, flexShrink: 0, display: 'flex', gap: '2px', padding: '4px 2px 0', borderLeft: '1px solid #374151', overflow: 'hidden' }}>
                            {workers.map((w, i) => {
                              const isPeak = w.time === activeChartData.maxWorkerTime;
                              return (
                                <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                  <span style={{ color: isPeak ? '#f59e0b' : '#d1d5db', fontSize: '11px', fontWeight: isPeak ? '700' : '400', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', whiteSpace: 'nowrap', overflow: 'hidden', flex: 1, textOverflow: 'ellipsis', textAlign: 'right' }}>
                                    {w.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </View>
                  </View>
                );
              })()}

              {/* İSTASYON GRAFİĞİ */}
              {activeMenu === "grafik" && activeGrafikView === "istasyon" && Platform.OS === 'web' && (() => {
                const stations = activeChartData.sortedStations || [];
                const maxT     = ((activeChartData?.maxStationTime) || 1) * 1.15;
                const yTicks   = [0,10,20,30,40,50,60,70,80,90,100].map(pct => ({ pct, val: (maxT * pct / 100).toFixed(1) }));
                const Y_AXIS_W = 44;
                const X_LABEL_H = 100;

                const stageColors = {
                  stage1: "#1d4ed8", 
                  stage2: "#7c3aed", 
                  stage3: "#d97706", 
                  final:  "#2d9a4e"  
                };
                const baseBarColor = stageColors[selectedGraphStage] || "#2d9a4e";
                const peakColor = "#b91c1c"; 

                return (
                  <View style={{ flex: 1, padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "bold" }}>🏭 İstasyon Süreleri Dağılımı</Text>
                      {planData && renderStageToggles()}
                    </View>
                    
                    {planData && renderVarianceCards()}

                    <View style={{ flex: 1, backgroundColor: "#0d1117", borderRadius: 8, borderWidth: 1, borderColor: "#21262d", padding: 12, paddingTop: 20, marginTop: 5, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row' }}>
                        <div style={{ width: `${Y_AXIS_W}px`, flexShrink: 0, position: 'relative', marginBottom: `${X_LABEL_H}px` }}>
                          {yTicks.slice(1).map(({ pct, val }) => (
                            <div key={pct} style={{ position: 'absolute', bottom: `${pct}%`, right: 6, transform: 'translateY(50%)', lineHeight: 1 }}>
                              <span style={{ color: '#6b7280', fontSize: '10px', whiteSpace: 'nowrap', fontWeight: '500' }}>{val}s</span>
                            </div>
                          ))}
                          <div style={{ position: 'absolute', bottom: 0, right: 6 }}><span style={{ color: '#6b7280', fontSize: '10px', whiteSpace: 'nowrap', fontWeight: '500' }}>0s</span></div>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #374151', borderBottom: '1px solid #374151' }}>
                            {yTicks.slice(1).map(({ pct }) => (
                              <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct}%`, height: '1px', backgroundColor: pct === 100 ? '#4b5563' : 'rgba(55,65,81,0.5)', pointerEvents: 'none' }} />
                            ))}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '2px', padding: '0 2px' }}>
                              {stations.map((s, i) => {
                                const isPeak = s.time === activeChartData.maxStationTime;
                                const barColor = isPeak ? peakColor : baseBarColor;
                                return (
                                  <div
                                    key={i}
                                    title={`${s.name}  |  ${(s.time||0).toFixed(2)}s\nPersonel: ${s.workers}`}
                                    style={{
                                      flex: 1, minWidth: 0, height: `${(s.time / maxT) * 100}%`, backgroundColor: barColor,
                                      borderRadius: '2px 2px 0 0', outline: isPeak ? `2px solid ${peakColor}` : 'none', cursor: 'default',
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          
                          <div style={{ height: `${X_LABEL_H}px`, flexShrink: 0, display: 'flex', gap: '2px', padding: '4px 2px 0', borderLeft: '1px solid #374151', overflow: 'hidden' }}>
                            {stations.map((s, i) => {
                              const isPeak = s.time === activeChartData.maxStationTime;
                              return (
                                <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                  <span style={{ color: isPeak ? peakColor : '#d1d5db', fontSize: '11px', fontWeight: isPeak ? '700' : '400', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', whiteSpace: 'nowrap', overflow: 'hidden', flex: 1, textOverflow: 'ellipsis', textAlign: 'right' }}>
                                    {s.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </View>
                  </View>
                );
              })()}
            </View>
          </>
        )}
      </View>

      <StationDetailModal visible={!!selectedStation} onClose={() => setSelectedStation(null)} stationData={selectedStation} activeStage={activeStage} />
    </SafeAreaView>
  );
}

const StationBox = ({ st, scale, threshold, showLabel, onSelect, selectedId, activeStage }) => {
  const isSelected = selectedId === st.id;
  const isGreen = st.status === "green";
  
  let badgeIcon = null;
  let badgeColor = "#3b82f6";
  
  if (isGreen && activeStage !== "clean") {
    if (activeStage === "stage1" && (st.durum === "ATANDI" || st.durum === "SABIT")) { badgeIcon = "🧩"; badgeColor = "#3b82f6"; } 
    else if (activeStage === "stage2") {
      if (st.durum === "TAKVIYE (YEDEK)" || st.durum === "POOL") { badgeIcon = "🎓"; badgeColor = "#10b981"; } 
      else if (st.durum === "TAKVIYE (USTA)" || st.durum === "MASTER") { badgeIcon = "⭐"; badgeColor = "#f59e0b"; }
    } 
    else if (activeStage === "stage3" && st.rows?.some(r => r.detay?.includes("YARDIMCI DESTEĞİ"))) { badgeIcon = "⚡"; badgeColor = "#ef4444"; } 
    else if (activeStage === "stage4" && st.rows?.some(r => r.detay?.includes("TRANSFER"))) { badgeIcon = "⇄"; badgeColor = "#0ea5e9"; }
  }

  const rawId = st.id ? st.id.toString() : "";
  const cleanedId = rawId.split("(")[0].replace("OP_", "").trim() || st.sira || "?";

  return (
    <TouchableOpacity
      activeOpacity={0.8} onPress={() => onSelect(st)}
      style={{
        width: 55, height: 55, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center",
        backgroundColor: isSelected ? "#1e3a8a" : (isGreen ? "#064e3b" : "#450a0a"),
        borderColor: isSelected ? "#3b82f6" : (isGreen ? "#10b981" : "#ef4444"), 
        position: "relative", 
        paddingHorizontal: 1 
      }}
    >
      {showLabel ? (
        <Text 
          numberOfLines={2} 
          adjustsFontSizeToFit 
          minimumFontScale={0.4} 
          style={{ fontSize: 9.5, fontWeight: "bold", color: "#fff", textAlign: "center", lineHeight: 11 }}
        >
          {cleanedId}
        </Text>
      ) : (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff", opacity: 0.8 }} />
      )}
      
      {badgeIcon && (
        <View style={{ position: "absolute", top: -8, right: -8, backgroundColor: "#161b22", borderWidth: 1.5, borderColor: badgeColor, borderRadius: 11, width: 22, height: 22, alignItems: "center", justifyContent: "center", zIndex: 5 }}>
          <Text style={{ color: badgeColor, fontSize: 11, fontWeight: "bold" }}>{badgeIcon}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#0d1117" },
  sidebar: { width: 240, backgroundColor: "#161b22", borderRightWidth: 1, borderColor: "#30363d", paddingLeft: 15, paddingTop: 15, zIndex: 10, overflow: "hidden" },
  sidebarHeader: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: "#30363d", paddingBottom: 10 },
  sidebarTitle: { color: "#34d399", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  sidebarLabel: { color: "#8b949e", fontSize: 10, fontWeight: "bold", marginBottom: 6, letterSpacing: 1 },
  formSection: { marginBottom: 15, backgroundColor: "#0d1117", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#30363d", zIndex: 50 },
  inputGroup: { marginBottom: 10 },
  inputLabel: { color: "#8b949e", fontSize: 11, marginBottom: 4 },
  input: { backgroundColor: "#161b22", color: "#fff", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: "#30363d", fontSize: 12 },
  dropdownButton: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#161b22", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: "#30363d" },
  dropdownList: { position: "absolute", top: 45, left: 0, right: 0, backgroundColor: "#161b22", borderWidth: 1, borderColor: "#30363d", borderRadius: 4, elevation: 5, zIndex: 100 },
  dropdownItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: "#30363d" },
  calcBtn: { backgroundColor: "#238636", padding: 8, borderRadius: 4, alignItems: "center", marginTop: 5 },
  calcBtnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  menuSection: { flex: 1 },
  menuGroup: { marginBottom: 15 },
  menuItem: { paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6, marginBottom: 4 },
  menuItemActive: { backgroundColor: "#1f2937", borderLeftWidth: 3, borderLeftColor: "#3b82f6" },
  menuItemText: { color: "#e6edf3", fontSize: 12, fontWeight: "600" },
  subMenuContainer: { marginLeft: 10, borderLeftWidth: 1, borderColor: "#30363d", paddingLeft: 8, marginTop: 5 },
  subMenuItem: { paddingVertical: 5, paddingHorizontal: 6, borderRadius: 4, marginBottom: 2 },
  subMenuItemActive: { backgroundColor: "#1e3a8a" },
  subMenuText: { color: "#8b949e", fontSize: 11, fontWeight: '500' },
  mainContent: { flex: 1, flexDirection: "column", zIndex: 1 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 50 },
  loadingText: { color: "#8b949e", marginTop: 10, fontSize: 13 },
  statsHeader: { flexDirection: "row", padding: 10, gap: 10, backgroundColor: "#161b22", borderBottomWidth: 1, borderColor: "#30363d", zIndex: 10 },
  statCard: { flex: 1, backgroundColor: "#0d1117", padding: 10, borderRadius: 6, borderWidth: 1, borderColor: "#30363d", justifyContent: "center" },
  statTitle: { color: "#8b949e", fontSize: 10, marginBottom: 2, fontWeight: "600" },
  statValue: { fontSize: 16, fontWeight: "bold" },
  contentArea: { flex: 1, backgroundColor: "#0d1117" },
  mapContainer: { flex: 1, overflow: 'hidden', position: 'relative' },
  resetBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: '#1f2937', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: '#3b82f6', zIndex: 20 },
  placeholderText: { color: "#e6edf3", fontSize: 14, fontWeight: "500", textAlign: "center", lineHeight: 20 },

  workerCard: {
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    overflow: "hidden",
    flex: 1
  },
  workerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1f2937",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#30363d"
  },
  workerNameText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  workerTimeBadge: { 
    backgroundColor: "rgba(59, 130, 246, 0.15)", 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: "#3b82f6" 
  },
  workerTimeText: { color: "#93c5fd", fontSize: 12, fontWeight: "bold" },
  workerCardBody: { padding: 15, gap: 12 },
  stationGroup: { 
    backgroundColor: "#0d1117", 
    padding: 10, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: "#21262d" 
  },
  stationGroupTitle: { color: "#8b949e", fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  opBadgeContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  opBadge: { 
    backgroundColor: "#21262d", 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4, 
    borderWidth: 1, 
    borderColor: "#30363d" 
  },
  opBadgeText: { color: "#c9d1d9", fontSize: 10 }
});