import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { storage } from "@/src/utils/storage";

export type ThemeMode = "dark" | "light";

export type ThemeColors = {
  bg: string;
  bgElev: string;
  glass: string;
  glassStrong: string;
  border: string;
  borderGlow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  neonPrimary: string;
  neonSecondary: string;
  online: string;
  danger: string;
  bubbleSelf: string;
  bubbleOther: string;
};

const DARK: ThemeColors = {
  bg: "#05050A",
  bgElev: "#0B0B14",
  glass: "rgba(20,20,35,0.6)",
  glassStrong: "rgba(30,30,50,0.85)",
  border: "rgba(255,255,255,0.08)",
  borderGlow: "rgba(139,92,246,0.5)",
  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#52525B",
  neonPrimary: "#4F46E5",
  neonSecondary: "#8B5CF6",
  online: "#39FF14",
  danger: "#FF3B30",
  bubbleSelf: "#4F46E5",
  bubbleOther: "rgba(255,255,255,0.06)",
};

const LIGHT: ThemeColors = {
  bg: "#F5F4FB",
  bgElev: "#FFFFFF",
  glass: "rgba(255,255,255,0.7)",
  glassStrong: "rgba(255,255,255,0.95)",
  border: "rgba(0,0,0,0.08)",
  borderGlow: "rgba(79,70,229,0.4)",
  textPrimary: "#0A0A14",
  textSecondary: "#4B4B58",
  textMuted: "#8B8B94",
  neonPrimary: "#4F46E5",
  neonSecondary: "#8B5CF6",
  online: "#22C55E",
  danger: "#EF4444",
  bubbleSelf: "#4F46E5",
  bubbleOther: "rgba(0,0,0,0.05)",
};

type Ctx = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
};

const ThemeCtx = createContext<Ctx>({} as Ctx);

const KEY = "campus_chat_theme_v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    (async () => {
      const m = await storage.getItem<string>(KEY, "dark");
      if (m === "light" || m === "dark") setMode(m);
    })();
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      storage.setItem(KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ mode, colors: mode === "dark" ? DARK : LIGHT, toggle }),
    [mode, toggle]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
