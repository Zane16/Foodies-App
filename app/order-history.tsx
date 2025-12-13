import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native"
import { supabase } from "../supabase"
import { useAuth } from "./context/_authContext"
import { Colors } from "../constants/Colors"

interface OrderHistoryItem {
  id: string
  status: string
  total_price: number
  created_at: string
  delivered_at: string | null
  items: any[]
  vendors: {
    business_name: string
  }[]
  vendor_rating?: {
    rating: number
  }
  deliverer_rating?: {
    rating: number
  }
  deliverer_id: string | null
}

export default function OrderHistory() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchOrderHistory()
    }
  }, [user?.id])

  const fetchOrderHistory = async () => {
    if (!user?.id) return

    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          total_price,
          created_at,
          delivered_at,
          items,
          deliverer_id,
          vendors!inner (
            business_name
          )
        `)
        .eq("customer_id", user.id)
        .in("status", ["delivered", "completed", "cancelled"])
        .order("created_at", { ascending: false })

      if (error) throw error

      // Fetch ratings for each order
      const ordersWithRatings = await Promise.all(
        (ordersData || []).map(async (order) => {
          // Fetch vendor rating
          const { data: vendorRating } = await supabase
            .from("ratings")
            .select("rating")
            .eq("order_id", order.id)
            .eq("customer_id", user.id)
            .eq("type", "vendor")
            .maybeSingle()

          // Fetch deliverer rating if deliverer assigned
          let delivererRating = null
          if (order.deliverer_id) {
            const { data } = await supabase
              .from("ratings")
              .select("rating")
              .eq("order_id", order.id)
              .eq("customer_id", user.id)
              .eq("type", "deliverer")
              .maybeSingle()
            delivererRating = data
          }

          return {
            ...order,
            vendor_rating: vendorRating,
            deliverer_rating: delivererRating,
          }
        })
      )

      setOrders(ordersWithRatings as OrderHistoryItem[])
    } catch (error) {
      console.error("Error fetching order history:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchOrderHistory()
  }

  const clearHistory = () => {
    Alert.alert(
      "Clear Order History",
      "Are you sure you want to delete all your order history? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("orders")
                .delete()
                .eq("customer_id", user?.id)
                .in("status", ["delivered", "completed", "cancelled"])

              if (error) throw error
              setOrders([])
            } catch (error) {
              console.error("Error clearing history:", error)
              Alert.alert("Error", "Failed to clear order history")
            }
          },
        },
      ]
    )
  }

  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      delivered: String(Colors.light.secondary),
      completed: "#10B981",
      cancelled: "#EF4444",
    }
    return colorMap[status] || Colors.light.icon
  }

  const getStatusText = (status: string): string => {
    const textMap: { [key: string]: string } = {
      delivered: "Delivered",
      completed: "Completed",
      cancelled: "Cancelled",
    }
    return textMap[status] || status
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0 || diffDays === 1) {
      return "Today"
    } else if (diffDays === 2) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })
    }
  }

  const getRatingStatus = (order: OrderHistoryItem): {
    needsRating: boolean
    text: string
    color: string
  } => {
    if (order.status === "cancelled") {
      return { needsRating: false, text: "Cancelled", color: "#EF4444" }
    }

    const vendorRated = !!order.vendor_rating
    const delivererRated = order.deliverer_id ? !!order.deliverer_rating : true // N/A if no deliverer

    if (vendorRated && delivererRated) {
      return { needsRating: false, text: "Rated", color: "#10B981" }
    } else if (vendorRated || delivererRated) {
      return { needsRating: true, text: "Rate Remaining", color: "#FFB800" }
    } else {
      return { needsRating: true, text: "Not Rated", color: Colors.light.icon }
    }
  }

  const renderOrderItem = ({ item }: { item: OrderHistoryItem }) => {
    const ratingStatus = getRatingStatus(item)

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() =>
          router.push({
            pathname: "/track-order",
            params: { orderId: item.id },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusBadgeText}>{getStatusText(item.status)}</Text>
            </View>
            <View
              style={[
                styles.ratingBadge,
                { backgroundColor: `${ratingStatus.color}20` },
              ]}
            >
              <Ionicons
                name={ratingStatus.needsRating ? "star-outline" : "star"}
                size={14}
                color={ratingStatus.color}
              />
              <Text style={[styles.ratingBadgeText, { color: ratingStatus.color }]}>
                {ratingStatus.text}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.vendorRow}>
            <Ionicons name="restaurant" size={18} color={Colors.light.primary} />
            <Text style={styles.vendorName}>{(item as any).vendors.business_name}</Text>
          </View>

          <View style={styles.itemsRow}>
            <Ionicons name="receipt-outline" size={16} color={Colors.light.icon} />
            <Text style={styles.itemsText}>
              {item.items.length} {item.items.length === 1 ? "item" : "items"}
            </Text>
            <View style={styles.dividerDot} />
            <Text style={styles.totalPrice}>₱{item.total_price.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderIdText}>Order #{item.id.slice(0, 8)}</Text>
          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>
              {ratingStatus.needsRating ? "View & Rate" : "View Details"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.light.secondary} />
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <TouchableOpacity
            onPress={clearHistory}
            style={styles.clearButton}
            disabled={orders.length === 0}
          >
            <Ionicons name="trash-outline" size={22} color={orders.length === 0 ? "rgba(255,255,255,0.4)" : "#FFFFFF"} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <TouchableOpacity
          onPress={clearHistory}
          style={styles.clearButton}
          disabled={orders.length === 0}
        >
          <Ionicons name="trash-outline" size={22} color={orders.length === 0 ? "rgba(255,255,255,0.4)" : "#FFFFFF"} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your completed orders will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.light.primary]}
                tintColor={Colors.light.primary}
              />
            }
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.light.text,
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  orderDate: {
    fontSize: 12,
    color: Colors.light.icon,
    fontWeight: "600",
  },
  orderBody: {
    marginBottom: 12,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  itemsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemsText: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  dividerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.light.icon,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  orderIdText: {
    fontSize: 12,
    color: Colors.light.icon,
    fontFamily: "monospace",
  },
  viewDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.secondary,
  },
})
