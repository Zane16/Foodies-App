import { Ionicons } from "@expo/vector-icons"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native"
import { supabase } from "../../supabase"
import { Colors } from "../../constants/Colors"

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  customer: {
    full_name: string
  }
}

interface VendorReviewsModalProps {
  visible: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
  averageRating?: number
  totalRatings?: number
}

export default function VendorReviewsModal({
  visible,
  onClose,
  vendorId,
  vendorName,
  averageRating = 0,
  totalRatings = 0,
}: VendorReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (visible) {
      fetchReviews()
    }
  }, [visible, vendorId])

  const fetchReviews = async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("ratings")
        .select(`
          id,
          rating,
          comment,
          created_at,
          customer:profiles!ratings_customer_id_fkey (
            full_name
          )
        `)
        .eq("rated_entity_id", vendorId)
        .eq("type", "vendor")
        .order("created_at", { ascending: false })

      if (error) throw error

      setReviews((data as any) || [])
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0 || diffDays === 1) {
      return "Today"
    } else if (diffDays === 2) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })
    }
  }

  const renderRatingDistribution = () => {
    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => r.rating === star).length
      const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0
      return { star, count, percentage }
    })

    return (
      <View style={styles.distributionContainer}>
        {distribution.map(({ star, count, percentage }) => (
          <View key={star} style={styles.distributionRow}>
            <Text style={styles.distributionStar}>{star}</Text>
            <Ionicons name="star" size={14} color="#FFB800" />
            <View style={styles.distributionBarContainer}>
              <View
                style={[
                  styles.distributionBarFill,
                  { width: `${percentage}%` },
                ]}
              />
            </View>
            <Text style={styles.distributionCount}>{count}</Text>
          </View>
        ))}
      </View>
    )
  }

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewHeaderLeft}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {((item as any).customer?.full_name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.reviewHeaderInfo}>
            <Text style={styles.reviewerName}>
              {(item as any).customer?.full_name || "Anonymous"}
            </Text>
            <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <View style={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name="star"
              size={14}
              color={star <= item.rating ? "#FFB800" : "#DDD"}
            />
          ))}
        </View>
      </View>
      {item.comment && (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      )}
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Reviews</Text>
              <Text style={styles.modalSubtitle}>{vendorName}</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Reviews Yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to review {vendorName}!
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Overall Rating Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryRatingNumber}>
                    {averageRating.toFixed(1)}
                  </Text>
                  <View style={styles.summaryStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name="star"
                        size={20}
                        color={star <= Math.round(averageRating) ? "#FFB800" : "#DDD"}
                      />
                    ))}
                  </View>
                  <Text style={styles.summaryText}>
                    Based on {totalRatings} {totalRatings === 1 ? "review" : "reviews"}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRight}>
                  {renderRatingDistribution()}
                </View>
              </View>

              {/* Reviews List */}
              <View style={styles.reviewsSection}>
                <Text style={styles.reviewsSectionTitle}>Customer Reviews</Text>
                {reviews.map((review) => (
                  <View key={review.id}>
                    {renderReview({ item: review })}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
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
    maxHeight: "90%",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: "center",
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  summaryLeft: {
    alignItems: "center",
    paddingRight: 20,
  },
  summaryRatingNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: Colors.light.text,
    marginBottom: 8,
  },
  summaryStars: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    color: Colors.light.icon,
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 16,
  },
  summaryRight: {
    flex: 1,
  },
  distributionContainer: {
    gap: 6,
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distributionStar: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.text,
    width: 12,
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  distributionBarFill: {
    height: "100%",
    backgroundColor: "#FFB800",
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.icon,
    width: 24,
    textAlign: "right",
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  reviewHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
})
