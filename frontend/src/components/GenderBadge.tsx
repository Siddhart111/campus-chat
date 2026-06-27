import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Gender = "male" | "female" | "unknown" | undefined | null;

export default function GenderBadge({
  gender,
  size = "sm",
}: {
  gender: Gender;
  size?: "xs" | "sm" | "md";
}) {
  if (gender !== "male" && gender !== "female") return null;

  const isMale = gender === "male";
  const config = isMale
    ? {
        // Cyan / electric blue — "HE" with lightning
        gradient: ["#00B7FF", "#1E40FF"] as const,
        border: "#7DD3FC",
        glow: "#00B7FF",
        icon: "flash" as const,
        label: "HE",
      }
    : {
        // Hot pink / magenta — "SHE" with sparkle
        gradient: ["#FF4FB8", "#A21CAF"] as const,
        border: "#F5A8E0",
        glow: "#FF4FB8",
        icon: "sparkles" as const,
        label: "SHE",
      };

  const padH = size === "xs" ? 6 : size === "sm" ? 8 : 10;
  const padV = size === "xs" ? 2 : size === "sm" ? 3 : 4;
  const iconSize = size === "xs" ? 10 : size === "sm" ? 12 : 14;
  const fontSize = size === "xs" ? 9 : size === "sm" ? 10 : 11;

  return (
    <View
      testID={`gender-badge-${gender}`}
      style={[
        styles.wrap,
        {
          shadowColor: config.glow,
          shadowOpacity: 0.7,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
          elevation: 3,
        },
      ]}
    >
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.badge,
          {
            paddingHorizontal: padH,
            paddingVertical: padV,
            borderColor: config.border,
          },
        ]}
      >
        <Ionicons name={config.icon} size={iconSize} color="#FFFFFF" />
        <Text style={[styles.text, { fontSize }]}>{config.label}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 999 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 0.6,
  },
});
