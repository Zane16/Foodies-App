import React from "react"
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"

export interface OAuthButtonProps {
  provider: "google" | "microsoft"
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  style?: any
}

export function OAuthButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  style,
}: OAuthButtonProps) {
  // Provider-specific configurations
  const config = {
    google: {
      label: "Continue with Google",
      icon: "logo-google" as const,
      backgroundColor: "#FFFFFF",
      textColor: "#1F2937",
      borderColor: "#E5E7EB",
    },
    microsoft: {
      label: "Continue with Microsoft",
      icon: "logo-microsoft" as const,
      backgroundColor: "#FFFFFF",
      textColor: "#1F2937",
      borderColor: "#E5E7EB",
    },
  }

  const providerConfig = config[provider]

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: providerConfig.backgroundColor,
          borderColor: providerConfig.borderColor,
        },
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={providerConfig.textColor} size="small" />
      ) : (
        <>
          <View style={styles.iconContainer}>
            <Ionicons
              name={providerConfig.icon}
              size={20}
              color={providerConfig.textColor}
            />
          </View>
          <Text
            style={[
              styles.buttonText,
              { color: providerConfig.textColor },
            ]}
          >
            {providerConfig.label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
})

// Add default export for Expo Router
export default OAuthButton
