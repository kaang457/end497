import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import { GlobalStore } from "../constants/store"; // Store dosyanızın yolu

export default function ResultScreen() {
  const router = useRouter();
  const [activeStage, setActiveStage] = useState("clean");

  // GlobalStore'dan veriyi çekiyoruz
  const data = GlobalStore.planData;
  const form = GlobalStore.formData;

  if (!data || !data.stages) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Veri yüklenemedi...</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: "#3b82f6" }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Aktif aşamaya göre istasyon listesini alıyoruz
  const allStations = data.stages[activeStage] || [];

  // U-Layout Bölümleme Mantığı
  const topCount = Math.floor(allStations.length * 0.42);
  const sideCount = Math.floor(allStations.length * 0.16);

  const topLine = allStations.slice(0, topCount);
  const sideLine = allStations.slice(topCount, topCount + sideCount);
  const bottomLine = allStations.slice(topCount + sideCount).reverse();

  const getStageStyle = (stage) =>
    activeStage === stage ? styles.activeTab : styles.inactiveTab;

  return (
    <View style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={{ color: "#3b82f6", fontWeight: "bold" }}>← GERİ</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>
            SKU: {form.sku} | Hedef: {form.demand}
          </Text>
        </View>

        {/* Aşama Seçici (Vite'taki butonlar) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stagePicker}
        >
          {["clean", "stage1", "stage2", "stage3", "stage4"].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveStage(s)}
              style={[styles.tab, getStageStyle(s)]}
            >
              <Text style={styles.tabText}>
                {s === "clean" ? "Final" : s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Hattın Çizimi (Yatay ve Dikey Kaydırma) */}
      <ScrollView horizontal>
        <ScrollView contentContainerStyle={styles.uLayoutScroll}>
          <View style={styles.uContainer}>
            {/* ANA HAT (ÜST VE ALT) */}
            <View style={styles.mainLineColumn}>
              {/* Üst Sıra */}
              <View style={styles.stationRow}>
                {topLine.map((st, i) => (
                  <StationBox key={st.id || i} station={st} />
                ))}
              </View>

              {/* Alt Sıra */}
              <View style={styles.stationRow}>
                {bottomLine.map((st, i) => (
                  <StationBox key={st.id || i} station={st} />
                ))}
              </View>
            </View>

            {/* YAN HAT (SAĞ DİKEY) */}
            <View style={styles.sideLineColumn}>
              {sideLine.map((st, i) => (
                <StationBox key={st.id || i} station={st} />
              ))}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

// İstasyon Kutusu
const StationBox = ({ station }) => {
  const isGreen = station.status === "green";
  const label = station.id?.replace("OP_", "").trim();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.stationBox,
        {
          borderColor: isGreen ? "#10b981" : "#ef4444",
          backgroundColor: isGreen ? "#064e3b" : "#450a0a"
        }
      ]}
    >
      <Text style={styles.stationLabel}>{label}</Text>
      {station.durum === "SABIT" && <Text style={{ fontSize: 10 }}>⚖️</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0d1117"
  },
  errorText: { color: "#fff", marginBottom: 20 },

  topBar: {
    paddingTop: 10,
    backgroundColor: "#161b22",
    borderBottomWidth: 1,
    borderColor: "#30363d"
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 10
  },
  backBtn: { marginRight: 15 },
  headerText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Aşama Seçici Stilleri
  stagePicker: { paddingHorizontal: 10, marginBottom: 10 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1
  },
  activeTab: { backgroundColor: "#1e3a8a", borderColor: "#3b82f6" },
  inactiveTab: { backgroundColor: "#21262d", borderColor: "#30363d" },
  tabText: { color: "#fff", fontSize: 11, fontWeight: "bold" },

  // Layout Çizimi
  uLayoutScroll: {
    padding: 60,
    minWidth: Dimensions.get("window").width * 1.5
  },
  uContainer: { flexDirection: "row" },
  mainLineColumn: { justifyContent: "space-between", height: 300 },
  sideLineColumn: { marginLeft: 30, gap: 15, justifyContent: "center" },
  stationRow: { flexDirection: "row", gap: 15 },

  stationBox: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  stationLabel: { color: "#fff", fontWeight: "bold", fontSize: 13 }
});
