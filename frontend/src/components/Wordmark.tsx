import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Neon "Campus Chat" typographic wordmark.
 * Used on splash + landing.
 */
export default function Wordmark({
  size = 44,
  animate = true,
  subtitle,
}: {
  size?: number;
  animate?: boolean;
  subtitle?: string;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [animate, pulse]);

  const shadowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const shadowRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [12, 26] });

  return (
    <View style={styles.wrap} testID="wordmark">
      <Animated.Text
        style={[
          styles.text,
          {
            fontSize: size,
            shadowOpacity,
            shadowRadius,
          },
        ]}
      >
        CAMPUS
      </Animated.Text>
      <View style={styles.row}>
        <View style={styles.bar} />
        <Animated.Text
          style={[
            styles.textLight,
            {
              fontSize: size * 0.95,
              shadowOpacity,
              shadowRadius,
            },
          ]}
        >
          CHAT
        </Animated.Text>
        <View style={styles.bar} />
      </View>
      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
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
    textShadowRadius: 18,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
  },
  textLight: {
    color: "#C7BFFF",
    fontWeight: "300",
    letterSpacing: 8,
    textShadowColor: "#4F46E5",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 0 },
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
