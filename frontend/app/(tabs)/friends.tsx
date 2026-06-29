import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useToast } from "@/src/components/Toast";
import Avatar from "@/src/components/Avatar";
import GenderBadge from "@/src/components/GenderBadge";
import { api } from "@/src/api";

type FriendRequest = {
  request_id: string;
  from_user: { id: string; alias: string; avatar_color: string; avatar_image?: string | null; gender?: "male" | "female" | "unknown" };
};

type Friend = {
  id: string;
  alias: string;
  avatar_color: string;
  avatar_image?: string | null;
  gender?: "male" | "female" | "unknown";
  online: boolean;
};

type DiscoverUser = { id: string; alias: string; avatar_color: string; avatar_image?: string | null; gender?: "male" | "female" | "unknown" };

export default function FriendsTab() {
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"requests" | "add" | "friends">("requests");
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [discover, setDiscover] = useState<DiscoverUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [r, f, d] = await Promise.all([
        api.requests(user.id),
        api.friends(user.id),
        api.discover(user.id),
      ]);
      setRequests(r);
      setFriends(f);
      setDiscover(d);
    } catch (e: any) {
      show(e.message || "Failed to load", "error");
    }
  }, [user, show]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const accept = async (rid: string, alias: string) => {
    try {
      await api.accept(rid);
      show(`You and ${alias} are now friends`, "success");
      load();
    } catch (e: any) {
      show(e.message || "Failed", "error");
    }
  };

  const decline = async (rid: string) => {
    try {
      await api.decline(rid);
      load();
    } catch (e: any) {
      show(e.message || "Failed", "error");
    }
  };

  const sendReq = async (toId: string, alias: string) => {
    if (!user) return;
    try {
      await api.sendRequest(user.id, toId);
      show(`Request sent to ${alias}`, "success");
      setDiscover((prev) => prev.filter((u) => u.id !== toId));
    } catch (e: any) {
      show(e.message || "Failed", "error");
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <LinearGradient
        colors={mode === "dark" ? ["#05050A", "#0B0918"] : ["#F5F4FB", "#EFEEFB"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.textPrimary }]}>Friends</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Your circle, anonymized.
        </Text>
      </View>

      {/* Segmented */}
      <View style={[styles.segment, { backgroundColor: colors.glass, borderColor: colors.border }]}>
        <Pressable
          testID="tab-requests"
          onPress={() => setTab("requests")}
          style={[
            styles.segBtn,
            tab === "requests" && { backgroundColor: colors.neonPrimary },
          ]}
        >
          <Text style={[styles.segText, { color: tab === "requests" ? "#fff" : colors.textSecondary }]}>
            Requests
          </Text>
          {requests.length > 0 ? (
            <View style={styles.miniBadge}>
              <Text style={styles.miniBadgeText}>{requests.length}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          testID="tab-add"
          onPress={() => setTab("add")}
          style={[
            styles.segBtn,
            tab === "add" && { backgroundColor: colors.neonPrimary },
          ]}
        >
          <Text style={[styles.segText, { color: tab === "add" ? "#fff" : colors.textSecondary }]}>
            Add Friend
          </Text>
        </Pressable>
        <Pressable
          testID="tab-friends"
          onPress={() => setTab("friends")}
          style={[
            styles.segBtn,
            tab === "friends" && { backgroundColor: colors.neonPrimary },
          ]}
        >
          <Text style={[styles.segText, { color: tab === "friends" ? "#fff" : colors.textSecondary }]}>
            My Friends ({friends.length})
          </Text>
        </Pressable>
      </View>

      {tab === "requests" ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonSecondary} />}
        >
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            INCOMING REQUESTS
          </Text>
          {requests.length === 0 ? (
            <EmptyState text="No requests right now." colors={colors} />
          ) : (
            requests.map((r) => (
              <View
                key={r.request_id}
                style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.border }]}
              >
                <Avatar alias={r.from_user.alias} color={r.from_user.avatar_color} image={r.from_user.avatar_image} size={44} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.cardAlias, { color: colors.textPrimary }]}>
                      {r.from_user.alias}
                    </Text>
                    <GenderBadge gender={r.from_user.gender} size="xs" />
                  </View>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    wants to chat with you
                  </Text>
                </View>
                <Pressable
                  testID={`accept-${r.request_id}`}
                  onPress={() => accept(r.request_id, r.from_user.alias)}
                  style={[styles.smallBtn, { backgroundColor: colors.neonPrimary }]}
                >
                  <Text style={styles.smallBtnText}>Add</Text>
                </Pressable>
                <Pressable
                  testID={`decline-${r.request_id}`}
                  onPress={() => decline(r.request_id)}
                  style={[styles.ghostBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.ghostBtnText, { color: colors.textSecondary }]}>
                    Decline
                  </Text>
                </Pressable>
              </View>
            ))
          )}

        </ScrollView>
      ) : tab === "add" ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonSecondary} />}
        >
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            DISCOVER PEOPLE
          </Text>
          {discover.length === 0 ? (
            <EmptyState text="No new people to add right now." colors={colors} />
          ) : (
            discover.map((d) => (
              <View
                key={d.id}
                style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.border }]}
              >
                <Avatar alias={d.alias} color={d.avatar_color} image={d.avatar_image} size={44} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.cardAlias, { color: colors.textPrimary }]}>{d.alias}</Text>
                    <GenderBadge gender={d.gender} size="xs" />
                  </View>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Anonymous · UPES verified
                  </Text>
                </View>
                <Pressable
                  testID={`discover-${d.id}`}
                  onPress={() => sendReq(d.id, d.alias)}
                  style={[
                    styles.smallBtn,
                    { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.neonSecondary },
                  ]}
                >
                  <Ionicons name="person-add" size={14} color={colors.neonSecondary} />
                  <Text style={[styles.smallBtnText, { color: colors.neonSecondary, marginLeft: 4 }]}>
                    Add
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonSecondary} />}
          ListEmptyComponent={<EmptyState text="No friends yet. Accept some requests!" colors={colors} />}
          renderItem={({ item }) => (
            <Pressable
              testID={`open-chat-${item.id}`}
              onPress={() => router.push(`/chat/${item.id}`)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.glass,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Avatar alias={item.alias} color={item.avatar_color} image={item.avatar_image} size={48} online={item.online} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.cardAlias, { color: colors.textPrimary }]}>{item.alias}</Text>
                  <GenderBadge gender={item.gender} size="xs" />
                </View>
                <Text style={[styles.cardSub, { color: item.online ? "#39FF14" : colors.textMuted }]}>
                  {item.online ? "Online now" : "Offline"}
                </Text>
              </View>
              <Ionicons name="chatbubble-ellipses" size={22} color={colors.neonSecondary} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyState({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <Ionicons name="sparkles" size={26} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, marginTop: 8 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 0 },
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: 2 },
  segment: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  segText: { fontSize: 13, fontWeight: "700" },
  miniBadge: {
    backgroundColor: "#FF3B30",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  scroll: { padding: 16, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
    marginTop: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  cardAlias: { fontSize: 15, fontWeight: "700" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardSub: { fontSize: 12, marginTop: 2 },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  smallBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  ghostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 6,
  },
  ghostBtnText: { fontSize: 12, fontWeight: "600" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
  },
});
