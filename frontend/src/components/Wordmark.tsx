import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Neon "Campus Chat" typographic wordmark — static soft glow (no animation).
 */
export default function Wordmark({
  size = 44,
  // `animate` kept for backwards compatibility; ignored.
  animate: _animate = false,
  subtitle,
}: {
  size?: number;
  animate?: boolean;
  subtitle?: string;
}) {
  return (
    <View style={styles.wrap} testID="wordmark">
      <Text style={[styles.text, { fontSize: size }]}>CAMPUS</Text>
      <View style={styles.row}>
        <View style={styles.bar} />
        <Text style={[styles.textLight, { fontSize: size * 0.95 }]}>CHAT</Text>
        <View style={styles.bar} />
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <LinearGradient
        colors={["transparent", "rgba(139,92,246,0.2)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.glowBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  text: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 6,
    textShadowColor: "#8B5CF6",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  textLight: {
    color: "#C7BFFF",
    fontWeight: "300",
    letterSpacing: 8,
    textShadowColor: "#4F46E5",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    marginHorizontal: 10,
  },
  row: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  bar: {
    width: 28,
    height: 2,
    backgroundColor: "#8B5CF6",
    opacity: 0.7,
    borderRadius: 2,
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 12,
    letterSpacing: 4,
    marginTop: 14,
    textTransform: "uppercase",
  },
  glowBar: {
    height: 1,
    width: 220,
    marginTop: 18,
  },
});
