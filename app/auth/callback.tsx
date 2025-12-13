import React, { useEffect, useState } from "react"
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import * as Linking from "expo-linking"
import { supabase } from "../../supabase"

/**
 * Auth Callback Screen
 *
 * Handles OAuth and Magic Link authentication callbacks.
 * This screen processes the redirect from:
 * - Google OAuth
 * - Microsoft OAuth (future)
 * - Magic Link emails
 *
 * Flow:
 * 1. Extract session from URL parameters
 * 2. Validate user email domain
 * 3. Detect organization from email
 * 4. Create/update user profile with organization_id
 * 5. Redirect to home screen
 */
export default function AuthCallback() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [status, setStatus] = useState<string>("Processing authentication...")

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      setStatus("Validating credentials...")

      // Get the current URL to extract session tokens
      const url = await Linking.getInitialURL()

      if (!url) {
        throw new Error("No callback URL found")
      }

      // Parse the URL to extract session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (!session || !session.user) {
        throw new Error("No session found. Please try logging in again.")
      }

      const user = session.user
      const userEmail = user.email

      if (!userEmail) {
        throw new Error("Email not found in user session")
      }

      setStatus("Detecting your organization...")

      // Detect organization from email domain
      const { data: orgData, error: orgError } = await supabase.rpc(
        "get_organization_by_email",
        { user_email: userEmail }
      )

      if (orgError) {
        console.error("Organization lookup error:", orgError)
        throw new Error("Unable to detect organization from email domain")
      }

      if (!orgData || orgData.length === 0) {
        const domain = userEmail.split("@")[1]
        throw new Error(
          `Email domain @${domain} is not registered with any organization. Please use your institutional email address.`
        )
      }

      const organization = orgData[0]

      setStatus("Setting up your profile...")

      // Check if profile already exists
      const { data: existingProfile, error: profileCheckError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

      if (profileCheckError) {
        console.error("Profile check error:", profileCheckError)
      }

      if (existingProfile) {
        // Update existing profile with organization_id and auth provider
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            organization_id: organization.org_id,
            auth_provider: getAuthProvider(user),
            email_verified: true,
            last_login_at: new Date().toISOString(),
          })
          .eq("id", user.id)

        if (updateError) {
          console.error("Profile update error:", updateError)
          throw new Error("Failed to update profile")
        }
      } else {
        // Create new profile for first-time OAuth users
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          userEmail.split("@")[0]

        const { error: insertError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              email: userEmail,
              full_name: fullName,
              role: "customer",
              organization_id: organization.org_id,
              auth_provider: getAuthProvider(user),
              email_verified: true,
              last_login_at: new Date().toISOString(),
            },
          ])

        if (insertError) {
          console.error("Profile creation error:", insertError)
          throw new Error("Failed to create profile")
        }
      }

      setStatus("Success! Redirecting...")

      // Small delay for better UX
      setTimeout(() => {
        router.replace("/(tabs)/home")
      }, 500)
    } catch (error: any) {
      console.error("Auth callback error:", error)
      Alert.alert(
        "Authentication Error",
        error.message || "An error occurred during authentication",
        [
          {
            text: "Try Again",
            onPress: () => router.replace("/auth/login"),
          },
        ]
      )
    }
  }

  /**
   * Detect which OAuth provider was used based on user metadata
   */
  const getAuthProvider = (user: any): string => {
    const provider = user.app_metadata?.provider

    if (provider === "google") return "google"
    if (provider === "microsoft") return "microsoft"
    if (provider === "email") return "magic_link"

    return "password"
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#14B8A6" />
      <Text style={styles.statusText}>{status}</Text>
      <Text style={styles.subText}>Please wait...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    padding: 24,
  },
  statusText: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
})
