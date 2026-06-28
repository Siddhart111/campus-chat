import React, { useRef } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Wraps a message bubble — when the user swipes right past 50px,
 * it triggers onReply() with the wrapped message.
 */
export default function SwipeToReply({
  children,
  onReply,
}: {
  children: React.ReactNode;
  onReply: () => void;
}) {
  const translate = useRef(new Animated.Value(0)).current;
  const triggered = useRef(false);

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => {
        return Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy);
      },
      onPanResponderMove: (_e, g) => {
        if (g.dx > 0 && g.dx < 90) {
          translate.setValue(g.dx);
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx > 55 && !triggered.current) {
          triggered.current = true;
          onReply();
          setTimeout(() => (triggered.current = false), 300);
        }
        Animated.spring(translate, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translate, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const iconOpacity = translate.interpolate({
    inputRange: [0, 30, 90],
    outputRange: [0, 0.4, 1],
    extrapolate: "clamp",
  });
  const iconScale = translate.interpolate({
    inputRange: [0, 30, 60],
    outputRange: [0.6, 0.85, 1.05],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.iconArea,
          { opacity: iconOpacity, transform: [{ scale: iconScale }] },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="arrow-undo" size={18} color="#8B5CF6" />
      </Animated.View>
      <Animated.View
        style={{ transform: [{ translateX: translate }] }}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  iconArea: {
    position: "absolute",
    left: 6,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,0.12)",
    borderRadius: 18,
  },
});
