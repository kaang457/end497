import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions
} from "react-native";
import { useRouter } from "expo-router";
import { getStyles } from "../styles/dynamicStyles";
import { colors } from "../styles/theme";
import { GlobalStore } from "../constants/store";

export default function ResultScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = getStyles(width);

  const [activeStage, setActiveStage] = useState("stage1");
  const [isFetching, setIsFetching] = useState(false);

  // Store'dan gelen veriyi öncelikli al, yoksa boş obje ile başla
  const [stageDataCache, setStageDataCache] = useState(() => {
    if (GlobalStore.planData && Object.keys(GlobalStore.planData).length > 0) {
      return GlobalStore.planData;
    }
    return {};
  });

  const form = GlobalStore.formData;

  // Cache'de ilgili stage yoksa backend'in outputs klasöründen çek
  useEffect(() => {
    if (!stageDataCache[activeStage]) {
      fetchStageData(activeStage);
    }
  }, [activeStage]);

  const fetchStageData = async (stageName) => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `http://localhost:8000/outputs/${stageName}_data.json`
      );
      if (response.ok) {
        const data = await response.json();
        setStageDataCache((prev) => ({ ...prev, [stageName]: data }));
      } else {
        console.warn(`Failed to fetch ${stageName}_data.json`);
      }
    } catch (err) {
      console.error("Error fetching stage data:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const currentStageData = stageDataCache[activeStage] || {};
  const flatResults = currentStageData.results_flat || [];
  const stats = currentStageData.stats || {};

  // 1. Data Parser: Düz listeyi istasyon objelerine çevirir
  const allStations = useMemo(() => {
    if (!flatResults || flatResults.length === 0) return [];

    const parsedStations = [];
    flatResults.forEach((row) => {
      const seq = row[0];
      const nameRaw = row[1];
      const tag = row[6];

      // Alt operasyonları (seq === "") ve kapalı istasyonları filtrele
      if (seq !== "" && tag !== "DEVRE DIŞI") {
        const id = nameRaw.replace(" (İstasyon Yükü)", "").trim();
        const isAssigned = tag !== "BEKLEMEDE" && row[2] !== "ATANMADI";

        parsedStations.push({
          id: id,
          status: isAssigned ? "green" : "red",
          durum: tag,
          time: row[3] // İstasyon yükü süresi (Örn: "11.94")
        });
      }
    });
    return parsedStations;
  }, [flatResults, activeStage]); // activeStage değiştiğinde parse işlemini zorla

  // Yüklenme Ekranı
  if (isFetching && (!flatResults || flatResults.length === 0)) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" }
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary || "#000"} />
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
          {activeStage === "clean" ? "FINAL" : activeStage.toUpperCase()}{" "}
          yükleniyor...
        </Text>
      </View>
    );
  }

  // Hata / Boş Veri Ekranı
  if (!flatResults || flatResults.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
          Veri yüklenemedi veya boş. Lütfen tekrar hesaplayın.
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            ← Geri Dön
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // U-Layout Düzeni İçin Matematik
  const topCount = Math.floor(allStations.length * 0.42);
  const sideCount = Math.floor(allStations.length * 0.16);
  const topLine = allStations.slice(0, topCount);
  const sideLine = allStations.slice(topCount, topCount + sideCount);
  const bottomLine = allStations.slice(topCount + sideCount).reverse();

  return (
    <View style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarHeader}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            SKU: {form?.sku || "Bilinmiyor"} • Hedef:{" "}
            {form?.demand || "Bilinmiyor"}
          </Text>
        </View>

        {/* Hap (Pill) Tasarımlı Sekmeler */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stagePicker}
        >
          {["stage1", "stage2", "stage3", "stage4", "clean"].map((s) => {
            const isActive = activeStage === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setActiveStage(s)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive
                      ? colors.tabActive
                      : colors.tabInactive
                  }
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive
                        ? colors.textPrimary
                        : colors.textSecondary
                    }
                  ]}
                >
                  {s === "clean" ? "FINAL" : s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* İstatistik Çubuğu */}
      {stats && Object.keys(stats).length > 0 && (
        <View style={styles.statsContainer}>
          <StatBox
            label="Aktif İstasyon"
            value={stats.active_stations}
            styles={styles}
          />
          <StatBox
            label="Darboğaz (Sn)"
            value={stats.bottleneck_time?.toFixed(2)}
            styles={styles}
          />
          <StatBox
            label="Atanan Personel"
            value={stats.assigned_count}
            styles={styles}
          />
          <StatBox
            label="Üretim Saati"
            value={`${stats.total_production_hours?.toFixed(2)}h`}
            styles={styles}
          />
        </View>
      )}

      {/* U-Layout İstasyon Çizimi */}
      <ScrollView horizontal>
        <ScrollView contentContainerStyle={styles.uLayoutScroll}>
          <View style={styles.uContainer}>
            <View style={styles.mainLineColumn}>
              <View style={styles.stationRow}>
                {topLine.map((st, i) => (
                  <StationBox
                    key={`top-${activeStage}-${st.id || i}`} // KEY GÜNCELLENDİ
                    station={st}
                    styles={styles}
                  />
                ))}
              </View>
              <View style={styles.stationRow}>
                {bottomLine.map((st, i) => (
                  <StationBox
                    key={`bot-${activeStage}-${st.id || i}`} // KEY GÜNCELLENDİ
                    station={st}
                    styles={styles}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sideLineColumn}>
              {sideLine.map((st, i) => (
                <StationBox
                  key={`side-${activeStage}-${st.id || i}`} // KEY GÜNCELLENDİ
                  station={st}
                  styles={styles}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

// İstatistik Kutusu Bileşeni
const StatBox = ({ label, value, styles }) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value || "-"}</Text>
  </View>
);

// İstasyon Kutusu Bileşeni
const StationBox = ({ station, styles }) => {
  const isGreen = station.status === "green";
  const isSabit = station.durum === "SABIT";

  // Sadece kodu göstermek için "OP_" kısmını at
  const label = station.id?.replace("OP_", "").trim();

  // Duruma göre dinamik renkler
  const boxStyles = {
    borderColor: isGreen ? colors.successBorder : colors.dangerBorder,
    backgroundColor: isGreen ? colors.successBg : colors.dangerBg
  };

  const textStyles = {
    color: isGreen ? colors.successText : colors.dangerText
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.stationBox, boxStyles]}
    >
      <Text style={[styles.stationLabel, textStyles]}>{label}</Text>
      <Text style={[styles.stationTime, textStyles]}>{station.time}s</Text>
      {isSabit && <Text style={{ fontSize: 10, marginTop: 4 }}>🔒 SABİT</Text>}
    </TouchableOpacity>
  );
};
