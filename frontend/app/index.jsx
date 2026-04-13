import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  PanResponder,
  Animated,
  Platform,
  ScrollView
} from "react-native";
import ConveyorBelt from "../components/ConveyorBelt";
// Tema ve Stil Importları
import { useTheme } from "../context/ThemeContext";
import { getDashboardStyles } from "../styles/dashboard";

// Dışarı aktardığımız bileşenler (Yolları kendi projene göre ayarla)
import StationBox from "../components/StationBox";
import StationDetailModal from "../components/StationDetailModal";

export default function DashboardScreen() {
  // --- 1. TEMA VE STİL YÖNETİMİ ---
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const styles = getDashboardStyles(colors);

  // --- 2. STATE YÖNETİMİ ---
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: "SKU Seçiniz",
    vardiya: "8",
    demand: ""
  });
  const [planData, setPlanData] = useState(null);

  const [allWorkers, setAllWorkers] = useState([]);
  const [absentWorkers, setAbsentWorkers] = useState([]);
  const [showWorkerPanel, setShowWorkerPanel] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");

  const [showSkuPicker, setShowSkuPicker] = useState(false);
  const mevcutSKUlar = ["97653", "78446", "40132", "77558", "77514", "78472"];

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

  // --- 3. KULLANICI ETKİLEŞİMİ & EVENT LISTENERLAR ---
  useEffect(() => {
    fetch("http://localhost:8000/api/personel-listesi")
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setAllWorkers(d.workers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      // Body'ye dark-mode class'ını toggle edelim ki CSS içinden yakalayabilelim
      if (isDarkMode) {
        document.body.classList.add("dark-mode");
      } else {
        document.body.classList.remove("dark-mode");
      }

      const style = document.createElement("style");
      style.innerHTML = `
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: ${isDarkMode ? "#1e2736" : "#e2e8f0"}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; border: 1px solid ${colors.background.main}; }
  ::-webkit-scrollbar-thumb:hover { background: #60a5fa; }
  * { scrollbar-width: thin; scrollbar-color: #3b82f6 ${isDarkMode ? "#1e2736" : "#e2e8f0"}; }

  @keyframes industrialMoveRight {
    from { background-position: 0 0, 0 0, 0 0; }
    to   { background-position: 34px 0, 34px 0, 0 0; }
  }

  @keyframes industrialMoveLeft {
    from { background-position: 34px 0, 34px 0, 0 0; }
    to   { background-position: 0 0, 0 0, 0 0; }
  }

  @keyframes industrialMoveDown {
    from { background-position: 0 0, 0 0, 0 0; }
    to   { background-position: 0 34px, 0 34px, 0 0; }
  }

  .belt-industrial-h-right {
    background-image:
      repeating-linear-gradient(
        90deg,
        rgba(0,0,0,0.18) 0px,
        rgba(0,0,0,0.18) 2px,
        transparent 2px,
        transparent 30px,
        rgba(255,255,255,0.18) 30px,
        rgba(255,255,255,0.18) 34px
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 10px,
        rgba(255,255,255,0.10) 10px,
        rgba(255,255,255,0.10) 17px,
        transparent 17px,
        transparent 34px
      ),
      linear-gradient(
        180deg,
        rgba(255,255,255,0.18) 0%,
        rgba(255,255,255,0.04) 18%,
        rgba(0,0,0,0.08) 50%,
        rgba(255,255,255,0.06) 82%,
        rgba(0,0,0,0.18) 100%
      );
    animation: industrialMoveRight 1.1s linear infinite;
  }

  .belt-industrial-h-left {
    background-image:
      repeating-linear-gradient(
        90deg,
        rgba(0,0,0,0.18) 0px,
        rgba(0,0,0,0.18) 2px,
        transparent 2px,
        transparent 30px,
        rgba(255,255,255,0.18) 30px,
        rgba(255,255,255,0.18) 34px
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 10px,
        rgba(255,255,255,0.10) 10px,
        rgba(255,255,255,0.10) 17px,
        transparent 17px,
        transparent 34px
      ),
      linear-gradient(
        180deg,
        rgba(255,255,255,0.18) 0%,
        rgba(255,255,255,0.04) 18%,
        rgba(0,0,0,0.08) 50%,
        rgba(255,255,255,0.06) 82%,
        rgba(0,0,0,0.18) 100%
      );
    animation: industrialMoveLeft 1.1s linear infinite;
  }

  .belt-industrial-v-down {
    background-image:
      repeating-linear-gradient(
        180deg,
        rgba(0,0,0,0.18) 0px,
        rgba(0,0,0,0.18) 2px,
        transparent 2px,
        transparent 30px,
        rgba(255,255,255,0.18) 30px,
        rgba(255,255,255,0.18) 34px
      ),
      repeating-linear-gradient(
        180deg,
        transparent 0px,
        transparent 10px,
        rgba(255,255,255,0.10) 10px,
        rgba(255,255,255,0.10) 17px,
        transparent 17px,
        transparent 34px
      ),
      linear-gradient(
        90deg,
        rgba(255,255,255,0.18) 0%,
        rgba(255,255,255,0.04) 18%,
        rgba(0,0,0,0.08) 50%,
        rgba(255,255,255,0.06) 82%,
        rgba(0,0,0,0.18) 100%
      );
    animation: industrialMoveDown 1.1s linear infinite;
  }

  .dark-mode .belt-industrial-h-right,
  .dark-mode .belt-industrial-h-left,
  .dark-mode .belt-industrial-v-down {
    filter: saturate(0.9) brightness(0.85);
  }
`;
      const applyClasses = () => {
        const scrollViews = document.querySelectorAll('[style*="overflow"]');
        scrollViews.forEach((el) => {
          el.style.overflowY = "auto";
          el.style.scrollbarWidth = "thin";
          el.style.scrollbarColor = `#3b82f6 ${isDarkMode ? "#1e2736" : "#e2e8f0"}`;
        });
      };
      setTimeout(applyClasses, 500);
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, [isDarkMode, colors.background.main]);

  const dragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    panStartX: 0,
    panStartY: 0
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) =>
        Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false
      }),
      onPanResponderRelease: () => {
        setIsDragging(false);
        pan.flattenOffset();
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        pan.flattenOffset();
      }
    })
  ).current;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMouseDown = (e) => {
      const mapEl = mapContainerRef.current;
      if (!mapEl || !mapEl.contains(e.target)) return;
      e.preventDefault();
      dragState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        panStartX: pan.x._value,
        panStartY: pan.y._value
      };
      setIsDragging(true);
    };
    const handleMouseMove = (e) => {
      if (!dragState.current.active) return;
      e.preventDefault();
      pan.setValue({
        x: dragState.current.panStartX + (e.clientX - dragState.current.startX),
        y: dragState.current.panStartY + (e.clientY - dragState.current.startY)
      });
    };
    const handleMouseUp = () => {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      setIsDragging(false);
    };
    const handleGlobalWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const mapEl = mapContainerRef.current;
        if (mapEl) {
          const rect = mapEl.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            const direction = e.deltaY > 0 ? -1 : 1;
            setScale((prev) =>
              Math.min(Math.max(0.15, prev + direction * 0.05), 4.0)
            );
          }
        }
      }
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("wheel", handleGlobalWheel);
    };
  }, [pan]);

  const resetMap = () => {
    setScale(START_SCALE);
    pan.setValue({ x: 0, y: 0 });
    pan.flattenOffset();
  };

  const toggleAbsent = (worker) => {
    setAbsentWorkers((prev) =>
      prev.includes(worker)
        ? prev.filter((w) => w !== worker)
        : [...prev, worker]
    );
  };

  // --- 4. DATA FETCH VE HESAPLAMALAR ---
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
      Alert.alert(
        "Sistem Hatası",
        "Backende bağlanılamadı. API'nin çalıştığından emin olun."
      );
    } finally {
      setLoading(false);
    }
  };

  const arrangeInFullU = (stageData) => {
    if (!stageData) return;
    const seen = new Set();
    const unique = [];
    for (const row of stageData) {
      if (!seen.has(row.id) && row.id) {
        seen.add(row.id);
        unique.push(row);
      }
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
    if (!allRows || allRows.length === 0)
      return {
        active: 0,
        passive: 0,
        cycle: "0.00",
        cycleWorker: "-",
        formattedTime: "00:00:00"
      };
    const uniqueStations = new Set();
    const activeSet = new Set();
    const workerLoads = {};
    allRows.forEach((r) => {
      if (r.id) {
        const rawStId = r.id.split("(")[0].trim();
        uniqueStations.add(rawStId);
        const isActive =
          r.durum !== "BOŞ / KAPALI" &&
          r.durum !== "DEVRE DIŞI" &&
          r.durum !== "KAPALI";
        if (isActive) activeSet.add(rawStId);
        if (r.rows && r.rows.length > 0) {
          const stationWorkerLoad = {};
          r.rows.forEach((op) => {
            const sureVal =
              parseFloat((op.sure || "0").toString().replace(",", ".")) || 0;
            const worker = op.personel?.trim();
            if (
              worker &&
              worker !== "-" &&
              !worker.includes("DEVRE") &&
              !worker.includes("BOŞ")
            ) {
              stationWorkerLoad[worker] =
                (stationWorkerLoad[worker] || 0) + sureVal;
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
    allRows.forEach((r) => {
      if (!r.rows || r.rows.length === 0) return;
      const stationWorkerLoad = {};
      r.rows.forEach((op) => {
        const sureVal =
          parseFloat((op.sure || "0").toString().replace(",", ".")) || 0;
        const worker = op.personel?.trim();
        if (
          worker &&
          worker !== "-" &&
          !worker.includes("DEVRE") &&
          !worker.includes("BOŞ")
        ) {
          stationWorkerLoad[worker] =
            (stationWorkerLoad[worker] || 0) + sureVal;
        }
      });
      for (const [worker, load] of Object.entries(stationWorkerLoad)) {
        if (load > maxLoad) {
          maxLoad = load;
          bottleneckWorker = worker;
        }
      }
    });

    const demandVal = parseInt(formData.demand) || 0;
    const totalSeconds = maxLoad * demandVal;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    return {
      active: activeSet.size,
      passive: uniqueStations.size - activeSet.size,
      cycle: maxLoad.toFixed(2),
      cycleWorker: bottleneckWorker,
      formattedTime
    };
  };

  const generateChartAndTableData = (sourceRows = null) => {
    const dataRows = sourceRows || allRows;
    const workerData = {};
    const stationData = {};

    const getCategory = (row) => {
      const detay = (row.detay || "").toUpperCase();
      const ikon = row.ikon || "";
      const atama = (row.atama_amaci || "").toUpperCase();
      if (detay.includes("TRANSFER")) return "stage4";
      if (detay.includes("YARDIMCI")) return "stage3";
      if (ikon === "⭐" || atama.includes("MASTER") || atama.includes("USTA"))
        return "stage2";
      if (
        ikon === "🎓" ||
        ikon === "📚" ||
        atama.includes("POOL") ||
        atama.includes("YEDEK") ||
        atama.includes("MERGE")
      )
        return "stage2";
      return "stage1";
    };

    dataRows.forEach((st) => {
      if (!st.id) return;
      const stName = st.id.split("(")[0].trim();
      const stWorkers = new Set();
      const perWorkerLoad = {};

      st.rows?.forEach((r) => {
        const val =
          parseFloat((r.sure || "0").toString().replace(",", ".")) || 0;
        const w = r.personel?.trim();
        if (w && w !== "-" && !w.includes("DEVRE") && !w.includes("BOŞ")) {
          stWorkers.add(w);
          perWorkerLoad[w] = (perWorkerLoad[w] || 0) + val;
          if (!workerData[w])
            workerData[w] = {
              total: 0,
              stations: {},
              cats: { stage1: 0, stage2: 0, stage3: 0, stage4: 0 },
              stationTimes: {}
            };
          workerData[w].total += val;
          workerData[w].stationTimes[stName] =
            (workerData[w].stationTimes[stName] || 0) + val;
          const cat = getCategory(r);
          workerData[w].cats[cat] = (workerData[w].cats[cat] || 0) + val;
          if (!workerData[w].stations[stName])
            workerData[w].stations[stName] = [];
          if (r.operasyon && r.operasyon !== "TÜM OPERASYONLAR") {
            workerData[w].stations[stName].push(r.operasyon);
          }
        }
      });
      const stCycleTime =
        Object.values(perWorkerLoad).length > 0
          ? Math.max(...Object.values(perWorkerLoad))
          : 0;
      if (stCycleTime > 0) {
        stationData[stName] = {
          total: stCycleTime,
          workers: Array.from(stWorkers).join(", ")
        };
      }
    });

    const sortedWorkers = Object.entries(workerData)
      .map(([name, data]) => ({
        name,
        time: data.total,
        stationsMap: data.stations,
        stationTimes: data.stationTimes,
        cats: data.cats
      }))
      .sort((a, b) => b.time - a.time);

    const sortedStations = Object.entries(stationData)
      .map(([name, data]) => ({
        name,
        time: data.total,
        workers: data.workers
      }))
      .sort((a, b) => b.time - a.time);

    let variance = 0;
    let stdDev = 0;

    if (sortedWorkers.length > 0) {
      const mean =
        sortedWorkers.reduce((acc, w) => acc + (w.time || 0), 0) /
        sortedWorkers.length;
      const totalMad = sortedWorkers.reduce(
        (acc, w) => acc + Math.abs((w.time || 0) - mean),
        0
      );
      stdDev = totalMad;
      variance = totalMad / sortedWorkers.length;
    }
    return {
      sortedWorkers,
      sortedStations,
      stdDev,
      maxWorkerTime: sortedWorkers[0]?.time || 1,
      maxStationTime: sortedStations[0]?.time || 1
    };
  };

  const exportToExcel = (type) => {
    if (!planData) return;
    const sourceRows = planData.clean || planData.stage4 || [];
    const { sortedWorkers, sortedStations } =
      generateChartAndTableData(sourceRows);
    let csvRows = [];
    if (type === "kisi") {
      csvRows.push(["Operatör", "Toplam Süre (s)", "İstasyon", "Operasyonlar"]);
      sortedWorkers.forEach((w) => {
        const stations = Object.entries(w.stationsMap || {});
        if (stations.length === 0) {
          csvRows.push([w.name, (w.time || 0).toFixed(2), "-", "-"]);
        } else {
          stations.forEach(([st, ops], idx) => {
            csvRows.push([
              idx === 0 ? w.name : "",
              idx === 0 ? (w.time || 0).toFixed(2) : "",
              st,
              (ops || []).join(", ")
            ]);
          });
        }
      });
    } else {
      csvRows.push(["İstasyon", "Çevrim Süresi (s)", "Çalışan Operatörler"]);
      sortedStations.forEach((s) => {
        csvRows.push([s.name, (s.time || 0).toFixed(2), s.workers || "-"]);
      });
    }
    const csvContent =
      "\uFEFF" +
      csvRows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")
        )
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      type === "kisi" ? "operatör_listesi.csv" : "istasyon_listesi.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const getGraphSourceData = () => {
    if (!planData) return allRows;
    switch (selectedGraphStage) {
      case "stage1":
        return planData.stage1 || [];
      case "stage2":
        return planData.stage2 || [];
      case "stage3":
        return planData.before_stage4 || planData.stage3 || [];
      case "final":
        return planData.clean || [];
      default:
        return planData.clean || [];
    }
  };

  // --- 5. RENDER YARDIMCILARI & VERİ DEĞİŞKENLERİ ---
  const stats = calculateStats();
  const activeChartData = generateChartAndTableData(getGraphSourceData());
  const stage3ChartData = generateChartAndTableData(
    planData?.before_stage4 || planData?.stage3 || []
  );

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const StageButton = ({ id, label }) => {
    const isActive = activeStage === id && activeMenu === "atama";
    return (
      <TouchableOpacity
        style={[styles.subMenuItem, isActive ? styles.subMenuItemActive : null]}
        onPress={() => {
          setActiveMenu("atama");
          changeStage(id);
        }}
      >
        <Text
          style={[
            styles.subMenuText,
            isActive ? { color: colors.text.main, fontWeight: "bold" } : null
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStageToggles = () => (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.background.secondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border.default,
        overflow: "hidden"
      }}
    >
      {[
        { id: "stage1", label: "Aşama 1" },
        { id: "stage2", label: "Aşama 2" },
        { id: "stage3", label: "Aşama 3" },
        { id: "final", label: "Final (Aşama 4)" }
      ].map((stg) => {
        const isActive = selectedGraphStage === stg.id;
        const activeColor =
          stg.id === "stage1"
            ? colors.status.primary
            : stg.id === "stage2"
              ? colors.status.purple
              : stg.id === "stage3"
                ? colors.status.warning
                : colors.status.success;
        return (
          <TouchableOpacity
            key={stg.id}
            onPress={() => setSelectedGraphStage(stg.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: isActive ? activeColor : "transparent"
            }}
          >
            <Text
              style={{
                color: isActive ? "#fff" : colors.text.muted,
                fontSize: 11,
                fontWeight: "bold"
              }}
            >
              {stg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderVarianceCards = () => {
    if (selectedGraphStage === "final") {
      const preS4Dev = stage3ChartData?.stdDev || 0;
      const finalDev = activeChartData?.stdDev || 0;
      const impPct =
        preS4Dev > 0
          ? (((preS4Dev - finalDev) / preS4Dev) * 100).toFixed(1)
          : "0.0";
      const isBetter = finalDev < preS4Dev;

      return (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(29,78,216,0.12)",
              borderWidth: 1,
              borderColor: colors.status.primary,
              borderRadius: 7,
              padding: 8
            }}
          >
            <Text
              style={{
                color: colors.status.primary,
                fontSize: 9,
                marginBottom: 2
              }}
            >
              ✅ Final Sapma
            </Text>
            <Text
              style={{
                color: colors.status.primary,
                fontSize: 14,
                fontWeight: "900"
              }}
            >
              {finalDev.toFixed(2)}s
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(124,58,237,0.12)",
              borderWidth: 1,
              borderColor: colors.status.purple,
              borderRadius: 7,
              padding: 8
            }}
          >
            <Text
              style={{
                color: colors.status.purple,
                fontSize: 9,
                marginBottom: 2
              }}
            >
              📉 Aşama 4 Öncesi
            </Text>
            <Text
              style={{
                color: colors.status.purple,
                fontSize: 14,
                fontWeight: "900"
              }}
            >
              {preS4Dev.toFixed(2)}s
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: isBetter
                ? "rgba(16,185,129,0.12)"
                : "rgba(239,68,68,0.12)",
              borderWidth: 1,
              borderColor: isBetter
                ? colors.status.success
                : colors.status.danger,
              borderRadius: 7,
              padding: 8
            }}
          >
            <Text
              style={{
                color: isBetter ? colors.status.success : colors.status.danger,
                fontSize: 9,
                marginBottom: 2
              }}
            >
              📈 İyileşme Oranı
            </Text>
            <Text
              style={{
                color: isBetter ? colors.status.success : colors.status.danger,
                fontSize: 14,
                fontWeight: "900"
              }}
            >
              {isBetter ? `%${impPct}` : `-%${Math.abs(impPct)}`}
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(29,78,216,0.12)",
            borderWidth: 1,
            borderColor: colors.status.primary,
            borderRadius: 7,
            padding: 8
          }}
        >
          <Text
            style={{
              color: colors.status.primary,
              fontSize: 9,
              marginBottom: 2
            }}
          >
            📊 Görüntülenen Aşama Sapması
          </Text>
          <Text
            style={{
              color: colors.status.primary,
              fontSize: 14,
              fontWeight: "900"
            }}
          >
            {(activeChartData?.stdDev || 0).toFixed(2)}s
          </Text>
        </View>
        <View style={{ flex: 2 }} />
      </View>
    );
  };

  // --- 6. ANA Uİ RENDER ---
  return (
    <SafeAreaView style={styles.container}>
      {/* SOL SİDEBAR */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View>
            <Text style={styles.sidebarTitle}>🏭 BEKO A.Ş.</Text>
            <Text
              style={{
                color: colors.status.success,
                fontSize: 9,
                fontWeight: "600",
                marginTop: 2
              }}
            >
              ÜRETİM YÖNETİM SİSTEMİ
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              padding: 6,
              backgroundColor: colors.background.tertiary,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.border.default
            }}
          >
            <Text style={{ fontSize: 14 }}>{isDarkMode ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{
            flex: 1,
            ...(Platform.OS === "web" ? { overflowY: "auto" } : {})
          }}
          contentContainerStyle={{ paddingBottom: 20, paddingRight: 15 }}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
        >
          <View style={styles.formSection}>
            <Text style={styles.sidebarLabel}>PLANLAMA PARAMETRELERİ</Text>

            {/* SKU SEÇİMİ */}
            <View style={[styles.inputGroup, { zIndex: 50 }]}>
              <Text style={styles.inputLabel}>SKU Seçimi:</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowSkuPicker(!showSkuPicker)}
              >
                <Text style={{ color: colors.text.main, fontSize: 12 }}>
                  {formData.sku}
                </Text>
                <Text style={{ color: colors.text.muted, fontSize: 12 }}>
                  ▼
                </Text>
              </TouchableOpacity>
              {showSkuPicker && (
                <View style={styles.dropdownList}>
                  {mevcutSKUlar.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData({ ...formData, sku: s });
                        setShowSkuPicker(false);
                      }}
                    >
                      <Text style={{ color: colors.text.main, fontSize: 12 }}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* HEDEF TALEP */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hedef Talep (Adet):</Text>
              <TextInput
                style={styles.input}
                value={String(formData.demand)}
                onChangeText={(t) => setFormData({ ...formData, demand: t })}
                onFocus={() => {
                  if (!formData.demand) return;
                  setFormData({ ...formData, demand: "" });
                }}
                placeholder="Hedef Adet"
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
              />
            </View>

            {/* DEVAMSIZ PERSONEL */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Operatör Devamlılığı:</Text>
              <TouchableOpacity
                onPress={() => setShowWorkerPanel(!showWorkerPanel)}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: colors.background.secondary,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor:
                    absentWorkers.length > 0
                      ? colors.status.danger
                      : colors.border.default
                }}
              >
                <Text
                  style={{
                    color:
                      absentWorkers.length > 0
                        ? colors.status.danger
                        : colors.text.main,
                    fontSize: 12
                  }}
                >
                  🚫 Devamsız Personel{" "}
                  {absentWorkers.length > 0 ? `(${absentWorkers.length})` : ""}
                </Text>
                <Text style={{ color: colors.text.muted, fontSize: 11 }}>
                  {showWorkerPanel ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              {showWorkerPanel && (
                <View
                  style={{
                    backgroundColor: colors.background.main,
                    borderWidth: 1,
                    borderColor: colors.border.default,
                    borderRadius: 4,
                    marginTop: 4,
                    maxHeight: 220
                  }}
                >
                  <TextInput
                    style={{
                      backgroundColor: colors.background.secondary,
                      color: colors.text.main,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderBottomWidth: 1,
                      borderColor: colors.border.default,
                      fontSize: 11
                    }}
                    placeholder="İsim ara..."
                    placeholderTextColor={colors.text.muted}
                    value={workerSearch}
                    onChangeText={setWorkerSearch}
                  />
                  <ScrollView
                    style={{ maxHeight: 160 }}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                  >
                    {allWorkers
                      .filter((w) =>
                        w.toLowerCase().includes(workerSearch.toLowerCase())
                      )
                      .map((worker) => {
                        const isAbsent = absentWorkers.includes(worker);
                        return (
                          <TouchableOpacity
                            key={worker}
                            onPress={() => toggleAbsent(worker)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              borderBottomWidth: 1,
                              borderColor: colors.border.light,
                              backgroundColor: isAbsent
                                ? "rgba(239,68,68,0.1)"
                                : "transparent"
                            }}
                          >
                            <View
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3,
                                borderWidth: 1,
                                borderColor: isAbsent
                                  ? colors.status.danger
                                  : colors.border.default,
                                backgroundColor: isAbsent
                                  ? colors.status.danger
                                  : "transparent",
                                marginRight: 8,
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              {isAbsent && (
                                <Text
                                  style={{
                                    color: "#fff",
                                    fontSize: 9,
                                    fontWeight: "bold"
                                  }}
                                >
                                  ✕
                                </Text>
                              )}
                            </View>
                            <Text
                              style={{
                                color: isAbsent
                                  ? colors.status.danger
                                  : colors.text.secondary,
                                fontSize: 11,
                                flex: 1
                              }}
                            >
                              {worker}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                  {absentWorkers.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setAbsentWorkers([])}
                      style={{
                        padding: 6,
                        borderTopWidth: 1,
                        borderColor: colors.border.default,
                        alignItems: "center"
                      }}
                    >
                      <Text
                        style={{ color: colors.status.danger, fontSize: 10 }}
                      >
                        Seçimleri Temizle
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.calcBtn}
              onPress={hesapla}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.calcBtnText}>HESAPLA</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* GÖRÜNÜM MENÜLERİ */}
          <View style={[styles.menuSection, { zIndex: 1 }]}>
            <Text style={styles.sidebarLabel}>GÖRÜNÜMLER</Text>
            <View style={styles.menuGroup}>
              {/* ATAMA GÖSTERİMİ */}
              <TouchableOpacity
                activeOpacity={planData ? 0.2 : 1}
                style={[
                  styles.menuItem,
                  activeMenu === "atama" ? styles.menuItemActive : null,
                  !planData && { opacity: 0.4 }
                ]}
                onPress={() => planData && handleMenuClick("atama")}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <Text style={styles.menuItemText}>
                    🏭 Atama Gösterimi (Hat)
                  </Text>
                  {planData && (
                    <Text style={{ color: colors.text.muted, fontSize: 10 }}>
                      {expandedMenu === "atama" ? "▼" : "▶"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {expandedMenu === "atama" && planData && (
                <View style={styles.subMenuContainer}>
                  <Text
                    style={{
                      color: colors.text.muted,
                      fontSize: 10,
                      marginBottom: 5
                    }}
                  >
                    AŞAMA SEÇİCİ
                  </Text>
                  <StageButton id="clean" label="🎯 Final Planı" />
                  <StageButton id="stage1" label="🧠 Aşama 1 (Yetkinlik)" />
                  <StageButton
                    id="stage2"
                    label="🎓 Aşama 2 (Eğitim,Usta,Komşu)"
                  />
                  <StageButton id="stage3" label="⚠️ Aşama 3 (Darboğaz)" />
                  <StageButton id="stage4" label="🔄 Aşama 4 (Sapma)" />
                </View>
              )}

              {/* TABLO GÖSTERİMİ */}
              <TouchableOpacity
                activeOpacity={planData ? 0.2 : 1}
                style={[
                  styles.menuItem,
                  activeMenu === "tablo" ? styles.menuItemActive : null,
                  !planData && { opacity: 0.4 },
                  { marginTop: 5 }
                ]}
                onPress={() => planData && handleMenuClick("tablo")}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <Text style={styles.menuItemText}>
                    📋 İstasyon/Operatör Listesi
                  </Text>
                  {planData && (
                    <Text style={{ color: colors.text.muted, fontSize: 10 }}>
                      {expandedMenu === "tablo" ? "▼" : "▶"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {expandedMenu === "tablo" && planData && (
                <View style={styles.subMenuContainer}>
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      activeTabloView === "kisi" && activeMenu === "tablo"
                        ? styles.subMenuItemActive
                        : null
                    ]}
                    onPress={() => {
                      setActiveMenu("tablo");
                      setActiveTabloView("kisi");
                    }}
                  >
                    <Text
                      style={[
                        styles.subMenuText,
                        activeTabloView === "kisi" && activeMenu === "tablo"
                          ? { color: colors.text.main, fontWeight: "bold" }
                          : null
                      ]}
                    >
                      👥 Operatör Bazlı Liste
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      activeTabloView === "istasyon" && activeMenu === "tablo"
                        ? styles.subMenuItemActive
                        : null
                    ]}
                    onPress={() => {
                      setActiveMenu("tablo");
                      setActiveTabloView("istasyon");
                    }}
                  >
                    <Text
                      style={[
                        styles.subMenuText,
                        activeTabloView === "istasyon" && activeMenu === "tablo"
                          ? { color: colors.text.main, fontWeight: "bold" }
                          : null
                      ]}
                    >
                      🏭 İstasyon Bazlı Liste
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* GRAFİK GÖSTERİMİ */}
              <TouchableOpacity
                activeOpacity={planData ? 0.2 : 1}
                style={[
                  styles.menuItem,
                  activeMenu === "grafik" ? styles.menuItemActive : null,
                  !planData && { opacity: 0.4 },
                  { marginTop: 5 }
                ]}
                onPress={() => planData && handleMenuClick("grafik")}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <Text style={styles.menuItemText}>📈 Analiz Grafikleri</Text>
                  {planData && (
                    <Text style={{ color: colors.text.muted, fontSize: 10 }}>
                      {expandedMenu === "grafik" ? "▼" : "▶"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {expandedMenu === "grafik" && planData && (
                <View style={styles.subMenuContainer}>
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      activeGrafikView === "kisi" && activeMenu === "grafik"
                        ? styles.subMenuItemActive
                        : null
                    ]}
                    onPress={() => {
                      setActiveMenu("grafik");
                      setActiveGrafikView("kisi");
                    }}
                  >
                    <Text
                      style={[
                        styles.subMenuText,
                        activeGrafikView === "kisi" && activeMenu === "grafik"
                          ? { color: colors.text.main, fontWeight: "bold" }
                          : null
                      ]}
                    >
                      👥 Operatör Bazlı Grafik
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      activeGrafikView === "istasyon" && activeMenu === "grafik"
                        ? styles.subMenuItemActive
                        : null
                    ]}
                    onPress={() => {
                      setActiveMenu("grafik");
                      setActiveGrafikView("istasyon");
                    }}
                  >
                    <Text
                      style={[
                        styles.subMenuText,
                        activeGrafikView === "istasyon" &&
                        activeMenu === "grafik"
                          ? { color: colors.text.main, fontWeight: "bold" }
                          : null
                      ]}
                    >
                      🏭 İstasyon Bazlı Grafik
                    </Text>
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
            <ActivityIndicator size="large" color={colors.status.primary} />
            <Text style={styles.loadingText}>Plan Hesaplanıyor...</Text>
          </View>
        ) : !planData ? (
          <View style={styles.centerBox}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>👋</Text>
            <Text style={styles.placeholderText}>
              Sol menüden SKU ve Hedef seçip HESAPLA butonuna basın.
            </Text>
          </View>
        ) : (
          <>
            {/* ÜST İSTATİSTİK BARI */}
            <View style={styles.statsHeader}>
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>Açık İstasyon</Text>
                <Text
                  style={[styles.statValue, { color: colors.status.success }]}
                >
                  🟢 {stats.active}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>Kapalı İstasyon</Text>
                <Text
                  style={[styles.statValue, { color: colors.status.danger }]}
                >
                  🔴 {stats.passive}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>Çevrim Süresi</Text>
                <Text
                  style={[styles.statValue, { color: colors.status.primary }]}
                >
                  ⏱️ {stats.cycle}s
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDarkMode ? "#1e1b4b" : "#f3e8ff",
                    borderColor: colors.status.purple,
                    borderWidth: 1
                  }
                ]}
              >
                <Text
                  style={[styles.statTitle, { color: colors.status.purple }]}
                >
                  Hedef Süresi
                </Text>
                <Text
                  style={[styles.statValue, { color: colors.status.purple }]}
                >
                  ⏳ {stats.formattedTime}
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    borderColor: colors.status.warning,
                    borderWidth: 1,
                    flex: 1.5
                  }
                ]}
              >
                <Text style={styles.statTitle}>🔥 Darboğaz Personeli</Text>
                <Text
                  style={[styles.statValue, { color: colors.status.warning }]}
                >
                  {stats.cycleWorker || "-"}{" "}
                  <Text style={{ fontSize: 12 }}>({stats.cycle}s)</Text>
                </Text>
              </View>
            </View>

            <View style={styles.contentArea}>
              {/* HARİTA ALANI */}
              {activeMenu === "atama" && (
                <View
                  ref={mapContainerRef}
                  style={[
                    styles.mapContainer,
                    { cursor: isDragging ? "grabbing" : "grab" }
                  ]}
                  {...(Platform.OS !== "web" ? panResponder.panHandlers : {})}
                >
                  <TouchableOpacity style={styles.resetBtn} onPress={resetMap}>
                    <Text style={{ color: colors.text.main, fontSize: 10 }}>
                      📍 Merkezi Bul
                    </Text>
                  </TouchableOpacity>
                  {/* Animated.View İçeriği - index.jsx içindeki mapContainerRef alanının içi */}
                  <Animated.View
                    pointerEvents="box-none"
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale: scale }
                      ]
                    }}
                  >
                    {/* YENİ: Fabrika Zemini Container'ı */}
                    <View
                      style={{
                        backgroundColor: isDarkMode ? "#161b22" : "#ffffff",
                        borderRadius: 24,
                        borderWidth: 2,
                        borderColor: isDarkMode ? "#30363d" : "#e2e8f0",
                        padding: 60, // Bant ve kenarlar için nefes alma boşluğu
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: isDarkMode ? 0.5 : 0.1,
                        shadowRadius: 20,
                        elevation: 10
                      }}
                    >
                      {/* Üst Satır (İleri Akan Bant) */}
                      <View
                        style={{ flexDirection: "row", position: "relative" }}
                      >
                        {/* Konveyör Bant Arka Planı */}
                        <ConveyorBelt
                          direction="horizontal-right"
                          isDarkMode={isDarkMode}
                          colors={colors}
                          style={{
                            top: "50%",
                            left: -12,
                            right: -42,
                            height: 34,
                            marginTop: -17
                          }}
                        />

                        {/* İstasyonlar */}
                        <View
                          style={{ flexDirection: "row", gap: 10, zIndex: 2 }}
                        >
                          {topLine.map((st, idx) => (
                            <StationBox
                              key={st.id}
                              st={st}
                              scale={scale}
                              threshold={ZOOM_THRESHOLD}
                              showLabel={scale > ZOOM_THRESHOLD}
                              onSelect={setSelectedStation}
                              selectedId={selectedStation?.id}
                              activeStage={activeStage}
                              direction="up"
                              showArrow={idx >= 2 && (idx - 2) % 5 === 0}
                              colors={colors}
                              isDarkMode={isDarkMode} // Temayı prop olarak geç
                            />
                          ))}
                        </View>
                      </View>

                      {/* Orta Metin ve Yan Satır */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginVertical: 30
                        }}
                      >
                        {/* Montaj 2 Yazısı */}
                        <View
                          style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Text
                            style={{
                              color: isDarkMode
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(15,23,42,0.05)",
                              fontSize: 48,
                              fontWeight: "900",
                              letterSpacing: 10,
                              textTransform: "uppercase",
                              pointerEvents: "none",
                              textAlign: "center"
                            }}
                          >
                            MONTAJ 2 Hatti
                          </Text>
                        </View>

                        {/* Yan Satır (Aşağı Akan Bant) */}
                        <View style={{ position: "relative" }}>
                          {/* Konveyör Bant Arka Planı */}
                          <ConveyorBelt
                            direction="vertical-down"
                            isDarkMode={isDarkMode}
                            colors={colors}
                            style={{
                              top: -52,
                              bottom: -52,
                              left: "50%",
                              width: 34,
                              marginLeft: -17
                            }}
                          />

                          <View
                            style={{
                              flexDirection: "column",
                              gap: 10,
                              zIndex: 2
                            }}
                          >
                            {sideLine.map((st, idx) => (
                              <StationBox
                                key={st.id}
                                st={st}
                                scale={scale}
                                threshold={ZOOM_THRESHOLD}
                                showLabel={scale > ZOOM_THRESHOLD}
                                onSelect={setSelectedStation}
                                selectedId={selectedStation?.id}
                                activeStage={activeStage}
                                direction="right"
                                showArrow={idx >= 2 && (idx - 2) % 5 === 0}
                                colors={colors}
                                isDarkMode={isDarkMode}
                              />
                            ))}
                          </View>
                        </View>
                      </View>

                      {/* Alt Satır (Geri Akan Bant) */}
                      <View
                        style={{ flexDirection: "row", position: "relative" }}
                      >
                        {/* Konveyör Bant Arka Planı */}
                        <ConveyorBelt
                          direction="horizontal-left"
                          isDarkMode={isDarkMode}
                          colors={colors}
                          style={{
                            top: "50%",
                            left: -12,
                            right: -42,
                            height: 34,
                            marginTop: -17
                          }}
                        />

                        <View
                          style={{
                            flexDirection: "row",
                            gap: 10,
                            alignSelf: "flex-end",
                            zIndex: 2
                          }}
                        >
                          {bottomLine.map((st, idx) => (
                            <StationBox
                              key={st.id}
                              st={st}
                              scale={scale}
                              threshold={ZOOM_THRESHOLD}
                              showLabel={scale > ZOOM_THRESHOLD}
                              onSelect={setSelectedStation}
                              selectedId={selectedStation?.id}
                              activeStage={activeStage}
                              direction="down"
                              showArrow={idx >= 2 && (idx - 2) % 5 === 0}
                              colors={colors}
                              isDarkMode={isDarkMode}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              )}

              {/* KİŞİ BAZLI LİSTE (TABLO) */}
              {activeMenu === "tablo" && activeTabloView === "kisi" && (
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.default,
                      flexWrap: "wrap",
                      gap: 8
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text.main,
                        fontSize: 18,
                        fontWeight: "bold"
                      }}
                    >
                      👥 Kişi Bazlı Atama Listesi
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10
                      }}
                    >
                      {planData && Platform.OS === "web" && (
                        <TouchableOpacity
                          onPress={() => exportToExcel("kisi")}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(16,185,129,0.15)",
                            borderWidth: 1,
                            borderColor: colors.status.success,
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 6
                          }}
                        >
                          <Text
                            style={{
                              color: colors.status.success,
                              fontSize: 12,
                              fontWeight: "bold"
                            }}
                          >
                            📥 Excel'e Aktar
                          </Text>
                        </TouchableOpacity>
                      )}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: colors.background.main,
                          borderWidth: 1,
                          borderColor: colors.border.default,
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 6
                        }}
                      >
                        <Text
                          style={{ color: colors.text.muted, fontSize: 13 }}
                        >
                          🔍
                        </Text>
                        <TextInput
                          value={workerChartFilter}
                          onChangeText={setWorkerChartFilter}
                          placeholder="Personel ara..."
                          placeholderTextColor={colors.text.muted}
                          style={{
                            color: colors.text.main,
                            fontSize: 13,
                            minWidth: 150,
                            ...(Platform.OS === "web"
                              ? { outline: "none" }
                              : {}),
                            borderWidth: 0,
                            backgroundColor: "transparent"
                          }}
                        />
                        {workerChartFilter.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setWorkerChartFilter("")}
                          >
                            <Text
                              style={{
                                color: colors.text.muted,
                                fontSize: 13,
                                fontWeight: "bold"
                              }}
                            >
                              ✕
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {planData && renderStageToggles()}
                    </View>
                  </View>
                  <ScrollView
                    style={{ flex: 1, padding: 16 }}
                    contentContainerStyle={{ paddingBottom: 50 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginHorizontal: -8
                      }}
                    >
                      {(activeChartData?.sortedWorkers || [])
                        .filter(
                          (w) =>
                            !workerChartFilter.trim() ||
                            w.name
                              .toLowerCase()
                              .includes(workerChartFilter.trim().toLowerCase())
                        )
                        .map((w, i) => (
                          <View
                            key={i}
                            style={{
                              width: Platform.OS === "web" ? "33.33%" : "100%",
                              padding: 8,
                              minWidth: 300
                            }}
                          >
                            <View style={styles.workerCard}>
                              <View style={styles.workerCardHeader}>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8
                                  }}
                                >
                                  <Text style={{ fontSize: 18 }}>👤</Text>
                                  <Text style={styles.workerNameText}>
                                    {w.name}
                                  </Text>
                                </View>
                                <View style={styles.workerTimeBadge}>
                                  <Text style={styles.workerTimeText}>
                                    ⏱ {(w.time || 0).toFixed(2)}s
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.workerCardBody}>
                                {Object.entries(w.stationsMap || {}).map(
                                  ([st, ops], idx) => (
                                    <View key={idx} style={styles.stationGroup}>
                                      <Text style={styles.stationGroupTitle}>
                                        📍 {st}
                                      </Text>
                                      <View style={styles.opBadgeContainer}>
                                        {(ops || []).map((op, opIdx) => (
                                          <View
                                            key={opIdx}
                                            style={styles.opBadge}
                                          >
                                            <Text style={styles.opBadgeText}>
                                              {op}
                                            </Text>
                                          </View>
                                        ))}
                                      </View>
                                    </View>
                                  )
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* İSTASYON BAZLI LİSTE (TABLO) */}
              {activeMenu === "tablo" && activeTabloView === "istasyon" && (
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.default,
                      flexWrap: "wrap",
                      gap: 8
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text.main,
                        fontSize: 18,
                        fontWeight: "bold"
                      }}
                    >
                      🏭 İstasyon Bazlı Atama Listesi
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10
                      }}
                    >
                      {planData && Platform.OS === "web" && (
                        <TouchableOpacity
                          onPress={() => exportToExcel("istasyon")}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(16,185,129,0.15)",
                            borderWidth: 1,
                            borderColor: colors.status.success,
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 6
                          }}
                        >
                          <Text
                            style={{
                              color: colors.status.success,
                              fontSize: 12,
                              fontWeight: "bold"
                            }}
                          >
                            📥 Excel'e Aktar
                          </Text>
                        </TouchableOpacity>
                      )}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: colors.background.main,
                          borderWidth: 1,
                          borderColor: colors.border.default,
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 6
                        }}
                      >
                        <Text
                          style={{ color: colors.text.muted, fontSize: 13 }}
                        >
                          🔍
                        </Text>
                        <TextInput
                          value={stationChartFilter}
                          onChangeText={setStationChartFilter}
                          placeholder="İstasyon ara..."
                          placeholderTextColor={colors.text.muted}
                          style={{
                            color: colors.text.main,
                            fontSize: 13,
                            minWidth: 150,
                            ...(Platform.OS === "web"
                              ? { outline: "none" }
                              : {}),
                            borderWidth: 0,
                            backgroundColor: "transparent"
                          }}
                        />
                        {stationChartFilter.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setStationChartFilter("")}
                          >
                            <Text
                              style={{
                                color: colors.text.muted,
                                fontSize: 13,
                                fontWeight: "bold"
                              }}
                            >
                              ✕
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {planData && renderStageToggles()}
                    </View>
                  </View>
                  <ScrollView
                    style={{ flex: 1, padding: 16 }}
                    contentContainerStyle={{ paddingBottom: 50 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginHorizontal: -8
                      }}
                    >
                      {(activeChartData?.sortedStations || [])
                        .filter(
                          (s) =>
                            !stationChartFilter.trim() ||
                            s.name
                              .toLowerCase()
                              .includes(stationChartFilter.trim().toLowerCase())
                        )
                        .map((s, i) => (
                          <View
                            key={i}
                            style={{
                              width: Platform.OS === "web" ? "33.33%" : "100%",
                              padding: 8,
                              minWidth: 300
                            }}
                          >
                            <View style={styles.workerCard}>
                              <View style={styles.workerCardHeader}>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8
                                  }}
                                >
                                  <Text style={{ fontSize: 18 }}>🏭</Text>
                                  <Text style={styles.workerNameText}>
                                    {s.name}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.workerTimeBadge,
                                    {
                                      borderColor: colors.status.success,
                                      backgroundColor:
                                        "rgba(16, 185, 129, 0.15)"
                                    }
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: colors.status.success,
                                      fontSize: 12,
                                      fontWeight: "bold"
                                    }}
                                  >
                                    ⏱ {(s.time || 0).toFixed(2)}s
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.workerCardBody}>
                                <Text style={styles.stationGroupTitle}>
                                  Çalışan Operatörler
                                </Text>
                                <Text
                                  style={{
                                    color: colors.text.secondary,
                                    fontSize: 13
                                  }}
                                >
                                  {s.workers || "-"}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* KİŞİ BAZLI GRAFİK */}
              {activeMenu === "grafik" &&
                activeGrafikView === "kisi" &&
                Platform.OS === "web" &&
                (() => {
                  const workers = activeChartData.sortedWorkers || [];
                  const maxT = (activeChartData?.maxWorkerTime || 1) * 1.15;
                  const CAT_COLORS = {
                    stage1: colors.status.success,
                    stage2: colors.status.purple,
                    stage3: colors.status.warning,
                    stage4: colors.status.primary
                  };
                  const CAT_LABELS = {
                    stage1: "Aşama 1 - Temel Atama (yetkin)",
                    stage2: "Aşama 2 - Temel Atama (eğitimci,usta,komşu)",
                    stage3: "Aşama 3 - Darboğaz Yardımı",
                    stage4: "Aşama 4 - Sapma Azaltma"
                  };
                  const yTicks = [
                    0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
                  ].map((pct) => ({
                    pct,
                    val: ((maxT * pct) / 100).toFixed(1)
                  }));
                  const Y_AXIS_W = 44;
                  const X_LABEL_H = 100;

                  return (
                    <View style={{ flex: 1, padding: 16 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          flexWrap: "wrap",
                          gap: 8
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text.main,
                            fontSize: 15,
                            fontWeight: "bold"
                          }}
                        >
                          📊 Personel İş Yükü Dağılımı
                        </Text>
                        {planData && renderStageToggles()}
                      </View>
                      {planData && renderVarianceCards()}
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 10,
                          marginBottom: 8
                        }}
                      >
                        {Object.entries(CAT_LABELS).map(([key, label]) => (
                          <View
                            key={key}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 5
                            }}
                          >
                            <View
                              style={{
                                width: 12,
                                height: 12,
                                backgroundColor: CAT_COLORS[key],
                                borderRadius: 2
                              }}
                            />
                            <Text
                              style={{
                                color: colors.text.secondary,
                                fontSize: 10
                              }}
                            >
                              {label}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <View
                        style={{
                          flex: 1,
                          backgroundColor: colors.background.main,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.border.light,
                          padding: 12,
                          paddingTop: 20,
                          marginTop: 5,
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "row"
                          }}
                        >
                          <div
                            style={{
                              width: `${Y_AXIS_W}px`,
                              flexShrink: 0,
                              position: "relative",
                              marginBottom: `${X_LABEL_H}px`
                            }}
                          >
                            {yTicks.slice(1).map(({ pct, val }) => (
                              <div
                                key={pct}
                                style={{
                                  position: "absolute",
                                  bottom: `${pct}%`,
                                  right: 6,
                                  transform: "translateY(50%)",
                                  lineHeight: 1
                                }}
                              >
                                <span
                                  style={{
                                    color: colors.text.muted,
                                    fontSize: "10px",
                                    whiteSpace: "nowrap",
                                    fontWeight: "500"
                                  }}
                                >
                                  {val}s
                                </span>
                              </div>
                            ))}
                            <div
                              style={{
                                position: "absolute",
                                bottom: 0,
                                right: 6
                              }}
                            >
                              <span
                                style={{
                                  color: colors.text.muted,
                                  fontSize: "10px",
                                  whiteSpace: "nowrap",
                                  fontWeight: "500"
                                }}
                              >
                                0s
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              minWidth: 0
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                position: "relative",
                                borderLeft: `1px solid ${colors.border.default}`,
                                borderBottom: `1px solid ${colors.border.default}`
                              }}
                            >
                              {yTicks.slice(1).map(({ pct }) => (
                                <div
                                  key={pct}
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    bottom: `${pct}%`,
                                    height: "1px",
                                    backgroundColor:
                                      pct === 100
                                        ? colors.border.default
                                        : isDarkMode
                                          ? "rgba(55,65,81,0.5)"
                                          : "rgba(203,213,225,0.5)",
                                    pointerEvents: "none"
                                  }}
                                />
                              ))}
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "flex-end",
                                  gap: "2px",
                                  padding: "0 2px"
                                }}
                              >
                                {workers.map((w, i) => {
                                  const cats = w.cats || {};
                                  const isPeak =
                                    w.time === activeChartData.maxWorkerTime;
                                  const barH = (w.time / maxT) * 100;
                                  return (
                                    <div
                                      key={i}
                                      title={`${w.name}  |  Toplam: ${(w.time || 0).toFixed(2)}s\nAş.1: ${(cats.stage1 || 0).toFixed(1)}s  |  Aş.2: ${(cats.stage2 || 0).toFixed(1)}s  |  Aş.3: ${(cats.stage3 || 0).toFixed(1)}s  |  Aş.4: ${(cats.stage4 || 0).toFixed(1)}s`}
                                      style={{
                                        flex: 1,
                                        minWidth: 0,
                                        height: `${barH}%`,
                                        display: "flex",
                                        flexDirection: "column-reverse",
                                        borderRadius: "2px 2px 0 0",
                                        overflow: "hidden",
                                        outline: isPeak
                                          ? `2px solid ${colors.status.warning}`
                                          : "none",
                                        cursor: "default"
                                      }}
                                    >
                                      {[
                                        "stage1",
                                        "stage2",
                                        "stage3",
                                        "stage4"
                                      ].map((cat) => {
                                        const v = cats[cat] || 0;
                                        if (v <= 0) return null;
                                        return (
                                          <div
                                            key={cat}
                                            style={{
                                              width: "100%",
                                              height: `${(v / w.time) * 100}%`,
                                              backgroundColor: CAT_COLORS[cat],
                                              flexShrink: 0
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div
                              style={{
                                height: `${X_LABEL_H}px`,
                                flexShrink: 0,
                                display: "flex",
                                gap: "2px",
                                padding: "4px 2px 0",
                                borderLeft: `1px solid ${colors.border.default}`,
                                overflow: "hidden"
                              }}
                            >
                              {workers.map((w, i) => {
                                const isPeak =
                                  w.time === activeChartData.maxWorkerTime;
                                return (
                                  <div
                                    key={i}
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      overflow: "hidden"
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: isPeak
                                          ? colors.status.warning
                                          : colors.text.muted,
                                        fontSize: "11px",
                                        fontWeight: isPeak ? "700" : "400",
                                        writingMode: "vertical-rl",
                                        textOrientation: "mixed",
                                        transform: "rotate(180deg)",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        flex: 1,
                                        textOverflow: "ellipsis",
                                        textAlign: "right"
                                      }}
                                    >
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
              {activeMenu === "grafik" &&
                activeGrafikView === "istasyon" &&
                Platform.OS === "web" &&
                (() => {
                  const stations = activeChartData.sortedStations || [];
                  const maxT = (activeChartData?.maxStationTime || 1) * 1.15;
                  const yTicks = [
                    0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
                  ].map((pct) => ({
                    pct,
                    val: ((maxT * pct) / 100).toFixed(1)
                  }));
                  const Y_AXIS_W = 44;
                  const X_LABEL_H = 100;

                  const stageColors = {
                    stage1: colors.status.primary,
                    stage2: colors.status.purple,
                    stage3: colors.status.warning,
                    final: colors.status.success
                  };
                  const baseBarColor =
                    stageColors[selectedGraphStage] || colors.status.success;
                  const peakColor = colors.status.danger;

                  return (
                    <View style={{ flex: 1, padding: 16 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          flexWrap: "wrap",
                          gap: 8
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text.main,
                            fontSize: 15,
                            fontWeight: "bold"
                          }}
                        >
                          🏭 İstasyon Süreleri Dağılımı
                        </Text>
                        {planData && renderStageToggles()}
                      </View>

                      {planData && renderVarianceCards()}

                      <View
                        style={{
                          flex: 1,
                          backgroundColor: colors.background.main,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.border.light,
                          padding: 12,
                          paddingTop: 20,
                          marginTop: 5,
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "row"
                          }}
                        >
                          <div
                            style={{
                              width: `${Y_AXIS_W}px`,
                              flexShrink: 0,
                              position: "relative",
                              marginBottom: `${X_LABEL_H}px`
                            }}
                          >
                            {yTicks.slice(1).map(({ pct, val }) => (
                              <div
                                key={pct}
                                style={{
                                  position: "absolute",
                                  bottom: `${pct}%`,
                                  right: 6,
                                  transform: "translateY(50%)",
                                  lineHeight: 1
                                }}
                              >
                                <span
                                  style={{
                                    color: colors.text.muted,
                                    fontSize: "10px",
                                    whiteSpace: "nowrap",
                                    fontWeight: "500"
                                  }}
                                >
                                  {val}s
                                </span>
                              </div>
                            ))}
                            <div
                              style={{
                                position: "absolute",
                                bottom: 0,
                                right: 6
                              }}
                            >
                              <span
                                style={{
                                  color: colors.text.muted,
                                  fontSize: "10px",
                                  whiteSpace: "nowrap",
                                  fontWeight: "500"
                                }}
                              >
                                0s
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              minWidth: 0
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                position: "relative",
                                borderLeft: `1px solid ${colors.border.default}`,
                                borderBottom: `1px solid ${colors.border.default}`
                              }}
                            >
                              {yTicks.slice(1).map(({ pct }) => (
                                <div
                                  key={pct}
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    bottom: `${pct}%`,
                                    height: "1px",
                                    backgroundColor:
                                      pct === 100
                                        ? colors.border.default
                                        : isDarkMode
                                          ? "rgba(55,65,81,0.5)"
                                          : "rgba(203,213,225,0.5)",
                                    pointerEvents: "none"
                                  }}
                                />
                              ))}
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "flex-end",
                                  gap: "2px",
                                  padding: "0 2px"
                                }}
                              >
                                {stations.map((s, i) => {
                                  const isPeak =
                                    s.time === activeChartData.maxStationTime;
                                  const barColor = isPeak
                                    ? peakColor
                                    : baseBarColor;
                                  return (
                                    <div
                                      key={i}
                                      title={`${s.name}  |  ${(s.time || 0).toFixed(2)}s\nPersonel: ${s.workers}`}
                                      style={{
                                        flex: 1,
                                        minWidth: 0,
                                        height: `${(s.time / maxT) * 100}%`,
                                        backgroundColor: barColor,
                                        borderRadius: "2px 2px 0 0",
                                        outline: isPeak
                                          ? `2px solid ${peakColor}`
                                          : "none",
                                        cursor: "default"
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            <div
                              style={{
                                height: `${X_LABEL_H}px`,
                                flexShrink: 0,
                                display: "flex",
                                gap: "2px",
                                padding: "4px 2px 0",
                                borderLeft: `1px solid ${colors.border.default}`,
                                overflow: "hidden"
                              }}
                            >
                              {stations.map((s, i) => {
                                const isPeak =
                                  s.time === activeChartData.maxStationTime;
                                return (
                                  <div
                                    key={i}
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      overflow: "hidden"
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: isPeak
                                          ? peakColor
                                          : colors.text.muted,
                                        fontSize: "11px",
                                        fontWeight: isPeak ? "700" : "400",
                                        writingMode: "vertical-rl",
                                        textOrientation: "mixed",
                                        transform: "rotate(180deg)",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        flex: 1,
                                        textOverflow: "ellipsis",
                                        textAlign: "right"
                                      }}
                                    >
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

      {/* DIŞARIDAN ÇAĞRILAN MODAL */}
      <StationDetailModal
        visible={!!selectedStation}
        onClose={() => setSelectedStation(null)}
        stationData={selectedStation}
        activeStage={activeStage}
        colors={colors}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
}
