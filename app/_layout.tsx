import 'react-native-url-polyfill/auto'
import 'react-native-get-random-values'

import { Stack } from "expo-router";
import AuthGuard from "./components/AuthGuard";
import { AuthProvider } from "./context/_authContext";
import { CartProvider } from "./context/_CartContext";

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
