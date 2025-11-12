import API_CONFIG from '@/app/config/api';
import AddImageModal from '@/components/galerie/AddImageModal';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ged, createGed, getAllGeds } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';



export default function GalerieScreen() {
  const { token, user } = useAuth();
  const [images, setImages] = useState<Ged[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchImages = useCallback(async () => {
    if (token) {
      try {
        setLoading(true);
        const geds = await getAllGeds(token);
        const imageGeds = geds.filter(ged => ged.kind === 'image');
        setImages(imageGeds);
      } catch (error) {
        console.error('Failed to fetch images:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchImages();
    setRefreshing(false);
  }, [fetchImages]);

  const handleAddImage = async (data: { title: string; description: string; image: ImagePicker.ImagePickerAsset | null; voiceNote: { uri: string; type: string; name: string; } | null }) => {
    if (!token || !user || !data.image) return;

    const idsource = "00000000-0000-0000-0000-000000000000";
    
    try {
      // Upload image
      await createGed(token, {
        idsource,
        title: data.title,
        description: data.description,
        kind: 'image',
        author: `${user.firstname} ${user.lastname}`,
        file: {
          uri: data.image.uri,
          type: data.image.type || 'image/jpeg',
          name: data.image.fileName || 'photo.jpg',
        },
      });

      // Upload voice note if it exists
      if (data.voiceNote) {
        await createGed(token, {
          idsource,
          title: `${data.title} - Voice Note`,
          kind: 'voice_note',
          author: `${user.firstname} ${user.lastname}`,
          file: data.voiceNote,
        });
      }

      Alert.alert('Success', 'Image and voice note uploaded successfully.');
      fetchImages(); // Refresh the gallery
    } catch (error) {
      console.error('Failed to upload files:', error);
      Alert.alert('Upload Failed', 'Failed to upload files. Please try again.');
    } finally {
      setModalVisible(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.imageContainer}>
            <Image 
              source={{ uri: `${API_CONFIG.BASE_URL}${item.url}` }}
              style={styles.image} 
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No images found.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>
      <AddImageModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    margin: 2,
  },
  image: {
    width: '100%',
    height: 120,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  emptyText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
});
