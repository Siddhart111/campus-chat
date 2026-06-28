import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Block shown ABOVE a message bubble when it's a reply.
 * Also reused inside the composer to preview the message being replied to.
 */
export type ReplyTo = {
  id: string;
  sender_alias: string;
  text: string;
};

export function ReplyQuoteBlock({
  reply,
  selfPrefix,
  colors,
  compact,
}: {
  reply: ReplyTo;
  selfPrefix?: boolean;
  colors: any;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.quote,
        {
          backgroundColor: "rgba(139,92,246,0.10)",
          borderLeftColor: colors.neonSecondary,
        },
        compact ? styles.quoteCompact : null,
      ]}
    >
      <Text
        style={[
          styles.alias,
          { color: colors.neonSecondary },
        ]}
        numberOfLines={1}
      >
        {selfPrefix ? "Replying to " : ""}
        {reply.sender_alias}
      </Text>
      <Text
        style={[styles.text, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {reply.text}
      </Text>
    </View>
  );
}

export function ReplyComposerPreview({
  reply,
  onCancel,
  colors,
}: {
  reply: ReplyTo;
  onCancel: () => void;
  colors: any;
}) {
  return (
    <View style={[styles.composerWrap, { borderColor: colors.border, backgroundColor: colors.glass }]}>
      <View style={{ flex: 1 }}>
        <ReplyQuoteBlock reply={reply} selfPrefix colors={colors} compact />
      </View>
      <Pressable testID="cancel-reply-button" onPress={onCancel} hitSlop={10} style={styles.closeBtn}>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  quote: {
    borderLeftWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
    maxWidth: 260,
  },
  quoteCompact: { paddingVertical: 4, marginBottom: 0 },
  alias: { fontSize: 11, fontWeight: "800", marginBottom: 2 },
  text: { fontSize: 12, lineHeight: 16 },
  composerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
});
