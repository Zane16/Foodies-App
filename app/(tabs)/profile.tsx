import { Ionicons } from "@expo/vector-icons"
import * as Location from "expo-location"
import * as ImagePicker from "expo-image-picker"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform
} from "react-native"
import { useAuth } from "../context/_authContext"
import { supabase } from "../../supabase"
import { styles } from "../../styles/screens/profileStyles"
import { Colors } from "../../constants/Colors"
import { useRouter } from "expo-router"

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
  const router = useRouter()
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
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    delivery_notes: ""
  })
  const [addressForm, setAddressForm] = useState("")

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

  const handleEditProfile = () => {
    setEditForm({
      full_name: profile.full_name,
      phone: profile.phone,
      delivery_notes: profile.delivery_notes
    })
    setShowEditModal(true)
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return

    if (!editForm.full_name.trim() || !editForm.phone.trim()) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim(),
          delivery_notes: editForm.delivery_notes.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      setProfile({
        ...profile,
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        delivery_notes: editForm.delivery_notes.trim()
      })
      setShowEditModal(false)
      Alert.alert("Success", "Profile updated successfully!")
    } catch (error) {
      console.error(error)
      Alert.alert("Error", "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleMyAddresses = () => {
    setAddressForm(profile.delivery_address)
    setShowAddressModal(true)
  }

  const handleSaveAddress = async () => {
    if (!user?.id) return

    if (!addressForm.trim()) {
      Alert.alert("Error", "Please enter an address")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          delivery_address: addressForm.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error
      setProfile({ ...profile, delivery_address: addressForm.trim() })
      setShowAddressModal(false)
      Alert.alert("Success", "Address updated successfully!")
    } catch (error) {
      console.error(error)
      Alert.alert("Error", "Failed to update address")
    } finally {
      setSaving(false)
    }
  }

  const handleUseCurrentLocation = async () => {
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

        setAddressForm(formattedAddress)

        // Also update the profile state with coordinates
        const updatedProfile = {
          ...profile,
          delivery_address: formattedAddress,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }

        // Save to database
        if (user?.id) {
          const { error } = await supabase
            .from("profiles")
            .update({
              delivery_address: formattedAddress,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id)

          if (error) throw error
          setProfile(updatedProfile)
        }

        Alert.alert("Success", "Location captured successfully!")
      }
    } catch (error) {
      console.error("Error getting location:", error)
      Alert.alert("Error", "Failed to get your current location. Please try again.")
    } finally {
      setFetchingLocation(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.light.primary} />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your account</Text>
          </View>
        </View>
      </View>

      {/* White Content Area */}
      <View style={styles.whiteContent}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header - Centered */}
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
                <Ionicons name="person" size={40} color={Colors.light.primary} />
              )}
              {uploadingImage && (
                <View style={styles.avatarEditButton}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.userName}>
              {profile.full_name || "Customer"}
            </Text>
            <Text style={styles.userEmail}>{user?.email || ""}</Text>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleMyAddresses}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="location-outline" size={24} color={Colors.light.secondary} />
              </View>
              <Text style={styles.menuText}>My addresses</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/order-history")}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="receipt-outline" size={24} color={Colors.light.secondary} />
              </View>
              <Text style={styles.menuText}>Order History</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert("Notifications", "Notification settings coming soon!")}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="notifications-outline" size={24} color={Colors.light.secondary} />
              </View>
              <Text style={styles.menuText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert("Help & Support", "Contact us at zbisona@gbox.adnu.edu.ph")}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="help-circle-outline" size={24} color={Colors.light.secondary} />
              </View>
              <Text style={styles.menuText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert("Language", "English is currently selected")}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="globe-outline" size={24} color={Colors.light.secondary} />
              </View>
              <Text style={styles.menuText}>Language</Text>
              <Text style={styles.menuValue}>English</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleSignOut}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.full_name}
                      onChangeText={(text) => setEditForm({ ...editForm, full_name: text })}
                      placeholder="Enter your full name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.phone}
                      onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                      placeholder="Enter your phone number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Delivery Notes</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editForm.delivery_notes}
                      onChangeText={(text) => setEditForm({ ...editForm, delivery_notes: text })}
                      placeholder="Any special delivery instructions..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setShowEditModal(false)}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButtonPrimary, saving && styles.buttonDisabled]}
                    onPress={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonPrimaryText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Address Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddressModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Delivery Address</Text>
                  <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Address *</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={addressForm}
                      onChangeText={setAddressForm}
                      placeholder="Enter your delivery address"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={handleUseCurrentLocation}
                    disabled={fetchingLocation}
                  >
                    <Ionicons
                      name="location"
                      size={20}
                      color={Colors.light.primary}
                    />
                    {fetchingLocation ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.light.primary}
                        style={{ marginLeft: 8 }}
                      />
                    ) : (
                      <Text style={styles.locationButtonText}>Use Current Location</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setShowAddressModal(false)}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButtonPrimary, saving && styles.buttonDisabled]}
                    onPress={handleSaveAddress}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonPrimaryText}>Save Address</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
