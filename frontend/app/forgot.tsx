import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useToast } from "@/src/components/Toast";
import Wordmark from "@/src/components/Wordmark";
import { api } from "@/src/api";

const UPES_EMAIL_RE = /^[a-zA-Z][a-zA-Z0-9._-]*\.\d+@stu\.upes\.ac\.in$/;

export default function Forgot() {
  const { colors } = useTheme();
  const { show } = useToast();
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);

  const normalized = email.trim().toLowerCase();
  const emailValid = UPES_EMAIL_RE.test(normalized);
  const code = digits.join("");
  const pwValid = pw.length >= 6 && pw.length <= 8 && pw === confirm;

  useEffect(() => {
    if (stage !== "reset") return;
    inputs.current[0]?.focus();
  }, [stage]);

  useEffect(() => {
    if (stage !== "reset" || seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [stage, seconds]);

  const sendOtp = async () => {
    if (!emailValid) {
      show("Use your UPES student email", "error");
      return;
    }
    try {
      setLoading(true);
      await api.sendOtp(normalized);
      show("OTP sent — check your UPES inbox 📩", "success");
      setStage("reset");
      setSeconds(60);
    } catch (e: any) {
      show(e.message || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

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

  const submitReset = async () => {
    if (code.length !== 6) {
      show("Enter the 6-digit OTP", "error");
      return;
    }
    if (!pwValid) {
      show("Password must be 6–8 chars and both fields match", "error");
      return;
    }
    try {
      setLoading(true);
      await api.resetPassword(normalized, code, pw);
      show("Password reset — log in with your new password", "success");
      router.replace("/landing");
    } catch (e: any) {
      show(e.message || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.sendOtp(normalized);
      setSeconds(60);
      show("OTP resent — check your inbox 📩", "success");
    } catch (e: any) {
      show(e.message || "Failed", "error");
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <LinearGradient colors={["#05050A", "#0E0A24", "#05050A"]} style={StyleSheet.absoluteFill} />

      <View style={{ padding: 16 }}>
        <Pressable
          testID="back-to-login"
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Wordmark size={28} subtitle="Reset your password" />

          <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.border }]}>
            {stage === "email" ? (
              <>
                <Text style={[styles.h1, { color: colors.textPrimary }]}>Forgot password?</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  We&apos;ll send a 6-digit OTP to your UPES email so you can set a new password.
                </Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>UPES EMAIL</Text>
                <View
                  style={[
                    styles.inputWrap,
                    { borderColor: emailValid ? colors.neonSecondary : colors.border, backgroundColor: "rgba(255,255,255,0.03)" },
                  ]}
                >
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="forgot-email-input"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="parth.29555@stu.upes.ac.in"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    style={[styles.input, { color: colors.textPrimary }]}
                  />
                </View>

                <Pressable
                  testID="forgot-send-otp-button"
                  onPress={sendOtp}
                  disabled={!emailValid || loading}
                  style={({ pressed }) => [
                    styles.cta,
                    {
                      backgroundColor: emailValid ? colors.neonPrimary : "#2A2A40",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.ctaText}>Send reset OTP</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.h1, { color: colors.textPrimary }]}>Set a new password</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  Enter the OTP sent to <Text style={{ color: colors.neonSecondary }}>{normalized}</Text> and your new password.
                </Text>

                <View style={styles.boxes}>
                  {digits.map((d, i) => {
                    const isFocus = focusIdx === i;
                    return (
                      <TextInput
                        key={i}
                        testID={`forgot-otp-input-${i}`}
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
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>NEW PASSWORD (6–8)</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="new-password-input"
                    value={pw}
                    onChangeText={(v) => setPw(v.slice(0, 8))}
                    placeholder="6–8 chars"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPw}
                    maxLength={8}
                    autoCapitalize="none"
                    style={[styles.input, { color: colors.textPrimary }]}
                  />
                  <Pressable onPress={() => setShowPw((s) => !s)}>
                    <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>CONFIRM</Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: confirm.length > 0 && pw === confirm ? colors.online : colors.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="confirm-new-password-input"
                    value={confirm}
                    onChangeText={(v) => setConfirm(v.slice(0, 8))}
                    placeholder="Repeat new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPw}
                    maxLength={8}
                    autoCapitalize="none"
                    style={[styles.input, { color: colors.textPrimary }]}
                  />
                </View>

                <Pressable
                  testID="reset-password-button"
                  onPress={submitReset}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.cta,
                    { backgroundColor: colors.neonPrimary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Reset password</Text>}
                </Pressable>

                <View style={styles.resendRow}>
                  {seconds > 0 ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      Resend OTP in{" "}
                      <Text style={{ color: colors.neonSecondary }}>{seconds}s</Text>
                    </Text>
                  ) : (
                    <Pressable testID="forgot-resend-button" onPress={resend}>
                      <Text style={{ color: colors.neonSecondary, fontWeight: "700", fontSize: 12 }}>
                        Resend OTP
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, gap: 20 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { borderRadius: 24, borderWidth: 1, padding: 22, gap: 10 },
  h1: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 2, marginTop: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "500" },
  boxes: { flexDirection: "row", justifyContent: "space-between", gap: 6, marginTop: 12, marginBottom: 4 },
  box: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  cta: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  ctaText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  resendRow: { alignItems: "center", marginTop: 12 },
});
