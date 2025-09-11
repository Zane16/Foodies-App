import { Stack, usePathname, useRouter } from "expo-router"; // usePathname to detect current route
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../supabase";
import { CartProvider } from "./context/CartContext";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname(); // current route
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      // Skip auth check for /auth routes
      if (pathname.startsWith("/auth")) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/auth/login"); // redirect if not logged in
        return;
      }

      setLoading(false);
    }
    checkAuth();
  }, [pathname]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CartProvider>
  );
}
