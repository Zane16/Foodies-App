import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/_authContext"; // ✅ current logged-in user
import { useCart } from "../context/_CartContext";

export default function Cart() {
  const { cart, incrementQuantity, removeFromCart, clearCart, placeOrder } = useCart();
  const { user, loading } = useAuth(); // current logged-in user

  // Debug: Log user state
  console.log("Cart - User loading:", loading);
  console.log("Cart - User object:", user);

  // Calculate total price
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Handle checkout using context
  const handleCheckout = async () => {
    if (!user) {
      Alert.alert("Please login first!");
      return;
    }

    console.log("Full user object:", user);
    console.log("User ID:", user.id);
    
    if (!user.id) {
      Alert.alert("❌ Error", "User ID not found. Please log out and log back in.");
      return;
    }

    const result = await placeOrder(user.id);
    if (result.success) {
      Alert.alert("✅ Success", result.message);
    } else {
      Alert.alert("❌ Error", result.message);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Loading...</Text>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Please log in to view your cart</Text>
      </View>
    );
  }

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
              <Text style={styles.vendor}>
                {item.vendorName} ({item.orgName})
              </Text>
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
                onPress={() => incrementQuantity(item.id)} // ✅ FIXED: incrementQuantity instead of addToCart
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

      {/* Debug info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Debug Info:</Text>
        <Text style={styles.debugText}>User ID: {user?.id || 'No ID'}</Text>
        <Text style={styles.debugText}>User Email: {user?.email || 'No Email'}</Text>
      </View>

      {/* Checkout button */}
      <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
        <Text style={styles.checkoutText}>Place Order</Text>
      </TouchableOpacity>

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

  checkoutBtn: {
    marginTop: 20,
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  checkoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  clearBtn: {
    marginTop: 10,
    backgroundColor: "#ff2e63",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  clearText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  
  debugContainer: { 
    marginTop: 10, 
    padding: 10, 
    backgroundColor: "#f0f0f0", 
    borderRadius: 5 
  },
  debugText: { 
    fontSize: 12, 
    color: "#666", 
    marginBottom: 2 
  },
});
