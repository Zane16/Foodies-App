

import { Ionicons } from "@expo/vector-icons"
import { Tabs } from "expo-router"
import { Platform } from "react-native"
import { Colors } from "../../constants/Colors"
import CustomTabBar from "../components/CustomTabBar"



export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors.light.secondary,
        tabBarInactiveTintColor: Colors.light.icon,
        headerStyle: {
          backgroundColor: Colors.light.background,
          borderBottomColor: Colors.light.border,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: Colors.light.text,
          fontSize: 18,
          fontWeight: "700",
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
        }}
      />
    </Tabs>
  )
}