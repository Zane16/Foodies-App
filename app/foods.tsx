import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCart } from "./context/CartContext";

// Hardcoded foods by vendor
const foodsByVendor: Record<string, any[]> = {
  "1": [
    { id: "1", name: "Big Mac", price: 150 },
    { id: "2", name: "Fries", price: 60 },
  ],
  "2": [
    { id: "3", name: "Chickenjoy", price: 120 },
    { id: "4", name: "Jolly Spaghetti", price: 70 },
  ],
  "3": [
    { id: "5", name: "Lauriat", price: 160 },
    { id: "6", name: "Siopao", price: 50 },
  ],
  "4": [
    { id: "7", name: "Pecho Meal", price: 130 },
    { id: "8", name: "Halo-Halo", price: 65 },
  ],
  "5": [
    { id: "9", name: "Overload Pizza", price: 250 },
    { id: "10", name: "Lasagna", price: 120 },
  ],
  "6": [
    { id: "11", name: "Zinger", price: 150 },
    { id: "12", name: "Bucket of Chicken", price: 499 },
  ],
};

export default function Foods() {
  const { vendorId, vendorName, orgName } = useLocalSearchParams();
  const { cart, addToCart } = useCart();

  const foods = foodsByVendor[vendorId as string] || [];

  // Find current quantity in cart for this item
  const getQuantity = (id: string) => {
    const item = cart.find((i) => i.id === id);
    return item ? item.quantity : 0;
  };

  const handlePress = (food: any) => {
    // Add to cart (CartContext handles quantity)
    addToCart({
      ...food,
      vendorName,
      orgName,
    });
    alert(`${food.name} added to cart! 🛒`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{vendorName} - Menu</Text>
      <FlatList
        data={foods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handlePress(item)}
          >
            <View>
              <Text style={styles.cardText}>{item.name}</Text>
              <Text style={styles.price}>₱{item.price}</Text>
            </View>
            {getQuantity(item.id) > 0 && (
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>{getQuantity(item.id)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardText: { fontSize: 18, fontWeight: "600" },
  price: { fontSize: 16, fontWeight: "bold", color: "#4CAF50" },
  quantityBadge: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quantityText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
