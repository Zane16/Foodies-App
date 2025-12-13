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
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"
import { Colors } from "../../constants/Colors"
import { useColorScheme } from "../../hooks/useColorScheme"
import { supabase } from "../../supabase";
import { styles } from "../../styles/screens/loginStyles";
import MaskedView from "@react-native-masked-view/masked-view";
import { OAuthButton } from "../components/OAuthButton"

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession()

export default function Signup() {
  const router = useRouter();
  const colors = Colors.light
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

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

  // OAuth Sign-Up with Google
  async function handleGoogleSignUp() {
    try {
      const redirectUrl = Linking.createURL("auth/callback")

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== "web",
        },
      })

      if (error) throw error

      // Open browser for OAuth on mobile
      if (Platform.OS !== "web" && data?.url) {
        await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
      }
    } catch (err: any) {
      console.error("OAuth Error:", err)
      Alert.alert("Sign Up Error", err.message || "Failed to sign up with Google")
    }
  }

  // Password-based signup (legacy/fallback)
  async function handlePasswordSignup() {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
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
      // Detect organization from email domain
      const { data: orgData, error: orgError } = await supabase.rpc(
        "get_organization_by_email",
        { user_email: email }
      )

      if (orgError) {
        console.error("Organization lookup error:", orgError)
      }

      if (!orgData || orgData.length === 0) {
        const domain = email.split("@")[1]
        Alert.alert(
          "Email Not Registered",
          `The email domain @${domain} is not registered with any organization. Please use your institutional email address.`,
          [{ text: "OK" }]
        )
        setIsLoading(false)
        return
      }

      const organization = orgData[0]

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "customer" } },
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
          organization: organization.org_name, // Keep old field for compatibility
          organization_id: organization.org_id, // New multi-tenant field
          auth_provider: "password",
          email_verified: false,
          status: "approved" // Auto-approve customers
        }
      ]);

      if (profileError) throw profileError;

      Alert.alert(
        "Success",
        "Account created successfully! Please check your email to verify your account.",
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
