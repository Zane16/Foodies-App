  import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Button, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCart } from "./context/_CartContext";

  // Hardcoded foods by vendor with description
  const foodsByVendor: Record<string, any[]> = {
    "550e8400-e29b-41d4-a716-446655440001": [
      { id: "1", name: "Big Mac", price: 150, description: "Juicy beef burger with cheese." },
      { id: "2", name: "Fries", price: 60, description: "Crispy golden french fries." },
    ],
    "550e8400-e29b-41d4-a716-446655440002": [
      { id: "3", name: "Chickenjoy", price: 120, description: "Crispy fried chicken." },
      { id: "4", name: "Jolly Spaghetti", price: 70, description: "Sweet-style spaghetti with meat sauce." },
    ],
    // Add other vendors similarly...
  };

  export default function Foods() {
    const { vendorId, vendorName, orgName } = useLocalSearchParams();
    const router = useRouter();
    const { cart, addToCart } = useCart();

    const foods = foodsByVendor[vendorId as string] || [];

    // Modal state
    const [selectedFood, setSelectedFood] = useState<any | null>(null);
    const [quantity, setQuantity] = useState(1);

    const openModal = (food: any) => {
      setSelectedFood(food);
      setQuantity(1);
    };

    const closeModal = () => {
      setSelectedFood(null);
    };

    const handleAddToCart = () => {
      if (selectedFood) {
        addToCart(
          {
            ...selectedFood,
            vendorId,   // ✅ make sure vendorId is included
            vendorName,
            orgName,
          },
          quantity // ✅ pass as second argument
        );
        closeModal();
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{vendorName} - Menu</Text>

        <FlatList
          data={foods}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
              <View>
                <Text style={styles.cardText}>{item.name}</Text>
                <Text style={styles.price}>₱{item.price}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* Floating Cart Button */}
        {cart.length > 0 && (
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push("/cart")}
          >
            <Text style={styles.cartButtonText}>
              View Your Order ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </Text>
          </TouchableOpacity>
        )}

        {/* Food Detail Modal */}
        <Modal visible={!!selectedFood} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedFood && (
                <>
                  <Text style={styles.modalTitle}>{selectedFood.name}</Text>
                  <Text style={styles.modalDescription}>{selectedFood.description}</Text>
                  <Text style={styles.modalPrice}>₱{selectedFood.price}</Text>

                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(quantity + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Button title="Add to Cart" onPress={handleAddToCart} />
                  <Button title="Cancel" onPress={closeModal} color="#999" />
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", padding: 20 },
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
    card: {
      backgroundColor: "#f5f5f5",
      padding: 20,
      borderRadius: 12,
      marginBottom: 15,
    },
    cardText: { fontSize: 18, fontWeight: "600" },
    price: { fontSize: 16, fontWeight: "bold", color: "#4CAF50" },
    cartButton: {
      position: "absolute",
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: "#4CAF50",
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
    },
    cartButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
    modalDescription: { fontSize: 16, marginBottom: 10 },
    modalPrice: { fontSize: 16, fontWeight: "bold", color: "#4CAF50", marginBottom: 10 },
    quantityContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
    quantityButton: {
      borderWidth: 1,
      borderColor: "#ccc",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 5,
    },
    quantityButtonText: { fontSize: 18, fontWeight: "bold" },
    quantityText: { fontSize: 16, fontWeight: "600", marginHorizontal: 10 },
  });
