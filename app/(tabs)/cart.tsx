import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState, useRef } from "react"
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
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

// Animated Cart Item Component
const AnimatedCartItem = ({
  item,
  index,
  isSelected,
  onToggleSelect,
  onRemove,
  onIncrement,
  onDelete
}: {
  item: any
  index: number
  isSelected: boolean
  onToggleSelect: () => void
  onRemove: () => void
  onIncrement: () => void
  onDelete: () => void
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const itemSubtotal = item.price * item.quantity

  return (
    <Animated.View
      style={[
        styles.cartItem,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {/* Checkbox */}
      <TouchableOpacity
        style={styles.itemCheckbox}
        onPress={onToggleSelect}
      >
        <View style={[
          styles.checkbox,
          isSelected && styles.checkboxChecked
        ]}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>

      {/* Food Image */}
      <View style={styles.itemImage}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.foodImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="fast-food" size={32} color={Colors.light.primary} />
        )}
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.vendorBadge}>
          <Ionicons name="storefront-outline" size={12} color={Colors.light.icon} />
          <Text style={styles.vendorName} numberOfLines={1}>
            {item.vendorName}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
          {item.quantity > 1 && (
            <Text style={styles.itemSubtotal}> × {item.quantity} = ₱{itemSubtotal.toFixed(2)}</Text>
          )}
        </View>
      </View>

      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={onRemove}
        >
          <Ionicons name="remove" size={16} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={onIncrement}
        >
          <Ionicons name="add" size={16} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function Cart() {
  const { cart, incrementQuantity, removeFromCart, clearCart, placeOrder } = useCart()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<"Deliver" | "Pick Up">("Deliver")
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // Select all items by default when cart changes
  useEffect(() => {
    setSelectedItems(new Set(cart.map(item => item.id)))
  }, [cart.length])

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleClearCart = () => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => clearCart(),
        },
      ]
    )
  }

  const handleDeleteItem = (itemId: string, itemName: string) => {
    Alert.alert(
      "Remove Item",
      `Remove ${itemName} from cart?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            // Remove all quantity of this item
            const item = cart.find(i => i.id === itemId)
            if (item) {
              for (let i = 0; i < item.quantity; i++) {
                removeFromCart(itemId)
              }
            }
          },
        },
      ]
    )
  }

  // Calculate totals only for selected items
  const selectedCartItems = cart.filter(item => selectedItems.has(item.id))
  const subtotal = selectedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  // Get delivery fee from cart items (all items should be from same vendor)
  const vendorDeliveryFee = selectedCartItems.length > 0 ? (selectedCartItems[0].deliveryFee || 0) : 0
  const deliveryFee = deliveryMethod === "Deliver" ? vendorDeliveryFee : 0
  const finalTotal = subtotal + deliveryFee
  // Get minimum order from cart items
  const minimumOrder = selectedCartItems.length > 0 ? (selectedCartItems[0].minimumOrder || 0) : 0

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

    // Check if at least one item is selected
    if (selectedItems.size === 0) {
      Alert.alert("No Items Selected", "Please select at least one item to checkout.")
      return
    }

    const result = await placeOrder(user.id, selectedItems)
    if (result.success) {
      setShowCheckoutModal(false)
      // Redirect to tracking screen with order ID
      if (result.orderId) {
        router.push({
          pathname: "/track-order",
          params: { orderId: result.orderId },
        })
      } else {
        Alert.alert("Success", result.message)
      }
    } else {
      Alert.alert("Error", result.message)
    }
  }

  const openCheckoutModal = () => {
    if (cart.length === 0) {
      Alert.alert("Cart is empty", "Add items to your cart first")
      return
    }

    // Check if at least one item is selected
    if (selectedItems.size === 0) {
      Alert.alert("No Items Selected", "Please select at least one item to proceed.")
      return
    }

    // Check minimum order requirement
    if (minimumOrder > 0 && subtotal < minimumOrder) {
      Alert.alert(
        "Minimum Order Not Met",
        `This vendor requires a minimum order of ₱${minimumOrder.toFixed(2)}. Your current subtotal is ₱${subtotal.toFixed(2)}. Please add ₱${(minimumOrder - subtotal).toFixed(2)} more to proceed.`,
        [{ text: "OK" }]
      )
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
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() =>
                Alert.alert(
                  "Cart Options",
                  "What would you like to do?",
                  [
                    { text: "View Order History", onPress: () => router.push("/order-history") },
                    { text: "Help & Support", onPress: () => Alert.alert("Help", "Contact support at help@foodies.app") },
                    { text: "Cancel", style: "cancel" },
                  ]
                )
              }
            >
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
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push("/(tabs)/home")}
            >
              <Ionicons name="search-outline" size={20} color="#FFFFFF" />
              <Text style={styles.browseButtonText}>Browse Vendors</Text>
            </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Cart ({cart.length})</Text>
            <Text style={styles.headerSubtitle}>Review your order</Text>
          </View>
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
          renderItem={({ item, index }) => (
            <AnimatedCartItem
              key={`${item.id}-${index}`}
              item={item}
              index={index}
              isSelected={selectedItems.has(item.id)}
              onToggleSelect={() => toggleItemSelection(item.id)}
              onRemove={() => removeFromCart(item.id)}
              onIncrement={() => incrementQuantity(item.id)}
              onDelete={() => handleDeleteItem(item.id, item.name)}
            />
          )}
        />
      </View>

      {/* Bottom Bar with Done Button */}
      <View style={styles.bottomBar}>
        <View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Subtotal ({selectedCartItems.reduce((sum, item) => sum + item.quantity, 0)} items selected)
            </Text>
            <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summarySmall}>
              {selectedItems.size === 0
                ? "Please select items to checkout"
                : minimumOrder > 0 && subtotal < minimumOrder
                ? `Add ₱${(minimumOrder - subtotal).toFixed(2)} more to meet minimum order of ₱${minimumOrder.toFixed(2)}`
                : vendorDeliveryFee > 0
                ? `₱${vendorDeliveryFee.toFixed(2)} delivery fee will be added`
                : "Free delivery"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.doneButton, selectedItems.size === 0 && styles.doneButtonDisabled]}
          onPress={openCheckoutModal}
          disabled={selectedItems.size === 0}
        >
          <Text style={[styles.doneButtonText, selectedItems.size === 0 && styles.doneButtonTextDisabled]}>
            Proceed to Checkout
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={selectedItems.size === 0 ? "#14B8A6" : "#FFFFFF"}
          />
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
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
              </TouchableOpacity>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Checkout</Text>
                <Text style={styles.modalSubtitle}>{selectedCartItems.length} {selectedCartItems.length === 1 ? 'item' : 'items'}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScrollView}>
              {/* Delivery Method Toggle */}
              <View style={styles.deliveryToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    deliveryMethod === "Deliver" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setDeliveryMethod("Deliver")}
                >
                  <Ionicons
                    name="bicycle"
                    size={20}
                    color={deliveryMethod === "Deliver" ? "#FFFFFF" : "#14B8A6"}
                  />
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
                  <Ionicons
                    name="bag-handle"
                    size={20}
                    color={deliveryMethod === "Pick Up" ? "#FFFFFF" : "#14B8A6"}
                  />
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
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="location" size={20} color={Colors.light.primary} />
                    <Text style={styles.sectionLabel}>Delivery Address</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCheckoutModal(false)
                      router.push("/(tabs)/profile")
                    }}
                  >
                    <Text style={styles.editAddressLink}>Change</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.addressCard}>
                  <View style={styles.addressRow}>
                    <Ionicons name="person-circle-outline" size={24} color={Colors.light.icon} />
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressTitle}>{profile?.full_name || "Customer"}</Text>
                      <Text style={styles.addressSubtext}>{profile?.phone || "No phone"}</Text>
                    </View>
                  </View>
                  <View style={styles.addressDivider} />
                  <View style={styles.addressRow}>
                    <Ionicons name="home-outline" size={24} color={Colors.light.icon} />
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressDetail}>{profile?.delivery_address || "No address set"}</Text>
                      {profile?.delivery_notes && (
                        <Text style={styles.addressNotes}>{profile.delivery_notes}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.orderItemsSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="restaurant" size={20} color={Colors.light.primary} />
                    <Text style={styles.sectionLabel}>Order Items ({selectedCartItems.length})</Text>
                  </View>
                </View>
                {selectedCartItems.map((item, index) => (
                  <View key={`${item.id}-${index}`} style={styles.orderItem}>
                    <View style={styles.orderItemImage}>
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.orderFoodImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="fast-food" size={28} color={Colors.light.primary} />
                      )}
                    </View>
                    <View style={styles.orderItemContent}>
                      <Text style={styles.orderItemName} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.orderItemPriceRow}>
                        <Text style={styles.orderItemUnitPrice}>₱{item.price.toFixed(2)}</Text>
                        <Text style={styles.orderItemMultiplier}> × {item.quantity}</Text>
                      </View>
                    </View>
                    <View style={styles.orderItemRight}>
                      <Text style={styles.orderItemTotal}>₱{(item.price * item.quantity).toFixed(2)}</Text>
                      <View style={styles.orderItemQuantityControls}>
                        <TouchableOpacity
                          style={styles.orderItemButton}
                          onPress={() => removeFromCart(item.id)}
                        >
                          <Ionicons name="remove" size={14} color={Colors.light.text} />
                        </TouchableOpacity>
                        <Text style={styles.orderItemQuantity}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.orderItemButton}
                          onPress={() => incrementQuantity(item.id)}
                        >
                          <Ionicons name="add" size={14} color={Colors.light.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
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
                <View style={styles.summaryHeader}>
                  <Ionicons name="wallet" size={20} color={Colors.light.primary} />
                  <Text style={styles.summaryTitle}>Payment Summary</Text>
                </View>
                <View style={styles.summaryContent}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
                  </View>
                  {minimumOrder > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summarySmall}>Minimum order: ₱{minimumOrder.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <View style={styles.deliveryFeeRow}>
                      <Text style={styles.summaryLabel}>Delivery Fee</Text>
                      {deliveryFee === 0 && (
                        <View style={styles.freeTag}>
                          <Text style={styles.freeTagText}>FREE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.summaryValue}>₱{deliveryFee.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total Payment</Text>
                    <Text style={styles.totalValue}>₱{finalTotal.toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {/* Confirm Order Button */}
              <TouchableOpacity style={styles.confirmButton} onPress={handleCheckout}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Place Order</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}