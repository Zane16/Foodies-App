// app/customer/Foods.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Button,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";
import { useCart } from "../context/_CartContext";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
}

export default function Foods() {
  const { vendorId, vendorName, orgName } = useLocalSearchParams<{
    vendorId: string;
    vendorName: string;
    orgName: string;
  }>();
  const router = useRouter();
  const { cart, addToCart } = useCart();

  const [foods, setFoods] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedFood, setSelectedFood] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (vendorId) fetchFoods(vendorId as string);
  }, [vendorId]);

  const fetchFoods = async (vendorId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("menuitems")
      .select("id, name, description, price, image_url")
      .eq("vendor_id", vendorId);

    if (error) {
      console.error("Error fetching foods:", error);
      setFoods([]);
    } else {
      setFoods(data ?? []);
    }
    setLoading(false);
  };

  const openModal = (food: MenuItem) => {
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
          vendorId,
          vendorName,
          orgName,
        },
        quantity
      );
      closeModal();
    }
  };

  const renderItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : null}
      <Text style={styles.cardText}>{item.name}</Text>
      <Text style={styles.price}>₱{item.price}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{vendorName} - Menu</Text>

      {loading ? (
        <Text>Loading menu...</Text>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}

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
                {selectedFood.image_url ? (
                  <Image
                    source={{ uri: selectedFood.image_url }}
                    style={styles.modalImage}
                  />
                ) : null}
                <Text style={styles.modalTitle}>{selectedFood.name}</Text>
                <Text style={styles.modalDescription}>
                  {selectedFood.description}
                </Text>
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
  image: { width: "100%", height: 150, borderRadius: 8, marginBottom: 8 },
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
  modalImage: { width: "100%", height: 180, borderRadius: 8, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalDescription: { fontSize: 16, marginBottom: 10 },
  modalPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 10,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
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
