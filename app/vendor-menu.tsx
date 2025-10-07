import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import { Colors } from "../constants/Colors"
import { supabase } from "../supabase"
import { useCart } from "./context/_CartContext"

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
  
  // ✅ NEW: Store the resolved vendor ID
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null)

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
          .select("id")
          .eq("id", passedVendorId)
          .single()
        
        if (!vendorError && vendorData) {
          vendorUUID = vendorData.id
        }
      }
      
      if (!vendorUUID && passedVendorName) {
        const { data: nameData, error: nameError } = await supabase
          .from("vendors")
          .select("id")
          .eq("name", passedVendorName)
          .single()
        
        if (!nameError && nameData) {
          vendorUUID = nameData.id
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

      // Fetch categories for this vendor
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, vendor_id")
        .eq("vendor_id", vendorUUID)
        .order("created_at", { ascending: true })

      if (!categoriesError && categoriesData) {
        setCategories(categoriesData)
        // Set first category as active, or null if no categories
        if (categoriesData.length > 0) {
          setActiveCategory(categoriesData[0].id)
        }
      }

      // Fetch menu items
      const { data, error } = await supabase
        .from("menuitems")
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Vendor Info Card */}
        <View style={styles.vendorCard}>
          <View style={styles.vendorIcon}>
            <Ionicons name="restaurant" size={32} color={Colors.light.primary} />
          </View>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName}>{vendorName || "Vendor"}</Text>
            <Text style={styles.vendorLocation}>1st Floor Canteen</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#FFA500" />
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.reviewCount}>(830)</Text>
            </View>
          </View>
        </View>

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

        {/* Last Order Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Last Order</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {foods.slice(0, 2).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.lastOrderCard}
                onPress={() => openModal(item)}
              >
                <View style={styles.lastOrderImage}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.foodImage} />
                  ) : (
                    <Ionicons name="fast-food" size={32} color={Colors.light.primary} />
                  )}
                </View>
                <Text style={styles.lastOrderName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.lastOrderPrice}>₱{item.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.categoryTab,
                  !activeCategory && styles.categoryTabActive,
                ]}
                onPress={() => setActiveCategory(null)}
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
                  onPress={() => setActiveCategory(category.id)}
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
          <View style={styles.menuGrid}>
            {filteredFoods.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuCard}
                onPress={() => openModal(item)}
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
                  <Text style={styles.menuPrice}>₱{item.price}</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => openModal(item)}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
              <Ionicons name="close" size={28} color={Colors.light.text} />
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
                  <View style={styles.modalRatingRow}>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={16} color="#FFA500" />
                      <Text style={styles.ratingBadgeText}>4.8</Text>
                    </View>
                    <Text style={styles.modalReviews}>830 reviews</Text>
                  </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  vendorCard: {
    flexDirection: "row",
    marginHorizontal: 24,
    backgroundColor: "#FFF4E6",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  vendorIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  vendorInfo: {
    flex: 1,
    justifyContent: "center",
  },
  vendorName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  vendorLocation: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: Colors.light.icon,
    marginLeft: 4,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  lastOrderCard: {
    width: 120,
    marginLeft: 24,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
  },
  lastOrderImage: {
    width: "100%",
    height: 96,
    backgroundColor: "#FFF4CC",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  foodImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  lastOrderName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  lastOrderPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    marginLeft: 24,
  },
  categoryTabActive: {
    backgroundColor: Colors.light.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.icon,
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  menuCard: {
    width: "47%",
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 12,
    margin: "1.5%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuImageContainer: {
    width: "100%",
    height: 120,
    marginBottom: 12,
  },
  menuImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FFF4CC",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
    height: 38,
  },
  menuDescription: {
    fontSize: 12,
    color: Colors.light.icon,
    marginBottom: 8,
  },
  menuFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cartButton: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: "#6B4EE6",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B4EE6",
  },
  cartButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.icon,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 16,
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
    maxHeight: "85%",
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImageContainer: {
    width: "100%",
    height: 280,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FFF4CC",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.light.icon,
    lineHeight: 24,
    marginBottom: 16,
  },
  modalRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: 4,
  },
  modalReviews: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.input,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
    marginHorizontal: 24,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.text,
  },
  addToCartButton: {
    flexDirection: "row",
    backgroundColor: "#6B4EE6",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})