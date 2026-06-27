import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text } from "react-native";
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
          height: 70,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.5,
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
            <TabIcon name="chatbubbles" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="people" color={color} focused={focused} badge={reqCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-circle" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
  badge,
}: {
  name: any;
  color: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={26} color={color} />
      {focused ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      ) : null}
      {badge ? (
        <View style={styles.badge} testID="friends-tab-badge">
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", justifyContent: "center", width: 44 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    position: "absolute",
    top: -4,
    right: 2,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
