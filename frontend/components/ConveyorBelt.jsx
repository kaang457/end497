import React from "react";
import { View } from "react-native";

const ConveyorBelt = ({
  direction = "horizontal-right",
  isDarkMode,
  colors,
  style
}) => {
  const isVertical = direction === "vertical-down";

  return (
    <View
      style={[
        {
          position: "absolute",
          overflow: "hidden",
          borderRadius: 14,
          backgroundColor: isDarkMode ? "#2b313a" : "#bfc7d1",
          borderWidth: 2,
          borderColor: isDarkMode ? "#111827" : "#7c8a99",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.35 : 0.18,
          shadowRadius: 8,
          elevation: 6
        },
        style
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDarkMode ? "#3a414c" : "#cfd6de"
        }}
      />

      <View
        style={{
          position: "absolute",
          top: isVertical ? 0 : 2,
          left: isVertical ? 2 : 0,
          right: 0,
          height: isVertical ? "100%" : 5,
          width: isVertical ? 5 : "100%",
          backgroundColor: isDarkMode
            ? "rgba(255,255,255,0.10)"
            : "rgba(255,255,255,0.35)"
        }}
      />

      <View
        style={{
          position: "absolute",
          bottom: isVertical ? 0 : 2,
          right: isVertical ? 2 : 0,
          left: 0,
          height: isVertical ? "100%" : 5,
          width: isVertical ? 5 : "100%",
          backgroundColor: isDarkMode ? "rgba(0,0,0,0.20)" : "rgba(0,0,0,0.10)"
        }}
      />

      {!isVertical ? (
        <>
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 6,
              width: 4,
              backgroundColor: isDarkMode ? "#6b7280" : "#8b949e"
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 6,
              width: 4,
              backgroundColor: isDarkMode ? "#6b7280" : "#8b949e"
            }}
          />
        </>
      ) : (
        <>
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 6,
              height: 4,
              backgroundColor: isDarkMode ? "#6b7280" : "#8b949e"
            }}
          />
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 6,
              height: 4,
              backgroundColor: isDarkMode ? "#6b7280" : "#8b949e"
            }}
          />
        </>
      )}

      <View
        className={
          direction === "horizontal-right"
            ? "belt-industrial-h-right"
            : direction === "horizontal-left"
              ? "belt-industrial-h-left"
              : "belt-industrial-v-down"
        }
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />

      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          borderRadius: 14
        }}
      />
    </View>
  );
};

export default ConveyorBelt;
