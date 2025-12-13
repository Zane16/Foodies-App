import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import React, { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { supabase } from "../supabase"
import { styles } from "../styles/screens/chatStyles"
import { useAuth } from "./context/_authContext"

interface Message {
  id: string
  order_id: string
  sender_id: string
  message: string
  created_at: string
  read: boolean
}

interface OrderInfo {
  id: string
  customer_id: string
  vendor_id: string
  deliverer_id: string | null
  customer_name: string
  customer_phone: string
  vendors: {
    business_name: string
  }
  deliverer?: {
    full_name: string
    profile_picture_url: string | null
    phone: string | null
  } | null
}

export default function Chat() {
  const router = useRouter()
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const { user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [allOrderIds, setAllOrderIds] = useState<string[]>([])
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (!orderId || !user) return

    fetchOrderInfo()
  }, [orderId, user])

  // Fetch messages and subscribe after order info and allOrderIds are loaded
  useEffect(() => {
    if (!orderInfo || !user || allOrderIds.length === 0) return

    fetchMessages()
    const channel = subscribeToMessages()

    return () => {
      // Cleanup subscription on unmount
      if (channel) channel.unsubscribe()
    }
  }, [orderInfo?.id, user?.id, allOrderIds.join(",")])

  const fetchOrderInfo = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        customer_id,
        vendor_id,
        deliverer_id,
        customer_name,
        customer_phone,
        vendors!inner (
          business_name
        ),
        deliverer:profiles!orders_deliverer_id_fkey (
          full_name,
          profile_picture_url,
          phone
        )
      `)
      .eq("id", orderId)
      .single()

    if (error) {
      console.error("Error fetching order info:", error)
      return
    }

    setOrderInfo(data as OrderInfo)

    // Fetch all orders with the same person
    const isCustomer = data.customer_id === user?.id
    const otherPersonId = isCustomer ? data.deliverer_id : data.customer_id

    if (otherPersonId) {
      let query = supabase.from("orders").select("id")

      if (isCustomer) {
        // For customers: all orders where they are customer AND deliverer is the same person
        query = query.eq("customer_id", user.id).eq("deliverer_id", otherPersonId)
      } else {
        // For vendors/deliverers: all orders with this customer
        query = query.eq("customer_id", otherPersonId).eq("vendor_id", user.id)
      }

      const { data: relatedOrders } = await query

      if (relatedOrders) {
        setAllOrderIds(relatedOrders.map(o => o.id))
      }
    }
  }

  const handleCall = () => {
    if (!orderInfo) return

    let phoneNumber = ""
    let contactName = ""

    // If user is customer, call deliverer or vendor
    if (orderInfo.customer_id === user?.id) {
      if (orderInfo.deliverer_id && orderInfo.deliverer?.phone) {
        phoneNumber = orderInfo.deliverer.phone
        contactName = orderInfo.deliverer.full_name
      }
    } else {
      // If user is vendor/deliverer, call customer
      phoneNumber = orderInfo.customer_phone
      contactName = orderInfo.customer_name
    }

    if (!phoneNumber) {
      Alert.alert("No Phone Number", "Phone number not available for this contact.")
      return
    }

    Alert.alert(
      `Call ${contactName}?`,
      `Do you want to call ${phoneNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: () => {
            const url = `tel:${phoneNumber}`
            Linking.canOpenURL(url)
              .then((supported) => {
                if (supported) {
                  Linking.openURL(url)
                } else {
                  Alert.alert("Error", "Unable to make phone call")
                }
              })
              .catch((err) => console.error("Error opening phone:", err))
          },
        },
      ]
    )
  }

  const fetchMessages = async () => {
    setLoading(true)

    if (!orderInfo || allOrderIds.length === 0) {
      setLoading(false)
      return
    }

    const isCustomer = orderInfo.customer_id === user?.id

    let messagesQuery = supabase
      .from("messages")
      .select("*")
      .in("order_id", allOrderIds)

    if (isCustomer && orderInfo.deliverer_id) {
      messagesQuery = messagesQuery.or(`sender_id.eq.${orderInfo.deliverer_id},sender_id.eq.${user.id}`)
    }

    const { data, error } = await messagesQuery.order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
    } else {
      setMessages(data || [])
      markMessagesAsRead()
    }

    setLoading(false)
  }

  const markMessagesAsRead = async () => {
    if (!user || allOrderIds.length === 0) return

    await supabase
      .from("messages")
      .update({ read: true })
      .in("order_id", allOrderIds)
      .neq("sender_id", user.id)
  }

  const subscribeToMessages = () => {
    if (!orderInfo || allOrderIds.length === 0) return

    const isCustomer = orderInfo.customer_id === user?.id

    const channel = supabase
      .channel(`messages:person-${orderInfo.deliverer_id || orderInfo.customer_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message

          // Only process if message is from one of our orders
          if (!allOrderIds.includes(newMsg.order_id)) return

          // For customers, only show messages from deliverer or themselves
          if (isCustomer && orderInfo.deliverer_id) {
            if (newMsg.sender_id !== orderInfo.deliverer_id && newMsg.sender_id !== user?.id) {
              return
            }
          }

          setMessages((prev) => [...prev, newMsg])

          // Mark as read if not sent by current user
          if (newMsg.sender_id !== user?.id) {
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", newMsg.id)
          }

          // Scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }, 100)
        }
      )
      .subscribe()

    return channel
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return

    setSending(true)

    const { error } = await supabase.from("messages").insert([
      {
        order_id: orderId,
        sender_id: user.id,
        message: newMessage.trim(),
      },
    ])

    if (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message. Please try again.")
    } else {
      setNewMessage("")
    }

    setSending(false)
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id

    // Determine sender name based on user role
    let senderName = "You"
    if (!isOwnMessage) {
      if (orderInfo?.customer_id === user?.id) {
        // Customer view: show deliverer name
        senderName = orderInfo?.deliverer?.full_name || "Deliverer"
      } else {
        // Vendor/deliverer view: show customer name
        senderName = orderInfo?.customer_name || "Customer"
      }
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          {!isOwnMessage && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    )
  }

  const getChatTitle = () => {
    if (!orderInfo) return "Chat"

    // If user is customer, show deliverer name (always, since they can only chat with deliverers)
    if (orderInfo.customer_id === user?.id) {
      // Customer view: show deliverer name
      if (orderInfo.deliverer_id && orderInfo.deliverer) {
        return orderInfo.deliverer.full_name
      }
      return "Deliverer"
    }
    // If user is vendor/deliverer, show customer name
    return orderInfo.customer_name
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#5B5FDE" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        {orderInfo?.deliverer_id && orderInfo.deliverer?.profile_picture_url && (
          <Image
            source={{ uri: orderInfo.deliverer.profile_picture_url }}
            style={styles.headerAvatar}
          />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{getChatTitle()}</Text>
          <Text style={styles.headerSubtitle}>Order #{orderId?.slice(0, 8)}</Text>
        </View>
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCall}
        >
          <Ionicons name="call" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5EE8" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Start the conversation!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
