import { View, Text, StyleSheet, Pressable, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useToast } from "@/src/components/Toast";
import Avatar from "@/src/components/Avatar";
import Wordmark from "@/src/components/Wordmark";

export default function ProfileTab() {
  const { colors, mode, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  if (!user) return null;

  const doSignOut = async () => {
    await signOut();
    show("Signed out", "info");
    router.replace("/landing");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <LinearGradient
        colors={mode === "dark" ? ["#05050A", "#0B0918"] : ["#F5F4FB", "#EFEEFB"]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identity hero */}
        <View style={[styles.hero, { backgroundColor: colors.glass, borderColor: colors.border }]}>
          <Avatar alias={user.alias} color={user.avatar_color} size={88} glow />
          <Text style={[styles.alias, { color: colors.textPrimary }]}>{user.alias}</Text>
          <View style={[styles.idChip, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" }]}>
            <Ionicons name="shield-checkmark" size={12} color={colors.neonSecondary} />
            <Text style={[styles.idChipText, { color: colors.textSecondary }]}>
              Verified UPES Student
            </Text>
          </View>
          <Text style={[styles.idLine, { color: colors.textMuted }]}>
            Real ID hidden · Identity rotates every session
          </Text>
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: colors.glass, borderColor: colors.border }]}>
          <Row
            icon={mode === "dark" ? "moon" : "sunny"}
            label="Dark mode"
            colors={colors}
            right={
              <Switch
                testID="dark-mode-toggle"
                value={mode === "dark"}
                onValueChange={toggle}
                trackColor={{ false: "#bbb", true: colors.neonPrimary }}
                thumbColor="#fff"
              />
            }
          />
          <Divider colors={colors} />
          <Row
            icon="notifications"
            label="In-app notifications"
            colors={colors}
            right={
              <Switch
                value
                disabled
                trackColor={{ false: "#bbb", true: colors.neonPrimary }}
                thumbColor="#fff"
              />
            }
          />
          <Divider colors={colors} />
          <Row
            icon="lock-closed"
            label="Anonymous mode"
            colors={colors}
            right={
              <Text style={[styles.badge, { color: colors.online }]}>ALWAYS ON</Text>
            }
          />
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.glass, borderColor: colors.border, alignItems: "center", paddingVertical: 24 }]}>
          <Wordmark size={22} animate={false} />
          <Text style={[styles.tag, { color: colors.textMuted, marginTop: 12 }]}>
            v1.0 · For UPES Dehradun students
          </Text>
        </View>

        <Pressable
          testID="sign-out-button"
          onPress={doSignOut}
          style={({ pressed }) => [
            styles.signOut,
            {
              backgroundColor: "rgba(239,68,68,0.1)",
              borderColor: "rgba(239,68,68,0.5)",
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  right,
  colors,
}: {
  icon: any;
  label: string;
  right: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.rowIcon, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
          <Ionicons name={icon} size={18} color={colors.neonSecondary} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      {right}
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />;
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  alias: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  idChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  idChipText: { fontSize: 11, fontWeight: "600" },
  idLine: { fontSize: 11, marginTop: 4 },
  section: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 14, fontWeight: "600" },
  badge: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  tag: { fontSize: 11, letterSpacing: 1 },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
  },
  signOutText: { color: "#EF4444", fontSize: 14, fontWeight: "700" },
});
