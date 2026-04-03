import { StyleSheet, Dimensions } from "react-native";
import { colors, spacing } from "./theme";

// By wrapping styles in a function, you can pass parameters like 'windowWidth' or 'theme'
// to make your CSS truly dynamic.
export const getStyles = (width = Dimensions.get("window").width) => {
  return StyleSheet.create({
    // --- Shared ---
    container: {
      flex: 1,
      backgroundColor: colors.background
    },

    // --- Form Screen (index.jsx) ---
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
      width: width > 600 ? 500 : "100%", // Dynamic width based on screen size
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
    inputGroup: {
      marginBottom: spacing.lg
    },
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

    // --- Results Screen (results.jsx) ---
    topBar: {
      paddingTop: spacing.xxl, // Account for notch
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingBottom: spacing.sm
    },
    topBarHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md
    },
    backText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 14,
      marginRight: spacing.lg
    },
    headerTitle: {
      color: colors.textPrimary,
      fontWeight: "700",
      fontSize: 16
    },
    stagePicker: {
      paddingHorizontal: spacing.lg
    },
    tab: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      marginRight: spacing.sm
    },
    tabText: {
      fontSize: 13,
      fontWeight: "600"
    },

    // --- Layout Drawing ---
    uLayoutScroll: {
      padding: spacing.xl,
      minWidth: width * 1.5 // Dynamic width for horizontal scrolling
    },
    uContainer: {
      flexDirection: "row"
    },
    mainLineColumn: {
      justifyContent: "space-between",
      height: 320
    },
    sideLineColumn: {
      marginLeft: spacing.xl,
      gap: spacing.md,
      justifyContent: "center"
    },
    stationRow: {
      flexDirection: "row",
      gap: spacing.md
    },
    stationBox: {
      width: 75,
      height: 75,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1
    },
    stationLabel: {
      fontWeight: "700",
      fontSize: 14,
      marginBottom: 4
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background
    },

    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
      flexWrap: "wrap"
    },
    statBox: {
      flex: 1,
      minWidth: 100,
      backgroundColor: colors.inputBg,
      padding: spacing.sm,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "600",
      textTransform: "uppercase",
      marginBottom: 2
    },
    statValue: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "700"
    },

    stationBox: {
      width: 85,
      height: 85,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1
    },
    stationLabel: {
      fontWeight: "800",
      fontSize: 13,
      marginBottom: 2
    },
    stationTime: {
      fontWeight: "600",
      fontSize: 11,
      opacity: 0.8
    }
  });
};
