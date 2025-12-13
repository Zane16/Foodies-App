import React, { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "../../supabase"

type CartItem = {
  id: string
  name: string
  price: number
  vendorId: string
  vendorName: string
  orgName: string
  quantity: number
  image_url?: string | null
  deliveryFee?: number
  minimumOrder?: number
}

type Order = {
  id: string
  status: string
  vendor_id: string
  total_price: number
  items: any[]
  created_at: string
  [key: string]: any
}

type CartContextType = {
  cart: CartItem[]
  activeOrder: Order | null
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  incrementQuantity: (id: string) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  placeOrder: (userId: string, selectedItemIds?: Set<string>) => Promise<{ success: boolean; message: string; orderId?: string }>
  cancelOrder: (orderId: string, reason?: string) => Promise<{ success: boolean; message: string }>
  fetchActiveOrder: (userId: string) => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Set up realtime subscription for active orders
  useEffect(() => {
    if (!userId) return

    // Subscribe to order changes for this user
    const orderChannel = supabase
      .channel(`user-orders-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          const newOrder = payload.new as Order
          // Check if it's an active order
          if (["pending", "preparing", "ready", "accepted", "on_the_way"].includes(newOrder.status)) {
            setActiveOrder(newOrder)
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order
          // If order is completed/delivered/cancelled, clear active order
          if (["delivered", "completed", "cancelled"].includes(updatedOrder.status)) {
            setActiveOrder(null)
          } else if (["pending", "preparing", "ready", "accepted", "on_the_way"].includes(updatedOrder.status)) {
            setActiveOrder(updatedOrder)
          }
        }
      )
      .subscribe()

    return () => {
      orderChannel.unsubscribe()
    }
  }, [userId])

  const fetchActiveOrder = async (customerId: string) => {
    // Store userId for realtime subscription
    setUserId(customerId)

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", customerId)
        .in("status", ["pending", "preparing", "ready", "accepted", "on_the_way"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Error fetching active order:", error)
        return
      }

      setActiveOrder(data)
    } catch (error) {
      console.error("Error:", error)
    }
  }

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

  const cancelOrder = async (orderId: string, reason?: string) => {
    try {
      // First, fetch the order to check its current status
      const { data: orderData, error: fetchError } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single()

      if (fetchError) {
        return { success: false, message: "Error fetching order: " + fetchError.message }
      }

      if (!orderData) {
        return { success: false, message: "Order not found" }
      }

      // Check if order is still pending (vendor hasn't accepted yet)
      if (orderData.status !== "pending") {
        return {
          success: false,
          message: "Order cannot be cancelled. The vendor has already started preparing your order."
        }
      }

      // Cancel the order
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "cancelled"
        })
        .eq("id", orderId)

      if (updateError) {
        return { success: false, message: "Error cancelling order: " + updateError.message }
      }

      return { success: true, message: "Order cancelled successfully" }

    } catch (err: any) {
      console.error("Error cancelling order:", err)
      return { success: false, message: err.message || "Unknown error occurred" }
    }
  }

  const placeOrder = async (userId: string, selectedItemIds?: Set<string>) => {
    // Filter cart based on selected items (if provided)
    const itemsToOrder = selectedItemIds
      ? cart.filter(item => selectedItemIds.has(item.id))
      : cart

    if (!itemsToOrder.length) {
      return { success: false, message: selectedItemIds ? "Please select at least one item" : "Cart is empty" }
    }

    try {
      const subtotal = itemsToOrder.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      // Ensure all items are from the same vendor
      const vendorId = itemsToOrder[0].vendorId
      const allSameVendor = itemsToOrder.every((i) => i.vendorId === vendorId)
      if (!allSameVendor) {
        return {
          success: false,
          message: "All items must be from the same vendor",
        }
      }

      // Get delivery fee and minimum order from first item (all items are from same vendor)
      const deliveryFee = itemsToOrder[0].deliveryFee || 0
      const minimumOrder = itemsToOrder[0].minimumOrder || 0

      // Validate minimum order amount
      if (minimumOrder > 0 && subtotal < minimumOrder) {
        return {
          success: false,
          message: `Minimum order amount is ₱${minimumOrder.toFixed(2)}. Your subtotal is ₱${subtotal.toFixed(2)}. Please add ₱${(minimumOrder - subtotal).toFixed(2)} more to proceed.`,
        }
      }

      // Calculate total price including delivery fee
      const totalPrice = subtotal + deliveryFee

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
            items: itemsToOrder,
            total_price: subtotal,  // Subtotal only (items cost, excluding delivery fee)
            delivery_fee: deliveryFee,  // Delivery fee as separate column
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

      if (!data || data.length === 0) {
        return { success: false, message: "Failed to create order" }
      }

      const orderId = data[0].id

      // Remove ordered items from cart
      if (selectedItemIds) {
        // Only remove selected items
        setCart(cart.filter(item => !selectedItemIds.has(item.id)))
      } else {
        // Clear entire cart if no selection was specified
        clearCart()
      }

      return { success: true, message: "Order placed successfully!", orderId }

    } catch (err: any) {
      console.error("Error placing order:", err)
      return { success: false, message: err.message || "Unknown error occurred" }
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        activeOrder,
        addToCart,
        incrementQuantity,
        removeFromCart,
        clearCart,
        placeOrder,
        cancelOrder,
        fetchActiveOrder,
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