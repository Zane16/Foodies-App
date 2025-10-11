import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from "react-native"
import { Colors } from "../../constants/Colors"
import { useAuth } from "../context/_authContext"
import { useCart } from "../context/_CartContext"
import { styles } from "../../styles/screens/cartStyles"

export default function Cart() {
  const { cart, incrementQuantity, removeFromCart, clearCart, placeOrder } = useCart()
  const { user, loading } = useAuth()
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<"Deliver" | "Pick Up">("Deliver")
  const [deliveryAddress, setDeliveryAddress] = useState("")

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = deliveryMethod === "Deliver" ? 29 : 0
  const finalTotal = totalPrice + deliveryFee

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert("Please login first!")
      return
    }

    if (!user.id) {
      Alert.alert("❌ Error", "User ID not found. Please log out and log back in.")
      return
    }

    const result = await placeOrder(user.id)
    if (result.success) {
      setShowCheckoutModal(false)
      Alert.alert("✅ Success", result.message)
    } else {
      Alert.alert("❌ Error", result.message)
    }
  }

  const openCheckoutModal = () => {
    if (cart.length === 0) {
      Alert.alert("Cart is empty", "Add items to your cart first")
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
        <StatusBar barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Cart</Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cart-outline" size={64} color={Colors.light.icon} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items to get started</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Delivery Location */}
      <View style={styles.deliveryLocationCard}>
        <Text style={styles.deliveryLabel}>Delivery Location</Text>
        <TouchableOpacity style={styles.locationRow}>
          <Ionicons name="location" size={20} color={Colors.light.primary} />
          <Text style={styles.locationText}>Home</Text>
          <TouchableOpacity style={styles.changeButton}>
            <Text style={styles.changeButtonText}>Change Location</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

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
                  <Text style={styles.addressTitle}>Jacob St.</Text>
                  <Text style={styles.addressDetail}>Bonganbongan Bar Naga City</Text>
                  <TouchableOpacity style={styles.editAddressButton}>
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