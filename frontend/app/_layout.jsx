import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "../styles/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background || "#F8F9FA" }
        }}
      >
        <Stack.Screen name="index" /> {/* Yeni Landing Page / Dashboard */}
        <Stack.Screen name="new-plan" /> {/* Eski Form Ekranı */}
        <Stack.Screen name="results" /> {/* Güncellenmiş Sonuç Ekranı */}
      </Stack>
    </GestureHandlerRootView>
  );
}
