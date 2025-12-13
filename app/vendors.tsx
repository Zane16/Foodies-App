import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import React, { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import { Colors } from "../constants/Colors"
import { supabase } from "../supabase"
import { styles } from "../styles/screens/vendorsStyles"
import { useCart } from "./context/_CartContext"
import ActiveOrderButton from "./components/ActiveOrderButton"

interface VendorProfile {
  full_name: string | null
  status: string
  organization: string
  profile_picture_url: string | null
}

interface Vendor {
  id: string
  business_name: string
  business_address: string | null
  profiles: VendorProfile | null
  average_rating?: number
  total_ratings?: number
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  vendor_id: string
  vendors: {
    business_name: string
  }
}

// Animated Vendor Card Component
const AnimatedVendorCard = ({ vendor, index, renderVendorCard }: { vendor: Vendor; index: number; renderVendorCard: any }) => {
  const slideAnim = useRef(new Animated.Value(-50)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <View style={styles.vendorCardWrapper}>
        {renderVendorCard({ item: vendor })}
      </View>
    </Animated.View>
  )
}

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const router = useRouter()
  const { orgName } = useLocalSearchParams<{ orgName: string }>()
  const { cart } = useCart()
  const [loading, setLoading] = useState(true)
  const [orgHeaderImage, setOrgHeaderImage] = useState<string | null>(null)
  const [orgLogo, setOrgLogo] = useState<string | null>(null)
  const [popularItems, setPopularItems] = useState<MenuItem[]>([])
  const [recommendedItems, setRecommendedItems] = useState<MenuItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  // Modal state
  const [selectedFood, setSelectedFood] = useState<MenuItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [vendorDeliveryFee, setVendorDeliveryFee] = useState(0)
  const [vendorMinimumOrder, setVendorMinimumOrder] = useState(0)

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0)
  const { addToCart } = useCart()

  const filteredVendors = vendors.filter((vendor) =>
    searchQuery.trim() === "" ||
    vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const fetchVendors = async () => {
    if (!orgName) return

    setLoading(true)

    console.log("🔍 Fetching vendors for organization:", orgName)

    // Fetch organization header and logo from organization admin's profile
    const { data: orgData, error: orgError } = await supabase
      .from("profiles")
      .select("profile_picture_url, header_image_url")
      .eq("organization", orgName)
      .eq("role", "admin")
      .limit(1)
      .single()

    if (!orgError && orgData) {
      setOrgHeaderImage(orgData.header_image_url)
      setOrgLogo(orgData.profile_picture_url)
    }

    const { data, error } = await supabase
      .from("vendors")
      .select(`
        id,
        business_name,
        business_address,
        is_active,
        profiles!vendors_id_fkey (
          full_name,
          status,
          organization,
          profile_picture_url
        )
      `)
      .eq("is_active", true)

    console.log("📊 Query result for", orgName, ":", {
      count: data?.length || 0,
      vendors: data?.map(v => ({
        name: v.business_name,
        org: (v as any).profiles?.organization
      }))
    })

    if (error) {
      console.error("Error fetching vendors:", error)
      setVendors([])
    } else {
      // Transform the data - profiles comes back as an object (not array) from the join
      const transformedVendors: Vendor[] = (data as any[] || []).map(vendor => ({
        ...vendor,
        profiles: vendor.profiles || null
      }))

      // IMPORTANT: Filter by organization AND status in JavaScript since Supabase join filtering doesn't work reliably
      const orgFilteredVendors = transformedVendors.filter(vendor => {
        const vendorOrg = vendor.profiles?.organization?.trim()
        const vendorStatus = vendor.profiles?.status
        const normalizedOrgName = orgName?.trim()

        // Case-insensitive and whitespace-normalized comparison
        const orgMatches = vendorOrg?.toLowerCase() === normalizedOrgName?.toLowerCase()
        const statusApproved = vendorStatus === "approved"
        const matches = orgMatches && statusApproved

        if (!matches) {
          if (!orgMatches) {
            console.log(`⚠️ Filtered out ${vendor.business_name} - org mismatch (vendor: "${vendorOrg}", expected: "${normalizedOrgName}")`)
          }
          if (!statusApproved) {
            console.log(`⚠️ Filtered out ${vendor.business_name} - status not approved (status: "${vendorStatus}")`)
          }
        }

        return matches
      })

      console.log(`✅ After filtering: ${orgFilteredVendors.length} vendors for ${orgName}`)

      // Fetch ratings for each vendor
      const vendorsWithRatings = await Promise.all(
        orgFilteredVendors.map(async (vendor) => {
          try {
            const { data: ratingData, error: ratingError } = await supabase
              .rpc('get_average_rating', {
                entity_id: vendor.id,
                rating_type: 'vendor'
              })

            if (ratingError) {
              console.error(`Error fetching rating for ${vendor.business_name}:`, ratingError)
              return {
                ...vendor,
                average_rating: 0,
                total_ratings: 0
              }
            }

            return {
              ...vendor,
              average_rating: ratingData?.[0]?.average_rating || 0,
              total_ratings: ratingData?.[0]?.total_ratings || 0
            }
          } catch (error) {
            console.error(`Error fetching rating for vendor ${vendor.id}:`, error)
            return {
              ...vendor,
              average_rating: 0,
              total_ratings: 0
            }
          }
        })
      )

      setVendors(vendorsWithRatings)
    }

    setLoading(false)
  }

  const fetchPopularAndRecommendedItems = async () => {
    if (!orgName) return

    setItemsLoading(true)

    try {
      // First, get all vendor IDs for this organization
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .select(`
          id,
          profiles!vendors_id_fkey (
            organization,
            status
          )
        `)
        .eq("is_active", true)

      if (vendorError || !vendorData) {
        console.error("Error fetching vendors for items:", vendorError)
        setItemsLoading(false)
        return
      }

      // Filter vendors by organization in JavaScript to ensure accuracy
      const normalizedOrgName = orgName?.trim()?.toLowerCase()
      const orgVendors = vendorData.filter(v => {
        const vendorOrg = (v as any).profiles?.organization?.trim()?.toLowerCase()
        const vendorStatus = (v as any).profiles?.status
        return vendorOrg === normalizedOrgName && vendorStatus === "approved"
      })

      const vendorIds = orgVendors.map(v => v.id)

      console.log(`📊 Fetching best sellers and recommended items for ${vendorIds.length} vendors in ${orgName}`)

      if (vendorIds.length === 0) {
        setPopularItems([])
        setRecommendedItems([])
        setItemsLoading(false)
        return
      }

      // Fetch items marked as best sellers by vendors
      const { data: bestSellerData, error: bestSellerError } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          vendor_id,
          vendors!inner (
            business_name
          )
        `)
        .in("vendor_id", vendorIds)
        .eq("is_best_seller", true)
        .eq("is_available", true)

      // Fetch items marked as recommended by vendors
      const { data: recommendedData, error: recommendedError } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          vendor_id,
          vendors!inner (
            business_name
          )
        `)
        .in("vendor_id", vendorIds)
        .eq("is_recommended", true)
        .eq("is_available", true)

      // Map to MenuItem interface
      const popular: MenuItem[] = (bestSellerData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        vendor_id: item.vendor_id,
        vendors: {
          business_name: item.vendors?.business_name || "Unknown Vendor"
        }
      }))

      const recommended: MenuItem[] = (recommendedData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        vendor_id: item.vendor_id,
        vendors: {
          business_name: item.vendors?.business_name || "Unknown Vendor"
        }
      }))

      setPopularItems(popular)
      setRecommendedItems(recommended)

      console.log(`✅ Found ${popular.length} best sellers and ${recommended.length} recommended items`)
    } catch (error) {
      console.error("Error fetching items:", error)
    }

    setItemsLoading(false)
  }

  useEffect(() => {
    fetchVendors()
    fetchPopularAndRecommendedItems()
  }, [orgName])

  const goToVendorMenu = (vendor: Vendor) => {
    router.push({
      pathname: "vendor-menu",
      params: {
        vendorId: vendor.id,
        vendorName: vendor.business_name,
        orgName,
      },
    } as any)
  }

  const openFoodModal = async (item: MenuItem) => {
    // Fetch vendor delivery fee and minimum order
    try {
      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select("delivery_fee, minimum_order")
        .eq("id", item.vendor_id)
        .single()

      if (!error && vendorData) {
        setVendorDeliveryFee(Number(vendorData.delivery_fee) || 0)
        setVendorMinimumOrder(Number(vendorData.minimum_order) || 0)
      }
    } catch (error) {
      console.error("Error fetching vendor data:", error)
    }

    setSelectedFood(item)
    setQuantity(1)
  }

  const closeFoodModal = () => {
    setSelectedFood(null)
    setQuantity(1)
  }

  const handleAddToCart = () => {
    if (selectedFood) {
      addToCart(
        {
          ...selectedFood,
          vendorId: selectedFood.vendor_id,
          vendorName: selectedFood.vendors.business_name,
          orgName: orgName || "",
          deliveryFee: vendorDeliveryFee,
          minimumOrder: vendorMinimumOrder,
        },
        quantity
      )
      closeFoodModal()
    }
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out the vendors at ${orgName}! Download Foodies App to order delicious food.`,
        title: `${orgName} - Foodies`,
      })
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  const renderVendorCard = ({ item }: { item: Vendor }) => (
    <TouchableOpacity
      style={styles.vendorCard}
      onPress={() => goToVendorMenu(item)}
      activeOpacity={0.9}
    >
      <View style={styles.vendorImageContainer}>
        {item.profiles?.profile_picture_url ? (
          <Image
            source={{ uri: item.profiles.profile_picture_url }}
            style={styles.vendorImage}
          />
        ) : (
          <View style={styles.vendorImagePlaceholder}>
            <Ionicons name="restaurant" size={56} color={Colors.light.primary} />
          </View>
        )}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Open</Text>
        </View>
      </View>

      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName} numberOfLines={2}>
          {item.business_name || "Vendor"}
        </Text>

        <View style={styles.vendorMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFB800" />
            <Text style={styles.ratingText}>
              {item.average_rating && item.average_rating > 0
                ? item.average_rating.toFixed(1)
                : "New"}
            </Text>
            {item.total_ratings && item.total_ratings > 0 ? (
              <Text style={styles.reviewCount}>({item.total_ratings})</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.deliveryInfo}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.deliveryTime}>15-20 min</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={orgHeaderImage ? "transparent" : "#4A5EE8"} />

      {/* Header with Organization Image/Logo */}
      {orgHeaderImage ? (
        <View style={styles.orgHeaderContainer}>
          {/* Header Image Background */}
          <Image
            source={{ uri: orgHeaderImage }}
            style={styles.orgHeaderImage}
            resizeMode="cover"
          />

          {/* Gradient Overlay for better text visibility */}
          <View style={styles.headerGradient} />

          {/* Header Top Bar */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => setShowSearch(!showSearch)}
                style={styles.headerButton}
              >
                <Ionicons name="search-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerButton}
              >
                <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Organization Logo and Name centered on header */}
          <View style={styles.orgInfoOverlay}>
            <View style={styles.orgLogoContainer}>
              {orgLogo ? (
                <Image
                  source={{ uri: orgLogo }}
                  style={styles.orgLogoImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="school" size={50} color="#4A5EE8" />
              )}
            </View>
            <Text style={styles.orgNameOnHeader}>
              {orgName}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vendors</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => setShowSearch(!showSearch)}
                style={styles.headerButton}
              >
                <Ionicons name="search-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerButton}
              >
                <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Organization Section (No Image) */}
          <View style={styles.orgSection}>
            <View style={styles.orgIconContainer}>
              {orgLogo ? (
                <Image
                  source={{ uri: orgLogo }}
                  style={styles.orgLogoImageNoHeader}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="school" size={36} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.orgName}>
              {orgName}
            </Text>
          </View>
        </View>
      )}

      {/* White Content Area */}
      <ScrollView
        style={styles.whiteContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                placeholder="Search vendors..."
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

        {/* Popular Section */}
        {!itemsLoading && popularItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flame" size={32} color="#FF6B6B" style={styles.sectionIcon} />
              <View style={styles.sectionTextContainer}>
                <Text style={styles.sectionTitle}>Popular</Text>
                <Text style={styles.sectionSubtitle}>Best sellers</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {popularItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.foodCard}
                  onPress={() => openFoodModal(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.foodImageContainer}>
                    {item.image_url ? (
                      <>
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.foodImage}
                        />
                        <View style={styles.imageOverlay} />
                      </>
                    ) : (
                      <View style={styles.foodImagePlaceholder}>
                        <Ionicons name="fast-food" size={36} color={Colors.light.primary} />
                      </View>
                    )}
                    <View style={styles.popularBadge}>
                      <Ionicons name="star" size={14} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.foodCardContent}>
                    <Text style={styles.foodName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.foodVendor} numberOfLines={1}>
                      {item.vendors.business_name}
                    </Text>
                    <View style={styles.foodFooter}>
                      <Text style={styles.foodPrice}>₱{item.price.toFixed(2)}</Text>
                      <View style={styles.addButtonSmall}>
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recommended Section */}
        {!itemsLoading && recommendedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={32} color="#FFB800" style={styles.sectionIcon} />
              <View style={styles.sectionTextContainer}>
                <Text style={styles.sectionTitle}>Recommended</Text>
                <Text style={styles.sectionSubtitle}>Try these items</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recommendedItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.foodCard}
                  onPress={() => openFoodModal(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.foodImageContainer}>
                    {item.image_url ? (
                      <>
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.foodImage}
                        />
                        <View style={styles.imageOverlay} />
                      </>
                    ) : (
                      <View style={styles.foodImagePlaceholder}>
                        <Ionicons name="fast-food" size={36} color={Colors.light.primary} />
                      </View>
                    )}
                    <View style={styles.recommendedBadge}>
                      <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.foodCardContent}>
                    <Text style={styles.foodName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.foodVendor} numberOfLines={1}>
                      {item.vendors.business_name}
                    </Text>
                    <View style={styles.foodFooter}>
                      <Text style={styles.foodPrice}>₱{item.price.toFixed(2)}</Text>
                      <View style={styles.addButtonSmall}>
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Vendors Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant" size={32} color="#4A5EE8" style={styles.sectionIcon} />
            <View style={styles.sectionTextContainer}>
              <Text style={styles.sectionTitle}>Vendors</Text>
              <Text style={styles.sectionSubtitle}>Browse all vendors</Text>
            </View>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
          ) : filteredVendors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() ? "No vendors found" : "No vendors available"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim() ? "Try adjusting your search" : "Check back later for more options"}
              </Text>
            </View>
          ) : (
            <View style={styles.vendorGridInline}>
              {filteredVendors.map((vendor, index) => (
                <AnimatedVendorCard
                  key={vendor.id}
                  vendor={vendor}
                  index={index}
                  renderVendorCard={renderVendorCard}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Active Order Button - positioned higher to avoid overlap */}
      <View style={{ position: 'absolute', bottom: 100, left: 0, right: 0 }}>
        <ActiveOrderButton />
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

      {/* Food Detail Modal */}
      <Modal visible={!!selectedFood} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={closeFoodModal}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedFood && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Food Image */}
                <View style={styles.modalImageContainer}>
                  {selectedFood.image_url ? (
                    <Image
                      source={{ uri: selectedFood.image_url }}
                      style={styles.modalImage}
                    />
                  ) : (
                    <View style={styles.modalPlaceholder}>
                      <Ionicons name="fast-food" size={80} color={Colors.light.primary} />
                    </View>
                  )}
                </View>

                {/* Food Info */}
                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>{selectedFood.name}</Text>
                  <Text style={styles.modalVendor}>From {selectedFood.vendors.business_name}</Text>
                  <Text style={styles.modalDescription}>
                    {selectedFood.description || "Delicious food item from our menu"}
                  </Text>

                  {/* Quantity Selector */}
                  <View style={styles.quantitySection}>
                    <Text style={styles.quantityLabel}>Quantity</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Ionicons name="remove" size={20} color={Colors.light.text} />
                      </TouchableOpacity>
                      <Text style={styles.quantityValue}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setQuantity(quantity + 1)}
                      >
                        <Ionicons name="add" size={20} color={Colors.light.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Price and Add to Cart */}
                  <View style={styles.modalFooter}>
                    <View>
                      <Text style={styles.priceLabel}>Total Price</Text>
                      <Text style={styles.modalPrice}>
                        ₱{(selectedFood.price * quantity).toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addToCartButton}
                      onPress={handleAddToCart}
                    >
                      <Ionicons
                        name="cart"
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.addToCartText}>Add to Cart</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}