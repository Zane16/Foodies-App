// SIMPLE VERSION - Minimal Featured Items Component
// Automatically shows best sellers and recommended items based on sales data

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../supabase';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

interface SimpleFeaturedItemsProps {
  vendorId: string;
  onItemPress?: (itemId: string) => void;
}

export default function SimpleFeaturedItems({ vendorId, onItemPress }: SimpleFeaturedItemsProps) {
  const [recommended, setRecommended] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      try {
        // Get recommended
        const { data: rec } = await supabase
          .from('menu_items')
          .select('id, name, price, image_url')
          .eq('vendor_id', vendorId)
          .eq('is_recommended', true)
          .eq('is_available', true);

        setRecommended(rec || []);
      } catch (error) {
        console.error('Error fetching featured items:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [vendorId]);

  if (loading) {
    return <ActivityIndicator style={{ padding: 20 }} />;
  }

  return (
    <View style={styles.container}>
      {/* Recommended */}
      {recommended.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>💡 You Might Like</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recommended.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => onItemPress?.(item.id)}
              >
                {item.image_url && (
                  <Image source={{ uri: item.image_url }} style={styles.image} />
                )}
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  card: {
    width: 140,
    backgroundColor: 'white',
    borderRadius: 10,
    marginLeft: 16,
    padding: 10,
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000ff',
  },
});
