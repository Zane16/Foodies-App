"use client"


import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { supabase } from "../../supabase"

const { width } = Dimensions.get("window")

export default function OrganizationSelection() {
  const router = useRouter()

  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("profiles")
      .select("organization")
      .eq("role", "admin")
      .not("organization", "is", null)
      .neq("organization", "")

    if (error) {
      console.error("Error fetching organizations:", error)
      setLoading(false)
      return
    }

    const uniqueOrgs = Array.from(
      new Set(data.map((item) => item.organization.trim()))
    ).map((name, index) => ({
      id: index.toString(),
      name,
      icon: "school" as const,
    }))

    setOrganizations(uniqueOrgs)
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
      <StatusBar barStyle="dark-content" backgroundColor="#4A5EE8" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Foodies</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
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
        <FlatList
          data={filteredOrgs} 
          renderItem={() => null} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <>
              {/* Hero Banner */}
              <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Visit the famous burger</Text>
            <Text style={styles.heroSubtitle}>in Ateneo de Naga</Text>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroImage}>
            <Ionicons name="fast-food" size={80} color="#FFB800" />
          </View>
        </View>

        {/* Organizations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Organizations</Text>
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A5EE8" />
            </View>
          ) : filteredOrgs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No organizations found</Text>
            </View>
          ) : (
            <View style={styles.orgGrid}>
              {filteredOrgs.map((org) => (
                <TouchableOpacity
                  key={org.id}
                  style={styles.orgCard}
                  onPress={() => handlePress(org)}
                  activeOpacity={0.7}
                >
                  <View style={styles.orgIconContainer}>
                    <View style={styles.orgIcon}>
                      <Ionicons name={org.icon} size={32} color="#4A5EE8" />
                    </View>
                  </View>
                  <Text style={styles.orgName} numberOfLines={2}>
                    {org.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Go to Xavier Hall. Special</Text>
            <Text style={styles.promoSubtitle}>offers are available due</Text>
            <Text style={styles.promoSubtitle}>to events</Text>
          </View>
          <View style={styles.promoImageContainer}>
            <Ionicons name="gift" size={40} color="#4A5EE8" />
          </View>
        </View>
            </>
          }
        />
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
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
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
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  heroBanner: {
    marginHorizontal: 20,
    backgroundColor: "#FFF4CC",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    minHeight: 140,
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  viewButton: {
    backgroundColor: "#FFB800",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  heroImage: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  orgGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 16,
  },
  orgCard: {
    width: (width - 56) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orgIconContainer: {
    marginBottom: 12,
  },
  orgIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F7FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E8EBFF",
  },
  orgName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    lineHeight: 18,
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
    marginBottom: 2,
  },
  promoSubtitle: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  promoImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
})