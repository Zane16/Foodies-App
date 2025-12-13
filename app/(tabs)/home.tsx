"use client"


import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/homeStyles"
import { useAuth } from "../context/_authContext"
import { useCart } from "../context/_CartContext"
import ActiveOrderButton from "../components/ActiveOrderButton"
import MaskedView from "@react-native-masked-view/masked-view"

// Animated Organization Card Component
const AnimatedOrgCard = ({ org, index, onPress }: { org: any; index: number; onPress: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start()
  }, [])

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={styles.orgCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {org.headerImage ? (
          <ImageBackground
            source={{ uri: org.headerImage }}
            style={styles.orgCardBackground}
            imageStyle={styles.orgCardBackgroundImage}
          >
            <View style={styles.orgCardOverlay}>
              {org.logo && (
                <Image
                  source={{ uri: org.logo }}
                  style={styles.orgLogo}
                />
              )}
              <Text style={styles.orgNameWithImage} numberOfLines={2}>
                {org.name}
              </Text>
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.orgIconContainer}>
            {org.logo ? (
              <Image
                source={{ uri: org.logo }}
                style={styles.orgLogoIcon}
              />
            ) : (
              <View style={styles.orgIcon}>
                <Ionicons name={org.icon} size={40} color="#5B5FDE" />
              </View>
            )}
            <Text style={styles.orgName} numberOfLines={2}>
              {org.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function OrganizationSelection() {
  const router = useRouter()
  const { user } = useAuth()
  const { cart, activeOrder, fetchActiveOrder } = useCart()

  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [notificationCount, setNotificationCount] = useState(0)
  const [userAddress, setUserAddress] = useState<string>("")

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    fetchOrganizations()
    if (user?.id) {
      fetchNotificationCount()
      fetchUserAddress()
      fetchActiveOrder(user.id)
    }
  }, [user?.id])

  const fetchUserAddress = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("delivery_address")
        .eq("id", user.id)
        .single()

      if (!error && data?.delivery_address) {
        setUserAddress(data.delivery_address)
      } else {
        setUserAddress("Set delivery address")
      }
    } catch (error) {
      console.error("Error fetching address:", error)
      setUserAddress("Set delivery address")
    }
  }

  const fetchNotificationCount = async () => {
    if (!user?.id) return

    try {
      // Fetch unread messages count
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("read", false)
        .neq("sender_id", user.id)

      if (!error && count) {
        setNotificationCount(count)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const handleNotificationPress = () => {
    router.push("/(tabs)/messages")
  }

  const fetchOrganizations = async () => {
    setLoading(true)

    // Query the organizations table directly (allows viewing all active orgs)
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, logo_url, header_image_url")
      .eq("status", "active")
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching organizations:", error)
      setLoading(false)
      return
    }

    const orgs = data.map((org) => ({
      id: org.id,
      name: org.name,
      logo: org.logo_url,
      headerImage: org.header_image_url,
      icon: "school" as const,
    }))

    setOrganizations(orgs)
    setLoading(false)
  }

  const handlePress = (org: any) => {
    router.push({
      pathname: "/vendors",
      params: { orgName: org.name },
    })
  }

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5B5FDE" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        {/* Top Row: Logo, Search Bar, Notification */}
        <View style={styles.headerTopRow}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logoImage}
            />
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholder="Search organizations..."
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Address Section - Below */}
        <TouchableOpacity
          style={styles.addressContainer}
          onPress={() => router.push("/(tabs)/profile")}
          activeOpacity={0.7}
        >
          <Ionicons name="location-sharp" size={18} color="#FFFFFF" />
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressLabel}>Deliver to</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {userAddress || "Set delivery address"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* White Content Area */}
      <View style={styles.whiteContent}>
        <FlatList
          data={filteredOrgs}
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <>
              {/* Active Order Card */}
              <View style={styles.statsContainer}>
                <TouchableOpacity
                  style={[
                    styles.statCard,
                    activeOrder && styles.statCardActive,
                    !activeOrder && styles.statCardInactive
                  ]}
                  onPress={() => {
                    if (activeOrder) {
                      router.push({
                        pathname: "/track-order",
                        params: { orderId: activeOrder.id },
                      })
                    }
                  }}
                  disabled={!activeOrder}
                  activeOpacity={activeOrder ? 0.7 : 1}
                >
                  {!activeOrder ? (
                    <>
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>0</Text>
                      </View>
                      <Text style={styles.orderCardText}>
                        No Active Order
                      </Text>
                      <Ionicons
                        name="bicycle"
                        size={24}
                        color="#8B5CF6"
                      />
                    </>
                  ) : (
                    <>
                      <View style={[styles.orderBadge, styles.orderBadgeActive]}>
                        <Text style={[styles.orderBadgeText, styles.orderBadgeTextActive]}>1</Text>
                      </View>
                      <Text style={[styles.orderCardText, styles.orderCardTextActive]}>
                        View Your Order
                      </Text>
                      <Ionicons name="bicycle" size={24} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Organizations Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Browse Organizations</Text>
                </View>

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B5FDE" />
                  </View>
                ) : filteredOrgs.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="business-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyTitle}>No organizations found</Text>
                    <Text style={styles.emptyText}>Try adjusting your search</Text>
                  </View>
                ) : (
                  <View style={styles.orgGrid}>
                    {filteredOrgs.map((org, index) => (
                      <AnimatedOrgCard
                        key={org.id}
                        org={org}
                        index={index}
                        onPress={() => handlePress(org)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </>
          }
        />
      </View>

      {/* Floating Cart Button */}
      {totalCartItems > 0 && (
                <TouchableOpacity
                 style={styles.cartButton}
                   onPress={() => router.push("/(tabs)/cart")}
                >
                   <View style={styles.cartBadge}>
                   <Text style={styles.cartBadgeText}>{totalCartItems}</Text>
                </View>
                   <Text style={styles.cartButtonText}>View Your Order</Text>
                  <Ionicons name="cart" size={24} color="#FFFFFF" />
                 </TouchableOpacity>
             )}
    </View>
    
  )
}