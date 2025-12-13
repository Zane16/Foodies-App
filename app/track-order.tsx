import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Image,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { supabase } from "../supabase"
import { Colors } from "../constants/Colors"
import { Ionicons } from "@expo/vector-icons"
import { useCart } from "./context/_CartContext"
import { useAuth } from "./context/_authContext"
import RatingModal from "./components/RatingModal"

type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "accepted"
  | "on_the_way"
  | "delivered"
  | "completed"
  | "cancelled"

interface Order {
  id: string
  status: OrderStatus
  vendor_id: string
  deliverer_id: string | null
  delivery_address: string
  customer_name: string
  customer_phone: string
  total_price: number
  items: any[]
  created_at: string
}

interface Rating {
  rating: number
  comment: string | null
}

interface VendorInfo {
  business_name: string
  logo_url?: string
}

interface DelivererInfo {
  full_name: string
  profile_picture?: string
}

export default function TrackOrderWeb() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const orderId = params.orderId as string
  const { cancelOrder } = useCart()
  const { user } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [vendorRatingModalVisible, setVendorRatingModalVisible] = useState(false)
  const [delivererRatingModalVisible, setDelivererRatingModalVisible] = useState(false)
  const [vendorRating, setVendorRating] = useState<Rating | null>(null)
  const [delivererRating, setDelivererRating] = useState<Rating | null>(null)
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null)
  const [delivererInfo, setDelivererInfo] = useState<DelivererInfo | null>(null)

  useEffect(() => {
    if (!orderId) {
      alert("No order ID provided")
      router.back()
      return
    }

    fetchOrderDetails()
  }, [orderId])

  // Subscribe to order status changes
  useEffect(() => {
    if (!orderId) return

    const orderSubscription = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order
          setOrder(updatedOrder)

          // Handle status changes
          if (updatedOrder.status === "cancelled") {
            alert("Unfortunately, your order has been cancelled.")
            setTimeout(() => router.push("/(tabs)/home"), 2000)
          } else if (updatedOrder.status === "delivered") {
            alert("Your order has been delivered! Enjoy your meal!")
          }
        }
      )
      .subscribe()

    return () => {
      orderSubscription.unsubscribe()
    }
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          vendors!inner (
            business_name
          )
        `)
        .eq("id", orderId)
        .single()

      if (error) throw error

      setOrder(data)

      // Fetch vendor info with profile picture from profiles table
      if (data.vendor_id) {
        const { data: vendorProfileData } = await supabase
          .from("profiles")
          .select("profile_picture_url")
          .eq("id", data.vendor_id)
          .single()

        setVendorInfo({
          business_name: (data as any).vendors.business_name,
          logo_url: vendorProfileData?.profile_picture_url || null
        })
      }

      // Fetch deliverer info if assigned
      if (data.deliverer_id) {
        const { data: delivererData } = await supabase
          .from("profiles")
          .select("full_name, profile_picture_url")
          .eq("id", data.deliverer_id)
          .single()

        if (delivererData) {
          setDelivererInfo({
            full_name: delivererData.full_name || "Deliverer",
            profile_picture: delivererData.profile_picture_url
          })
        }
      }

      // Fetch ratings if order is delivered/completed
      if (["delivered", "completed"].includes(data.status)) {
        fetchRatings()
      }
    } catch (error: any) {
      console.error("Error fetching order:", error)
      alert("Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  const fetchRatings = async () => {
    if (!user?.id) return

    try {
      // Fetch vendor rating
      const { data: vendorRatingData } = await supabase
        .from("ratings")
        .select("rating, comment")
        .eq("order_id", orderId)
        .eq("customer_id", user.id)
        .eq("type", "vendor")
        .maybeSingle()

      if (vendorRatingData) {
        setVendorRating(vendorRatingData)
      }

      // Fetch deliverer rating if deliverer assigned
      if (order?.deliverer_id) {
        const { data: delivererRatingData } = await supabase
          .from("ratings")
          .select("rating, comment")
          .eq("order_id", orderId)
          .eq("customer_id", user.id)
          .eq("type", "deliverer")
          .maybeSingle()

        if (delivererRatingData) {
          setDelivererRating(delivererRatingData)
        }
      }
    } catch (error) {
      console.error("Error fetching ratings:", error)
    }
  }

  const handleRatingModalClose = () => {
    setVendorRatingModalVisible(false)
    setDelivererRatingModalVisible(false)
    // Refetch ratings to show updated data
    fetchRatings()
  }

  const handleCancelOrder = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      [
        {
          text: "No, Keep Order",
          style: "cancel"
        },
        {
          text: "Yes, Cancel Order",
          style: "destructive",
          onPress: async () => {
            setCancelling(true)
            const result = await cancelOrder(orderId)
            setCancelling(false)

            if (result.success) {
              Alert.alert("Success", result.message, [
                {
                  text: "OK",
                  onPress: () => router.push("/(tabs)/home")
                }
              ])
            } else {
              Alert.alert("Error", result.message)
            }
          }
        }
      ]
    )
  }

  const getStatusText = (status: OrderStatus): string => {
    const statusMap: Record<OrderStatus, string> = {
      pending: "Waiting for Vendor",
      preparing: "Preparing Your Food",
      ready: "Ready for Pickup",
      accepted: "Deliverer Assigned",
      on_the_way: "Out for Delivery",
      delivered: "Delivered",
      completed: "Completed",
      cancelled: "Cancelled",
    }
    return statusMap[status] || status
  }

  const getStatusIcon = (status: OrderStatus): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<OrderStatus, keyof typeof Ionicons.glyphMap> = {
      pending: "time-outline",
      preparing: "restaurant-outline",
      ready: "checkmark-circle-outline",
      accepted: "person-outline",
      on_the_way: "bicycle-outline",
      delivered: "home-outline",
      completed: "checkmark-done-outline",
      cancelled: "close-circle-outline",
    }
    return iconMap[status] || "help-outline"
  }

  const getStatusColor = (status: OrderStatus): string => {
    const colorMap: Record<OrderStatus, string> = {
      pending: Colors.light.warning || "#F59E0B",
      preparing: Colors.light.primary || "#4F46E5",
      ready: Colors.light.primary || "#4F46E5",
      accepted: Colors.light.secondary || "#14B8A6",
      on_the_way: Colors.light.secondary || "#14B8A6",
      delivered: Colors.light.success || "#10B981",
      completed: Colors.light.success || "#10B981",
      cancelled: Colors.light.error || "#EF4444",
    }
    return colorMap[status] || Colors.light.icon || "#6B7280"
  }

  const handleShareOrder = async () => {
    try {
      await Share.share({
        message: `Track my order #${orderId.slice(0, 8)}! Current status: ${getStatusText(order?.status || 'pending')}. Total: ₱${order?.total_price.toFixed(2)}`,
        title: "My Foodies Order",
      })
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  const getStatusDescription = (status: OrderStatus): string => {
    const descMap: Record<OrderStatus, string> = {
      pending: "We're waiting for the vendor to accept your order. This usually takes just a few minutes.",
      preparing: "The vendor is preparing your delicious food. Hang tight!",
      ready: "Your order is ready and waiting for a deliverer to pick it up.",
      accepted: "A deliverer has been assigned to your order and is on their way to the vendor.",
      on_the_way: "Your order is on its way to you! The deliverer will arrive soon.",
      delivered: "Your order has been delivered. We hope you enjoy your meal!",
      completed: "This order is complete. Thank you for choosing our service!",
      cancelled: "This order was cancelled. If you have questions, please contact support.",
    }
    return descMap[status] || "Processing your order..."
  }

  const statusSteps: OrderStatus[] = [
    "pending",
    "preparing",
    "ready",
    "accepted",
    "on_the_way",
    "delivered",
  ]

  const getCurrentStepIndex = (currentStatus: OrderStatus): number => {
    if (currentStatus === "cancelled") return -1
    if (currentStatus === "completed") return statusSteps.length
    return statusSteps.indexOf(currentStatus)
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    )
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const currentStepIndex = getCurrentStepIndex(order.status)

  const getEstimatedTime = () => {
    // Calculate estimated delivery time based on status
    const now = new Date()
    const baseMinutes = 30 // Base time in minutes

    switch (order?.status) {
      case "pending":
        return "30 - 45 min"
      case "preparing":
        return "25 - 35 min"
      case "ready":
        return "20 - 30 min"
      case "accepted":
        return "15 - 25 min"
      case "on_the_way":
        return "10 - 15 min"
      case "delivered":
        return "Delivered"
      default:
        return "Calculating..."
    }
  }

  return (
    <View style={styles.container}>
      {/* Status Hero Section */}
      <View style={[styles.heroSection, { backgroundColor: "#4A5EE8" }]}>
        <TouchableOpacity
          style={styles.backButtonFloating}
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.push("/(tabs)/home")
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Status Icon and Text */}
        <View style={styles.heroContent}>
          <View
            style={[
              styles.statusIconContainer,
              { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            ]}
          >
            <Ionicons
              name={getStatusIcon(order.status)}
              size={48}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.statusTitle}>{getStatusText(order.status)}</Text>
          <Text style={styles.statusDescription}>
            {getStatusDescription(order.status)}
          </Text>
        </View>
      </View>

      {/* Bottom Sheet Container */}
      <View style={styles.bottomSheet}>
        {/* Black Header Section */}
        <View style={styles.bottomSheetHeader}>
          {/* Deliverer/Vendor Info Card - White Oval */}
          <View style={styles.delivererCard}>
            <View style={styles.delivererAvatar}>
              {delivererInfo && order.deliverer_id && ["accepted", "on_the_way", "delivered"].includes(order.status) ? (
                delivererInfo.profile_picture ? (
                  <Image
                    source={{ uri: delivererInfo.profile_picture }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={24} color="#6B7280" />
                )
              ) : (
                vendorInfo?.logo_url ? (
                  <Image
                    source={{ uri: vendorInfo.logo_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="restaurant-outline" size={24} color="#6B7280" />
                )
              )}
            </View>
            <View style={styles.delivererInfo}>
              <Text style={styles.delivererName}>
                {delivererInfo && order.deliverer_id && ["accepted", "on_the_way", "delivered"].includes(order.status)
                  ? delivererInfo.full_name
                  : vendorInfo?.business_name || "Vendor"}
              </Text>
              <Text style={styles.delivererRole}>
                {delivererInfo && order.deliverer_id && ["accepted", "on_the_way", "delivered"].includes(order.status)
                  ? "Delivery Runner"
                  : "Preparing your order"}
              </Text>
            </View>
            {delivererInfo && order.deliverer_id && ["accepted", "on_the_way", "delivered"].includes(order.status) ? (
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => router.push({ pathname: "/chat", params: { orderId: order.id } })}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : order.status === "pending" ? (
              <TouchableOpacity
                style={styles.cancelIconButton}
                onPress={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* White Content Section */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* Delivery Time Section */}
          {order.status !== "delivered" && order.status !== "completed" && order.status !== "cancelled" && (
            <View style={styles.deliveryTimeSection}>
              <Text style={styles.deliveryTimeLabel}>Your Delivery Time</Text>
              <Text style={styles.deliveryTimeValue}>Estimated {getEstimatedTime()}</Text>
            </View>
          )}

          {/* Progress Bar */}
          {order.status !== "cancelled" && (
            <View style={styles.progressSection}>
              <View style={styles.progressContainer}>
                {statusSteps.map((step, index) => {
                  const isCurrent = index === currentStepIndex
                  const isPast = index < currentStepIndex

                  return (
                    <View key={step} style={styles.progressStepContainer}>
                      {/* Icon */}
                      <View
                        style={[
                          styles.progressIcon,
                          (isCurrent || isPast) && styles.progressIconActive,
                        ]}
                      >
                        <Ionicons
                          name={getStatusIcon(step)}
                          size={20}
                          color={(isCurrent || isPast) ? "#3B82F6" : "#D1D5DB"}
                        />
                      </View>

                      {/* Dashed Line */}
                      {index < statusSteps.length - 1 && (
                        <View style={styles.progressLineContainer}>
                          <View style={[styles.dashedLine, (isCurrent || isPast) && styles.dashedLineActive]} />
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* Order Items Section */}
          <View style={styles.itemsSection}>
            <Text style={styles.itemsSectionTitle}>Order Details</Text>

            <View style={styles.itemsCard}>
              {order.items.map((item, index) => (
                <View key={index}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <View style={styles.quantityBadge}>
                        <Text style={styles.quantityText}>{item.quantity}x</Text>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.special_instructions && (
                          <Text style={styles.itemNote}>Note: {item.special_instructions}</Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.itemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                  {index < order.items.length - 1 && <View style={styles.itemDivider} />}
                </View>
              ))}

              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>₱{order.total_price.toFixed(2)}</Text>
              </View>
            </View>

            {/* Delivery Info */}
            <View style={styles.deliveryInfoCard}>
              <View style={styles.deliveryInfoRow}>
                <Ionicons name="location" size={18} color={Colors.light.primary} />
                <View style={styles.deliveryInfoContent}>
                  <Text style={styles.deliveryInfoLabel}>Delivery Address</Text>
                  <Text style={styles.deliveryInfoValue}>{order.delivery_address}</Text>
                </View>
              </View>
              <View style={styles.deliveryInfoDivider} />
              <View style={styles.deliveryInfoRow}>
                <Ionicons name="person" size={18} color={Colors.light.primary} />
                <View style={styles.deliveryInfoContent}>
                  <Text style={styles.deliveryInfoLabel}>Customer</Text>
                  <Text style={styles.deliveryInfoValue}>{order.customer_name}</Text>
                </View>
              </View>
              <View style={styles.deliveryInfoDivider} />
              <View style={styles.deliveryInfoRow}>
                <Ionicons name="call" size={18} color={Colors.light.primary} />
                <View style={styles.deliveryInfoContent}>
                  <Text style={styles.deliveryInfoLabel}>Contact</Text>
                  <Text style={styles.deliveryInfoValue}>{order.customer_phone}</Text>
                </View>
              </View>
            </View>
          </View>

        {/* Rating Section - Show when order is delivered or completed */}
        {["delivered", "completed"].includes(order.status) && user && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingSectionTitle}>How was your experience?</Text>

            {/* Vendor Rating */}
            {vendorInfo && (
              <View style={styles.ratingCard}>
                <View style={styles.ratingCardHeader}>
                  <View style={styles.ratingCardLeft}>
                    <Ionicons name="restaurant" size={24} color={Colors.light.primary} />
                    <View style={styles.ratingCardInfo}>
                      <Text style={styles.ratingCardTitle}>Rate Vendor</Text>
                      <Text style={styles.ratingCardSubtitle}>{vendorInfo.business_name}</Text>
                    </View>
                  </View>
                  {vendorRating ? (
                    <TouchableOpacity
                      style={styles.editRatingButton}
                      onPress={() => setVendorRatingModalVisible(true)}
                    >
                      <Text style={styles.editRatingButtonText}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.rateButton}
                      onPress={() => setVendorRatingModalVisible(true)}
                    >
                      <Ionicons name="star" size={18} color="#FFFFFF" />
                      <Text style={styles.rateButtonText}>Rate</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {vendorRating && (
                  <View style={styles.existingRating}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name="star"
                          size={16}
                          color={star <= vendorRating.rating ? "#FFB800" : "#DDD"}
                        />
                      ))}
                    </View>
                    {vendorRating.comment && (
                      <Text style={styles.ratingComment}>{vendorRating.comment}</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Deliverer Rating */}
            {delivererInfo && order.deliverer_id && (
              <View style={styles.ratingCard}>
                <View style={styles.ratingCardHeader}>
                  <View style={styles.ratingCardLeft}>
                    <Ionicons name="bicycle" size={24} color={Colors.light.secondary} />
                    <View style={styles.ratingCardInfo}>
                      <Text style={styles.ratingCardTitle}>Rate Deliverer</Text>
                      <Text style={styles.ratingCardSubtitle}>{delivererInfo.full_name}</Text>
                    </View>
                  </View>
                  {delivererRating ? (
                    <TouchableOpacity
                      style={styles.editRatingButton}
                      onPress={() => setDelivererRatingModalVisible(true)}
                    >
                      <Text style={styles.editRatingButtonText}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.rateButton}
                      onPress={() => setDelivererRatingModalVisible(true)}
                    >
                      <Ionicons name="star" size={18} color="#FFFFFF" />
                      <Text style={styles.rateButtonText}>Rate</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {delivererRating && (
                  <View style={styles.existingRating}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name="star"
                          size={16}
                          color={star <= delivererRating.rating ? "#FFB800" : "#DDD"}
                        />
                      ))}
                    </View>
                    {delivererRating.comment && (
                      <Text style={styles.ratingComment}>{delivererRating.comment}</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
        </ScrollView>
      </View>

      {/* Rating Modals */}
      {vendorInfo && user && (
        <RatingModal
          visible={vendorRatingModalVisible}
          onClose={handleRatingModalClose}
          orderId={orderId}
          customerId={user.id}
          ratedEntityId={order?.vendor_id || ""}
          ratedEntityName={vendorInfo.business_name}
          type="vendor"
          existingRating={vendorRating || undefined}
        />
      )}

      {delivererInfo && user && order?.deliverer_id && (
        <RatingModal
          visible={delivererRatingModalVisible}
          onClose={handleRatingModalClose}
          orderId={orderId}
          customerId={user.id}
          ratedEntityId={order.deliverer_id}
          ratedEntityName={delivererInfo.full_name}
          type="deliverer"
          existingRating={delivererRating || undefined}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  heroSection: {
    flex: 1,
    backgroundColor: "#4A5EE8",
    paddingTop: 50,
    paddingBottom: 100,
    paddingHorizontal: 20,
    position: "relative",
    justifyContent: "center",
  },
  backButtonFloating: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 100,
  },
  heroContent: {
    alignItems: "center",
    paddingTop: 40,
  },
  statusIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statusTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  statusDescription: {
    fontSize: 15,
    color: "#FFFFFF",
    opacity: 0.9,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 30,
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -50,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSheetHeader: {
    backgroundColor: "#1F2937",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    flexGrow: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.text,
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.error,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  delivererCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  delivererAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  delivererInfo: {
    flex: 1,
  },
  delivererName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  delivererRole: {
    fontSize: 13,
    color: "#6B7280",
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  deliveryTimeSection: {
    marginBottom: 10,
  },
  deliveryTimeLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  deliveryTimeValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  progressSection: {
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  progressStepContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  progressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  progressIconActive: {
    backgroundColor: "#DBEAFE",
  },
  progressLineContainer: {
    flex: 1,
    paddingHorizontal: 6,
  },
  dashedLine: {
    height: 2,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  dashedLineActive: {
    borderColor: "#3B82F6",
  },
  orderSection: {
    paddingBottom: 16,
  },
  orderLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderMeals: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  orderId: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  ratingSection: {
    marginTop: 10,
    marginBottom: 0,
  },
  ratingSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 16,
  },
  ratingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ratingCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  ratingCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  ratingCardSubtitle: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  rateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  editRatingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.input,
  },
  editRatingButtonText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  existingRating: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  ratingComment: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
    fontStyle: "italic",
  },
  itemsSection: {
    marginBottom: 24,
  },
  itemsSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  itemsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 12,
  },
  quantityBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 36,
    alignItems: "center",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemNote: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  totalDivider: {
    height: 2,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.primary,
  },
  deliveryInfoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  deliveryInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  deliveryInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  deliveryInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  deliveryInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 20,
  },
  deliveryInfoDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
})
