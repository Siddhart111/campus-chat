import { useMemo, useState } from "react";
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
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/contexts/AuthContext";
import Wordmark from "@/src/components/Wordmark";
import { api } from "@/src/api";

const UPES_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@stu\.upes\.ac\.in$/;

type Mode = "login" | "signup";

export default function Landing() {
  const { colors } = useTheme();
  const { show } = useToast();
  const { signIn } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalized = email.trim().toLowerCase();
  const emailValid = useMemo(() => UPES_EMAIL_RE.test(normalized), [normalized]);
  const isCollegeEmail = normalized.endsWith("@stu.upes.ac.in");
  const pwValid = password.length >= 6 && password.length <= 8;
  const pwMatch = mode === "signup" ? password === confirm && pwValid : pwValid;
  const formValid = emailValid && pwValid && (mode === "login" || pwMatch);

  const submit = async () => {
    if (!emailValid) {
      show("Use your UPES email like parth.29555@stu.upes.ac.in", "error");
      return;
    }
    if (!pwValid) {
      show("Password must be 6 to 8 characters", "error");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      show("Passwords do not match", "error");
      return;
    }
    try {
      setLoading(true);
      if (mode === "login") {
        const res = await api.login(normalized, password);
        await signIn(res.user);
        show(`Welcome back, ${res.user.alias}`, "success");
        router.replace("/(tabs)");
      } else {
        // Signup: trigger OTP and route to OTP screen with password staged
        const res = await api.sendOtp(normalized);
        show("OTP sent — check your UPES inbox 📩", "success");
        router.push({
          pathname: "/otp",
          params: {
            email: normalized,
            password,
            mode: "signup",
            debugOtp: isCollegeEmail ? res.debug_otp : undefined,
          },
        });
      }
    } catch (e: any) {
      show(e.message || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <LinearGradient colors={["#05050A", "#0E0A24", "#05050A"]} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, { backgroundColor: "#4F46E5" }]} />
      <View style={[styles.blob, styles.blob2, { backgroundColor: "#8B5CF6" }]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
          <View style={styles.brand}>
            <Wordmark size={34} subtitle="Anonymous · Real · Fun" />
          </View>

          <View style={styles.heroImageContainer}>
            <Image
              source={require("../assets/images/app-image.png")}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* College selector pill */}
          <View style={[styles.collegeRow, { backgroundColor: colors.glass, borderColor: colors.border }]}>
            <View
              testID="college-selected"
              style={[styles.collegeChip, { backgroundColor: "rgba(139,92,246,0.15)", borderColor: colors.neonSecondary }]}
            >
              <Ionicons name="school" size={14} color={colors.neonSecondary} />
              <Text style={[styles.collegeText, { color: colors.textPrimary }]}>UPES Dehradun</Text>
              <View style={[styles.miniDot, { backgroundColor: colors.online }]} />
            </View>
            <View
              testID="college-coming-soon"
              style={[styles.collegeChip, { backgroundColor: "rgba(255,255,255,0.03)", borderColor: colors.border }]}
            >
              <Ionicons name="add-circle-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.collegeText, { color: colors.textMuted }]}>More coming soon</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.border }]}>
            {/* Mode segmented control */}
            <View style={[styles.seg, { borderColor: colors.border }]}>
              <Pressable
                testID="tab-login"
                onPress={() => setMode("login")}
                style={[styles.segBtn, mode === "login" && { backgroundColor: colors.neonPrimary }]}
              >
                <Text style={[styles.segText, { color: mode === "login" ? "#fff" : colors.textSecondary }]}>
                  Log in
                </Text>
              </Pressable>
              <Pressable
                testID="tab-signup"
                onPress={() => setMode("signup")}
                style={[styles.segBtn, mode === "signup" && { backgroundColor: colors.neonPrimary }]}
              >
                <Text style={[styles.segText, { color: mode === "signup" ? "#fff" : colors.textSecondary }]}>
                  Sign up
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.welcome, { color: colors.textPrimary }]}>
              {mode === "login" ? "Welcome back, mate." : "Create your anonymous handle."}
            </Text>
            <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
              {mode === "login"
                ? "Log in with your UPES email and password."
                : "We'll send a 6-digit OTP to verify your UPES email."}
            </Text>

            {/* Email */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>UPES STUDENT EMAIL</Text>
            <View
              style={[
                styles.inputWrap,
                {
                  borderColor: emailValid ? colors.neonSecondary : colors.border,
                  shadowColor: colors.neonSecondary,
                  shadowOpacity: emailValid ? 0.4 : 0,
                  backgroundColor: "rgba(255,255,255,0.03)",
                },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={emailValid ? colors.neonSecondary : colors.textMuted} />
              <TextInput
                testID="email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="parth.29555@stu.upes.ac.in"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[styles.input, { color: colors.textPrimary }]}
              />
              {emailValid ? <Ionicons name="checkmark-circle" size={18} color={colors.online} /> : null}
            </View>

            {/* Password */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>PASSWORD (6–8 CHARS)</Text>
            <View
              style={[
                styles.inputWrap,
                {
                  borderColor: pwValid ? colors.neonSecondary : colors.border,
                  shadowColor: colors.neonSecondary,
                  shadowOpacity: pwValid ? 0.4 : 0,
                  backgroundColor: "rgba(255,255,255,0.03)",
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={pwValid ? colors.neonSecondary : colors.textMuted} />
              <TextInput
                testID="password-input"
                value={password}
                onChangeText={(v) => setPassword(v.slice(0, 8))}
                placeholder="6–8 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPw}
                maxLength={8}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.textPrimary }]}
              />
              <Pressable onPress={() => setShowPw((s) => !s)} testID="toggle-password-visibility">
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {/* Confirm password (signup only) */}
            {mode === "signup" ? (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CONFIRM PASSWORD</Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor:
                        confirm.length > 0 && password === confirm ? colors.online : colors.border,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="confirm-password-input"
                    value={confirm}
                    onChangeText={(v) => setConfirm(v.slice(0, 8))}
                    placeholder="Repeat password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPw}
                    maxLength={8}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: colors.textPrimary }]}
                  />
                  {confirm.length > 0 && password === confirm ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.online} />
                  ) : null}
                </View>
              </>
            ) : null}

            {/* Submit */}
            <Pressable
              testID="auth-submit-button"
              onPress={submit}
              disabled={!formValid || loading}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: formValid ? colors.neonPrimary : "#2A2A40",
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: colors.neonPrimary,
                  shadowOpacity: formValid ? 0.6 : 0,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {mode === "login" ? "Log in" : "Continue · send OTP"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </Pressable>

            <Pressable
              testID="switch-mode-button"
              onPress={() => setMode((m) => (m === "login" ? "signup" : "login"))}
              style={{ alignSelf: "center", marginTop: 14 }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {mode === "login" ? (
                  <>
                    New to Campus Chat?{" "}
                    <Text style={{ color: colors.neonSecondary, fontWeight: "700" }}>Sign up →</Text>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <Text style={{ color: colors.neonSecondary, fontWeight: "700" }}>Log in →</Text>
                  </>
                )}
              </Text>
            </Pressable>

            {mode === "login" ? (
              <Pressable
                testID="forgot-password-link"
                onPress={() => router.push("/forgot")}
                style={{ alignSelf: "center", marginTop: 6 }}
              >
                <Text style={{ color: colors.neonSecondary, fontSize: 12, fontWeight: "600" }}>
                  Forgot password?
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.foot, { color: colors.textMuted }]}>
            UPES Dehradun students only · Identities stay anonymous
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20, gap: 22, paddingVertical: 32 },
  brand: { alignItems: "center", marginBottom: 4 },
  collegeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  collegeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  collegeText: { fontSize: 12, fontWeight: "700" },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: "#39FF14",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  card: { borderRadius: 28, borderWidth: 1, padding: 20, gap: 8 },
  seg: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
  },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  segText: { fontSize: 13, fontWeight: "700" },
  welcome: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  welcomeSub: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 2, marginTop: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "500" },
  cta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 5,
  },
  ctaText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  foot: { textAlign: "center", fontSize: 11, letterSpacing: 0.4, paddingHorizontal: 8 },
  heroImageContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  heroImage: {
    width: "100%",
    maxWidth: 320,
    height: 180,
    borderRadius: 24,
  },
  blob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.14,
    top: -80,
    left: -80,
  },
  blob2: { top: undefined, left: undefined, bottom: -100, right: -80, opacity: 0.12 },
});
