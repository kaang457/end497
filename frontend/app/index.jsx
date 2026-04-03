import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions
} from "react-native";
import { useRouter } from "expo-router";
import { getStyles } from "../styles/dynamicStyles";

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = getStyles(width); // Merkezi stilleri çağır

  return (
    <ScrollView contentContainerStyle={styles.dashboardContainer}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hoş Geldiniz,</Text>
        <Text style={styles.dashboardTitle}>Üretim Yönetim Paneli</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Genel OEE"
          value="%84.2"
          trend="+2.1%"
          isGood
          styles={styles}
        />
        <MetricCard title="Aktif Hatlar" value="4 / 5" styles={styles} />
        <MetricCard
          title="Planlanan Üretim"
          value="1,240"
          unit="Adet"
          styles={styles}
        />
        <MetricCard
          title="Darboğaz (Ort.)"
          value="15.2"
          unit="Sn"
          isDanger
          styles={styles}
        />
      </View>

      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/new-plan")}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonIcon}>⚡</Text>
          <View>
            <Text style={styles.primaryButtonText}>Yeni Planlama Oluştur</Text>
            <Text style={styles.primaryButtonSub}>
              Algoritma ile hat dengeleme yapın
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Son Yapılan Planlamalar</Text>
        <PlanRow
          sku="78446"
          date="Bugün, 08:30"
          demand="400"
          status="Tamamlandı"
          styles={styles}
        />
        <PlanRow
          sku="99210"
          date="Dün, 14:15"
          demand="250"
          status="Darboğaz Uyarısı"
          isWarning
          styles={styles}
        />
      </View>
    </ScrollView>
  );
}

const MetricCard = ({
  title,
  value,
  trend,
  unit,
  isGood,
  isDanger,
  styles
}) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricTitle}>{title}</Text>
    <View style={styles.metricRow}>
      <Text style={styles.metricValue}>
        {value} <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
    </View>
    {trend && (
      <Text
        style={[
          styles.metricTrend,
          isGood ? styles.textSuccess : styles.textDanger
        ]}
      >
        {trend}
      </Text>
    )}
  </View>
);

const PlanRow = ({ sku, date, demand, status, isWarning, styles }) => (
  <View style={styles.planRow}>
    <View>
      <Text style={styles.planSku}>SKU: {sku}</Text>
      <Text style={styles.planDate}>{date}</Text>
    </View>
    <View style={{ alignItems: "flex-end" }}>
      <Text style={styles.planDemand}>{demand} Adet</Text>
      <Text
        style={[
          styles.planStatus,
          isWarning ? styles.textWarning : styles.textSuccess
        ]}
      >
        {status}
      </Text>
    </View>
  </View>
);
