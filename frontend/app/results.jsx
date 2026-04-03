import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../styles/theme";
import { getStyles } from "../styles/dynamicStyles";
import { GlobalStore } from "../constants/store";

const BACKEND_URL = "http://localhost:8000";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// --- MEMOIZED NODE: Gereksiz render'ı önlemek için ---
const VisualNode = React.memo(({ station, isVertical, onPress }) => {
  const isAssigned = station.status === "green";
  const isSabit = station.durum === "SABIT" || station.durum === "MASTER";

  let bgColor = "#EF4444"; // Boş/Hatalı
  if (isAssigned) bgColor = "#10B981"; // Atanmış
  if (isSabit) bgColor = "#3B82F6"; // Sabit/Kritik

  const label = String(station.id || "")
    .replace("OP_", "")
    .trim();

  return (
    <View
      style={[
        nodeStyles.container,
        isVertical ? { marginVertical: 6 } : { marginHorizontal: 6 }
      ]}
    >
      {!isVertical && (
        <View style={{ alignItems: "center", marginBottom: 4 }}>
          <Text style={nodeStyles.nodeLabel}>{label}</Text>
          <View style={nodeStyles.connector} />
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(station)}
        style={[nodeStyles.nodeBox, { backgroundColor: bgColor }]}
      >
        <Text style={{ fontSize: 16 }}>👤</Text>
      </TouchableOpacity>

      {!isVertical && <Text style={nodeStyles.nodeTime}>{station.time}s</Text>}

      {isVertical && (
        <View style={nodeStyles.verticalInfo}>
          <Text style={nodeStyles.nodeTime}>{station.time}s</Text>
          <Text style={nodeStyles.nodeLabel}>{label}</Text>
        </View>
      )}
    </View>
  );
});

export default function ResultScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = getStyles(width);

  const [activeStage, setActiveStage] = useState("stage1");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // POPUP States
  const [selectedStation, setSelectedStation] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [stageDataCache, setStageDataCache] = useState(() => {
    return GlobalStore.planData && Object.keys(GlobalStore.planData).length > 0
      ? GlobalStore.planData
      : {};
  });

  const form = GlobalStore.formData;

  useEffect(() => {
    if (!stageDataCache[activeStage]) fetchStageData(activeStage);
  }, [activeStage]);

  // Popup Animasyon Kontrolü
  useEffect(() => {
    if (selectedStation) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [selectedStation]);

  const fetchStageData = async (stageName) => {
    setIsFetching(true);
    setFetchError(false);
    try {
      const response = await fetch(
        `${BACKEND_URL}/outputs/${stageName}_data.json`
      );
      if (response.ok) {
        const data = await response.json();
        setStageDataCache((prev) => ({ ...prev, [stageName]: data }));
      } else {
        setFetchError(true);
      }
    } catch (err) {
      setFetchError(true);
    } finally {
      setIsFetching(false);
    }
  };

  const allStations = useMemo(() => {
    const currentStageData = stageDataCache[activeStage];
    const flatResults = Array.isArray(currentStageData)
      ? currentStageData
      : currentStageData?.results_flat || [];
    if (!flatResults.length) return [];

    const parsedStations = [];
    let currentStation = null;

    flatResults.forEach((row) => {
      if (!row || row.length < 7) return;
      const seq = String(row[0] || "");

      if (seq !== "") {
        const nameRaw = String(row[1] || "");
        const tag = String(row[6] || "");
        if (tag !== "DEVRE DIŞI") {
          const isAssigned =
            tag !== "BEKLEMEDE" && String(row[2]) !== "ATANMADI";
          currentStation = {
            id: nameRaw.replace(" (İstasyon Yükü)", "").trim(),
            status: isAssigned ? "green" : "red",
            durum: tag,
            time: String(row[3] || "0.00"),
            operations: []
          };
          parsedStations.push(currentStation);
        } else {
          currentStation = null;
        }
      } else if (currentStation) {
        currentStation.operations.push({
          opName: String(row[2] || ""),
          time: String(row[3] || ""),
          operator: String(row[5] || "Belirsiz"),
          method: String(row[7] || "")
        });
      }
    });
    return parsedStations;
  }, [stageDataCache, activeStage]);

  const closePopup = useCallback(() => setSelectedStation(null), []);

  // Grid Bölümleme
  const total = allStations.length;
  const topCount = Math.floor(total * 0.45);
  const rightCount = Math.floor(total * 0.15);
  const bottomCount = Math.floor(total * 0.35);

  const topLine = allStations.slice(0, topCount);
  const rightLine = allStations.slice(topCount, topCount + rightCount);
  const bottomLine = allStations.slice(
    topCount + rightCount,
    topCount + rightCount + bottomCount
  );
  const spurLine = allStations.slice(topCount + rightCount + bottomCount);

  if (isFetching && allStations.length === 0) {
    return (
      <View
        style={[
          styles.container,
          localStyles.centered,
          { backgroundColor: "#0F172A" }
        ]}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 16, color: "#94A3B8" }}>
          Veriler Hazırlanıyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#0F172A" }]}>
      {/* Üst Bar */}
      <View
        style={[
          styles.topBar,
          { borderBottomWidth: 1, borderColor: "#1E293B" }
        ]}
      >
        <View style={styles.topBarHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: "#3B82F6", fontWeight: "bold" }}>
              ← Geri Dön
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: "#F8FAFC" }]}>
            Montaj Hattı Görünümü
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stagePicker}
        >
          {["stage1", "stage2", "stage3", "stage4", "clean"].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveStage(s)}
              style={[
                styles.tab,
                {
                  backgroundColor: activeStage === s ? "#3B82F6" : "#1E293B",
                  borderRadius: 12,
                  marginHorizontal: 4
                }
              ]}
            >
              <Text
                style={{
                  color: activeStage === s ? "#FFF" : "#94A3B8",
                  fontWeight: "600"
                }}
              >
                {s === "clean" ? "FİNAL" : s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grid Canvas */}
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 100 }}>
          <View style={{ flexDirection: "column" }}>
            <View style={{ flexDirection: "row" }}>
              {topLine.map((st) => (
                <VisualNode
                  key={st.id}
                  station={st}
                  onPress={setSelectedStation}
                />
              ))}
            </View>
            <View style={{ alignSelf: "flex-end", marginRight: 18 }}>
              {rightLine.map((st) => (
                <VisualNode
                  key={st.id}
                  station={st}
                  isVertical
                  onPress={setSelectedStation}
                />
              ))}
            </View>
            <View
              style={{ alignSelf: "flex-end", flexDirection: "row-reverse" }}
            >
              {bottomLine.map((st) => (
                <VisualNode
                  key={st.id}
                  station={st}
                  onPress={setSelectedStation}
                />
              ))}
            </View>
            <View style={{ marginLeft: 18 }}>
              {spurLine.map((st) => (
                <VisualNode
                  key={st.id}
                  station={st}
                  isVertical
                  onPress={setSelectedStation}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* MODAL ALTERNATİFİ: ANIMATED POPUP */}
      {selectedStation && (
        <Animated.View style={[localStyles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePopup} />

          <Animated.View
            style={[
              localStyles.popupCard,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={localStyles.popupHeader}>
              <View style={localStyles.handle} />
              <View style={localStyles.headerRow}>
                <View>
                  <Text style={localStyles.popupTitle}>
                    {selectedStation.id}
                  </Text>
                  <Text style={localStyles.popupSubTitle}>
                    {selectedStation.durum} • {selectedStation.time}s
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closePopup}
                  style={localStyles.closeCircle}
                >
                  <Text style={{ color: "#FFF", fontWeight: "bold" }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={localStyles.opList}
              showsVerticalScrollIndicator={false}
            >
              {selectedStation.operations.map((op, i) => (
                <View key={i} style={localStyles.opItem}>
                  <View style={localStyles.opAvatar}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={localStyles.opPerson}>{op.operator}</Text>
                    <Text style={localStyles.opName}>{op.opName}</Text>
                    {op.method && (
                      <View style={localStyles.methodTag}>
                        <Text style={localStyles.methodText}>{op.method}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={localStyles.opTime}>{op.time}s</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={localStyles.btnDone} onPress={closePopup}>
              <Text style={localStyles.btnDoneText}>Kapat</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

// --- STILLER ---

const nodeStyles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  nodeBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  nodeLabel: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  nodeTime: { fontSize: 10, color: "#38BDF8", marginTop: 4, fontWeight: "700" },
  connector: { width: 1, height: 8, backgroundColor: "#334155" },
  verticalInfo: {
    position: "absolute",
    left: 48,
    width: 120,
    justifyContent: "center"
  }
});

const localStyles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.85)",
    justifyContent: "flex-end",
    zIndex: 999
  },
  popupCard: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.75,
    borderWidth: 1,
    borderColor: "#334155"
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#475569",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  popupTitle: { fontSize: 22, fontWeight: "bold", color: "#F8FAFC" },
  popupSubTitle: { fontSize: 14, color: "#94A3B8", marginTop: 2 },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center"
  },
  opList: { marginBottom: 20 },
  opItem: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: "center"
  },
  opAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155"
  },
  opPerson: { color: "#F1F5F9", fontWeight: "bold", fontSize: 16 },
  opName: { color: "#94A3B8", fontSize: 13, marginTop: 2 },
  opTime: { color: "#38BDF8", fontWeight: "bold", fontSize: 15 },
  methodTag: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start"
  },
  methodText: { color: "#38BDF8", fontSize: 11, fontWeight: "600" },
  btnDone: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 18,
    alignItems: "center"
  },
  btnDoneText: { color: "#FFF", fontWeight: "bold", fontSize: 16 }
});
