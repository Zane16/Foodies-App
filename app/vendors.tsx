import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import { Colors } from "../constants/Colors"
import { supabase } from "../supabase"
import { styles } from "../styles/screens/vendorsStyles"

interface VendorProfile {
  full_name: string | null
  status: string
  organization: string
  profile_picture_url: string | null
}

interface VendorFromDB {
  id: string
  business_name: string
  business_address: string | null
  profiles: VendorProfile
}

interface Vendor {
  id: string
  business_name: string
  business_address: string | null
  profiles: VendorProfile | null
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

    console.log("🔍 Fetching vendors for organization:", orgName)

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
      .eq("profiles.status", "approved")
      .eq("profiles.organization", orgName)
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
      setFilteredVendors([])
    } else {
      // Transform the data - profiles comes back as an object (not array) from the join
      const transformedVendors: Vendor[] = (data as any[] || []).map(vendor => ({
        ...vendor,
        profiles: vendor.profiles || null
      }))

      // IMPORTANT: Filter by organization in JavaScript since Supabase join filtering doesn't work reliably
      const orgFilteredVendors = transformedVendors.filter(vendor => {
        const vendorOrg = vendor.profiles?.organization
        const matches = vendorOrg === orgName

        if (!matches) {
          console.log(`⚠️ Filtered out ${vendor.business_name} - org mismatch (vendor: "${vendorOrg}", expected: "${orgName}")`)
        }

        return matches
      })

      console.log(`✅ After filtering: ${orgFilteredVendors.length} vendors for ${orgName}`)

      setVendors(orgFilteredVendors)
      setFilteredVendors(orgFilteredVendors)
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
        const name = (vendor.business_name || vendor.profiles?.full_name || "").toLowerCase()
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
        vendorName: vendor.business_name,
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
        {item.profiles?.profile_picture_url ? (
          <Image
            source={{ uri: item.profiles.profile_picture_url }}
            style={styles.circleImage}
          />
        ) : (
          <Ionicons name="restaurant" size={24} color={Colors.light.primary} />
        )}
      </View>
      <Text style={styles.circleName} numberOfLines={1}>
        {(item.business_name || "Vendor").split(" ")[0]}
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