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
      const totalPrice = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      // Ensure all items are from the same vendor
      const vendorId = cart[0].vendorId
      const allSameVendor = cart.every((i) => i.vendorId === vendorId)
      if (!allSameVendor) {
        return {
          success: false,
          message: "All items must be from the same vendor",
        }
      }

      // Validate vendor exists
      const { data: vendorCheck, error: vendorError } = await supabase
        .from("vendors")
        .select("id, business_name")
        .eq("id", vendorId)
        .maybeSingle()

      if (vendorError) {
        return {
          success: false,
          message: "Error validating vendor: " + vendorError.message,
        }
      }

      if (!vendorCheck) {
        return {
          success: false,
          message: "Vendor not found. Please contact support.",
        }
      }

      // Validate user UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      if (!uuidRegex.test(userId)) {
        return { success: false, message: "Invalid user ID format" }
      }

      // Fetch user profile data for delivery information
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, delivery_address, delivery_notes")
        .eq("id", userId)
        .maybeSingle()

      if (profileError) {
        return {
          success: false,
          message: "Error fetching profile: " + profileError.message,
        }
      }

      if (!profile) {
        return {
          success: false,
          message: "Profile not found. Please complete your profile first.",
        }
      }

      // Validate required profile fields
      if (!profile.full_name || !profile.phone || !profile.delivery_address) {
        return {
          success: false,
          message: "Please complete your profile (name, phone, and delivery address) before placing an order.",
        }
      }

      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: userId,
            vendor_id: vendorId,
            items: cart,
            total_price: totalPrice,
            status: "pending",
            customer_name: profile.full_name,
            customer_phone: profile.phone,
            delivery_address: profile.delivery_address,
            delivery_notes: profile.delivery_notes || null,
          },
        ])
        .select("*")

      if (error) {
        return { success: false, message: error.message }
      }

      clearCart()
      return { success: true, message: "Order placed successfully!" }

    } catch (err: any) {
      console.error("Error placing order:", err)
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