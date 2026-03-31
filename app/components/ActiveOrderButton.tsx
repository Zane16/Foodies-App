import React, { useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useAuth } from "../context/_authContext"
import { useCart } from "../context/_CartContext"
import { Colors } from "../../constants/Colors"

export default function ActiveOrderButton() {
  const router = useRouter()
  const { user } = useAuth()
  const { activeOrder, fetchActiveOrder } = useCart()
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Fetch active order when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchActiveOrder(user.id)
    }
  }, [user?.id])

  useEffect(() => {
    if (activeOrder) {
      // Start pulsing animation when there's an active order
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [activeOrder])

  const getStatusText = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      pending: "Waiting for vendor",
      preparing: "Being prepared",
      ready: "Ready for pickup",
      accepted: "Deliverer assigned",
      on_the_way: "Out for delivery",
    }
    return statusMap[status] || status
  }

  if (!activeOrder) return null

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={styles.floatingOrderButton}
        onPress={() =>
          router.push({
            pathname: "/track-order",
            params: { orderId: activeOrder.id },
          })
        }
        activeOpacity={0.9}
      >
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>1</Text>
        </View>
        <Text style={styles.floatingOrderTitle}>View Your Order</Text>
        <Ionicons name="cart" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  floatingOrderButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  badgeContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },
  floatingOrderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
  },
})
