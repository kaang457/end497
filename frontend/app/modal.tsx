import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform } from 'react-native';

const IKON_STILLERI: any = {
  "🧩": { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", text: "#93c5fd" },
  "🎓": { bg: "rgba(16, 185, 129, 0.15)", border: "#10b981", text: "#6ee7b7" },
  "⚡": { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", text: "#fca5a5" },
  "⚖️": { bg: "rgba(234, 179, 8, 0.15)", border: "#eab308", text: "#fde047" },
  "⭐": { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", text: "#fcd34d" },
};

export default function StationDetailModal({ visible, onClose, stationData, activeStage }: any) {
  if (!stationData) return null;

  // İstasyonda çalışan TÜM benzersiz personelleri bulalım
  const benzersizPersoneller = Array.from(
    new Set(
      stationData.rows
        ?.filter((r: any) => r.personel && r.personel !== "-" && !r.durum?.includes("KAPALI"))
        .map((r: any) => r.personel)
    )
  );

  // İstasyon Cycle Time = her personelin toplam süresi içinde maksimum olan
  const perWorkerLoad: { [key: string]: number } = {};
  stationData.rows?.forEach((r: any) => {
    const sureVal = parseFloat((r.sure || "0").toString().replace(",", ".")) || 0;
    const w = r.personel?.trim();
    if (w && w !== "-" && !w.includes("DEVRE") && !w.includes("BOŞ")) {
      perWorkerLoad[w] = (perWorkerLoad[w] || 0) + sureVal;
    }
  });
  const cycleTime = Object.values(perWorkerLoad).length > 0
    ? Math.max(...(Object.values(perWorkerLoad) as number[]))
    : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", paddingRight: 10 }}>
              <Text style={styles.stationBadge}>{stationData.id}</Text>
              
              {/* Cycle Time Badge */}
              {cycleTime > 0 && (
                <View style={styles.cycleTimeBadge}>
                  <Text style={{ fontSize: 18 }}>⏱️</Text>
                  <Text style={{ color: "#34d399", fontWeight: "900", marginLeft: 5, fontSize: 15 }}>{cycleTime.toFixed(2)}s</Text>
                </View>
              )}

              {benzersizPersoneller.map((personel: any, idx: number) => (
                <View key={idx} style={styles.operatorBadge}>
                  <Text style={{ fontSize: 16 }}>🪑</Text>
                  <Text style={{ color: "#fff", fontWeight: "bold", marginLeft: 5 }}>{personel}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: "#fff", fontWeight: "900" }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.opTable}>
            {stationData.rows?.filter((r: any) => r.operasyon && r.operasyon !== "TÜM OPERASYONLAR").map((row: any, ri: number) => {
              const stil = IKON_STILLERI[row.ikon] || { bg: "rgba(100,116,139,0.2)", border: "#64748b", text: "#cbd5e1" };
              let isHighlighted = false;
              if (activeStage === "stage3" && row.detay?.includes("YARDIMCI DESTEĞİ")) isHighlighted = true;
              if (activeStage === "stage4" && row.detay?.includes("TRANSFER")) isHighlighted = true;
              
              return (
                <View key={ri} style={[styles.opRow, { backgroundColor: isHighlighted ? "rgba(59, 130, 246, 0.2)" : (ri % 2 === 0 ? "#161b22" : "#0d1117") }]}>
                  <View style={{ flex: 2, paddingRight: 10 }}>
                    <Text style={[styles.opText, { color: "#fff", fontWeight: "600", marginBottom: 4 }]} flexWrap="wrap">{row.operasyon}</Text>
                    {/* YENİ: Detay ve Açıklama Alanı */}
                    {row.detay && row.detay !== "-" && (
                      <Text style={{ fontSize: 10, color: "#8b949e", fontStyle: "italic" }} flexWrap="wrap">ℹ️ {row.detay}</Text>
                    )}
                  </View>
                  
                  <Text style={[styles.opText, { flex: 1, color: "#38bdf8", fontWeight: "bold", textAlign: "center" }]}>{row.personel}</Text>
                  
                  <View style={{ flex: 1.5, alignItems: "center" }}>
                    <View style={[styles.tag, { backgroundColor: stil.bg, borderColor: stil.border }]}>
                      <Text style={{ color: stil.text, fontSize: 10, textAlign: "center" }} flexWrap="wrap">{row.atama_amaci}</Text>
                    </View>
                    <Text style={{ color: "#a8a8a8", fontSize: 10, marginTop: 4 }}>⏱ {row.sure}s</Text>
                  </View>
                </View>
              );
            })}
            {(!stationData.rows || stationData.rows.length === 0) && (
               <Text style={{color: '#8b949e', textAlign: 'center', padding: 20}}>Bu istasyonda operasyon bulunmamaktadır.</Text>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.6)", 
    flexDirection: "row", // Sağdan sola yaslamak için
    justifyContent: "flex-end" 
  },
  modalContent: { 
    backgroundColor: "#0d1117", 
    width: Platform.OS === 'web' ? 450 : '85%', // Ekranın tamamını kaplamaması için daralttık
    height: "100%", 
    padding: 20, 
    borderLeftWidth: 1, 
    borderColor: "#3b82f6",
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  stationBadge: { fontSize: 16, fontWeight: "900", color: "#38bdf8", backgroundColor: "#1e293b", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#3b82f6", marginBottom: 5 },
  cycleTimeBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(52, 211, 153, 0.15)", borderWidth: 1, borderColor: "#34d399", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 5 },
  operatorBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245, 158, 11, 0.15)", borderWidth: 1, borderColor: "#f59e0b", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 5 },
  closeBtn: { backgroundColor: "#ef4444", padding: 8, borderRadius: 8, marginLeft: 10 },
  opTable: { borderRadius: 10, borderWidth: 1, borderColor: "#30363d", overflow: "hidden", flex: 1 },
  opRow: { flexDirection: "row", paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#1e293b", alignItems: "flex-start" },
  opText: { fontSize: 12 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 }
});