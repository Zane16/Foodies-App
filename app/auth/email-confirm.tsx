import React, { useEffect, useState } from "react"
import { View, Text, ActivityIndicator, StyleSheet } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { supabase } from "../../supabase"

export default function EmailConfirm() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [status, setStatus] = useState("Confirming your email...")

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get token from URL params
        const token = params.token || params.token_hash

        if (!token) {
          setStatus("Invalid confirmation link")
          setTimeout(() => router.replace("/auth/login"), 2000)
          return
        }

        console.log("Confirming email with token...")

        // Verify the email using the token
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token as string,
          type: 'email',
        })

        if (error) {
          console.error("Email confirmation error:", error)
          setStatus("Confirmation failed. Please try again.")
          setTimeout(() => router.replace("/auth/login"), 3000)
          return
        }

        setStatus("Email confirmed! Redirecting...")
        setTimeout(() => router.replace("/auth/login"), 1500)
      } catch (err: any) {
        console.error("Confirmation error:", err)
        setStatus("An error occurred")
        setTimeout(() => router.replace("/auth/login"), 2000)
      }
    }

    confirmEmail()
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#14B8A6" />
      <Text style={styles.statusText}>{status}</Text>
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
})
