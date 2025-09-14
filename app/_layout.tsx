import { Stack } from "expo-router";
import { AuthProvider } from "./context/_authContext";
import { CartProvider } from "./context/_CartContext";
import AuthGuard from "./components/AuthGuard";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <CartProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </CartProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
