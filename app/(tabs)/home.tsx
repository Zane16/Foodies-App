"use client"


import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/homeStyles"

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