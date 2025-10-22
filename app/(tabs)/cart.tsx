import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { Colors } from "../../constants/Colors"
import { useAuth } from "../context/_authContext"
import { useCart } from "../context/_CartContext"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/cartStyles"
import { useCallback } from "react"

interface ProfileData {
  full_name: string | null
  phone: string | null
  delivery_address: string | null
  delivery_notes: string | null
}

export default function Cart() {
  const { cart, incrementQuantity, removeFromCart, clearCart, placeOrder } = useCart()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<"Deliver" | "Pick Up">("Deliver")
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = deliveryMethod === "Deliver" ? 29 : 0
  const finalTotal = totalPrice + deliveryFee

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return

    setLoadingProfile(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, delivery_address, delivery_notes")
        .eq("id", user.id)
        .maybeSingle()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoadingProfile(false)
    }
  }, [user?.id])

  // Fetch profile on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchProfile()
    }
  }, [user?.id, fetchProfile])

  // Refetch profile when screen comes into focus (e.g., returning from profile page)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchProfile()
      }
    }, [user?.id, fetchProfile])
  )

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert("Please login first!")
      return
    }

    if (!user.id) {
      Alert.alert("Error", "User ID not found. Please log out and log back in.")
      return
    }

    const result = await placeOrder(user.id)
    if (result.success) {
      setShowCheckoutModal(false)
      Alert.alert("Success", result.message)
    } else {
      Alert.alert("Error", result.message)
    }
  }

  const openCheckoutModal = () => {
    if (cart.length === 0) {
      Alert.alert("Cart is empty", "Add items to your cart first")
      return
    }

    // Check if profile is complete
    if (!profile?.full_name || !profile?.phone || !profile?.delivery_address) {
      const missingFields = []
      if (!profile?.full_name) missingFields.push("name")
      if (!profile?.phone) missingFields.push("phone")
      if (!profile?.delivery_address) missingFields.push("delivery address")

      Alert.alert(
        "Complete Your Profile",
        `Please complete your profile (${missingFields.join(", ")}) before placing an order.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Profile",
            onPress: () => router.push("/(tabs)/profile"),
          },
        ]
      )
      return
    }

    setShowCheckoutModal(true)
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="log-in-outline" size={64} color={Colors.light.icon} />
        </View>
        <Text style={styles.emptyTitle}>Please Log In</Text>
        <Text style={styles.emptySubtitle}>Sign in to view your cart</Text>
      </View>
    )
  }

  if (cart.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Blue Header */}
        <View style={styles.blueHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Cart</Text>
              <Text style={styles.headerSubtitle}>Review your order</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* White Content Area */}
        <View style={styles.whiteContent}>
          <View style={styles.centerContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="cart-outline" size={64} color={Colors.light.icon} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Add items to get started</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Cart</Text>
            <Text style={styles.headerSubtitle}>Review your order</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* White Content Area */}
      <View style={styles.whiteContent}>
        {/* Cart Items */}
        <FlatList
          data={cart}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.cartList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemCheckbox}>
              <View style={styles.checkbox} />
            </View>
            
            <View style={styles.itemImage}>
              <Ionicons name="fast-food" size={32} color={Colors.light.primary} />
            </View>

            <View style={styles.itemContent}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>₱{item.price}</Text>
            </View>

            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => removeFromCart(item.id)}
              >
                <Ionicons name="remove" size={16} color={Colors.light.text} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => incrementQuantity(item.id)}
              >
                <Ionicons name="add" size={16} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeFromCart(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Bottom Bar with Done Button */}
      <View style={styles.bottomBar}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Items ({cart.length})</Text>
          <Text style={styles.summaryValue}>₱{totalPrice}</Text>
        </View>
        <TouchableOpacity style={styles.doneButton} onPress={openCheckoutModal}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Checkout Modal */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Order</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Delivery Method Toggle */}
              <View style={styles.deliveryToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    deliveryMethod === "Deliver" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setDeliveryMethod("Deliver")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      deliveryMethod === "Deliver" && styles.toggleTextActive,
                    ]}
                  >
                    Deliver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    deliveryMethod === "Pick Up" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setDeliveryMethod("Pick Up")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      deliveryMethod === "Pick Up" && styles.toggleTextActive,
                    ]}
                  >
                    Pick Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Delivery Address */}
              <View style={styles.addressSection}>
                <Text style={styles.sectionLabel}>Delivery Address</Text>
                <View style={styles.addressCard}>
                  <Text style={styles.addressTitle}>{profile?.full_name || "Customer"}</Text>
                  <Text style={styles.addressDetail}>{profile?.delivery_address || "No address set"}</Text>
                  {profile?.delivery_notes && (
                    <Text style={styles.addressDetail}>Note: {profile.delivery_notes}</Text>
                  )}
                  {profile?.phone && (
                    <Text style={styles.addressDetail}>Phone: {profile.phone}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.editAddressButton}
                    onPress={() => {
                      setShowCheckoutModal(false)
                      router.push("/(tabs)/profile")
                    }}
                  >
                    <Text style={styles.editAddressText}>Edit Address</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.light.icon} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.orderItemsSection}>
                {cart.map((item, index) => (
                  <View key={`${item.id}-${index}`} style={styles.orderItem}>
                    <View style={styles.orderItemImage}>
                      <Ionicons name="fast-food" size={24} color={Colors.light.primary} />
                    </View>
                    <View style={styles.orderItemContent}>
                      <Text style={styles.orderItemName}>{item.name}</Text>
                    </View>
                    <Text style={styles.orderItemQuantity}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.orderItemAddButton}>
                      <Ionicons name="add" size={16} color={Colors.light.text} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Discount Badge */}
              <View style={styles.discountBadge}>
                <Ionicons name="pricetag" size={16} color="#10B981" />
                <Text style={styles.discountText}>No Discount is Applied</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.light.icon} />
              </View>

              {/* Payment Summary */}
              <View style={styles.paymentSummary}>
                <Text style={styles.summaryTitle}>Payment Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Price</Text>
                  <Text style={styles.summaryValue}>₱{totalPrice}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee</Text>
                  <Text style={styles.summaryValue}>₱{deliveryFee}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₱{finalTotal}</Text>
                </View>
              </View>

              {/* Confirm Order Button */}
              <TouchableOpacity style={styles.confirmButton} onPress={handleCheckout}>
                <Text style={styles.confirmButtonText}>Confirm Order</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}