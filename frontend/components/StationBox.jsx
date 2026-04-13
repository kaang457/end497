import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";

export default function StationBox({
  st,
  scale,
  threshold,
  showLabel,
  onSelect,
  selectedId,
  activeStage,
  direction,
  showArrow,
  colors,
  isDarkMode
}) {
  const isSelected = selectedId === st.id;
  const isGreen = st.status === "green";

  let badgeIcon = null;
  let badgeColor = colors.status.primary;

  if (isGreen && activeStage !== "clean") {
    if (
      activeStage === "stage1" &&
      (st.durum === "ATANDI" || st.durum === "SABIT")
    ) {
      badgeIcon = "🧩";
      badgeColor = colors.status.primary;
    } else if (activeStage === "stage2") {
      badgeIcon = "📚";
      badgeColor = colors.status.success;
    } else if (
      activeStage === "stage3" &&
      st.rows?.some((r) => r.detay?.includes("YARDIMCI DESTEĞİ"))
    ) {
      badgeIcon = "⚡";
      badgeColor = colors.status.danger;
    } else if (
      activeStage === "stage4" &&
      st.rows?.some((r) => r.detay?.includes("TRANSFER"))
    ) {
      badgeIcon = "⇄";
      badgeColor = colors.status.primary;
    }
  }

  const rawId = st.id ? st.id.toString() : "";
  const cleanedId =
    rawId.split("(")[0].replace("OP_", "").trim() || st.sira || "?";

  // Ok ve Etiket Renkleri (Temadan çekiliyor)
  const arrowColor = isGreen ? colors.status.success : colors.status.danger;
  const labelBg = isGreen ? "rgba(6,78,59,0.95)" : "rgba(69,10,10,0.95)";
  const labelBorder = isGreen ? colors.status.success : colors.status.danger;

  const arrowUp = direction === "up";
  const arrowDown = direction === "down";
  const arrowLeft = direction === "left";
  const arrowRight = direction === "right";

  const LINE_LEN = 32;

  const renderArrowLabel = () => {
    if (!direction || !showArrow || Platform.OS !== "web") return null;

    let containerStyle = {};
    let lineStyle = {};
    let arrowHeadStyle = {};
    let labelStyle = {};

    if (arrowUp) {
      containerStyle = {
        position: "absolute",
        bottom: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 10
      };
      labelStyle = {
        marginBottom: 3,
        backgroundColor: labelBg,
        border: `1px solid ${labelBorder}`,
        borderRadius: 4,
        padding: "3px 8px",
        whiteSpace: "nowrap"
      };
      lineStyle = {
        width: 2,
        height: LINE_LEN,
        backgroundColor: arrowColor,
        flexShrink: 0
      };
      arrowHeadStyle = {
        width: 0,
        height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderBottom: `7px solid ${arrowColor}`,
        marginBottom: 0,
        flexShrink: 0
      };
      return (
        <div style={containerStyle}>
          <div style={labelStyle}>
            <span
              style={{
                color: "#fff",
                fontSize: "22px",
                fontWeight: "700",
                letterSpacing: "0.5px"
              }}
            >
              {cleanedId}
            </span>
          </div>
          <div style={arrowHeadStyle} />
          <div style={lineStyle} />
        </div>
      );
    }
    if (arrowDown) {
      containerStyle = {
        position: "absolute",
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 10
      };
      lineStyle = {
        width: 2,
        height: LINE_LEN,
        backgroundColor: arrowColor,
        flexShrink: 0
      };
      arrowHeadStyle = {
        width: 0,
        height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `7px solid ${arrowColor}`,
        flexShrink: 0
      };
      labelStyle = {
        marginTop: 3,
        backgroundColor: labelBg,
        border: `1px solid ${labelBorder}`,
        borderRadius: 4,
        padding: "3px 8px",
        whiteSpace: "nowrap"
      };
      return (
        <div style={containerStyle}>
          <div style={lineStyle} />
          <div style={arrowHeadStyle} />
          <div style={labelStyle}>
            <span
              style={{
                color: "#fff",
                fontSize: "22px",
                fontWeight: "700",
                letterSpacing: "0.5px"
              }}
            >
              {cleanedId}
            </span>
          </div>
        </div>
      );
    }
    if (arrowLeft) {
      containerStyle = {
        position: "absolute",
        top: "50%",
        left: "100%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 10
      };
      lineStyle = {
        height: 2,
        width: LINE_LEN,
        backgroundColor: arrowColor,
        flexShrink: 0
      };
      arrowHeadStyle = {
        width: 0,
        height: 0,
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        borderLeft: `7px solid ${arrowColor}`,
        flexShrink: 0
      };
      labelStyle = {
        marginLeft: 3,
        backgroundColor: labelBg,
        border: `1px solid ${labelBorder}`,
        borderRadius: 4,
        padding: "3px 8px",
        whiteSpace: "nowrap"
      };
      return (
        <div style={containerStyle}>
          <div style={lineStyle} />
          <div style={arrowHeadStyle} />
          <div style={labelStyle}>
            <span
              style={{
                color: "#fff",
                fontSize: "22px",
                fontWeight: "700",
                letterSpacing: "0.5px"
              }}
            >
              {cleanedId}
            </span>
          </div>
        </div>
      );
    }
    if (arrowRight) {
      containerStyle = {
        position: "absolute",
        top: "50%",
        right: "100%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 10
      };
      lineStyle = {
        height: 2,
        width: LINE_LEN,
        backgroundColor: arrowColor,
        flexShrink: 0
      };
      arrowHeadStyle = {
        width: 0,
        height: 0,
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        borderRight: `7px solid ${arrowColor}`,
        flexShrink: 0
      };
      labelStyle = {
        marginRight: 3,
        backgroundColor: labelBg,
        border: `1px solid ${labelBorder}`,
        borderRadius: 4,
        padding: "3px 8px",
        whiteSpace: "nowrap"
      };
      return (
        <div style={containerStyle}>
          <div style={lineStyle} />
          <div style={arrowHeadStyle} />
          <div style={labelStyle}>
            <span
              style={{
                color: "#fff",
                fontSize: "22px",
                fontWeight: "700",
                letterSpacing: "0.5px"
              }}
            >
              {cleanedId}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {renderArrowLabel()}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelect(st)}
        style={{
          width: 56,
          height: 56,
          borderRadius: 12, // Daha oval hatlar
          borderWidth: isSelected ? 3 : 2,
          alignItems: "center",
          justifyContent: "center",

          // Tema renklerine göre dokunsal (tactile) arka planlar
          backgroundColor: isSelected
            ? colors.background.tertiary
            : isGreen
              ? isDarkMode
                ? "rgba(5, 150, 105, 0.15)"
                : "#f0fdf4" // Zümrüt yeşili tonları
              : isDarkMode
                ? "rgba(220, 38, 38, 0.15)"
                : "#fef2f2", // Kırmızı tonları

          borderColor: isSelected
            ? colors.status.primary
            : isGreen
              ? colors.status.success
              : colors.status.danger,

          // Fiziksel bir obje hissi için gölge
          shadowColor: isGreen ? colors.status.success : colors.status.danger,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.4 : 0.2,
          shadowRadius: 4,
          elevation: 5,

          position: "relative",
          paddingHorizontal: 2
        }}
      >
        {showLabel ? (
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            style={{
              fontSize: 10,
              fontWeight: "800", // Yazıları daha okunabilir yaptık
              color: isDarkMode ? "#ffffff" : "#0f172a",
              textAlign: "center",
              lineHeight: 12
            }}
          >
            {cleanedId}
          </Text>
        ) : (
          // Uzaklaştırıldığında görünen iç ikon/nokta
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: isGreen
                ? colors.status.success
                : colors.status.danger,
              borderWidth: 2,
              borderColor: isDarkMode ? "#000" : "#fff",
              opacity: 0.9
            }}
          />
        )}

        {badgeIcon && (
          <View
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", // Temaya göre rozet zemini
              borderWidth: 2,
              borderColor: badgeColor,
              borderRadius: 14,
              width: 26,
              height: 26,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 2
            }}
          >
            <Text
              style={{ color: badgeColor, fontSize: 13, fontWeight: "bold" }}
            >
              {badgeIcon}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </div>
  );
}
