// app/customer/vendors.tsx
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

interface Vendor {
  id: string;
  name: string;
}

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const router = useRouter();

  const fetchVendors = async () => {
    const { data, error } = await supabase.from('vendors').select('*');
    if (error) console.error('Error fetching vendors:', error);
    else setVendors(data || []);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const goToVendorMenu = (vendorId: string) => {
    router.push({
      pathname: 'vendor-menu',
      params: { vendorId }
    } as any);
  };

  const renderItem = ({ item }: { item: Vendor }) => (
    <TouchableOpacity style={styles.card} onPress={() => goToVendorMenu(item.id)}>
      <Text style={styles.vendorName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vendors</Text>
      <FlatList data={vendors} keyExtractor={(i) => i.id} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  vendorName: { fontSize: 18, fontWeight: '600' },
});
