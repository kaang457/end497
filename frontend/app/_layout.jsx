import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    // GestureHandlerRootView is required for zooming/panning later
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0d1117" }
        }}
      >
        <index name="index" />
        <index name="result" />
      </Stack>
    </GestureHandlerRootView>
  );
}
