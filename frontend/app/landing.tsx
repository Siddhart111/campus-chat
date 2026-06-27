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
const DOMAIN = "@stu.upes.ac.in";

export default function Landing() {
  const { colors } = useTheme();
  const { show } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const normalized = email.trim().toLowerCase();
  const valid = useMemo(() => UPES_EMAIL_RE.test(normalized), [normalized]);

  const onSubmit = async () => {
    if (!valid) {
      show("Use your UPES email like parth.29555@stu.upes.ac.in", "error");
      return;
    }
    try {
      setLoading(true);
      await api.sendOtp(normalized);
      show("OTP sent — check your UPES inbox 📩", "success");
      router.push({ pathname: "/otp", params: { email: normalized } });
    } catch (e: any) {
      show(e.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#05050A", "#0E0A24", "#05050A"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, { backgroundColor: "#4F46E5" }]} />
      <View style={[styles.blob, styles.blob2, { backgroundColor: "#8B5CF6" }]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Wordmark size={36} subtitle="Anonymous · Real · UPES only" />
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.glass, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.welcome, { color: colors.textPrimary }]}>
              Welcome back, mate.
            </Text>
            <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
              Log in or create your anonymous handle with your UPES student email.
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              UPES STUDENT EMAIL
            </Text>

            <View
              style={[
                styles.inputWrap,
                {
                  borderColor: valid ? colors.neonSecondary : colors.border,
                  shadowColor: colors.neonSecondary,
                  shadowOpacity: valid ? 0.5 : 0,
                  backgroundColor: "rgba(255,255,255,0.03)",
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={valid ? colors.neonSecondary : colors.textMuted}
                style={{ marginRight: 8 }}
              />
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
              {valid ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.online} />
              ) : null}
            </View>

            {!valid && email.length > 0 ? (
              <Text style={[styles.hint, { color: "#FF8B8B" }]}>
                Must end with{" "}
                <Text style={{ fontWeight: "700" }}>{DOMAIN}</Text>
              </Text>
            ) : (
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                We&apos;ll send a 6-digit code to verify your UPES identity.
              </Text>
            )}

            <Pressable
              testID="send-otp-button"
              onPress={onSubmit}
              disabled={!valid || loading}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: valid ? colors.neonPrimary : "#2A2A40",
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: colors.neonPrimary,
                  shadowOpacity: valid ? 0.6 : 0,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Continue with email</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>
                NEW HERE?
              </Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.bullets}>
              <Bullet text="Enter your UPES student mail — same flow for sign up." colors={colors} />
              <Bullet text="You'll get an anonymous handle like NeonPanda07." colors={colors} />
              <Bullet text="Your real name & ID stay hidden — always." colors={colors} />
            </View>
          </View>

          <Text style={[styles.foot, { color: colors.textMuted }]}>
            UPES Dehradun students only · By continuing, you accept our community rules.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bullet({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: colors.neonSecondary }]} />
      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 22, gap: 24, paddingVertical: 40 },
  brand: { alignItems: "center", marginBottom: 8 },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 10,
  },
  welcome: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  welcomeSub: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginTop: 4 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "500" },
  hint: { fontSize: 12, marginTop: 6 },
  cta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 6,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  bullets: { gap: 8, marginTop: 12 },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 12, lineHeight: 18 },
  foot: { textAlign: "center", fontSize: 11, letterSpacing: 0.5, paddingHorizontal: 8 },
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
