"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
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
  View,
} from "react-native"
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"
import { makeRedirectUri } from "expo-auth-session"
import { Colors } from "../../constants/Colors"
import { useColorScheme } from "../../hooks/useColorScheme"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/loginStyles"
import MaskedView from "@react-native-masked-view/masked-view"
import { OAuthButton } from "../components/OAuthButton"

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession()

export default function Login() {
  const router = useRouter()
  const colors = Colors.light

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

    // Note: Expo Router handles deep links automatically
    // The foodies://auth/callback URL will automatically route to /auth/callback
    // No manual navigation needed here
  }, [])

  // OAuth Sign-In with Google
  async function handleGoogleSignIn() {
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
          Alert.alert("Cancelled", "Sign in was cancelled")
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
        "Sign In Error",
        err.message || "Failed to sign in with Google."
      )
      setIsLoading(false)
    }
  }

  // Password-based login (legacy/fallback)
  async function handlePasswordLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      if (!data.user) throw new Error("No user found.")

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()

      if (profileError) throw profileError
      if (profileData?.role !== "customer") {
        throw new Error("This app is for customers only.")
      }

      router.replace("/(tabs)/home")
    } catch (err: any) {
      Alert.alert("Login Error", err.message)
    } finally {
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* OAuth Sign-In */}
          <View style={{ marginBottom: 24 }}>
            <OAuthButton
              provider="google"
              onPress={handleGoogleSignIn}
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
                placeholder="yourname@university.domain"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                value={email}
                editable={!isLoading}
              />
            </View>
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
                placeholder="Enter your password"
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

          {/* Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handlePasswordLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => router.push("/auth/signup")}>
              <Text style={styles.link}>
                Don't have an account?{" "}
                <Text style={styles.linkAccent}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
