import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "../src/features/auth/context/AuthContext";
import AppMenuButton from "../src/components/navigation/AppMenuButton";
import FloatingCoachG from "../src/components/coach/FloatingCoachG";

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#020617" />
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "#020617"
              },
              animation: "slide_from_right"
            }}
          />
          <FloatingCoachG />
          <AppMenuButton />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
