import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { cart, addToCart, removeFromCart, clearCart } = useCart();

  // Calculate total price
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>🛒 Your cart is empty</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Cart</Text>

      <FlatList
        data={cart}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text style={styles.vendor}>{item.vendorName} ({item.orgName})</Text>
              <Text style={styles.price}>₱{item.price * item.quantity}</Text>
            </View>

            {/* Quantity controls */}
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => removeFromCart(item.id)}
              >
                <Text style={styles.qtyText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNumber}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.qtyText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Total price */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total: ₱{totalPrice}</Text>
      </View>

      {/* Clear cart button */}
      <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
        <Text style={styles.clearText}>Clear Cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  empty: { fontSize: 18, color: "#666", textAlign: "center", marginTop: 50 },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  foodName: { fontSize: 18, fontWeight: "600" },
  vendor: { fontSize: 14, color: "#555" },
  price: { fontSize: 16, fontWeight: "bold", color: "#4CAF50", marginTop: 4 },
  quantityContainer: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  qtyNumber: { marginHorizontal: 8, fontSize: 16, fontWeight: "bold" },
  totalContainer: { marginTop: 20, alignItems: "flex-end" },
  totalText: { fontSize: 20, fontWeight: "bold" },
  clearBtn: {
    marginTop: 20,
    backgroundColor: "#ff2e63",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  clearText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
