import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { supabase } from "../../supabase"
import { messagesStyles as styles } from "../../styles/screens/messagesStyles"
import { useAuth } from "../context/_authContext"
import { Colors } from "../../constants/Colors"

interface ConversationOrder {
  id: string
  customer_id: string
  vendor_id: string
  deliverer_id: string | null
  customer_name: string
  status: string
  created_at: string
  vendors: {
    business_name: string
  }
  deliverer?: {
    full_name: string
    profile_picture_url: string | null
  } | null
}

interface Conversation {
  order: ConversationOrder
  lastMessage: {
    message: string
    created_at: string
    sender_id: string
  } | null
  unreadCount: number
}

export default function Messages() {
  const router = useRouter()
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    fetchConversations()
    subscribeToMessages()

    return () => {
      supabase.channel("all-messages").unsubscribe()
    }
  }, [user])

  const fetchConversations = async () => {
    if (!user) return

    try {
      const { data: userOrders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          customer_id,
          vendor_id,
          deliverer_id,
          customer_name,
          status,
          created_at,
          vendors!inner (
            business_name
          ),
          deliverer:profiles!orders_deliverer_id_fkey (
            full_name,
            profile_picture_url
          )
        `
        )
        .or(`customer_id.eq.${user.id},vendor_id.eq.${user.id}`)

      if (ordersError) throw ordersError
      if (!userOrders || userOrders.length === 0) {
        setConversations([])
        setLoading(false)
        setRefreshing(false)
        return
      }

      const filteredOrders = userOrders.filter((order) => {
        if (order.customer_id === user.id) {
          return order.deliverer_id !== null
        }
        return true
      })

      if (filteredOrders.length === 0) {
        setConversations([])
        setLoading(false)
        setRefreshing(false)
        return
      }

      const orderIds = filteredOrders.map((order) => order.id)

      // Fetch all messages for these orders
      const { data: allMessages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .in("order_id", orderIds)

      if (messagesError) throw messagesError

      // Group orders by the other person (deliverer for customers, customer for deliverers)
      const groupedByPerson = new Map<string, typeof filteredOrders>()

      filteredOrders.forEach((order) => {
        const isCustomer = order.customer_id === user.id
        const personId = isCustomer ? order.deliverer_id : order.customer_id

        if (personId) {
          if (!groupedByPerson.has(personId)) {
            groupedByPerson.set(personId, [])
          }
          groupedByPerson.get(personId)!.push(order)
        }
      })

      // Create one conversation per person
      const conversationsData: Conversation[] = []

      for (const [personId, orders] of groupedByPerson.entries()) {
        // Get all messages from all orders with this person
        const personOrderIds = orders.map(o => o.id)
        const personMessages = allMessages?.filter(m => personOrderIds.includes(m.order_id)) || []

        // Get most recent order for this person (to use as the main order data)
        const mostRecentOrder = orders.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        // Get last message across all orders
        const lastMessage = personMessages.length > 0 ? personMessages.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0] : null

        // Count unread messages across all orders
        const unreadCount = personMessages.filter(m =>
          !m.read && m.sender_id !== user.id
        ).length

        conversationsData.push({
          order: {
            id: mostRecentOrder.id,
            customer_id: mostRecentOrder.customer_id,
            vendor_id: mostRecentOrder.vendor_id,
            deliverer_id: mostRecentOrder.deliverer_id,
            customer_name: mostRecentOrder.customer_name,
            status: mostRecentOrder.status,
            created_at: mostRecentOrder.created_at,
            vendors: (mostRecentOrder as any).vendors,
            deliverer: (mostRecentOrder as any).deliverer,
          },
          lastMessage: lastMessage ? {
            message: lastMessage.message,
            created_at: lastMessage.created_at,
            sender_id: lastMessage.sender_id,
          } : null,
          unreadCount,
        })
      }

      // Sort by last message timestamp
      conversationsData.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.order.created_at
        const bTime = b.lastMessage?.created_at || b.order.created_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      setConversations(conversationsData)
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("all-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refresh conversations when any message changes
          fetchConversations()
        }
      )
      .subscribe()
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchConversations()
  }

  const openChat = (orderId: string) => {
    router.push({
      pathname: "/chat",
      params: { orderId },
    })
  }

  const getConversationTitle = (conversation: Conversation) => {
    // If user is customer, show deliverer name (always, since we filter for deliverer-assigned orders)
    if (conversation.order.customer_id === user?.id) {
      // Customer view: show deliverer name
      if (conversation.order.deliverer_id && conversation.order.deliverer) {
        return conversation.order.deliverer.full_name
      }
      return "Deliverer" // Fallback (should not happen with our filters)
    }
    // If user is vendor, show customer name
    return conversation.order.customer_name
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F59E0B"
      case "preparing":
      case "accepted":
        return "#4F46E5"
      case "ready":
      case "on_the_way":
        return "#10B981"
      case "delivered":
      case "completed":
        return "#6B7280"
      case "cancelled":
        return "#EF4444"
      default:
        return "#6B7280"
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    // Apply search filter
    const matchesSearch = searchQuery.trim() === "" ||
      getConversationTitle(conv).toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.order.id.toLowerCase().includes(searchQuery.toLowerCase())

    // Apply status filter
    const matchesStatus = !statusFilter || conv.order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      // Today - show time
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    } else if (days === 1) {
      return "Yesterday"
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" })
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }

  const renderConversation = ({ item }: { item: Conversation }) => {
    const title = getConversationTitle(item)
    const lastMessagePreview = item.lastMessage?.message || "No messages yet"
    const timestamp = item.lastMessage?.created_at || item.order.created_at
    const hasUnread = item.unreadCount > 0

    // Determine if we should show deliverer's profile picture
    const isCustomer = item.order.customer_id === user?.id
    const hasDeliverer = item.order.deliverer_id && item.order.deliverer
    const showDelivererPicture = isCustomer && hasDeliverer && item.order.deliverer?.profile_picture_url

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => openChat(item.order.id)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationLeft}>
          {showDelivererPicture ? (
            <Image
              source={{ uri: item.order.deliverer!.profile_picture_url! }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: getStatusBadgeColor(item.order.status) },
              ]}
            >
              <Ionicons
                name={
                  isCustomer
                    ? hasDeliverer
                      ? "bicycle"
                      : "restaurant"
                    : "person"
                }
                size={24}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        <View style={styles.conversationMiddle}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
          </View>

          <View style={styles.conversationFooter}>
            <Text
              style={[
                styles.lastMessage,
                hasUnread && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage?.sender_id === user?.id && "You: "}
              {lastMessagePreview}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.orderInfo}>
            <Text style={styles.orderIdText}>
              Order #{item.order.id.slice(0, 8)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBadgeColor(item.order.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {item.order.status.charAt(0).toUpperCase() +
                  item.order.status.slice(1).replace("_", " ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.conversationRight}>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.blueHeader}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>Messages</Text>
              <Text style={styles.headerSubtitle}>Your conversations</Text>
            </View>
          </View>
        </View>
        <View style={styles.whiteContent}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.blueHeader}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>Your conversations</Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name="search-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.whiteContent}>
        {/* Status Filter Indicator */}
        {statusFilter && (
          <View style={styles.filterIndicator}>
            <Ionicons name="filter" size={16} color={Colors.light.secondary} />
            <Text style={styles.filterText}>
              Showing: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setStatusFilter(null)}>
              <Ionicons name="close-circle" size={18} color={Colors.light.secondary} />
            </TouchableOpacity>
          </View>
        )}

        {filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Messages with your deliverers will appear here once they are assigned to your orders
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.order.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#4F46E5"]}
                tintColor="#4F46E5"
              />
            }
          />
        )}
      </View>
    </View>
  )
}
