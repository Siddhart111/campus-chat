import { useCallback, useEffect, useRef, useState } from "react";
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
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useToast } from "@/src/components/Toast";
import Avatar from "@/src/components/Avatar";
import { api, wsUrl } from "@/src/api";

type Msg = {
  id: string;
  sender_id: string;
  sender_alias: string;
  sender_color: string;
  sender_avatar?: string | null;
  text?: string;
  image?: string;
  timestamp: string;
};

type Peer = { id: string; alias: string; avatar_color: string; avatar_image?: string | null; online?: boolean };

function timeOf(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function PrivateChat() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !friendId) return;
    (async () => {
      try {
        const [p, ms] = await Promise.all([
          api.getUser(String(friendId)),
          api.privateMessages(user.id, String(friendId)),
        ]);
        setPeer(p);
        setMessages(ms);
      } catch (e: any) {
        show(e.message || "Failed to load", "error");
      }
    })();
  }, [user, friendId, show]);

  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(wsUrl(user.id));
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "private_message") {
          const m: Msg = data.message;
          if (
            (m.sender_id === user.id && (m as any).recipient_id === friendId) ||
            (m.sender_id === friendId && (m as any).recipient_id === user.id)
          ) {
            setMessages((prev) => [...prev, m]);
            if (m.sender_id === friendId) setPeerTyping(false);
          }
        } else if (data.type === "typing") {
          if (data.from_id === friendId) {
            setPeerTyping(!!data.is_typing);
          }
        }
      } catch {}
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user, friendId]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [messages.length, peerTyping]);

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

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: "typing", to_id: friendId, is_typing: isTyping }));
    },
    [friendId]
  );

  const onTextChange = (v: string) => {
    setText(v);
    sendTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 2000);
  };

  const send = useCallback(async () => {
    if (!user || !friendId) return;
    const t = text.trim();
    if (!t && !pendingImage) return;
    const ws = wsRef.current;
    const payload = {
      type: "private_message",
      to_id: String(friendId),
      text: t || undefined,
      image: pendingImage || undefined,
    };
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      sendTyping(false);
    } else {
      try {
        const m = await api.sendMessage({
          sender_id: user.id,
          text: t || undefined,
          image: pendingImage || undefined,
          recipient_id: String(friendId),
        });
        setMessages((prev) => [...prev, m]);
      } catch (e: any) {
        show(e.message || "Send failed", "error");
        return;
      }
    }
    setText("");
    setPendingImage(null);
  }, [text, pendingImage, user, friendId, sendTyping, show]);

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <LinearGradient
        colors={mode === "dark" ? ["#05050A", "#0B0918"] : ["#F5F4FB", "#EFEEFB"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.glass }]}>
        <Pressable
          testID="chat-back"
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.04)" }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        {peer ? (
          <View style={styles.peerRow}>
            <Avatar alias={peer.alias} color={peer.avatar_color} image={peer.avatar_image} size={36} online />
            <View>
              <Text style={[styles.peerAlias, { color: colors.textPrimary }]}>{peer.alias}</Text>
              <Text style={[styles.peerStatus, { color: peerTyping ? colors.neonSecondary : colors.textMuted }]}>
                {peerTyping ? "typing…" : "Online"}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.textMuted }}>Loading…</Text>
        )}
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Bubble msg={item} isSelf={item.sender_id === user.id} colors={colors} />
          )}
          ListFooterComponent={peerTyping && peer ? <TypingBubble peer={peer} colors={colors} /> : null}
        />

        {pendingImage ? (
          <View style={[styles.preview, { borderColor: colors.border }]}>
            <Image source={{ uri: pendingImage }} style={styles.previewImg} />
            <Pressable onPress={() => setPendingImage(null)} style={styles.previewClose}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.composer, { backgroundColor: colors.glassStrong, borderColor: colors.border }]}>
          <Pressable
            onPress={pickImage}
            style={[styles.iconBtn, { backgroundColor: "rgba(139,92,246,0.15)" }]}
          >
            <Ionicons name="image-outline" size={22} color={colors.neonSecondary} />
          </Pressable>
          <TextInput
            testID="private-message-input"
            value={text}
            onChangeText={onTextChange}
            placeholder={`Message ${peer?.alias || ""}`}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.textPrimary }]}
            multiline
            maxLength={500}
          />
          <Pressable
            testID="private-send-button"
            onPress={send}
            disabled={!text.trim() && !pendingImage}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: text.trim() || pendingImage ? colors.neonPrimary : "#2A2A40",
                opacity: pressed ? 0.85 : 1,
                shadowColor: colors.neonPrimary,
                shadowOpacity: text.trim() || pendingImage ? 0.7 : 0,
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

function Bubble({ msg, isSelf, colors }: { msg: Msg; isSelf: boolean; colors: any }) {
  return (
    <View style={[styles.row, isSelf ? styles.rowRight : styles.rowLeft]}>
      <View style={{ maxWidth: "78%" }}>
        <View
          style={[
            styles.bubble,
            isSelf
              ? {
                  backgroundColor: colors.bubbleSelf,
                  borderBottomRightRadius: 4,
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
            <Text style={{ color: isSelf ? "#fff" : colors.textPrimary, fontSize: 15, lineHeight: 20 }}>
              {msg.text}
            </Text>
          ) : null}
          <Text
            style={[
              styles.time,
              { color: isSelf ? "rgba(255,255,255,0.7)" : colors.textMuted },
            ]}
          >
            {isSelf ? "You · " : ""}
            {timeOf(msg.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TypingBubble({ peer, colors }: { peer: Peer; colors: any }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: -4, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View style={[styles.row, styles.rowLeft, { marginTop: 4 }]} testID="typing-indicator">
      <Avatar alias={peer.alias} color={peer.avatar_color} image={peer.avatar_image} size={24} />
      <View
        style={[
          styles.typingBubble,
          { backgroundColor: colors.bubbleOther, borderColor: colors.border },
        ]}
      >
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              { backgroundColor: colors.textSecondary, transform: [{ translateY: d }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  peerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  peerAlias: { fontSize: 15, fontWeight: "700" },
  peerStatus: { fontSize: 11, marginTop: 1 },
  list: { padding: 14, gap: 6 },
  row: { flexDirection: "row", marginBottom: 4, gap: 6 },
  rowLeft: { justifyContent: "flex-start", alignSelf: "flex-start" },
  rowRight: { justifyContent: "flex-end", alignSelf: "flex-end" },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
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
  typingBubble: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
});
