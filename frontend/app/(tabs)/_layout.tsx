import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text, Image } from "react-native";
import { useEffect, useState } from "react";

import { useTheme } from "@/src/contexts/ThemeContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/api";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reqCount, setReqCount] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/landing");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      try {
        const reqs = await api.requests(user.id);
        if (alive) setReqCount(reqs.length);
      } catch {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [user]);

  if (!user) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.bgElev,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 78,
          paddingTop: 10,
          paddingBottom: 14,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.6,
          marginTop: 2,
        },
        tabBarActiveTintColor: colors.neonSecondary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Group",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconActive="chatbubbles"
              iconInactive="chatbubbles-outline"
              color={color}
              focused={focused}
              accent="#8B5CF6"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wall"
        options={{
          title: "Wall",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconActive="flame"
              iconInactive="flame-outline"
              color={focused ? "#FF6B35" : color}
              focused={focused}
              accent="#FF6B35"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconActive="people"
              iconInactive="people-outline"
              color={color}
              focused={focused}
              accent="#39FF14"
              badge={reqCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <ProfileTabIcon
              focused={focused}
              color={color}
              image={user.avatar_image}
              alias={user.alias}
              avatarColor={user.avatar_color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  iconActive,
  iconInactive,
  color,
  focused,
  accent,
  badge,
}: {
  iconActive: any;
  iconInactive: any;
  color: string;
  focused: boolean;
  accent: string;
  badge?: number;
}) {
  return (
    <View style={styles.iconWrap}>
      {focused ? (
        <View
          style={[
            styles.activePill,
            {
              backgroundColor: `${accent}22`,
              borderColor: `${accent}66`,
              shadowColor: accent,
            },
          ]}
        />
      ) : null}
      <Ionicons name={focused ? iconActive : iconInactive} size={24} color={color} />
      {badge ? (
        <View style={styles.badge} testID="friends-tab-badge">
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ProfileTabIcon({
  focused,
  color,
  image,
  alias,
  avatarColor,
}: {
  focused: boolean;
  color: string;
  image?: string | null;
  alias: string;
  avatarColor: string;
}) {
  const initials = alias.replace(/[0-9]/g, "").slice(0, 2).toUpperCase();
  if (image) {
    return (
      <View style={styles.iconWrap}>
        <View
          style={[
            styles.avatarRing,
            {
              borderColor: focused ? "#8B5CF6" : "transparent",
              shadowColor: "#8B5CF6",
              shadowOpacity: focused ? 0.6 : 0,
            },
          ]}
        >
          <Image
            source={{ uri: image }}
            style={styles.avatarImg}
            resizeMode="cover"
          />
        </View>
      </View>
    );
  }
  // No profile picture — show initials disc with the user's avatar color
  return (
    <View style={styles.iconWrap}>
      <View
        style={[
          styles.avatarRing,
          {
            borderColor: focused ? "#8B5CF6" : "transparent",
            shadowColor: "#8B5CF6",
            shadowOpacity: focused ? 0.6 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.initialsDisc,
            { backgroundColor: focused ? avatarColor : "rgba(255,255,255,0.05)" },
          ]}
        >
          {focused ? (
            <Text style={styles.initialsText}>{initials}</Text>
          ) : (
            <Ionicons name="person" size={18} color={color} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 32,
  },
  activePill: {
    position: "absolute",
    top: -2,
    width: 44,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    position: "absolute",
    top: -6,
    right: 8,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0B0B14",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  avatarRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 13 },
  initialsDisc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
});
