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
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from 'react-native-safe-area-context';

const IMAGES_PER_PAGE = 2;

export default function GalerieScreen() {
  const { token, user } = useAuth();
  const { width } = useWindowDimensions();
  const [geds, setGeds] = useState<Ged[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Ged | null>(null);
  const [isAnnotatorVisible, setIsAnnotatorVisible] = useState(false);
  const [annotatorImageUri, setAnnotatorImageUri] = useState<string | null>(null);

  const isTablet = width >= 768;

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
      const { uri } = data.image;
      const fileName = uri.split('/').pop() || `qualiphoto_${Date.now()}.jpg`;
      const fileType = fileName.split('.').pop() || 'jpeg';

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
          uri: uri,
          type: `image/${fileType}`,
          name: fileName,
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
      
      // Refresh the gallery to show the newly uploaded picture
      await fetchGeds();
      
      if (shouldClose) {
        setModalVisible(false);
      }
    } catch (error: any) {
      console.error('Failed to upload files:', error);
      // Handle 403 error specifically for limit reached
      if (error?.message?.includes('limit') || error?.message?.includes('Image limit')) {
        Alert.alert('Limite atteinte', error?.message || 'Vous avez atteint votre limite d\'images.');
      } else {
        Alert.alert('Upload Failed', 'Please try again.');
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

  const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);

  const paginatedData = useMemo(() => {
    const pages = [];
    for (let i = 0; i < filteredImages.length; i += IMAGES_PER_PAGE) {
      pages.push(filteredImages.slice(i, i + IMAGES_PER_PAGE));
    }
    return pages;
  }, [filteredImages]);

  const currentPageImages = useMemo(() => {
    return paginatedData[currentPage] || [];
  }, [paginatedData, currentPage]);

  const voiceNotesBySource = useMemo(() => {
    return geds.reduce((acc, curr) => {
        if (curr.kind === 'voice_note') {
            acc[curr.idsource] = true;
        }
        return acc;
    }, {} as Record<string, boolean>);
  }, [geds]);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirmDate = (date: Date) => {
    setSelectedDate(date);
    setCurrentPage(0);
    hideDatePicker();
  };
  
  const handleShowAll = () => {
    setSelectedDate(null);
    setCurrentPage(0);
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
          {[...Array(2)].map((_, index) => (
            <View key={index} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <ScrollView
          style={styles.galleryContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.contentContainer}>
            {currentPageImages.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>Pas d&apos;images trouvées.</Text>
              </View>
            ) : (
              currentPageImages.map((item) => (
                <View key={item.id} style={styles.imageContainer}>
                  <GalerieCard
                    item={item}
                    onPress={() => handleCardPress(item)}
                    hasVoiceNote={voiceNotesBySource[item.idsource]}
                  />
                </View>
              ))
            )}
          </View>
          
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
                onPress={handlePrevPage}
                disabled={currentPage === 0}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={24} 
                  color={currentPage === 0 ? COLORS.gray : COLORS.primary} 
                />
              </TouchableOpacity>
              
              <View style={styles.pageIndicator}>
                <Text style={styles.pageText}>
                  {currentPage + 1} / {totalPages}
                </Text>
                <View style={styles.dotsContainer}>
                  {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                    let dotIndex = index;
                    if (totalPages > 5) {
                      if (currentPage < 3) {
                        dotIndex = index;
                      } else if (currentPage >= totalPages - 3) {
                        dotIndex = totalPages - 5 + index;
                      } else {
                        dotIndex = currentPage - 2 + index;
                      }
                    }
                    return (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          dotIndex === currentPage && styles.activeDot,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
              
              <TouchableOpacity
                style={[styles.pageButton, currentPage === totalPages - 1 && styles.pageButtonDisabled]}
                onPress={handleNextPage}
                disabled={currentPage === totalPages - 1}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={currentPage === totalPages - 1 ? COLORS.gray : COLORS.primary} 
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
          description={selectedItem.description}
          author={selectedItem.author}
          createdAt={selectedItem.created_at}
          type={selectedItem.type}
          categorie={selectedItem.categorie}
          latitude={selectedItem.latitude}
          longitude={selectedItem.longitude}
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
  galleryContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SIZES.medium,
    paddingTop: SIZES.medium,
  },
  imageContainer: {
    marginBottom: SIZES.medium,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  addButton: {
    position: 'absolute',
    bottom: 50,
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
    backgroundColor: COLORS.primary,
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
    flex: 1,
    paddingHorizontal: SIZES.medium,
    marginTop: SIZES.medium,
  },
  skeletonCard: {
    height: 200,
    backgroundColor: '#E0E0E0',
    borderRadius: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightWhite,
  },
  pageButton: {
    padding: SIZES.small,
    borderRadius: SIZES.small,
    backgroundColor: COLORS.lightWhite,
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageIndicator: {
    alignItems: 'center',
  },
  pageText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
    marginBottom: SIZES.small,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray2,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
