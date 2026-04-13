import { StyleSheet, Platform } from "react-native";

export const getDashboardStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.background.main
    },
    sidebar: {
      width: 260,
      backgroundColor: colors.background.secondary,
      borderRightWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: 20,
      paddingTop: 20,
      zIndex: 10,
      overflow: "hidden"
    },
    sidebarHeader: {
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      paddingBottom: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingRight: 10
    },
    sidebarTitle: {
      color: colors.text.main, // HATA BURADAYDI, DÜZELTİLDİ ✅
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: 1
    },
    sidebarLabel: {
      color: colors.text.muted,
      fontSize: 11,
      fontWeight: "bold",
      marginBottom: 10,
      letterSpacing: 1
    },
    formSection: {
      marginBottom: 20,
      backgroundColor: colors.background.main,
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.default,
      zIndex: 50
    },
    inputGroup: {
      marginBottom: 15
    },
    inputLabel: {
      color: colors.text.muted,
      fontSize: 12,
      marginBottom: 6
    },
    input: {
      backgroundColor: colors.background.secondary,
      color: colors.text.main,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border.default,
      fontSize: 13
    },
    dropdownButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.background.secondary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border.default
    },
    dropdownList: {
      position: "absolute",
      top: 50,
      left: 0,
      right: 0,
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 6,
      elevation: 5,
      zIndex: 100
    },
    dropdownItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default
    },
    calcBtn: {
      backgroundColor: colors.status.success,
      padding: 10,
      borderRadius: 6,
      alignItems: "center",
      marginTop: 10
    },
    calcBtnText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 13
    },
    menuSection: {
      flex: 1
    },
    menuGroup: {
      marginBottom: 20
    },
    menuItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 6
    },
    menuItemActive: {
      backgroundColor: colors.background.tertiary,
      borderLeftWidth: 4,
      borderLeftColor: colors.status.primary
    },
    menuItemText: {
      color: colors.text.secondary,
      fontSize: 13,
      fontWeight: "600"
    },
    subMenuContainer: {
      marginLeft: 15,
      borderLeftWidth: 1,
      borderColor: colors.border.default,
      paddingLeft: 10,
      marginTop: 8
    },
    subMenuItem: {
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 6,
      marginBottom: 4
    },
    subMenuItemActive: {
      backgroundColor: "rgba(59,130,246,0.15)"
    },
    subMenuText: {
      color: colors.text.muted,
      fontSize: 12,
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
      marginTop: 15,
      fontSize: 14
    },
    statsHeader: {
      flexDirection: "row",
      padding: 15,
      gap: 15,
      backgroundColor: colors.background.secondary,
      borderBottomWidth: 1,
      borderColor: colors.border.default,
      zIndex: 10
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background.main,
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.default,
      justifyContent: "center"
    },
    statTitle: {
      color: colors.text.muted,
      fontSize: 11,
      marginBottom: 4,
      fontWeight: "600"
    },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text.main
    },
    contentArea: {
      flex: 1,
      backgroundColor: colors.background.main,
      padding: 20
    },
    mapContainer: {
      flex: 1,
      overflow: "hidden",
      position: "relative"
    },
    resetBtn: {
      position: "absolute",
      top: 15,
      right: 15,
      backgroundColor: colors.background.tertiary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border.focus,
      zIndex: 20
    },
    placeholderText: {
      color: colors.text.secondary,
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 22
    },
    workerCard: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 12,
      overflow: "hidden",
      flex: 1
    },
    workerCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.background.tertiary,
      paddingHorizontal: 18,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default
    },
    workerNameText: {
      color: colors.text.main,
      fontSize: 15,
      fontWeight: "bold"
    },
    workerTimeBadge: {
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.status.primary
    },
    workerTimeText: {
      color: colors.status.primary,
      fontSize: 13,
      fontWeight: "bold"
    },
    workerCardBody: {
      padding: 18,
      gap: 15
    },
    stationGroup: {
      backgroundColor: colors.background.main,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.light
    },
    stationGroupTitle: {
      color: colors.text.muted,
      fontSize: 13,
      fontWeight: "bold",
      marginBottom: 10
    },
    opBadgeContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    opBadge: {
      backgroundColor: colors.border.light,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border.default
    },
    opBadgeText: {
      color: colors.text.secondary,
      fontSize: 11
    }
  });
