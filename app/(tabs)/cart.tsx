import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native"
import { Colors } from "../../constants/Colors"
import { useAuth } from "../context/_authContext"
import { useCart } from "../context/_CartContext"

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.light.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.text,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryLocationCard: {
    marginHorizontal: 24,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  deliveryLabel: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: 8,
    flex: 1,
  },
  changeButton: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  cartList: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#FFF4CC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.light.input,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginHorizontal: 12,
  },
  deleteButton: {
    padding: 4,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  doneButton: {
    backgroundColor: "#6B4EE6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.light.input,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.icon,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  deliveryToggle: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: Colors.light.input,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#E879F9",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.icon,
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  addressSection: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  addressCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 12,
  },
  editAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editAddressText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  orderItemsSection: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  orderItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#FFF4CC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  orderItemContent: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  orderItemQuantity: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginRight: 8,
  },
  orderItemAddButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.light.input,
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  discountText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 8,
  },
  paymentSummary: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  confirmButton: {
    marginHorizontal: 24,
    backgroundColor: "#6B4EE6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})