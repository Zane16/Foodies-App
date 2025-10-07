import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import { Colors } from "../constants/Colors"
import { supabase } from "../supabase"

const { width } = Dimensions.get("window")

interface Vendor {
  id: string
  full_name: string | null
  vendor_name: string | null
  status: string
}

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { orgName } = useLocalSearchParams<{ orgName: string }>()
  const [loading, setLoading] = useState(true)

  const fetchVendors = async () => {
    if (!orgName) return

    setLoading(true)

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, vendor_name, status, role")
      .eq("role", "vendor")
      .eq("status", "approved")
      .eq("organization", orgName)

    if (error) {
      console.error("Error fetching vendors:", error)
      setVendors([])
      setFilteredVendors([])
    } else {
      setVendors(data || [])
      setFilteredVendors(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchVendors()
  }, [orgName])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVendors(vendors)
    } else {
      const filtered = vendors.filter((vendor) => {
        const name = (vendor.vendor_name || vendor.full_name || "").toLowerCase()
        return name.includes(searchQuery.toLowerCase())
      })
      setFilteredVendors(filtered)
    }
  }, [searchQuery, vendors])

  const goToVendorMenu = (vendor: Vendor) => {
    router.push({
      pathname: "vendor-menu",
      params: {
        vendorId: vendor.id,
        vendorName: vendor.vendor_name || vendor.full_name,
        orgName,
      },
    } as any)
  }

  const renderVendorCircle = ({ item }: { item: Vendor }) => (
    <TouchableOpacity
      style={styles.vendorCircle}
      onPress={() => goToVendorMenu(item)}
      activeOpacity={0.7}
    >
      <View style={styles.circleIcon}>
        <Ionicons name="restaurant" size={24} color={Colors.light.primary} />
      </View>
      <Text style={styles.circleName} numberOfLines={1}>
        {(item.vendor_name || item.full_name || "Vendor").split(" ")[0]}
      </Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#4A5EE8" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* White Content Area */}
      <View style={styles.whiteContent}>
        {/* Organization Banner */}
        <View style={styles.orgBanner}>
          <View style={styles.orgImageContainer}>
            <View style={styles.orgImage}>
              <Ionicons name="school" size={48} color="#4A5EE8" />
            </View>
          </View>
          <Text style={styles.orgName}>{orgName}</Text>
        </View>

        {/* Vendors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendors</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
          ) : filteredVendors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No vendors available</Text>
            </View>
          ) : (
            <FlatList
              data={filteredVendors}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vendorList}
              renderItem={renderVendorCircle}
            />
          )}
        </View>

        {/* Popular Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular</Text>
          <Text style={styles.sectionSubtitle}>Select a vendor above to see their menu</Text>
          
          <View style={styles.popularGrid}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.popularCard}>
                <View style={styles.popularImagePlaceholder}>
                  <Ionicons name="fast-food" size={32} color="#E0E0E0" />
                </View>
                <Text style={styles.popularTitle}>Popular Item {i}</Text>
                <Text style={styles.popularSubtitle}>Available when you select a vendor</Text>
                <Text style={styles.popularPrice}>₱0.00</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Special offers available!</Text>
            <Text style={styles.promoSubtitle}>Select a vendor to see exclusive deals</Text>
          </View>
          <View style={styles.promoImage}>
            <Ionicons name="gift" size={32} color="#4A5EE8" />
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4A5EE8",
  },
  blueHeader: {
    backgroundColor: "#4A5EE8",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 45,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  whiteContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 24,
  },
  orgBanner: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  orgImageContainer: {
    marginBottom: 12,
  },
  orgImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F5F7FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#4A5EE8",
  },
  orgName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  vendorList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  vendorCircle: {
    alignItems: "center",
    marginRight: 20,
    width: 70,
  },
  circleIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F5F7FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#E8EBFF",
  },
  circleName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  popularGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  popularCard: {
    width: (width - 52) / 3,
    marginBottom: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
  },
  popularImagePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  popularTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    marginBottom: 2,
  },
  popularSubtitle: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  popularPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A5EE8",
  },
  promoBanner: {
    marginHorizontal: 20,
    backgroundColor: "#E8F0FF",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  promoImage: {
    width: 60,
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
})