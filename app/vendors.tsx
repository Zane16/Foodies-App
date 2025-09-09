import { useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Hardcoded vendors by org
const vendorsByOrg: Record<string, any[]> = {
  "1": [
    { id: "1", name: "McDonalds" },
    { id: "2", name: "Jollibee" },
  ],
  "2": [
    { id: "3", name: "Chowking" },
    { id: "4", name: "Mang Inasal" },
  ],
  "3": [
    { id: "5", name: "Greenwich" },
    { id: "6", name: "KFC" },
  ],
};

export default function Vendors() {
  const { orgId, orgName } = useLocalSearchParams();
  const router = useRouter();

  const vendors = vendorsByOrg[orgId as string] || [];

  const handlePress = (vendor: any) => {
    router.push({
      pathname: "/foods",
      params: { vendorId: vendor.id, vendorName: vendor.name, orgName },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vendors in {orgName}</Text>

      <FlatList
        data={vendors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handlePress(item)}
          >
            <Text style={styles.cardText}>{item.name}</Text>
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
  },
  cardText: { fontSize: 18, fontWeight: "600" },
});
