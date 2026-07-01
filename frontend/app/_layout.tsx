import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { RealtimeProvider } from "@/src/contexts/RealtimeContext";
import { ThemeProvider, useTheme } from "@/src/contexts/ThemeContext";
import { ToastProvider } from "@/src/components/Toast";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

function ThemedShell() {
  const { mode, colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("inset-swipe");
    }
  }, []);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RealtimeProvider>
            <ToastProvider>
              <ThemedShell />
            </ToastProvider>
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
