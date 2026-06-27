import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastItem = { id: number; text: string; tone: "info" | "success" | "error" };

const Ctx = createContext<{ show: (t: string, tone?: ToastItem["tone"]) => void }>({
  show: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((text: string, tone: ToastItem["tone"] = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const insets = useSafeAreaInsets();
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <View
        pointerEvents="none"
        style={[styles.wrap, { top: insets.top + 12 }]}
        testID="toast-host"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [opacity, translate]);

  const bg =
    item.tone === "success" ? "#1B7C3F" : item.tone === "error" ? "#9F1239" : "#1E1B4B";
  const border =
    item.tone === "success" ? "#39FF14" : item.tone === "error" ? "#FF3B30" : "#8B5CF6";

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity,
          transform: [{ translateY: translate }],
          shadowColor: border,
        },
      ]}
    >
      <Text style={styles.text}>{item.text}</Text>
    </Animated.View>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 240,
    maxWidth: 360,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
