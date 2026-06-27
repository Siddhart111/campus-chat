import { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme } from "@/src/contexts/ThemeContext";
import Wordmark from "@/src/components/Wordmark";

export default function Index() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (user) router.replace("/(tabs)");
      else router.replace("/landing");
    }, 1400);
    return () => clearTimeout(t);
  }, [loading, user, router]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bg }]}
      testID="splash-screen"
    >
      <LinearGradient
        colors={["#05050A", "#0E0A24", "#05050A"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowBlob} />
      <View style={[styles.glowBlob, styles.glowBlob2]} />
      <Wordmark size={42} subtitle="Anonymous · Real · UPES only" />
      <ActivityIndicator
        size="small"
        color="#8B5CF6"
        style={{ marginTop: 36 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glowBlob: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#4F46E5",
    opacity: 0.18,
    top: -80,
    left: -100,
  },
  glowBlob2: {
    backgroundColor: "#8B5CF6",
    top: undefined,
    left: undefined,
    bottom: -120,
    right: -100,
    opacity: 0.14,
  },
});
