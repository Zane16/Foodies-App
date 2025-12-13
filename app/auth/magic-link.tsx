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
  ActivityIndicator,
} from "react-native"
import * as Linking from "expo-linking"
import { Colors } from "../../constants/Colors"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/loginStyles"
import MaskedView from "@react-native-masked-view/masked-view"

/**
 * Magic Link Authentication Screen
 *
 * Passwordless authentication via email.
 * Flow:
 * 1. User enters email
 * 2. System validates email domain against organizations table
 * 3. Magic link sent to email
 * 4. User clicks link in email
 * 5. Redirected to app via deep link
 * 6. Auth callback creates/updates profile
 */
export default function MagicLink() {
  const router = useRouter()
  const colors = Colors.light

  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

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

  async function handleSendMagicLink() {
    if (!email) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      // Check if email domain is registered with an organization
      const { data: orgData, error: orgError } = await supabase.rpc(
        "get_organization_by_email",
        { user_email: email }
      )

      if (orgError) {
        console.error("Organization lookup error:", orgError)
        throw new Error("Unable to validate email domain")
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

      // Send magic link
      const redirectUrl = Linking.createURL("auth/callback")

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            organization_id: organization.org_id,
          },
        },
      })

      if (error) throw error

      setEmailSent(true)
    } catch (err: any) {
      console.error("Magic link error:", err)
      Alert.alert(
        "Error",
        err.message || "Failed to send magic link. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleResendEmail() {
    setEmailSent(false)
    handleSendMagicLink()
  }

  if (emailSent) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Success Icon */}
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: "#E0F7F4",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 32,
              }}
            >
              <Ionicons name="mail-outline" size={60} color="#14B8A6" />
            </View>

            {/* Success Message */}
            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: "#1A1A1A",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Check Your Email
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#666666",
                textAlign: "center",
                lineHeight: 24,
                marginBottom: 8,
                paddingHorizontal: 24,
              }}
            >
              We've sent a magic link to
            </Text>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#14B8A6",
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              {email}
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: "#888888",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 40,
                paddingHorizontal: 32,
              }}
            >
              Click the link in the email to sign in. The link will expire in 1
              hour.
            </Text>

            {/* Actions */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: "#F3F4F6", marginBottom: 16 },
              ]}
              onPress={handleResendEmail}
            >
              <Text
                style={[styles.loginButtonText, { color: "#1A1A1A" }]}
              >
                Resend Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
              <Text
                style={{
                  fontSize: 15,
                  color: "#14B8A6",
                  fontWeight: "600",
                }}
              >
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    )
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
                  <Text style={[styles.appName, { opacity: 0 }]}>
                    Foodies
                  </Text>
                </LinearGradient>
              </MaskedView>
              <Text style={styles.tagline}>Campus Food Delivery</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginBottom: 24 }}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>

            <Text style={styles.title}>Sign In with Email</Text>
            <Text style={styles.subtitle}>
              We'll send you a magic link for a password-free sign in
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="yourname@university.domain"
                  placeholderTextColor={colors.icon}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  value={email}
                  editable={!isLoading}
                  autoFocus
                />
              </View>
              <Text style={styles.helperText}>
                Use your institutional email address
              </Text>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleSendMagicLink}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Send Magic Link</Text>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View
              style={{
                backgroundColor: "#F0F9FF",
                borderRadius: 12,
                padding: 16,
                marginTop: 24,
                borderLeftWidth: 4,
                borderLeftColor: "#14B8A6",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#14B8A6"
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#1A1A1A",
                      lineHeight: 20,
                      fontWeight: "500",
                    }}
                  >
                    Magic links are a secure, password-free way to sign in. The
                    link expires after 1 hour for security.
                  </Text>
                </View>
              </View>
            </View>

            {/* Back Link */}
            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.link}>
                  <Text style={styles.linkAccent}>← Back to Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
