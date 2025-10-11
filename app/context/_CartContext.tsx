import React, { createContext, useContext, useState } from "react"
import { supabase } from "../../supabase"

type CartItem = {
  id: string
  name: string
  price: number
  vendorId: string
  vendorName: string
  orgName: string
  quantity: number
}

type CartContextType = {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  incrementQuantity: (id: string) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  placeOrder: (userId: string) => Promise<{ success: boolean; message: string }>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [...prev, { ...item, quantity }]
    })
  }

  const incrementQuantity = (id: string) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i))
    )
  }

  const removeFromCart = (id: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const clearCart = () => setCart([])

  const placeOrder = async (userId: string) => {
    if (!cart.length) {
      return { success: false, message: "Cart is empty" }
    }

    try {
      console.log("🛒 Placing order with User ID:", userId)
      
      const totalPrice = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      // Ensure all items are from the same vendor
      const vendorId = cart[0].vendorId
      console.log("📦 Cart vendor ID:", vendorId)
      console.log("📦 Full cart:", JSON.stringify(cart, null, 2))
      
      const allSameVendor = cart.every((i) => i.vendorId === vendorId)
      if (!allSameVendor) {
        return {
          success: false,
          message: "All items must be from the same vendor",
        }
      }

      // ✅ FIXED: Use maybeSingle() instead of single() to avoid PGRST116 error
      const { data: vendorCheck, error: vendorError } = await supabase
        .from("vendors")
        .select("id, business_name")
        .eq("id", vendorId)
        .maybeSingle()

      if (vendorError) {
        console.error("❌ Vendor query error:", vendorError)
        return {
          success: false,
          message: "Error validating vendor: " + vendorError.message,
        }
      }

      if (!vendorCheck) {
        console.error("❌ Vendor not found in vendors table:", vendorId)
        
        // Debug: Check if vendor exists at all
        const { data: allVendors } = await supabase
          .from("vendors")
          .select("id, business_name")
          .limit(10)

        console.log("📋 Available vendors in database:", allVendors)
        
        return {
          success: false,
          message: `Vendor not found (ID: ${vendorId}). Please contact support.`,
        }
      }

      console.log("✅ Vendor validated:", vendorCheck.id, "-", vendorCheck.business_name)

      // Validate user UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      
      if (!uuidRegex.test(userId)) {
        console.error("❌ Invalid UUID format:", userId)
        return { success: false, message: "Invalid user ID format" }
      }

      console.log("💾 Inserting order into database...")
      
      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: userId,
            vendor_id: vendorId,
            items: cart,
            total_price: totalPrice,
            status: "pending",
          },
        ])
        .select("*")

      if (error) {
        console.error("❌ Order Insert Error:", error)
        return { success: false, message: error.message }
      }

      console.log("✅ Order placed successfully:", data)
      clearCart()
      return { success: true, message: "Order placed successfully!" }
      
    } catch (err: any) {
      console.error("❌ Unexpected Error placing order:", err)
      return { success: false, message: err.message || "Unknown error occurred" }
    }
  }

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
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used inside CartProvider")
  return context
}

export default function CartContextComponent() {
  return null
}