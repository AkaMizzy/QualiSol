import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Anomalie2,
  createAnomalie2,
  deleteAnomalie2,
  getAllAnomalies2,
  updateAnomalie2
} from '@/services/anomalie2Service';
import { createGed, Ged, getGedsBySource } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';

export default function Anomalie2Screen() {
  const { user, token } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomalie2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnomalie, setEditingAnomalie] = useState<Anomalie2 | null>(null);
  const [anomalie, setAnomalie] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [anomalieImages, setAnomalieImages] = useState<Record<string, Ged[]>>({});
  
  // Modal image state
  const [modalImages, setModalImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [existingImages, setExistingImages] = useState<Ged[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Image preview modal
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAllAnomalies2(token);
      setAnomalies(data);
      // Fetch images for each anomalie
      const imagesMap: Record<string, Ged[]> = {};
      for (const anom of data) {
        try {
          const images = await getGedsBySource(token, anom.id, 'anomalie2');
          if (images.length > 0) {
            imagesMap[anom.id] = images;
          }
        } catch (e) {
          // Ignore errors for individual image fetches
        }
      }
      setAnomalieImages(imagesMap);
    } catch (error) {
      console.error('Failed to fetch anomalies:', error);
      Alert.alert('Erreur', 'Impossible de charger les anomalies');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnomalies();
  }, [fetchAnomalies]);

  const handleOpenModal = async (anomalieItem?: Anomalie2) => {
    if (anomalieItem) {
      setEditingAnomalie(anomalieItem);
      setAnomalie(anomalieItem.anomalie || '');
      // Load existing images for this anomalie
      if (token) {
        try {
          const images = await getGedsBySource(token, anomalieItem.id, 'anomalie2');
          setExistingImages(images);
        } catch (e) {
          setExistingImages([]);
        }
      }
    } else {
      setEditingAnomalie(null);
      setAnomalie('');
      setExistingImages([]);
    }
    setModalImages([]);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingAnomalie(null);
    setAnomalie('');
    setModalImages([]);
    setExistingImages([]);
  };

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin des autorisations de l\'appareil photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setModalImages(prev => [...prev, result.assets[0]]);
    }
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin des autorisations de la galerie.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setModalImages(prev => [...prev, ...result.assets]);
    }
  }, []);

  const showImagePickerOptions = () => {
    Alert.alert(
      'Ajouter une image',
      'Choisissez une option',
      [
        { text: 'Prendre une photo', onPress: handleTakePhoto },
        { text: 'Choisir depuis la galerie', onPress: handlePickFromGallery },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const removeModalImage = (index: number) => {
    setModalImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (anomalieId: string) => {
    if (!token || !user || modalImages.length === 0) return;

    const authorName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.email || 'Unknown';

    for (const asset of modalImages) {
      try {
        await createGed(token, {
          idsource: anomalieId,
          kind: 'anomalie2',
          title: `Image Anomalie 2`,
          author: authorName,
          file: {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || `anomalie2_${Date.now()}.jpg`,
          },
        });
      } catch (error: any) {
        console.error('Failed to upload image:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      let anomalieId: string;
      
      if (editingAnomalie) {
        await updateAnomalie2(editingAnomalie.id, { anomalie }, token);
        anomalieId = editingAnomalie.id;
      } else {
        const created = await createAnomalie2({ anomalie }, token);
        anomalieId = created.id;
      }

      // Upload any new images
      if (modalImages.length > 0) {
        setUploadingImages(true);
        await uploadImages(anomalieId);
        setUploadingImages(false);
      }

      handleCloseModal();
      fetchAnomalies();
    } catch (error) {
      console.error('Failed to save anomalie:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'anomalie');
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer cette anomalie ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAnomalie2(id, token);
              fetchAnomalies();
            } catch (error) {
              console.error('Failed to delete anomalie:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'anomalie');
            }
          },
        },
      ]
    );
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  const renderItem = ({ item }: { item: Anomalie2 }) => {
    const images = anomalieImages[item.id] || [];

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.anomalie || 'Sans description'}</Text>
          {item.cpmany && <Text style={styles.cardSubtitle}>{item.cpmany}</Text>}
          <Text style={styles.cardDate}>
            {new Date(item.created_at).toLocaleDateString('fr-FR')}
          </Text>
          
          {/* Images Section */}
          {images.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.imagesContainer}
              contentContainerStyle={styles.imagesContent}
            >
              {images.map((img) => (
                <TouchableOpacity key={img.id} onPress={() => handleImagePress(`${API_CONFIG.BASE_URL}${img.url}`)}>
                  <Image
                    source={{ uri: `${API_CONFIG.BASE_URL}${img.url}` }}
                    style={styles.thumbnail}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => handleOpenModal(item)} style={styles.iconButton}>
            <Ionicons name="pencil" size={20} color="#f87b1b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
            <Ionicons name="trash" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader user={user || undefined} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Anomalie 2</Text>
          <Text style={styles.headerSubtitle}>{anomalies.length} anomalie(s)</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
          <Ionicons name="add-circle" size={32} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={anomalies}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ef4444']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Aucune anomalie pour le moment</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => handleOpenModal()}>
              <Text style={styles.emptyButtonText}>Créer une anomalie</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAnomalie ? 'Modifier' : 'Nouvelle'} Anomalie
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom d'anomalie</Text>
                <TextInput
                  style={styles.input}
                  placeholder="nom d'anomalie"
                  value={anomalie}
                  onChangeText={setAnomalie}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Image Upload Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Images</Text>
                
                {/* Existing images (when editing) */}
                {existingImages.length > 0 && (
                  <View style={styles.existingImagesSection}>
                    <Text style={styles.subLabel}>Images existantes</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                      {existingImages.map((img) => (
                        <TouchableOpacity key={img.id} onPress={() => handleImagePress(`${API_CONFIG.BASE_URL}${img.url}`)}>
                          <Image
                            source={{ uri: `${API_CONFIG.BASE_URL}${img.url}` }}
                            style={styles.modalThumbnail}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* New images to upload */}
                {modalImages.length > 0 && (
                  <View style={styles.newImagesSection}>
                    <Text style={styles.subLabel}>Nouvelles images</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                      {modalImages.map((asset, index) => (
                        <View key={index} style={styles.newImageContainer}>
                          <Image source={{ uri: asset.uri }} style={styles.modalThumbnail} />
                          <TouchableOpacity 
                            style={styles.removeImageButton}
                            onPress={() => removeModalImage(index)}
                          >
                            <Ionicons name="close-circle" size={24} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Add image button */}
                <TouchableOpacity style={styles.addImageButton} onPress={showImagePickerOptions}>
                  <Ionicons name="camera-outline" size={24} color="#ef4444" />
                  <Text style={styles.addImageButtonText}>Ajouter une image</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.submitButton, (submitting || uploadingImages) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting || uploadingImages}
              >
                {submitting || uploadingImages ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.submitButtonText}>
                      {uploadingImages ? 'Upload des images...' : 'Enregistrement...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      {editingAnomalie ? 'Modifier' : 'Créer'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={imageModalVisible} animationType="fade" transparent>
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.imageModalBackdrop} 
            onPress={() => setImageModalVisible(false)} 
          />
          <View style={styles.imageModalContent}>
            {selectedImage && (
              <>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
                <TouchableOpacity 
                  style={styles.closeImageButton}
                  onPress={() => setImageModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={36} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#11224e',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardActions: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  imagesContainer: {
    marginTop: 12,
  },
  imagesContent: {
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11224e',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#11224e',
    minHeight: 100,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  existingImagesSection: {
    marginBottom: 12,
  },
  newImagesSection: {
    marginBottom: 12,
  },
  imagesRow: {
    flexDirection: 'row',
  },
  modalThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  newImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  addImageButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
  closeImageButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
