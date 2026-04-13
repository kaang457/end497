import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform
} from "react-native";

export default function StationDetailModal({
  visible,
  onClose,
  stationData,
  activeStage,
  colors,
  isDarkMode
}) {
  if (!stationData) return null;

  // İkon stillerini de dinamik tema renklerine bağladık
  const IKON_STILLERI = {
    "🧩": {
      bg: "rgba(59, 130, 246, 0.15)",
      border: colors.status.primary,
      text: colors.status.primary
    },
    "🎓": { bg: "rgba(6, 182, 212, 0.15)", border: "#06b6d4", text: "#06b6d4" },
    "⚡": {
      bg: "rgba(239, 68, 68, 0.15)",
      border: colors.status.danger,
      text: colors.status.danger
    },
    "⚖️": {
      bg: "rgba(234, 179, 8, 0.15)",
      border: colors.status.warning,
      text: colors.status.warning
    },
    "⭐": {
      bg: "rgba(245, 158, 11, 0.15)",
      border: colors.status.warning,
      text: colors.status.warning
    }
  };

  const benzersizPersoneller = Array.from(
    new Set(
      stationData.rows
        ?.filter(
          (r) =>
            r.personel && r.personel !== "-" && !r.durum?.includes("KAPALI")
        )
        .map((r) => r.personel)
    )
  );

  const perWorkerLoad = {};
  stationData.rows?.forEach((r) => {
    const sureVal =
      parseFloat((r.sure || "0").toString().replace(",", ".")) || 0;
    const w = r.personel?.trim();
    if (w && w !== "-" && !w.includes("DEVRE") && !w.includes("BOŞ")) {
      perWorkerLoad[w] = (perWorkerLoad[w] || 0) + sureVal;
    }
  });
  const cycleTime =
    Object.values(perWorkerLoad).length > 0
      ? Math.max(...Object.values(perWorkerLoad))
      : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.2)",
          flexDirection: "row",
          justifyContent: "flex-end"
        }}
      >
        <View
          style={{
            backgroundColor: colors.background.main,
            width: Platform.OS === "web" ? 450 : "85%",
            height: "100%",
            padding: 20,
            borderLeftWidth: 1,
            borderColor: colors.border.focus,
            shadowColor: "#000",
            shadowOffset: { width: -5, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 10
          }}
        >
          {/* MODAL HEADER */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                paddingRight: 10
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "900",
                  color: colors.status.primary,
                  backgroundColor: colors.background.secondary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.status.primary,
                  marginBottom: 5
                }}
              >
                {stationData.id}
              </Text>

              {cycleTime > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(52, 211, 153, 0.15)",
                    borderWidth: 1,
                    borderColor: colors.status.success,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginBottom: 5
                  }}
                >
                  <Text style={{ fontSize: 18 }}>⏱️</Text>
                  <Text
                    style={{
                      color: colors.status.success,
                      fontWeight: "900",
                      marginLeft: 5,
                      fontSize: 15
                    }}
                  >
                    {cycleTime.toFixed(2)}s
                  </Text>
                </View>
              )}

              {benzersizPersoneller.map((personel, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    borderWidth: 1,
                    borderColor: colors.status.warning,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginBottom: 5
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🪑</Text>
                  <Text
                    style={{
                      color: colors.text.main,
                      fontWeight: "bold",
                      marginLeft: 5
                    }}
                  >
                    {personel}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: colors.status.danger,
                padding: 8,
                borderRadius: 8,
                marginLeft: 10
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* TABLO İÇERİĞİ */}
          <ScrollView
            style={{
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border.default,
              overflow: "hidden",
              flex: 1
            }}
          >
            {stationData.rows
              ?.filter((r) => r.operasyon && r.operasyon !== "TÜM OPERASYONLAR")
              .map((row, ri) => {
                const stil = IKON_STILLERI[row.ikon] || {
                  bg: "rgba(100,116,139,0.2)",
                  border: colors.text.muted,
                  text: colors.text.muted
                };
                let isHighlighted = false;
                if (
                  activeStage === "stage3" &&
                  row.detay?.includes("YARDIMCI DESTEĞİ")
                )
                  isHighlighted = true;
                if (activeStage === "stage4" && row.detay?.includes("TRANSFER"))
                  isHighlighted = true;

                return (
                  <View
                    key={ri}
                    style={{
                      flexDirection: "row",
                      paddingVertical: 15,
                      paddingHorizontal: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.light,
                      alignItems: "flex-start",
                      backgroundColor: isHighlighted
                        ? "rgba(59, 130, 246, 0.2)"
                        : ri % 2 === 0
                          ? colors.background.secondary
                          : colors.background.main
                    }}
                  >
                    <View style={{ flex: 2, paddingRight: 10 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.text.main,
                          fontWeight: "600",
                          marginBottom: 4
                        }}
                      >
                        {row.operasyon}
                      </Text>
                      {row.detay && row.detay !== "-" && (
                        <Text
                          style={{
                            fontSize: 10,
                            color: colors.text.muted,
                            fontStyle: "italic"
                          }}
                        >
                          ℹ️ {row.detay}
                        </Text>
                      )}
                    </View>

                    <Text
                      style={{
                        fontSize: 12,
                        flex: 1,
                        color: colors.status.primary,
                        fontWeight: "bold",
                        textAlign: "center"
                      }}
                    >
                      {row.personel}
                    </Text>

                    <View style={{ flex: 1.5, alignItems: "center" }}>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          backgroundColor: stil.bg,
                          borderColor: stil.border
                        }}
                      >
                        <Text
                          style={{
                            color: stil.text,
                            fontSize: 10,
                            textAlign: "center"
                          }}
                        >
                          {row.atama_amaci}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: colors.text.muted,
                          fontSize: 10,
                          marginTop: 4
                        }}
                      >
                        ⏱ {row.sure}s
                      </Text>
                    </View>
                  </View>
                );
              })}

            {(!stationData.rows || stationData.rows.length === 0) && (
              <Text
                style={{
                  color: colors.text.muted,
                  textAlign: "center",
                  padding: 20
                }}
              >
                Bu istasyon girilen SKU için kullanılmamaktadır.
              </Text>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
