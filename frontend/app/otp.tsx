import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/api";

export default function Otp() {
  const { email, password, mode, debugOtp } = useLocalSearchParams<{
    email: string;
    password?: string;
    mode?: string;
    debugOtp?: string;
  }>();
  const { colors } = useTheme();
  const { show } = useToast();
  const { signIn } = useAuth();
  const router = useRouter();

  const isCollegeEmail = String(email).toLowerCase().endsWith("@stu.upes.ac.in");
  const [currentDebugOtp, setCurrentDebugOtp] = useState<string | undefined>(
    isCollegeEmail && typeof debugOtp === "string" ? debugOtp : undefined
  );
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const setDigit = (idx: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, "").slice(-1);
    setDigits((arr) => {
      const next = [...arr];
      next[idx] = clean;
      return next;
    });
    if (clean && idx < 5) {
      inputs.current[idx + 1]?.focus();
      setFocusIdx(idx + 1);
    }
  };

  const onKey = (idx: number, key: string) => {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
      setFocusIdx(idx - 1);
    }
  };

  const code = digits.join("");
  const ready = code.length === 6;

  const submit = async () => {
    if (!ready) return;
    setSubmitting(true);
    try {
      const res = await api.verifyOtp(String(email), code, password ? String(password) : undefined);
      await signIn(res.user);
      show(`Welcome, ${res.user.alias} 🎉`, "success");
      router.replace("/(tabs)");
    } catch (e: any) {
      show(e.message || "Wrong OTP", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    try {
      const res = await api.sendOtp(String(email));
      setSeconds(60);
      if (typeof res?.debug_otp === "string") {
        setCurrentDebugOtp(res.debug_otp);
        show("New OTP generated — use the code shown below.", "success");
      } else {
        show("New OTP sent — check your inbox 📩", "success");
      }
    } catch (e: any) {
      show(e.message || "Failed to resend", "error");
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#05050A", "#0E0A24", "#05050A"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={[styles.h1, { color: colors.textPrimary }]}>Enter the code</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Sent to{" "}
            <Text style={{ color: colors.neonSecondary }}>{email}</Text>
          </Text>
          {isCollegeEmail && currentDebugOtp ? (
            <View style={[styles.debugCard, { borderColor: colors.neonSecondary, backgroundColor: colors.glass }]}> 
              <Text style={[styles.debugLabel, { color: colors.neonSecondary }]}>In-app OTP mode enabled</Text>
              <Text style={[styles.debugCode, { color: colors.textPrimary }]}>{currentDebugOtp}</Text>
              <Text style={[styles.debugHint, { color: colors.textMuted }]}>Use this code directly in the app.</Text>
            </View>
          ) : (
            <Text style={[styles.demo, { color: colors.textMuted }]}> 
              📩 Open your UPES inbox to find the 6-digit code.
            </Text>
          )}

          <View style={styles.boxes}>
            {digits.map((d, i) => {
              const isFocus = focusIdx === i;
              return (
                <TextInput
                  key={i}
                  testID={`otp-input-${i}`}
                  ref={(r) => {
                    inputs.current[i] = r;
                  }}
                  value={d}
                  onChangeText={(v) => setDigit(i, v)}
                  onKeyPress={(e) => onKey(i, e.nativeEvent.key)}
                  onFocus={() => setFocusIdx(i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[
                    styles.box,
                    {
                      color: colors.textPrimary,
                      borderColor: isFocus || d ? colors.neonSecondary : colors.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      shadowColor: colors.neonSecondary,
                      shadowOpacity: isFocus ? 0.6 : 0,
                    },
                  ]}
                />
              );
            })}
          </View>

          <Pressable
            testID="verify-otp-button"
            onPress={submit}
            disabled={!ready || submitting}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: ready ? colors.neonPrimary : "#2A2A40",
                opacity: pressed ? 0.85 : 1,
                shadowColor: colors.neonPrimary,
                shadowOpacity: ready ? 0.6 : 0,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Verify & Continue</Text>
            )}
          </Pressable>

          <View style={styles.resendRow}>
            {seconds > 0 ? (
              <Text style={[styles.resendText, { color: colors.textMuted }]}>
                Resend in <Text style={{ color: colors.neonSecondary }}>{seconds}s</Text>
              </Text>
            ) : (
              <Pressable testID="resend-otp-button" onPress={resend}>
                <Text style={[styles.resendText, { color: colors.neonSecondary, fontWeight: "700" }]}>
                  Resend OTP
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { padding: 16 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  sub: { fontSize: 14 },
  demo: { fontSize: 12, marginTop: -8 },
  debugCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    gap: 6,
  },
  debugLabel: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  debugCode: { fontSize: 30, fontWeight: "800" },
  debugHint: { fontSize: 12, lineHeight: 18 },
  boxes: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
  box: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  cta: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 6,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  resendRow: { alignItems: "center", marginTop: 16 },
  resendText: { fontSize: 13, letterSpacing: 0.5 },
});
