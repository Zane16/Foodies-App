"use client"

import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Colors } from "../../constants/Colors"
import { useColorScheme } from "../../hooks/useColorScheme"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/loginStyles"

export default function Login() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin() {
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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="restaurant" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Foodies</Text>
          <Text style={[styles.tagline, { color: colors.icon }]}>
            Delicious food, delivered fast
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>Sign in to your account</Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your email"
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
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
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
              { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 },
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={[styles.loginButtonText, { color: colors.text }]}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => router.push("/auth/signup")}>
              <Text style={[styles.link, { color: colors.icon }]}>
                Don’t have an account?{" "}
                <Text style={[styles.linkAccent, { color: colors.primary }]}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
