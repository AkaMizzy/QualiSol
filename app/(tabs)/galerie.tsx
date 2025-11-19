import API_CONFIG from '@/app/config/api';
import AppHeader from '@/components/AppHeader';
import AddImageModal from '@/components/galerie/AddImageModal';
import GalerieCard from '@/components/galerie/GalerieCard';
import PictureAnnotator from '@/components/PictureAnnotator';
import PreviewModal from '@/components/PreviewModal';
import { ICONS } from '@/constants/Icons';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ged, createGed, getAllGeds, updateGedFile } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from 'react-native-safe-area-context';

const PAGE_SIZE = 10;

export default function GalerieScreen() {
  const { token, user } = useAuth();
  const [geds, setGeds] = useState<Ged[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Ged | null>(null);
  const [isAnnotatorVisible, setIsAnnotatorVisible] = useState(false);
  const [annotatorImageUri, setAnnotatorImageUri] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad) {
        setModalVisible(true);
        setIsFirstLoad(false);
      }
    }, [isFirstLoad])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGeds();
    setRefreshing(false);
  }, [fetchGeds]);

  const handleAddImage = async (data: { title: string; description: string; image: ImagePicker.ImagePickerAsset | null; voiceNote: { uri: string; type: string; name: string; } | null; author: string; latitude: number | null; longitude: number | null; level: number; type: string | null; categorie: string | null; }, shouldClose: boolean) => {
    if (!token || !user || !data.image) return;
    const idsource = "00000000-0000-0000-0000-000000000000";
    
    try {
      await createGed(token, {
        idsource,
        title: data.title,
        description: data.description,
        kind: 'qualiphoto',
        author: data.author,
        latitude: data.latitude?.toString(),
        longitude: data.longitude?.toString(),
        level: data.level,
        type: data.type || undefined,
        categorie: data.categorie || undefined,
        file: {
          uri: data.image.uri,
          type: data.image.type || 'image/jpeg',
          name: data.image.fileName || data.image.uri.split('/').pop() || `qualiphoto_${Date.now()}.jpg`,
        },
      });

      if (data.voiceNote) {
        await createGed(token, {
          idsource,
          title: `${data.title} - Voice Note`,
          kind: 'voice_note',
          author: data.author,
          file: data.voiceNote,
        });
      }
      fetchGeds();
    } catch (error) {
      console.error('Failed to upload files:', error);
      Alert.alert('Upload Failed', 'Please try again.');
    } finally {
      if (shouldClose) {
        setModalVisible(false);
      }
    }
  };

  const handleCardPress = (item: Ged) => {
    setSelectedItem(item);
  };

  const closePreview = () => {
    setSelectedItem(null);
  };

  const handleOpenAnnotator = () => {
    if (selectedItem?.url) {
      const fullUrl = `${API_CONFIG.BASE_URL}${selectedItem.url}`;
      setAnnotatorImageUri(fullUrl);
      setIsAnnotatorVisible(true);
    }
  };

  const handleCloseAnnotator = () => {
    setIsAnnotatorVisible(false);
    setAnnotatorImageUri(null);
    setSelectedItem(null);
  };

  const handleSaveAnnotation = async (image: { uri: string; name: string; type: string }) => {
    if (!token || !selectedItem) {
      Alert.alert('Erreur', 'Impossible de sauvegarder, session invalide.');
      return;
    }
    try {
      const updatedGed = await updateGedFile(token, selectedItem.id, image);
      setGeds(prevGeds =>
        prevGeds.map(ged => (ged.id === updatedGed.id ? updatedGed : ged))
      );
      handleCloseAnnotator();
    } catch (error) {
      console.error('Failed to save annotation:', error);
      Alert.alert('Erreur', 'Échec de l\'enregistrement de l\'annotation.');
    }
  };

  const allImages = useMemo(() => {
    return geds
      .filter(g => g.kind === 'qualiphoto')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [geds]);

  const filteredImages = useMemo(() => {
    if (!selectedDate) return allImages;

    const selectedDay = selectedDate.toDateString();
    return allImages.filter(img => new Date(img.created_at).toDateString() === selectedDay);
  }, [allImages, selectedDate]);

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

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirmDate = (date: Date) => {
    setSelectedDate(date);
    setDisplayedCount(PAGE_SIZE);
    hideDatePicker();
  };
  
  const handleShowAll = () => {
    setSelectedDate(null);
    setDisplayedCount(PAGE_SIZE);
  };

  const formattedDate = useMemo(() => {
    if (!selectedDate) return "Filtrer par date";
    return selectedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [selectedDate]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.datePickerButton} onPress={showDatePicker}>
          <Ionicons name="calendar-outline" size={20} color={selectedDate ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.datePickerText, selectedDate && styles.datePickerTextActive]}>
            {formattedDate}
          </Text>
        </TouchableOpacity>
        
        {selectedDate && (
          <TouchableOpacity style={styles.showAllButton} onPress={handleShowAll}>
            <Text style={styles.showAllButtonText}>Afficher tout</Text>
          </TouchableOpacity>
        )}
      </View>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
      />

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
          numColumns={1}
          renderItem={({ item }) => (
            <GalerieCard
              item={item}
              onPress={() => handleCardPress(item)}
              hasVoiceNote={voiceNotesBySource[item.idsource]}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Pas d&apos;images trouvées.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={
            filteredImages.length > displayedCount ? (
              <TouchableOpacity style={styles.loadMoreContainer} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Voir plus</Text>
                <View style={styles.loadMoreLine} />
              </TouchableOpacity>
            ) : null
          }
        />
      )}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Image source={ICONS.cameraPng} style={{ width: 32, height: 32 }} />
      </TouchableOpacity>
      <AddImageModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddImage}
        openCameraOnShow={true}
      />
      {selectedItem && (
        <PreviewModal
          visible={!!selectedItem && !isAnnotatorVisible}
          onClose={closePreview}
          mediaUrl={`${API_CONFIG.BASE_URL}${selectedItem.url}`}
          mediaType={selectedItem.kind === 'qualiphoto' ? 'image' : 'file'}
          title={selectedItem.title}
          onAnnotate={handleOpenAnnotator}
        />
      )}
      <Modal visible={isAnnotatorVisible} animationType="slide">
        {annotatorImageUri && (
          <PictureAnnotator
            baseImageUri={annotatorImageUri}
            onClose={handleCloseAnnotator}
            onSaved={handleSaveAnnotation}
            title={`Annoter: ${selectedItem?.title || 'Photo'}`}
          />
        )}
      </Modal>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightWhite,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightWhite,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small + 2,
    borderRadius: SIZES.large,
    marginRight: SIZES.medium,
  },
  datePickerText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginLeft: SIZES.small,
  },
  datePickerTextActive: {
    color: COLORS.primary,
    fontFamily: FONT.bold,
  },
  showAllButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small + 2,
    borderRadius: SIZES.large,
  },
  showAllButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
  skeletonContainer: {
    paddingHorizontal: 8,
  },
  skeletonCard: {
    width: '100%',
    height: 200,
    backgroundColor: '#E0E0E0',
    borderRadius: SIZES.medium,
    marginBottom: 16,
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginVertical: SIZES.large,
  },
  loadMoreText: {
    color: COLORS.primary,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    marginBottom: SIZES.small,
  },
  loadMoreLine: {
    height: 1,
    width: '30%',
    backgroundColor: COLORS.primary,
  },
});
