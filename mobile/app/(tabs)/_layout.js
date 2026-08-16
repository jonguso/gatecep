import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0f172a",
          borderTopColor: "#1e293b",
          height: 64,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarActiveTintColor: "#67e8f9",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontWeight: "900",
          fontSize: 11
        }
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
<Tabs.Screen name="markets" options={{ title: "Markets" }} />
<Tabs.Screen name="trading" options={{ title: "Trading" }} />
<Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
<Tabs.Screen name="news" options={{ title: "News" }} />

<Tabs.Screen name="coach" options={{ href: null }} />
<Tabs.Screen name="funds" options={{ href: null }} />
    </Tabs>
  );
}
