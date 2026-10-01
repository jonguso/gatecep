import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";

import { WEB_SHELL_MIN_WIDTH } from "../../src/components/web/WebTopNavigation";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wideWeb = Platform.OS === "web" && width >= WEB_SHELL_MIN_WIDTH;

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarStyle: wideWeb
          ? { display: "none" }
          : {
              backgroundColor: "#0f172a",
              borderTopColor: "#1e293b",
              height: 56,
              paddingBottom: 6,
              paddingTop: 6
            },
        tabBarActiveTintColor: "#67e8f9",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontWeight: "900",
          fontSize: 11
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          )
        }}
      />

      <Tabs.Screen
        name="markets"
        options={{
          title: "Markets",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "trending-up" : "trending-up-outline"}
              size={size}
              color={color}
            />
          )
        }}
      />

      <Tabs.Screen
        name="trading"
        options={{
          title: "Trading",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "swap-horizontal" : "swap-horizontal-outline"}
              size={size}
              color={color}
            />
          )
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={size}
              color={color}
            />
          )
        }}
      />

      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "newspaper" : "newspaper-outline"}
              size={size}
              color={color}
            />
          )
        }}
      />

<Tabs.Screen name="coach" options={{ href: null }} />
<Tabs.Screen name="funds" options={{ href: null }} />
    </Tabs>
  );
}
