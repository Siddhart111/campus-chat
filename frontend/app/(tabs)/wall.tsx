import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
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

type Post = {
  id: string;
  author_id: string;
  author_alias: string;
  author_color: string;
  author_avatar?: string | null;
  author_gender?: "male" | "female" | "unknown";
  text: string;
  timestamp: string;
  likes_count: number;
  comments_count: number;
  liked?: boolean;
};

function timeAgo(iso: string) {
  try {
    const t = new Date(iso).getTime();
    const sec = Math.floor((Date.now() - t) / 1000);
    if (sec < 60) return "just now";
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
    return `${Math.floor(sec / 86400)}d`;
  } catch {
    return "";
  }
}

export default function Wall() {
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.wallList(user.id);
      setPosts(list);
    } catch (e: any) {
      show(e.message || "Failed to load wall", "error");
    }
  }, [user, show]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user) return;
    const t = text.trim();
    if (!t) return;
    try {
      setPosting(true);
      const p = await api.wallCreate(user.id, t);
      setPosts((prev) => [p, ...prev]);
      setText("");
      show("Posted on the Wall 🎉", "success");
    } catch (e: any) {
      show(e.message || "Failed", "error");
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    // optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked: !p.liked, likes_count: p.likes_count + (p.liked ? -1 : 1) }
          : p
      )
    );
    try {
      await api.wallLike(post.id, user.id);
    } catch {
      // revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked: post.liked, likes_count: post.likes_count }
            : p
        )
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
        <View>
          <Text style={[styles.h1, { color: colors.textPrimary }]}>The Wall</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            Ask anything · UPES replies anonymously
          </Text>
        </View>
        <Ionicons name="flame" size={24} color="#FF6B35" />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonSecondary} />
          }
          ListHeaderComponent={
            <View
              style={[styles.composer, { backgroundColor: colors.glass, borderColor: colors.border }]}
              testID="wall-composer"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Avatar alias={user.alias} color={user.avatar_color} image={user.avatar_image} size={32} />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Posting as <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{user.alias}</Text>
                </Text>
                <GenderBadge gender={user.gender} size="xs" />
              </View>
              <TextInput
                testID="wall-input"
                value={text}
                onChangeText={setText}
                placeholder="Ask anything… exam tips, hostel issues, crush confessions"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                multiline
                maxLength={500}
              />
              <View style={styles.composerActions}>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{text.length}/500</Text>
                <Pressable
                  testID="wall-post-button"
                  onPress={submit}
                  disabled={!text.trim() || posting}
                  style={({ pressed }) => [
                    styles.postBtn,
                    {
                      backgroundColor: text.trim() ? colors.neonPrimary : "#2A2A40",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {posting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={14} color="#fff" />
                      <Text style={styles.postBtnText}>Post</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>
                Be the first to ask the Wall.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`wall-post-${item.id}`}
              onPress={() => router.push(`/wall/${item.id}`)}
              style={({ pressed }) => [
                styles.post,
                { backgroundColor: colors.glass, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <View style={styles.postHead}>
                <Avatar
                  alias={item.author_alias}
                  color={item.author_color}
                  image={item.author_avatar}
                  size={36}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.postAlias, { color: item.author_color }]}>
                      {item.author_alias}
                    </Text>
                    <GenderBadge gender={item.author_gender} size="xs" />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{timeAgo(item.timestamp)}</Text>
                </View>
              </View>
              <Text style={[styles.postText, { color: colors.textPrimary }]}>{item.text}</Text>
              <View style={styles.postActions}>
                <Pressable
                  testID={`like-${item.id}`}
                  onPress={() => toggleLike(item)}
                  style={styles.actionBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={item.liked ? "heart" : "heart-outline"}
                    size={20}
                    color={item.liked ? "#FF3B7A" : colors.textSecondary}
                  />
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                    {item.likes_count}
                  </Text>
                </Pressable>
                <View style={styles.actionBtn}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                    {item.comments_count} {item.comments_count === 1 ? "comment" : "comments"}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={{ color: colors.neonSecondary, fontSize: 12, fontWeight: "700" }}>
                  Reply →
                </Text>
              </View>
            </Pressable>
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: 2 },
  list: { padding: 16, gap: 10, paddingBottom: 80 },
  composer: { borderRadius: 20, borderWidth: 1, padding: 12, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  composerActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
  },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  post: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  postHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAlias: { fontSize: 14, fontWeight: "700" },
  postText: { fontSize: 15, lineHeight: 22 },
  postActions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
});
