import React from "react";
import { View, Text, StyleSheet } from "react-native";
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
    ? { color: "#3DA9FF", bg: "rgba(61,169,255,0.12)", border: "rgba(61,169,255,0.4)", icon: "male" as const, label: "M" }
    : { color: "#FF6BAA", bg: "rgba(255,107,170,0.12)", border: "rgba(255,107,170,0.45)", icon: "female" as const, label: "F" };

  const padH = size === "xs" ? 4 : size === "sm" ? 6 : 8;
  const padV = size === "xs" ? 1 : size === "sm" ? 2 : 3;
  const iconSize = size === "xs" ? 9 : size === "sm" ? 11 : 13;
  const fontSize = size === "xs" ? 9 : size === "sm" ? 10 : 11;

  return (
    <View
      testID={`gender-badge-${gender}`}
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: padH,
          paddingVertical: padV,
        },
      ]}
    >
      <Ionicons name={config.icon} size={iconSize} color={config.color} />
      <Text style={[styles.text, { color: config.color, fontSize }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 999,
  },
  text: { fontWeight: "800", letterSpacing: 0.5 },
});
