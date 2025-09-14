import React, { createContext, useContext, useState } from "react";
import { supabase } from "../supabase"; // adjust path if needed

type CartItem = {
  id: string;
  name: string;
  price: number;
  vendorId: string;
  vendorName: string;
  orgName: string;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  incrementQuantity: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  placeOrder: (userId: string) => Promise<{ success: boolean; message: string }>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // ✅ Add item with correct quantity from modal
  const addToCart = (
    item: Omit<CartItem, "quantity">,
    quantity: number = 1
  ) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  };

  // ✅ Increase by 1 in Cart page (+ button)
  const incrementQuantity = (id: string) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  // ✅ Decrease by 1 in Cart page (- button)
  const removeFromCart = (id: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  // ✅ Save order in Supabase
  const placeOrder = async (userId: string) => {
    if (!cart.length) {
      return { success: false, message: "Cart is empty" };
    }

    try {
      const totalPrice = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Ensure all items are from same vendor
      const vendorId = cart[0].vendorId;
      const allSameVendor = cart.every((i) => i.vendorId === vendorId);
      if (!allSameVendor) {
        return {
          success: false,
          message: "All items must be from the same vendor",
        };
      }

      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: userId,
            vendor_id: vendorId,
            items: cart,
            total_price: totalPrice,
            status: "Pending",
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error("Order Insert Error:", error);
        return { success: false, message: error.message };
      }

      console.log("Inserted order:", data);

      clearCart();
      return { success: true, message: "Order placed successfully!" };
    } catch (err: any) {
      console.error("Unexpected Error placing order:", err);
      return { success: false, message: err.message };
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        incrementQuantity,
        removeFromCart,
        clearCart,
        placeOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
