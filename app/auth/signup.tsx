import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Picker } from "@react-native-picker/picker"
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"
import { makeRedirectUri } from "expo-auth-session"
import { Colors } from "../../constants/Colors"
import { useColorScheme } from "../../hooks/useColorScheme"
import { supabase } from "../../supabase";
import { styles } from "../../styles/screens/loginStyles";
import MaskedView from "@react-native-masked-view/masked-view";
import { OAuthButton } from "../components/OAuthButton"

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession()

interface Organization {
  id: string;
  name: string;
  slug: string;
  email_domains: string[];
  logo_url?: string;
  primary_color?: string;
}

export default function Signup() {
  const router = useRouter();
  const colors = Colors.light
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    // Fetch organizations on component mount
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
          // Auto-select first organization if available
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

    // Note: Expo Router handles deep links automatically
    // The foodies://auth/callback URL will automatically route to /auth/callback
    // No manual navigation needed here
  }, [])

  // OAuth Sign-Up with Google
  async function handleGoogleSignUp() {
    try {
      setIsLoading(true)

      // Use the scheme from app.json (foodies://) for consistency
      // This works for both development builds and production
      const redirectUrl = "foodies://auth/callback"

      console.log("OAuth Redirect URL:", redirectUrl)
      console.log("Add this URL to Supabase Authentication > URL Configuration > Redirect URLs")

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error

      // Open browser for OAuth on mobile
      if (data?.url) {
        console.log("Opening OAuth URL...")

        // Open the browser - the deep link will redirect to callback screen
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        )

        console.log("OAuth Browser Result:", result)

        // The callback screen will handle the code exchange
        // We just need to handle cancellation here
        if (result.type === 'cancel') {
          Alert.alert("Cancelled", "Sign up was cancelled")
          setIsLoading(false)
        } else if (result.type === 'dismiss') {
          console.log("Browser dismissed - user may have been redirected to callback screen")
          // Don't show error - the callback screen is handling it
          setIsLoading(false)
        } else if (result.type === 'success') {
          console.log("Browser closed - callback screen should be handling authentication")
          // The callback screen will handle everything
          setIsLoading(false)
        }
      }
    } catch (err: any) {
      console.error("OAuth Error:", err)
      Alert.alert(
        "Sign Up Error",
        err.message || "Failed to sign up with Google."
      )
      setIsLoading(false)
    }
  }

  // Password-based signup (legacy/fallback)
  async function handlePasswordSignup() {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!selectedOrganizationId) {
      Alert.alert("Error", "Please select an organization");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      // Get the selected organization
      const selectedOrg = organizations.find(org => org.id === selectedOrganizationId)
      
      const organization = selectedOrg ? {
        org_id: selectedOrg.id,
        org_name: selectedOrg.name,
        org_slug: selectedOrg.slug,
        org_email_domains: selectedOrg.email_domains,
        org_logo_url: selectedOrg.logo_url,
        org_primary_color: selectedOrg.primary_color
      } : null

      console.log("Selected organization:", organization)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: "customer" },
          emailRedirectTo: 'foodies://auth/email-confirm',
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from signup.");

      // Insert into profiles table with organization_id
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user.id,
          role: "customer",
          email: email,
          full_name: email.split("@")[0],
          organization: organization?.org_name || 'global', // Keep old field for compatibility
          organization_id: organization?.org_id || null, // New multi-tenant field
          auth_provider: "password",
          email_verified: false,
          status: "approved" // Auto-approve customers
        }
      ]);

      if (profileError) throw profileError;

      Alert.alert(
        "Success",
        "Account created! Please check your email to confirm your account, then you can log in.",
        [
          {
            text: "OK",
            onPress: () => router.push("/auth/login")
          }
        ]
      );

    } catch (error: any) {
      Alert.alert("Signup Error", error.message);
    } finally {
      setIsLoading(false);
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
              maskElement={
                <Text style={styles.appName}>Foodies</Text>
              }
            >
              <LinearGradient
                colors={['#2DD4BF', '#14B8A6', '#0D9488']}
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          {/* OAuth Sign-Up */}
          <View style={{ marginBottom: 24 }}>
            <OAuthButton
              provider="google"
              onPress={handleGoogleSignUp}
              loading={isLoading}
              disabled={isLoading}
            />
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="yourname@school.domain"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                value={email}
                editable={!isLoading}
              />
            </View>
            <Text style={styles.helperText}>
              Use your institutional email address
            </Text>
          </View>

          {/* Organization Selection */}
          {loadingOrganizations ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Organization</Text>
              <View style={[styles.inputWrapper, { justifyContent: "center" }]}>
                <Text style={{ color: colors.icon }}>Loading organizations...</Text>
              </View>
            </View>
          ) : organizations.length > 0 ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Organization</Text>
              <View style={[styles.inputWrapper, { paddingHorizontal: 0, overflow: "hidden" }]}>
                <Ionicons 
                  name="business-outline" 
                  size={20} 
                  color={colors.icon} 
                  style={[styles.inputIcon, { marginLeft: 16 }]} 
                />
                <Picker
                  selectedValue={selectedOrganizationId}
                  onValueChange={(itemValue) => setSelectedOrganizationId(itemValue)}
                  style={{ 
                    flex: 1, 
                    color: "#1A1A1A",
                    marginRight: 16
                  }}
                  enabled={!isLoading}
                >
                  <Picker.Item label="Select an organization..." value={null} />
                  {organizations.map((org) => (
                    <Picker.Item key={org.id} label={org.name} value={org.id} />
                  ))}
                </Picker>
              </View>
              <Text style={styles.helperText}>
                Choose which organization you belong to
              </Text>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Organization</Text>
              <View style={[styles.inputWrapper, { justifyContent: "center" }]}>
                <Text style={{ color: "#FF6B6B" }}>No organizations available</Text>
              </View>
            </View>
          )}

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.icon}
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                value={password}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.icon}
                secureTextEntry={!showConfirmPassword}
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handlePasswordSignup}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Text>
          </TouchableOpacity>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => router.push("/auth/login")}>
              <Text style={styles.link}>
                Already have an account?{" "}
                <Text style={styles.linkAccent}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
