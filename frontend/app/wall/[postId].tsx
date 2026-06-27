import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useToast } from "@/src/components/Toast";
import Avatar from "@/src/components/Avatar";
import GenderBadge from "@/src/components/GenderBadge";
import { api } from "@/src/api";

type Post = {
  id: string;
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

type Comment = {
  id: string;
  author_alias: string;
  author_color: string;
  author_avatar?: string | null;
  author_gender?: "male" | "female" | "unknown";
  text: string;
  timestamp: string;
};

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export default function PostDetail() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user || !postId) return;
    try {
      const [p, cs] = await Promise.all([
        api.wallGetPost(String(postId), user.id),
        api.wallComments(String(postId)),
      ]);
      setPost(p);
      setComments(cs);
    } catch (e: any) {
      show(e.message || "Failed to load", "error");
    }
  }, [user, postId, show]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!user || !postId) return;
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const c = await api.wallAddComment(String(postId), user.id, t);
      setComments((prev) => [...prev, c]);
      setPost((p) => (p ? { ...p, comments_count: p.comments_count + 1 } : p));
      setText("");
    } catch (e: any) {
      show(e.message || "Failed", "error");
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async () => {
    if (!user || !post) return;
    setPost({ ...post, liked: !post.liked, likes_count: post.likes_count + (post.liked ? -1 : 1) });
    try {
      await api.wallLike(post.id, user.id);
    } catch {}
  };

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <LinearGradient
        colors={mode === "dark" ? ["#05050A", "#0B0918"] : ["#F5F4FB", "#EFEEFB"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.header, { borderColor: colors.border }]}>
        <Pressable
          testID="back-post"
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            post ? (
              <View style={[styles.post, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <View style={styles.head}>
                  <Avatar
                    alias={post.author_alias}
                    color={post.author_color}
                    image={post.author_avatar}
                    size={40}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.alias, { color: post.author_color }]}>
                        {post.author_alias}
                      </Text>
                      <GenderBadge gender={post.author_gender} size="xs" />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {timeAgo(post.timestamp)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.postText, { color: colors.textPrimary }]}>{post.text}</Text>
                <View style={styles.actions}>
                  <Pressable testID="post-like" onPress={toggleLike} style={styles.actionBtn} hitSlop={8}>
                    <Ionicons
                      name={post.liked ? "heart" : "heart-outline"}
                      size={20}
                      color={post.liked ? "#FF3B7A" : colors.textSecondary}
                    />
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600" }}>
                      {post.likes_count}
                    </Text>
                  </Pressable>
                  <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600" }}>
                      {post.comments_count}
                    </Text>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: colors.border, marginTop: 12 }} />
                <Text style={[styles.commentsLabel, { color: colors.textMuted }]}>
                  COMMENTS · {post.comments_count}
                </Text>
              </View>
            ) : (
              <ActivityIndicator color={colors.neonSecondary} style={{ marginTop: 40 }} />
            )
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 20, fontSize: 13 }}>
              No comments yet. Be the first to reply.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.comment, { backgroundColor: colors.glass, borderColor: colors.border }]}>
              <Avatar
                alias={item.author_alias}
                color={item.author_color}
                image={item.author_avatar}
                size={28}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.commentAlias, { color: item.author_color }]}>
                    {item.author_alias}
                  </Text>
                  <GenderBadge gender={item.author_gender} size="xs" />
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>· {timeAgo(item.timestamp)}</Text>
                </View>
                <Text style={[styles.commentText, { color: colors.textPrimary }]}>{item.text}</Text>
              </View>
            </View>
          )}
        />

        <View style={[styles.composer, { backgroundColor: colors.glassStrong, borderColor: colors.border }]}>
          <TextInput
            testID="comment-input"
            value={text}
            onChangeText={setText}
            placeholder="Reply to this post…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.textPrimary }]}
            multiline
            maxLength={500}
          />
          <Pressable
            testID="comment-send"
            onPress={send}
            disabled={!text.trim() || sending}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: text.trim() ? colors.neonPrimary : "#2A2A40",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "700" },
  list: { padding: 14, gap: 10, paddingBottom: 20 },
  post: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10, marginBottom: 6 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  alias: { fontSize: 14, fontWeight: "700" },
  postText: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  commentsLabel: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700", marginTop: 10 },
  comment: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  commentAlias: { fontSize: 12, fontWeight: "700" },
  commentText: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
