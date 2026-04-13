import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "../context/ThemeContext";

// İç Layout: Context'e erişebilmek için ayrı bir fonksiyona ayırdık
function RootLayoutNav() {
  const { colors, isDarkMode } = useTheme();

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background.main }}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.main },
          animation: "slide_from_right"
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="results" />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
