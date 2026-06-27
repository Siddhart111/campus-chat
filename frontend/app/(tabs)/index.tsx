import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useToast } from "@/src/components/Toast";
import Avatar from "@/src/components/Avatar";
import GenderBadge from "@/src/components/GenderBadge";
import { api, wsUrl } from "@/src/api";

type Msg = {
  id: string;
  sender_id: string;
  sender_alias: string;
  sender_color: string;
  sender_avatar?: string | null;
  sender_gender?: "male" | "female" | "unknown";
  text?: string;
  image?: string;
  timestamp: string;
};

function timeOf(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function GroupChat() {
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const { show } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [online, setOnline] = useState(73);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList>(null);

  // Load history + online count
  useEffect(() => {
    (async () => {
      try {
        const [msgs, oc] = await Promise.all([api.groupMessages(), api.onlineCount()]);
        setMessages(msgs);
        setOnline(oc.count);
      } catch {}
    })();
  }, []);

  // WebSocket
  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(wsUrl(user.id));
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "group_message") {
          setMessages((prev) => [...prev, data.message]);
        } else if (data.type === "presence") {
          setOnline((prev) => Math.max(prev, data.online + 20));
        }
      } catch {}
    };
    ws.onerror = () => {};
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [messages.length]);

  const pickImage = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        show("Photo permission denied", "error");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.base64) {
        setPendingImage(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch {
      show("Couldn't pick image", "error");
    }
  }, [show]);

  const send = useCallback(async () => {
    if (!user) return;
    const t = text.trim();
    if (!t && !pendingImage) return;
    const ws = wsRef.current;
    const payload = { type: "group_message", text: t || undefined, image: pendingImage || undefined };
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      // fallback HTTP
      try {
        const m = await api.sendMessage({
          sender_id: user.id,
          text: t || undefined,
          image: pendingImage || undefined,
        });
        setMessages((prev) => [...prev, m]);
      } catch (e: any) {
        show(e.message || "Send failed", "error");
        return;
      }
    }
    setText("");
    setPendingImage(null);
  }, [text, pendingImage, user, show]);

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <LinearGradient
        colors={mode === "dark" ? ["#05050A", "#0B0918"] : ["#F5F4FB", "#EFEEFB"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top header */}
      <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.glass }]}>
        <View style={styles.headerLeft}>
          <Avatar alias={user.alias} color={user.avatar_color} image={user.avatar_image} size={36} glow />
          <View>
            <Text style={[styles.headerHi, { color: colors.textMuted }]}>YOU&apos;RE</Text>
            <Text style={[styles.headerAlias, { color: colors.textPrimary }]}>{user.alias}</Text>
          </View>
        </View>
        <View
          style={[
            styles.onlinePill,
            { borderColor: "rgba(57,255,20,0.4)", backgroundColor: "rgba(57,255,20,0.08)" },
          ]}
          testID="online-count"
        >
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{online} online</Text>
        </View>
      </View>

      {/* Pinned banner */}
      <View
        style={[
          styles.pinned,
          {
            backgroundColor: "rgba(79,70,229,0.08)",
            borderColor: "rgba(79,70,229,0.3)",
          },
        ]}
      >
        <Ionicons name="pin" size={14} color={colors.neonSecondary} />
        <Text style={[styles.pinnedText, { color: colors.textSecondary }]}>
          Welcome to Campus Chat — UPES Dehradun only{" "}
          <Text style={{ color: colors.neonSecondary }}>🎓</Text>
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              isSelf={item.sender_id === user.id}
              colors={colors}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {pendingImage ? null : null}

        <View style={[styles.composer, { backgroundColor: colors.glassStrong, borderColor: colors.border }]}>
          <TextInput
            testID="message-input"
            value={text}
            onChangeText={setText}
            placeholder="Drop a thought…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.textPrimary }]}
            multiline
            maxLength={500}
          />
          <Pressable
            testID="send-message-button"
            onPress={send}
            disabled={!text.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: text.trim() ? colors.neonPrimary : "#2A2A40",
                opacity: pressed ? 0.85 : 1,
                shadowColor: colors.neonPrimary,
                shadowOpacity: text.trim() ? 0.7 : 0,
              },
            ]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  msg,
  isSelf,
  colors,
}: {
  msg: Msg;
  isSelf: boolean;
  colors: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(translate, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();
  }, [opacity, translate]);

  return (
    <Animated.View
      style={[
        styles.row,
        isSelf ? styles.rowRight : styles.rowLeft,
        { opacity, transform: [{ translateY: translate }] },
      ]}
    >
      {!isSelf ? (
        <Avatar alias={msg.sender_alias} color={msg.sender_color} image={msg.sender_avatar} size={32} />
      ) : null}
      <View style={{ maxWidth: "76%" }}>
        {!isSelf ? (
          <View style={styles.aliasRow}>
            <Text style={[styles.aliasLabel, { color: msg.sender_color }]}>
              {msg.sender_alias}
            </Text>
            <GenderBadge gender={msg.sender_gender} size="xs" />
          </View>
        ) : null}
        <View
          style={[
            styles.bubble,
            isSelf
              ? {
                  backgroundColor: colors.bubbleSelf,
                  borderBottomRightRadius: 4,
                  shadowColor: colors.bubbleSelf,
                  shadowOpacity: 0.4,
                }
              : {
                  backgroundColor: colors.bubbleOther,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderBottomLeftRadius: 4,
                },
          ]}
        >
          {msg.image ? (
            <Image source={{ uri: msg.image }} style={styles.msgImage} />
          ) : null}
          {msg.text ? (
            <Text
              style={{
                color: isSelf ? "#fff" : colors.textPrimary,
                fontSize: 15,
                lineHeight: 20,
              }}
            >
              {msg.text}
            </Text>
          ) : null}
          <Text
            style={[
              styles.time,
              { color: isSelf ? "rgba(255,255,255,0.7)" : colors.textMuted },
            ]}
          >
            {timeOf(msg.timestamp)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerHi: { fontSize: 10, letterSpacing: 1.5 },
  headerAlias: { fontSize: 16, fontWeight: "700" },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#39FF14",
    shadowColor: "#39FF14",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  onlineText: { color: "#39FF14", fontSize: 11, fontWeight: "700" },
  pinned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  pinnedText: { fontSize: 12, flex: 1 },
  listContent: { padding: 12, gap: 8 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 6 },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end", alignSelf: "flex-end" },
  aliasRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, marginLeft: 2 },
  aliasLabel: { fontSize: 11, fontWeight: "700" },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  msgImage: { width: 200, height: 160, borderRadius: 10, marginBottom: 6 },
  time: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 4,
  },
  preview: {
    marginHorizontal: 12,
    marginBottom: 4,
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewImg: { width: "100%", height: "100%" },
  previewClose: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
