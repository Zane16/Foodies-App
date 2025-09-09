import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const organizations = [
  { id: "1", name: "Ateneo de Naga University" },
  { id: "2", name: "University of Saint Isabel" },
  { id: "3", name: "Naga College Foundation" },
];

export default function Home() {
  const router = useRouter();

  const handlePress = (org: any) => {
    router.push({
      pathname: "/vendors",
      params: { orgId: org.id, orgName: org.name }, // ✅ pass org details
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Organizations</Text>

      <FlatList
        data={organizations}
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
