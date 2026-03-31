import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import { Colors } from "../../constants/Colors"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/loginStyles"
import MaskedView from "@react-native-masked-view/masked-view"

interface Organization {
  id: string
  name: string
  slug: string
  email_domains: string[]
  logo_url?: string
  primary_color?: string
}

export default function SelectOrganization() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const colors = Colors.light

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingOrganizations, setLoadingOrganizations] = useState(true)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    // Fetch organizations
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("id, name, slug, email_domains, logo_url, primary_color")
          .eq("status", "active")
          .order("name", { ascending: true })

        if (error) {
          console.error("Error fetching organizations:", error)
          Alert.alert("Error", "Failed to load organizations")
        } else {
          setOrganizations(data || [])
          if (data && data.length > 0) {
            setSelectedOrganizationId(data[0].id)
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching organizations:", err)
      } finally {
        setLoadingOrganizations(false)
      }
    }

    fetchOrganizations()
  }, [])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleContinue = async () => {
    if (!selectedOrganizationId) {
      Alert.alert("Error", "Please select an organization")
      return
    }

    setIsLoading(true)
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        throw new Error("No active session found")
      }

      const user = session.user

      // Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (fetchError) throw fetchError

      // Get organization details
      const selectedOrg = organizations.find(org => org.id === selectedOrganizationId)

      if (!selectedOrg) {
        throw new Error("Selected organization not found")
      }

      if (existingProfile) {
        // Update existing profile with organization
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            organization_id: selectedOrganizationId,
            organization: selectedOrg.name,
          })
          .eq("id", user.id)

        if (updateError) throw updateError
      } else {
        // Create new profile with selected organization
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Customer"

        const { error: insertError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            email: user.email,
            full_name: fullName,
            role: "customer",
            organization_id: selectedOrganizationId,
            organization: selectedOrg.name,
            auth_provider: user.app_metadata?.provider === "google" ? "google" : "password",
            email_verified: true,
            status: "approved",
            last_login_at: new Date().toISOString(),
          },
        ])

        if (insertError) throw insertError
      }

      Alert.alert("Success", "Organization selected! Redirecting...", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)/home"),
        },
      ])
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to select organization")
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
              />
              <MaskedView
                maskElement={<Text style={styles.appName}>Foodies</Text>}
              >
                <LinearGradient
                  colors={["#2DD4BF", "#14B8A6", "#0D9488"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ height: 44 }}
                >
                  <Text style={[styles.appName, { opacity: 0 }]}>Foodies</Text>
                </LinearGradient>
              </MaskedView>
              <Text style={styles.tagline}>Campus Food Delivery</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>Select Organization</Text>
            <Text style={styles.subtitle}>
              Choose which organization you belong to
            </Text>

            {/* Organization Selection */}
            {loadingOrganizations ? (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Organization</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { justifyContent: "center" },
                  ]}
                >
                  <Text style={{ color: colors.icon }}>
                    Loading organizations...
                  </Text>
                </View>
              </View>
            ) : organizations.length > 0 ? (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Organization</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { paddingHorizontal: 0, overflow: "hidden" },
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={colors.icon}
                    style={[styles.inputIcon, { marginLeft: 16 }]}
                  />
                  <Picker
                    selectedValue={selectedOrganizationId}
                    onValueChange={(itemValue) =>
                      setSelectedOrganizationId(itemValue)
                    }
                    style={{
                      flex: 1,
                      color: "#1A1A1A",
                      marginRight: 16,
                    }}
                    enabled={!isLoading}
                  >
                    <Picker.Item label="Select an organization..." value={null} />
                    {organizations.map((org) => (
                      <Picker.Item
                        key={org.id}
                        label={org.name}
                        value={org.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Organization</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { justifyContent: "center" },
                  ]}
                >
                  <Text style={{ color: "#FF6B6B" }}>
                    No organizations available
                  </Text>
                </View>
              </View>
            )}

            {/* Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (isLoading || organizations.length === 0) &&
                  styles.loginButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={isLoading || organizations.length === 0}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "Confirming..." : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
