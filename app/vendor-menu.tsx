import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import React, { useEffect, useState, useRef } from "react"
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import { Colors } from "../constants/Colors"
import { supabase } from "../supabase"
import { useCart } from "./context/_CartContext"
import { styles } from "../styles/screens/vendorMenuStyles"
import VendorReviewsModal from "./components/VendorReviewsModal"
import SimpleFeaturedItems from "./components/SimpleFeaturedItems"

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image_url?: string
  category_id?: string
}

interface Category {
  id: string
  name: string
  vendor_id: string
}

// Animated Menu Item Component
const AnimatedMenuItem = ({ item, index, onPress }: { item: MenuItem; index: number; onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View
      style={{
        width: '47%',
        margin: '1.5%',
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={[styles.menuCard, { width: '100%', margin: 0 }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.menuImageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.menuImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="fast-food" size={40} color={Colors.light.primary} />
            </View>
          )}
        </View>
        <Text style={styles.menuName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.menuDescription} numberOfLines={1}>
          {item.description || "Delicious food"}
        </Text>
        <View style={styles.menuFooter}>
          <Text style={styles.menuPrice}>₱{item.price.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={onPress}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function Foods() {
  const { vendorId, vendorName, orgName } = useLocalSearchParams<{
    vendorId: string
    vendorName: string
    orgName: string
  }>()
  const router = useRouter()
  const { cart, addToCart } = useCart()
  const [foods, setFoods] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFood, setSelectedFood] = useState<MenuItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  // Ref for scrolling to menu grid
  const menuGridRef = useRef<View>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  // ✅ NEW: Store the resolved vendor ID
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null)
  // Store vendor header image
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null)
  // Store vendor profile picture
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)
  // Store vendor ratings
  const [averageRating, setAverageRating] = useState<number>(0)
  const [totalRatings, setTotalRatings] = useState<number>(0)
  // Reviews modal state
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  // Store vendor delivery fee and minimum order
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [minimumOrder, setMinimumOrder] = useState<number>(0)

  useEffect(() => {
    if (!vendorId && !vendorName) {
      console.warn("No vendorId or vendorName provided!")
      setLoading(false)
      return
    }
    fetchFoods(vendorId, vendorName)
  }, [vendorId, vendorName])

  const fetchFoods = async (passedVendorId?: string, passedVendorName?: string) => {
    setLoading(true)
    try {
      let vendorUUID: string | null = null
      
      if (passedVendorId) {
        const { data: vendorData, error: vendorError } = await supabase
          .from("vendors")
          .select(`
            id,
            header_image_url,
            delivery_fee,
            minimum_order,
            profiles!vendors_id_fkey (
              profile_picture_url
            )
          `)
          .eq("id", passedVendorId)
          .single()

        if (!vendorError && vendorData) {
          vendorUUID = vendorData.id
          setHeaderImageUrl(vendorData.header_image_url)
          setProfilePictureUrl((vendorData as any).profiles?.profile_picture_url || null)
          setDeliveryFee(Number(vendorData.delivery_fee) || 0)
          setMinimumOrder(Number(vendorData.minimum_order) || 0)
        }
      }

      if (!vendorUUID && passedVendorName) {
        const { data: nameData, error: nameError } = await supabase
          .from("vendors")
          .select(`
            id,
            header_image_url,
            delivery_fee,
            minimum_order,
            profiles!vendors_id_fkey (
              profile_picture_url
            )
          `)
          .eq("business_name", passedVendorName)
          .single()

        if (!nameError && nameData) {
          vendorUUID = nameData.id
          setHeaderImageUrl(nameData.header_image_url)
          setProfilePictureUrl((nameData as any).profiles?.profile_picture_url || null)
          setDeliveryFee(Number(nameData.delivery_fee) || 0)
          setMinimumOrder(Number(nameData.minimum_order) || 0)
        }
      }
      
      if (!vendorUUID) {
        console.warn("Cannot resolve vendor UUID. No menu items will be fetched.")
        setFoods([])
        setCategories([])
        setLoading(false)
        return
      }
      
      // ✅ NEW: Store the resolved vendor ID
      console.log("✅ Resolved Vendor ID:", vendorUUID)
      setResolvedVendorId(vendorUUID)

      // Fetch vendor ratings
      try {
        const { data: ratingData, error: ratingError } = await supabase
          .rpc('get_average_rating', {
            entity_id: vendorUUID,
            rating_type: 'vendor'
          })

        if (!ratingError && ratingData && ratingData.length > 0) {
          setAverageRating(ratingData[0].average_rating || 0)
          setTotalRatings(ratingData[0].total_ratings || 0)
        } else {
          setAverageRating(0)
          setTotalRatings(0)
        }
      } catch (error) {
        console.error("Error fetching vendor ratings:", error)
        setAverageRating(0)
        setTotalRatings(0)
      }

      // Fetch categories for this vendor
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, vendor_id")
        .eq("vendor_id", vendorUUID)
        .order("created_at", { ascending: true })

      if (!categoriesError && categoriesData) {
        setCategories(categoriesData)
        // Keep activeCategory as null to show all items by default
      }

      // Fetch menu items
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, category_id")
        .eq("vendor_id", vendorUUID)

      if (error) {
        console.error("Error fetching menu items:", error)
        setFoods([])
      } else if (!data || data.length === 0) {
        console.log("No menu items found for vendor:", vendorUUID)
        setFoods([])
      } else {
        const foodsWithCorrectType = data.map((item) => ({
          ...item,
          price: Number(item.price),
        }))
        setFoods(foodsWithCorrectType)
      }
    } catch (err) {
      console.error("Unexpected error fetching foods:", err)
      setFoods([])
      setCategories([])
    }
    setLoading(false)
  }

  const openModal = (food: MenuItem) => {
    setSelectedFood(food)
    setQuantity(1)
  }

  const closeModal = () => setSelectedFood(null)

  // ✅ UPDATED: Use resolvedVendorId instead of vendorId
  const handleAddToCart = () => {
    if (selectedFood && resolvedVendorId) {
      console.log("🛒 Adding to cart with vendor ID:", resolvedVendorId)
      addToCart(
        {
          ...selectedFood,
          vendorId: resolvedVendorId,  // ✅ Use the resolved UUID
          vendorName,
          orgName,
          deliveryFee,
          minimumOrder,
        },
        quantity
      )
      closeModal()
    } else if (!resolvedVendorId) {
      console.error("❌ Cannot add to cart: Vendor ID not resolved")
    }
  }

  const filteredFoods = foods.filter((food) => {
    const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !activeCategory || food.category_id === activeCategory
    return matchesSearch && matchesCategory
  })

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  // Handle category selection and scroll to menu
  const handleCategorySelect = (categoryId: string | null) => {
    setActiveCategory(categoryId)
    // Scroll to menu grid after a short delay to allow re-render
    setTimeout(() => {
      menuGridRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true })
        },
        () => {}
      )
    }, 100)
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Vendor Header Section with Image Background */}
      {headerImageUrl ? (
        <View style={styles.vendorHeaderContainer}>
          {/* Header Image Background */}
          <Image
            source={{ uri: headerImageUrl }}
            style={styles.vendorHeaderImage}
            resizeMode="cover"
          />

          {/* Header Bar Overlay */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButtonWhite}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitleWhite}>Detail</Text>
            <TouchableOpacity style={styles.shareButtonWhite}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* White Card Overlay with Vendor Info */}
          <View style={styles.vendorInfoCard}>
            <View style={styles.vendorLogo}>
              {profilePictureUrl ? (
                <Image
                  source={{ uri: profilePictureUrl }}
                  style={styles.vendorLogoImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="restaurant" size={32} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.vendorDetails}>
              <Text style={styles.vendorName}>{vendorName || "Vendor"}</Text>
              <Text style={styles.vendorLocation}>1st Floor Canteen</Text>
              <TouchableOpacity
                style={styles.ratingRow}
                onPress={() => setShowReviewsModal(true)}
                disabled={totalRatings === 0}
              >
                <Ionicons name="star" size={16} color="#FFA500" />
                <Text style={styles.ratingText}>
                  {averageRating > 0 ? averageRating.toFixed(1) : "New"}
                </Text>
                {totalRatings > 0 && (
                  <Text style={styles.reviewCount}>({totalRatings})</Text>
                )}
              </TouchableOpacity>
              <View style={styles.deliveryInfoRow}>
                <View style={styles.deliveryInfo}>
                  <Ionicons name="bicycle-outline" size={14} color={Colors.light.icon} />
                  <Text style={styles.deliveryInfoText}>
                    {deliveryFee === 0 ? "Free delivery" : `₱${deliveryFee.toFixed(2)} delivery`}
                  </Text>
                </View>
                {minimumOrder > 0 && (
                  <View style={styles.deliveryInfo}>
                    <Ionicons name="receipt-outline" size={14} color={Colors.light.icon} />
                    <Text style={styles.deliveryInfoText}>Min: ₱{minimumOrder.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Regular Header (no image) */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detail</Text>
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-outline" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Vendor Card (no image) */}
          <View style={styles.vendorCard}>
            <View style={styles.vendorCardContent}>
              <View style={styles.vendorIcon}>
                {profilePictureUrl ? (
                  <Image
                    source={{ uri: profilePictureUrl }}
                    style={styles.vendorIconImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="restaurant" size={32} color={Colors.light.primary} />
                )}
              </View>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{vendorName || "Vendor"}</Text>
                <Text style={styles.vendorLocation}>1st Floor Canteen</Text>
                <TouchableOpacity
                  style={styles.ratingRow}
                  onPress={() => setShowReviewsModal(true)}
                  disabled={totalRatings === 0}
                >
                  <Ionicons name="star" size={16} color="#FFA500" />
                  <Text style={styles.ratingText}>
                    {averageRating > 0 ? averageRating.toFixed(1) : "New"}
                  </Text>
                  {totalRatings > 0 && (
                    <Text style={styles.reviewCount}>({totalRatings})</Text>
                  )}
                </TouchableOpacity>
                <View style={styles.deliveryInfoRow}>
                  <View style={styles.deliveryInfo}>
                    <Ionicons name="bicycle-outline" size={14} color={Colors.light.icon} />
                    <Text style={styles.deliveryInfoText}>
                      {deliveryFee === 0 ? "Free delivery" : `₱${deliveryFee.toFixed(2)} delivery`}
                    </Text>
                  </View>
                  {minimumOrder > 0 && (
                    <View style={styles.deliveryInfo}>
                      <Ionicons name="receipt-outline" size={14} color={Colors.light.icon} />
                      <Text style={styles.deliveryInfoText}>Min: ₱{minimumOrder.toFixed(2)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </>
      )}

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={Colors.light.icon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholder="Search in menu"
              placeholderTextColor={Colors.light.placeholder}
            />
          </View>
        </View>

        {/* Featured Items - Auto-populated based on sales data */}
        {resolvedVendorId && (
          <SimpleFeaturedItems
            vendorId={resolvedVendorId}
            onItemPress={(itemId) => {
              // Find the item in foods array and open modal
              const item = foods.find(f => f.id === itemId);
              if (item) openModal(item);
            }}
          />
        )}

        {/* Category Tabs */}
        {categories.length > 0 && (
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.categoryTab,
                  !activeCategory && styles.categoryTabActive,
                ]}
                onPress={() => handleCategorySelect(null)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    !activeCategory && styles.categoryTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryTab,
                    activeCategory === category.id && styles.categoryTabActive,
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      activeCategory === category.id && styles.categoryTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Menu Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading menu...</Text>
          </View>
        ) : filteredFoods.length > 0 ? (
          <View ref={menuGridRef} style={styles.menuGrid}>
            {filteredFoods.map((item, index) => (
              <AnimatedMenuItem
                key={item.id}
                item={item}
                index={index}
                onPress={() => openModal(item)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={Colors.light.icon} />
            <Text style={styles.emptyText}>No menu items found</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Cart Button */}
      {totalCartItems > 0 && (
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
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
            <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
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

      {/* Vendor Reviews Modal */}
      {resolvedVendorId && (
        <VendorReviewsModal
          visible={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          vendorId={resolvedVendorId}
          vendorName={vendorName || "Vendor"}
          averageRating={averageRating}
          totalRatings={totalRatings}
        />
      )}
    </View>
  )
}