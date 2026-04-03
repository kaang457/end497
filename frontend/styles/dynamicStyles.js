import { StyleSheet, Dimensions } from "react-native";
import { colors, spacing } from "./theme";

export const getStyles = (width = Dimensions.get("window").width) => {
  return StyleSheet.create({
    // --- Shared (Ortak) ---
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.canvasBg
    },
    loadingText: { marginTop: spacing.md, color: colors.surface },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.canvasBg,
      padding: spacing.lg
    },

    // ==========================================
    // --- 1. Dashboard Ekranı (index.jsx) ---
    // ==========================================
    dashboardContainer: {
      padding: spacing.lg,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xl
    },
    header: { marginBottom: spacing.xl },
    greeting: { fontSize: 16, color: colors.textSecondary, marginBottom: 4 },
    dashboardTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.textPrimary
    },
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: spacing.xl
    },
    metricCard: {
      width: "48%",
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 16,
      marginBottom: spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2
    },
    metricTitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: "500"
    },
    metricRow: { flexDirection: "row", alignItems: "baseline" },
    metricValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.textPrimary
    },
    metricUnit: {
      fontSize: 14,
      fontWeight: "normal",
      color: colors.textSecondary,
      marginLeft: 4
    },
    metricTrend: { fontSize: 12, marginTop: 4, fontWeight: "600" },
    textSuccess: { color: colors.successBorder },
    textDanger: { color: colors.dangerBorder },
    textWarning: { color: colors.warningBorder },
    actionSection: { marginBottom: spacing.xl },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.md
    },
    primaryButton: {
      backgroundColor: colors.primary,
      padding: 20,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center"
    },
    primaryButtonIcon: { fontSize: 32, marginRight: spacing.md },
    primaryButtonText: {
      color: "#FFF",
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 4
    },
    primaryButtonSub: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
    planRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    planSku: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 4
    },
    planDate: { fontSize: 13, color: colors.textSecondary },
    planDemand: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4
    },
    planStatus: { fontSize: 12, fontWeight: "600" },

    // ==========================================
    // --- 2. Form Ekranı (new-plan.jsx) ---
    // ==========================================
    formScrollContainer: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.md
    },
    card: {
      backgroundColor: colors.surface,
      padding: spacing.xl,
      borderRadius: 12,
      width: width > 600 ? 500 : "100%",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2
    },
    title: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: spacing.xxl,
      letterSpacing: -0.5
    },
    inputGroup: { marginBottom: spacing.lg },
    label: {
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    input: {
      backgroundColor: colors.inputBg,
      color: colors.textPrimary,
      padding: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 16
    },
    mainBtn: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: spacing.md
    },
    btnText: {
      color: colors.surface,
      fontWeight: "600",
      fontSize: 16,
      letterSpacing: 0.5
    },

    // ==========================================
    // --- 3. Sonuç/Canvas Ekranı (results.jsx) ---
    // ==========================================
    canvasContainer: { flex: 1, backgroundColor: colors.canvasBg },
    topBar: {
      backgroundColor: colors.surface,
      paddingTop: 50,
      paddingBottom: 10,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderColor: colors.border
    },
    topBarHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16
    },
    backText: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 16,
      marginRight: 16
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary
    },
    stagePicker: { flexDirection: "row", gap: 8 },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    statsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: colors.canvasSurface,
      padding: 12,
      borderBottomWidth: 1,
      borderColor: colors.canvasBorder
    },
    statText: { color: colors.surface, fontSize: 14 },
    canvasWrapper: { flex: 1 },
    canvasScrollArea: { padding: 60, flexGrow: 1 },

    // Görseldeki Node (İstasyon) Tasarımı
    nodeContainer: { alignItems: "center", justifyContent: "center" },
    nodeLabelWrapper: { alignItems: "center", marginBottom: 2 },
    nodeLabelText: { fontSize: 10, color: colors.canvasText, marginBottom: 2 },
    nodeStem: { width: 1, height: 10, backgroundColor: colors.textSecondary },
    nodeBox: {
      width: 32,
      height: 32,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)"
    },
    nodeIcon: { fontSize: 16, color: colors.surface },
    nodeTime: { fontSize: 9, color: colors.canvasText, marginTop: 4 }
  });
};
