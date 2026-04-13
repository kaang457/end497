import { StyleSheet, Platform } from "react-native";
import { AppTheme } from "../constants/theme";

const { colors } = AppTheme;

export const getDashboardStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.background.main
    },
    sidebar: {
      width: 240,
      backgroundColor: colors.background.secondary,
      borderRightWidth: 1,
      borderColor: colors.border.default,
      paddingLeft: 15,
      paddingTop: 15,
      zIndex: 10,
      overflow: "hidden"
    },
    sidebarHeader: {
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      paddingBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between", // Tema butonuyla başlığı yan yana koymak için
      alignItems: "flex-start",
      paddingRight: 10
    },
    sidebarTitle: {
      color: colors.status.success,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 1
    },
    sidebarLabel: {
      color: colors.text.muted,
      fontSize: 10,
      fontWeight: "bold",
      marginBottom: 6,
      letterSpacing: 1
    },
    formSection: {
      marginBottom: 15,
      backgroundColor: colors.background.main,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.default,
      zIndex: 50
    },
    inputGroup: {
      marginBottom: 10
    },
    inputLabel: {
      color: colors.text.muted,
      fontSize: 11,
      marginBottom: 4
    },
    input: {
      backgroundColor: colors.background.secondary,
      color: colors.text.main,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border.default,
      fontSize: 12
    },
    dropdownButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.background.secondary,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border.default
    },
    dropdownList: {
      position: "absolute",
      top: 45,
      left: 0,
      right: 0,
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 4,
      elevation: 5,
      zIndex: 100
    },
    dropdownItem: {
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default
    },
    calcBtn: {
      backgroundColor: colors.status.success,
      padding: 8,
      borderRadius: 4,
      alignItems: "center",
      marginTop: 5
    },
    calcBtnText: {
      color: colors.text.main,
      fontWeight: "bold",
      fontSize: 12
    },
    menuSection: {
      flex: 1
    },
    menuGroup: {
      marginBottom: 15
    },
    menuItem: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 6,
      marginBottom: 4
    },
    menuItemActive: {
      backgroundColor: colors.background.tertiary,
      borderLeftWidth: 3,
      borderLeftColor: colors.status.primary
    },
    menuItemText: {
      color: colors.text.secondary,
      fontSize: 12,
      fontWeight: "600"
    },
    subMenuContainer: {
      marginLeft: 10,
      borderLeftWidth: 1,
      borderColor: colors.border.default,
      paddingLeft: 8,
      marginTop: 5
    },
    subMenuItem: {
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderRadius: 4,
      marginBottom: 2
    },
    subMenuItemActive: {
      backgroundColor: "#1e3a8a" // Özel seçim arkaplanı
    },
    subMenuText: {
      color: colors.text.muted,
      fontSize: 11,
      fontWeight: "500"
    },
    mainContent: {
      flex: 1,
      flexDirection: "column",
      zIndex: 1
    },
    centerBox: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 50
    },
    loadingText: {
      color: colors.text.muted,
      marginTop: 10,
      fontSize: 13
    },
    statsHeader: {
      flexDirection: "row",
      padding: 10,
      gap: 10,
      backgroundColor: colors.background.secondary,
      borderBottomWidth: 1,
      borderColor: colors.border.default,
      zIndex: 10
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background.main,
      padding: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border.default,
      justifyContent: "center"
    },
    statTitle: {
      color: colors.text.muted,
      fontSize: 10,
      marginBottom: 2,
      fontWeight: "600"
    },
    statValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text.main
    },
    contentArea: {
      flex: 1,
      backgroundColor: colors.background.main
    },
    mapContainer: {
      flex: 1,
      overflow: "hidden",
      position: "relative"
    },
    resetBtn: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: colors.background.tertiary,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border.focus,
      zIndex: 20
    },
    placeholderText: {
      color: colors.text.secondary,
      fontSize: 14,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 20
    },
    workerCard: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      overflow: "hidden",
      flex: 1
    },
    workerCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.background.tertiary,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default
    },
    workerNameText: {
      color: colors.text.main,
      fontSize: 14,
      fontWeight: "bold"
    },
    workerTimeBadge: {
      backgroundColor: "rgba(59, 130, 246, 0.15)", // Şeffaflık olduğu için rgba kaldı
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.status.primary
    },
    workerTimeText: {
      color: "#93c5fd", // Orijinal açık mavi
      fontSize: 12,
      fontWeight: "bold"
    },
    workerCardBody: {
      padding: 15,
      gap: 12
    },
    stationGroup: {
      backgroundColor: colors.background.main,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.light
    },
    stationGroupTitle: {
      color: colors.text.muted,
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 8
    },
    opBadgeContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6
    },
    opBadge: {
      backgroundColor: colors.border.light,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border.default
    },
    opBadgeText: {
      color: colors.text.secondary,
      fontSize: 10
    }
  });
