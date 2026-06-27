import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Avatar({
  alias,
  color,
  size = 40,
  online,
  glow,
}: {
  alias: string;
  color: string;
  size?: number;
  online?: boolean;
  glow?: boolean;
}) {
  const initials = alias
    .replace(/[0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: glow ? 0.9 : 0.5,
            shadowRadius: glow ? 12 : 6,
            shadowOffset: { width: 0, height: 0 },
            elevation: glow ? 8 : 4,
          },
        ]}
      >
        <Text
          style={[
            styles.initials,
            { fontSize: size * 0.4 },
          ]}
        >
          {initials}
        </Text>
      </View>
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: online ? "#39FF14" : "#52525B",
              right: 0,
              bottom: 0,
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dot: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#05050A",
  },
});
