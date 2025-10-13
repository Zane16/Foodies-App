import { Ionicons } from "@expo/vector-icons"
import * as Location from "expo-location"
import * as ImagePicker from "expo-image-picker"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import { useAuth } from "../context/_authContext"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/profileStyles"

interface ProfileData {
  full_name: string
  phone: string
  delivery_address: string
  delivery_notes: string
  latitude: number | null
  longitude: number | null
  profile_picture_url: string | null
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    phone: "",
    delivery_address: "",
    delivery_notes: "",
    latitude: null,
    longitude: null,
    profile_picture_url: null,
  })
  const [locationPermission, setLocationPermission] = useState<string | null>(null)
  const [fetchingLocation, setFetchingLocation] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchProfile()
    checkLocationPermission()
  }, [])

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync()
    setLocationPermission(status)
  }

  const fetchProfile = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone: data.phone || "",
          delivery_address: data.delivery_address || "",
          delivery_notes: data.delivery_notes || "",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          profile_picture_url: data.profile_picture_url || null,
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      Alert.alert("Error", "Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const handleGetLocation = async () => {
    try {
      setFetchingLocation(true)

      // Request permission if not granted
      if (locationPermission !== "granted") {
        const { status } = await Location.requestForegroundPermissionsAsync()
        setLocationPermission(status)

        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Location permission is required to use this feature. Please enable it in your device settings."
          )
          setFetchingLocation(false)
          return
        }
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      if (address && address.length > 0) {
        const addr = address[0]
        const formattedAddress = [
          addr.name,
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country,
        ]
          .filter(Boolean)
          .join(", ")

        setProfile({
          ...profile,
          delivery_address: formattedAddress,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })

        Alert.alert("Success", "Location captured successfully!")
      }
    } catch (error) {
      console.error("Error getting location:", error)
      Alert.alert("Error", "Failed to get your current location. Please try again.")
    } finally {
      setFetchingLocation(false)
    }
  }

  const handlePickImage = async () => {
    Alert.alert(
      "Profile Picture",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: () => handleTakePhoto(),
        },
        {
          text: "Choose from Library",
          onPress: () => handleChooseFromLibrary(),
        },
        { text: "Cancel", style: "cancel" },
      ]
    )
  }

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera permission is required to take photos.")
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })

    if (!result.canceled && result.assets[0]) {
      await uploadProfilePicture(result.assets[0].uri)
    }
  }

  const handleChooseFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Photo library permission is required.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })

    if (!result.canceled && result.assets[0]) {
      await uploadProfilePicture(result.assets[0].uri)
    }
  }

  const uploadProfilePicture = async (imageUri: string) => {
    if (!user?.id) return

    setUploadingImage(true)
    try {
      // Read file as base64
      const response = await fetch(imageUri)
      const blob = await response.blob()

      // Convert blob to base64 using FileReader (works in React Native)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            // Remove data:image/...;base64, prefix
            const base64String = reader.result.split(',')[1]
            resolve(base64String)
          } else {
            reject(new Error('Failed to convert image'))
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg"
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `profile-pictures/${fileName}`

      // Decode base64 to binary
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, bytes.buffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // Update profile with new picture URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_picture_url: publicUrl })
        .eq("id", user.id)

      if (updateError) throw updateError

      setProfile({ ...profile, profile_picture_url: publicUrl })
      Alert.alert("Success", "Profile picture updated successfully!")
    } catch (error: any) {
      console.error("Error uploading profile picture:", error)
      Alert.alert("Error", error.message || "Failed to upload profile picture")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return

    // Validation
    if (!profile.full_name.trim()) {
      Alert.alert("Validation Error", "Please enter your full name")
      return
    }

    if (!profile.phone.trim()) {
      Alert.alert("Validation Error", "Please enter your phone number")
      return
    }

    if (!profile.delivery_address.trim()) {
      Alert.alert("Validation Error", "Please enter your delivery address")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          delivery_address: profile.delivery_address.trim(),
          delivery_notes: profile.delivery_notes.trim(),
          latitude: profile.latitude,
          longitude: profile.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      Alert.alert("Success", "Profile updated successfully!")
    } catch (error) {
      console.error("Error saving profile:", error)
      Alert.alert("Error", "Failed to save profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut()
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A5EE8" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#4A5EE8" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account information</Text>
      </View>

      {/* White Content Area */}
      <View style={styles.whiteContent}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handlePickImage}
              disabled={uploadingImage}
            >
              {profile.profile_picture_url ? (
                <Image
                  source={{ uri: profile.profile_picture_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={40} color="#4A5EE8" />
              )}
              <View style={styles.avatarEditButton}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>
              {profile.full_name || "Customer"}
            </Text>
            <Text style={styles.userEmail}>{user?.email || ""}</Text>
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={profile.full_name}
                onChangeText={(text) =>
                  setProfile({ ...profile, full_name: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                value={profile.phone}
                onChangeText={(text) =>
                  setProfile({ ...profile, phone: text })
                }
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Delivery Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#E65100" />
              <Text style={styles.infoCardText}>
                Your delivery address will be used for all orders. You can update it anytime or use your current location.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your delivery address"
                value={profile.delivery_address}
                onChangeText={(text) =>
                  setProfile({ ...profile, delivery_address: text })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleGetLocation}
              disabled={fetchingLocation}
            >
              {fetchingLocation ? (
                <ActivityIndicator size="small" color="#4A5EE8" />
              ) : (
                <>
                  <Ionicons name="location" size={20} color="#4A5EE8" />
                  <Text style={styles.locationButtonText}>
                    Use Current Location
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {profile.latitude && profile.longitude && (
              <View style={styles.locationStatus}>
                <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                <Text style={styles.locationStatusText}>
                  GPS coordinates saved ({profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)})
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="E.g., Building name, floor number, landmarks, etc."
                value={profile.delivery_notes}
                onChangeText={(text) =>
                  setProfile({ ...profile, delivery_notes: text })
                }
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}
