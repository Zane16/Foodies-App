import { Ionicons } from "@expo/vector-icons"
import React, { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native"
import { supabase } from "../../supabase"
import { Colors } from "../../constants/Colors"

interface RatingModalProps {
  visible: boolean
  onClose: () => void
  orderId: string
  customerId: string
  ratedEntityId: string
  ratedEntityName: string
  type: "vendor" | "deliverer"
  existingRating?: {
    rating: number
    comment: string | null
  }
}

export default function RatingModal({
  visible,
  onClose,
  orderId,
  customerId,
  ratedEntityId,
  ratedEntityName,
  type,
  existingRating,
}: RatingModalProps) {
  const [rating, setRating] = useState(existingRating?.rating || 0)
  const [comment, setComment] = useState(existingRating?.comment || "")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Please select a rating", "Tap on the stars to rate")
      return
    }

    setSubmitting(true)

    try {
      // Check if rating already exists
      const { data: existingData } = await supabase
        .from("ratings")
        .select("id")
        .eq("order_id", orderId)
        .eq("customer_id", customerId)
        .eq("type", type)
        .maybeSingle()

      if (existingData) {
        // Update existing rating
        const { error } = await supabase
          .from("ratings")
          .update({
            rating,
            comment: comment.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id)

        if (error) throw error

        Alert.alert(
          "Rating Updated",
          `Your rating for ${ratedEntityName} has been updated. Thank you!`
        )
      } else {
        // Insert new rating
        const { error } = await supabase.from("ratings").insert([
          {
            order_id: orderId,
            customer_id: customerId,
            rated_entity_id: ratedEntityId,
            rating,
            comment: comment.trim() || null,
            type,
          },
        ])

        if (error) throw error

        Alert.alert(
          "Thank You!",
          `Your rating for ${ratedEntityName} has been submitted.`
        )
      }

      onClose()
      setRating(0)
      setComment("")
    } catch (error: any) {
      console.error("Error submitting rating:", error)
      Alert.alert("Error", "Failed to submit rating. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      onClose()
      // Reset after a delay to avoid visual glitch
      setTimeout(() => {
        if (!existingRating) {
          setRating(0)
          setComment("")
        }
      }, 300)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Rate {type === "vendor" ? "Vendor" : "Deliverer"}</Text>
              <Text style={styles.modalSubtitle}>{ratedEntityName}</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Rating Stars */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionLabel}>How would you rate your experience?</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                    disabled={submitting}
                  >
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={48}
                      color={star <= rating ? "#FFB800" : "#CCC"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </Text>
              )}
            </View>

            {/* Comment Section */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionLabel}>
                Share your experience (Optional)
              </Text>
              <TextInput
                style={styles.commentInput}
                placeholder={`Tell us about your experience with ${ratedEntityName}...`}
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!submitting}
              />
              <Text style={styles.characterCount}>
                {comment.length}/500 characters
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {existingRating ? "Update Rating" : "Submit Rating"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeButton: {
    padding: 4,
  },
  modalTitleContainer: {
    alignItems: "center",
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFB800",
    marginTop: 8,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: Colors.light.input,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.light.text,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.light.icon,
    textAlign: "right",
    marginTop: 8,
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: Colors.light.secondary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: Colors.light.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#CCC",
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})
