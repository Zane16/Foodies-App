import React, { useEffect, useRef, useState } from "react"
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { supabase } from "../../supabase"
import * as Linking from "expo-linking"

export default function AuthCallback() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [status, setStatus] = useState("Processing authentication...")
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const run = async () => {
      console.log("=== Auth Callback Started ===")
      console.log("URL params:", params)

      // Prefer params first (Expo Router already parsed the URL for us)
      let url: string | null = null
      if (params.code) {
        url = `foodies://auth/callback?code=${params.code}`
        console.log("Constructed URL from params:", url)
      } else {
        // Fallback to getting the full URL
        url = await Linking.getInitialURL()
        console.log("Initial URL:", url)
      }

      // Check if we have a code - if so, trigger the exchange and listen for auth state change
      if (url && url.includes('code=')) {
        console.log("Setting up auth state listener...")

        let sessionHandled = false

        // Set up listener for auth state change BEFORE triggering the exchange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("Callback screen - Auth event:", event)

          if (event === 'SIGNED_IN' && session?.user && !sessionHandled) {
            sessionHandled = true
            console.log("Session detected via listener!")
            subscription.unsubscribe()
            await completeAuthFlow(session)
          }
        })

        // Now trigger the exchange (it will hang, but the listener will catch the session)
        handleAuthCallback(url)

        // Safety timeout - if no session after 15 seconds, show error
        setTimeout(() => {
          if (!sessionHandled) {
            console.error("Timeout waiting for session")
            subscription.unsubscribe()
            Alert.alert(
              "Authentication Timeout",
              "The login process took too long. Please try again.",
              [{ text: "OK", onPress: () => router.replace("/auth/login") }]
            )
          }
        }, 15000)
      } else {
        handleAuthCallback(url)
      }
    }

    run()
  }, [])

  const handleAuthCallback = (url: string | null) => {
    // Don't await this - just trigger the exchange
    // The auth state listener will handle the session when it's created
    if (url && url.includes('code=')) {
      console.log("Detected OAuth callback with code parameter")

      // Extract the authorization code from the URL
      const urlObj = new URL(url)
      const code = urlObj.searchParams.get('code')

      if (!code) {
        console.error("No authorization code found in callback URL")
        Alert.alert(
          "Authentication Error",
          "No authorization code found",
          [{ text: "OK", onPress: () => router.replace("/auth/login") }]
        )
        return
      }

      console.log("Triggering code exchange...")
      console.log("Authorization code:", code)

      // Trigger the exchange (don't await - the listener will catch the result)
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error("Code exchange error:", error)
        } else {
          console.log("Code exchange completed successfully")
        }
      }).catch((err) => {
        console.error("Code exchange failed:", err)
      })
    } else {
      console.error("Invalid callback URL - missing authorization code")
      Alert.alert(
        "Authentication Error",
        "Invalid callback URL",
        [{ text: "OK", onPress: () => router.replace("/auth/login") }]
      )
    }
  }

  const completeAuthFlow = async (session: any) => {
    const user = session.user
    const userEmail = user.email

    console.log("=== OAuth Complete Auth Flow ===")
    console.log("User ID:", user.id)
    console.log("User Email:", userEmail)

    if (!userEmail) {
      throw new Error("Email not found in session")
    }

    setStatus("Checking your profile...")

    // Test basic fetch first
    console.log("DEBUG: Testing basic fetch...")
    try {
      const testResponse = await fetch('https://httpbin.org/get')
      const testJson = await testResponse.json()
      console.log("DEBUG: Basic fetch works! Status:", testResponse.status)
    } catch (fetchErr) {
      console.error("DEBUG: Basic fetch FAILED:", fetchErr)
    }

    console.log("DEBUG: About to query profiles table")
    console.log("DEBUG: Query params - user.id:", user.id)
    console.log("DEBUG: Supabase URL:", 'https://qjvamxyspqexibdsavkc.supabase.co')

    // Check if profile exists
    let existingProfile, fetchError
    try {
      console.log("DEBUG: Executing query...")
      const result = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      console.log("DEBUG: Query completed!")
      console.log("DEBUG: Result:", JSON.stringify(result, null, 2))

      existingProfile = result.data
      fetchError = result.error
    } catch (queryError) {
      console.error("DEBUG: Query threw exception:", queryError)
      throw queryError
    }

    console.log("Existing profile:", existingProfile ? "Found" : "Not found")
    if (fetchError) {
      console.error("Fetch profile error:", fetchError)
      throw fetchError
    }

    if (existingProfile) {
      // Returning user - just update last login
      console.log("Returning user - updating last login")

      if (existingProfile.role !== "customer") {
        throw new Error("This app is for customers only. Please use the appropriate app for your role.")
      }

      const { error } = await supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id)

      if (error) {
        console.error("Update last_login_at error:", error)
        // Don't throw - not critical
      }
    } else {
      // First-time user - try to detect organization from email domain
      console.log("First-time user - detecting organization from email domain")
      setStatus("Detecting your organization...")

      const emailDomain = userEmail.split("@")[1].toLowerCase()
      console.log("Looking up organization for domain:", emailDomain)

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("status", "active")
        .contains("email_domains", [emailDomain])
        .limit(1)

      const organization = orgData && orgData.length > 0 ? orgData[0] : null
      console.log("Organization:", organization ? organization.name : "not found - will ask user to select")

      if (organization) {
        // Organization found by email domain - create profile automatically
        setStatus("Creating your profile...")

        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          userEmail.split("@")[0]

        const { error: insertError } = await supabase.from("profiles").insert([{
          id: user.id,
          email: userEmail,
          full_name: fullName,
          role: "customer",
          organization_id: organization?.id || null,
          organization: organization?.name || "global",
          auth_provider: getAuthProvider(user),
          email_verified: true,
          status: "approved",
          last_login_at: new Date().toISOString(),
        }])

        if (insertError) {
          console.error("Insert profile error:", insertError)
          throw insertError
        }
        console.log("Profile created successfully")

        setStatus("Success! Redirecting...")
        console.log("Navigating to home screen")

        setTimeout(() => {
          router.replace("/(tabs)/home")
        }, 500)
      } else {
        // No organization found - redirect to selection screen
        console.log("No organization found by email domain - redirecting to select-organization screen")
        setStatus("Redirecting to organization selection...")

        setTimeout(() => {
          router.replace("/auth/select-organization")
        }, 500)
      }
    }
  }

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
