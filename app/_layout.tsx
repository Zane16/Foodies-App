import { Stack } from "expo-router";
import { CartProvider } from "./context/CartContext"; // adjust path if needed

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CartProvider>
  );
}
