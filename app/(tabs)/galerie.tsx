import AppHeader from '@/components/AppHeader';
import AddImageModal from '@/components/galerie/AddImageModal';
import GalerieCard from '@/components/galerie/GalerieCard';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ged, createGed, getAllGeds } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterType = 'all' | 'today' | 'week' | 'month';
const PAGE_SIZE = 10;

export default function GalerieScreen() {
  const { token, user } = useAuth();
  const [geds, setGeds] = useState<Ged[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);

  const fetchGeds = useCallback(async () => {
    if (token) {
      try {
        setLoading(true);
        const fetchedGeds = await getAllGeds(token);
        setGeds(fetchedGeds);
      } catch (error) {
        console.error('Failed to fetch geds:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchGeds();
  }, [fetchGeds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGeds();
    setRefreshing(false);
  }, [fetchGeds]);

  const handleAddImage = async (data: { title: string; description: string; image: ImagePicker.ImagePickerAsset | null; voiceNote: { uri: string; type: string; name: string; } | null }) => {
    if (!token || !user || !data.image) return;
    const idsource = "00000000-0000-0000-0000-000000000000";
    
    try {
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

      if (data.voiceNote) {
        await createGed(token, {
          idsource,
          title: `${data.title} - Voice Note`,
          kind: 'voice_note',
          author: `${user.firstname} ${user.lastname}`,
          file: data.voiceNote,
        });
      }
      Alert.alert('Success', 'Image uploaded successfully.');
      fetchGeds();
    } catch (error) {
      console.error('Failed to upload files:', error);
      Alert.alert('Upload Failed', 'Please try again.');
    } finally {
      setModalVisible(false);
    }
  };

  const allImages = useMemo(() => {
    return geds
      .filter(g => g.url && /\.(jpg|jpeg|png|gif)$/i.test(g.url))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [geds]);

  const filteredImages = useMemo(() => {
    if (filter === 'all') return allImages;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (filter === 'today') {
      return allImages.filter(img => new Date(img.created_at) >= today);
    }
    if (filter === 'week') {
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      return allImages.filter(img => new Date(img.created_at) >= oneWeekAgo);
    }
    if (filter === 'month') {
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);
        return allImages.filter(img => new Date(img.created_at) >= oneMonthAgo);
    }
    return allImages;
  }, [allImages, filter]);

  const displayedImages = useMemo(() => {
    return filteredImages.slice(0, displayedCount);
  }, [filteredImages, displayedCount]);

  const voiceNotesBySource = useMemo(() => {
    return geds.reduce((acc, curr) => {
        if (curr.kind === 'voice_note') {
            acc[curr.idsource] = true;
        }
        return acc;
    }, {} as Record<string, boolean>);
  }, [geds]);

  const handleLoadMore = () => {
    setDisplayedCount(prevCount => prevCount + PAGE_SIZE);
  };

  const renderFilterButton = (label: string, type: FilterType) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.activeFilter]}
      onPress={() => {
        setFilter(type);
        setDisplayedCount(PAGE_SIZE); // Reset count on filter change
      }}
    >
      <Text style={[styles.filterText, filter === type && styles.activeFilterText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <View style={styles.filterContainer}>
        {renderFilterButton('All', 'all')}
        {renderFilterButton('Today', 'today')}
        {renderFilterButton('Week', 'week')}
        {renderFilterButton('Month', 'month')}
      </View>
      {loading && !refreshing ? (
        <View style={styles.skeletonContainer}>
          {[...Array(6)].map((_, index) => (
            <View key={index} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <FlatList
          data={displayedImages}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <GalerieCard
              item={item}
              onPress={() => {}}
              hasVoiceNote={voiceNotesBySource[item.idsource]}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No images found.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={
            filteredImages.length > displayedCount ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>
      <AddImageModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddImage}
      />
    </SafeAreaView>
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
    marginTop: 50,
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.white,
  },
  filterButton: {
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.large,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontFamily: FONT.medium,
    color: COLORS.secondary,
  },
  activeFilterText: {
    color: COLORS.white,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  skeletonCard: {
    width: '45%',
    height: 200,
    backgroundColor: '#E0E0E0',
    borderRadius: SIZES.medium,
    margin: 8,
  },
  loadMoreButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    borderRadius: SIZES.medium,
    alignItems: 'center',
    margin: SIZES.large,
  },
  loadMoreButtonText: {
    color: COLORS.white,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
});
