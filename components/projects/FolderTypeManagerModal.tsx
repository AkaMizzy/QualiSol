import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import companyService from '@/services/companyService';
import {
  createFolderType,
  deleteFolderType,
  FolderType,
  getAllFolderTypes,
  updateFolderType,
} from '@/services/folderTypeService';
import { createGed, getAllGeds, getGedsBySource, updateGedFile } from '@/services/gedService';
import { Company } from '@/types/company';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QuestionTypeManagerModal from './QuestionTypeManagerModal';

type FormComponentProps = {
  isEditing: boolean;
  isSubmitting: boolean;
  title: string;
  description: string;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onPickImage: () => void;
  imageUri?: string;
};

const FormComponent = ({
  isEditing,
  isSubmitting,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
  onPickImage,
  imageUri,
}: FormComponentProps) => (
  <View style={styles.formCard}>
    <Text style={styles.formTitle}>{isEditing ? 'Modifier le type' : 'Nouveau type de dossier'}</Text>
    <TouchableOpacity onPress={onPickImage} style={styles.imagePicker}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="camera" size={24} color="#f87b1b" />
          <Text style={styles.imagePickerText}>Ajouter une image</Text>
        </View>
      )}
    </TouchableOpacity>
    <View style={styles.inputWrap}>
      <Ionicons name="text-outline" size={16} color="#f87b1b" />
      <TextInput
        placeholder="Titre"
        placeholderTextColor="#f87b1b"
        value={title}
        onChangeText={onTitleChange}
        style={styles.input}
      />
    </View>
    <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
      <Ionicons name="document-text-outline" size={16} color="#f87b1b" />
      <TextInput
        placeholder="Description (optionnel)"
        placeholderTextColor="#f87b1b"
        value={description}
        onChangeText={onDescriptionChange}
        style={[styles.input, { height: '100%' }]}
        multiline
      />
    </View>
    <View style={styles.formActions}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSubmit} style={styles.submitButton} disabled={isSubmitting}>
        <Text style={styles.submitButtonText}>{isEditing ? 'Enregistrer' : 'Créer'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function FolderTypeManagerModal({ visible, onClose }: Props) {
  const { token, user } = useAuth();
  const [folderTypes, setFolderTypes] = useState<FolderType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<FolderType | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFolderType, setSelectedFolderType] = useState<FolderType | null>(null);
  const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);
  const [image, setImage] = useState<ImagePickerAsset | null>(null);

  // Limit tracking state
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentStorageGB, setCurrentStorageGB] = useState(0);
  const [storageQuotaGB, setStorageQuotaGB] = useState(0);
  const [isStorageQuotaReached, setIsStorageQuotaReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const fetchFolderTypes = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const types = await getAllFolderTypes(token);
      const typesWithImages = await Promise.all(
        types.map(async (type) => {
          const geds = await getGedsBySource(token, type.id, 'folder_type_icon');
          if (geds.length > 0 && geds[0].url) {
            return {
              ...type,
              imageUrl: `${API_CONFIG.BASE_URL}${geds[0].url}`,
              imageGedId: geds[0].id,
            };
          }
          return type;
        })
      );
      setFolderTypes(typesWithImages);
    } catch (error) {
      console.error('Failed to fetch folder types:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (visible) {
      fetchFolderTypes();
    }
  }, [visible, fetchFolderTypes]);

  useEffect(() => {
    const fetchLimitInfo = async () => {
      try {
        setLoadingLimits(true);
        if (!token) return;
        
        const [company, geds] = await Promise.all([
          companyService.getCompany(),
          getAllGeds(token)
        ]);
        
        setCompanyInfo(company);
        
        // Calculate storage quota
        const storageUsedGB = company.nbimagetake || 0;
        const storageQuotaTB = company.sizeimages || 1;
        const storageQuotaGBValue = storageQuotaTB * 1024;
        
        setCurrentStorageGB(storageUsedGB);
        setStorageQuotaGB(storageQuotaGBValue);
        setIsStorageQuotaReached(storageUsedGB >= storageQuotaGBValue);
      } catch (error) {
        console.error('Error fetching limit info:', error);
      } finally {
        setLoadingLimits(false);
      }
    };

    if (visible) {
      fetchLimitInfo();
    }
  }, [visible, token]);

  const handleOpenQuestionManager = (type: FolderType) => {
    setSelectedFolderType(type);
    setIsQuestionModalVisible(true);
  };

  const handleBeginEdit = (type: FolderType) => {
    setIsEditing(type);
    setIsAdding(false);
    setTitle(type.title);
    setDescription(type.description || '');
    setImage(null);
  };

  const handleBeginAdd = () => {
    setIsEditing(null);
    setIsAdding(true);
    setTitle('');
    setDescription('');
    setImage(null);
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
    setTitle('');
    setDescription('');
    setImage(null);
  };

  const handleSubmit = async () => {
    if (!token || !title.trim() || !user) {
      Alert.alert('Erreur', 'Titre manquant ou utilisateur non authentifié.');
      return;
    }

    // Check limits before submitting if uploading an image
    if (image) {
      if (isStorageQuotaReached) {
        Alert.alert(
          'Quota de stockage dépassé',
          `Vous avez atteint votre quota de stockage de ${(storageQuotaGB / 1024).toFixed(1)}TB. Utilisation actuelle: ${currentStorageGB.toFixed(2)}GB.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let savedType: FolderType;
      if (isEditing) {
        const updatedType = await updateFolderType(
          isEditing.id,
          { title, description: description || undefined },
          token
        );
        setFolderTypes((prev) =>
          prev.map((t) => (t.id === updatedType.id ? { ...t, ...updatedType } : t))
        );
        savedType = { ...isEditing, ...updatedType };
      } else {
        const newType = await createFolderType({ title, description: description || undefined }, token);
        setFolderTypes((prev) => [newType, ...prev]);
        savedType = newType;
      }

      if (image && image.uri) {
        const file = {
          uri: image.uri,
          name: image.fileName || `photo_${Date.now()}.jpg`,
          type: image.type === 'image' ? 'image/jpeg' : 'video/mp4',
        };

        if (isEditing && isEditing.imageGedId) {
          const updatedGed = await updateGedFile(token, isEditing.imageGedId, file);
          setFolderTypes((prev) =>
            prev.map((t) =>
              t.id === savedType.id
                ? { ...t, imageUrl: `${API_CONFIG.BASE_URL}${updatedGed.url}`, imageGedId: updatedGed.id }
                : t
            )
          );
        } else {
          const gedData = await createGed(token, {
            idsource: savedType.id,
            title: `Icon for ${savedType.title}`,
            kind: 'folder_type_icon',
            author: user.id,
            file,
          });
          setFolderTypes((prev) =>
            prev.map((t) =>
              t.id === savedType.id
                ? { ...t, imageUrl: `${API_CONFIG.BASE_URL}${gedData.data.url}`, imageGedId: gedData.data.id }
                : t
            )
          );
        }
      }

      handleCancel();
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} folder type:`, error);
      Alert.alert('Erreur', `Échec de ${isEditing ? 'la mise à jour' : 'la création'} du type de dossier.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deleteFolderType(id, token);
      setFolderTypes((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete folder type:', error);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'La permission d’accès à la galerie est requise.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const renderItem = ({ item }: { item: FolderType }) => (
    <View style={styles.itemCard}>
      <Image
        source={{ uri: item.imageUrl || undefined }}
        style={styles.itemImage}
        defaultSource={require('@/assets/images/icon.png')} // Provide a default image
      />
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => handleBeginEdit(item)} style={styles.iconButton}>
          <Ionicons name="pencil" size={20} color="#11224e" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
          <Ionicons name="trash" size={20} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleOpenQuestionManager(item)} style={styles.iconButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Gérer les types de dossier</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Limit Info Banners */}
          {!loadingLimits && companyInfo && (
            <View style={styles.limitsContainer}>
              <View style={[styles.limitInfoBanner, isStorageQuotaReached && styles.limitInfoBannerWarning]}>
                <Ionicons 
                  name={isStorageQuotaReached ? "warning" : "cloud-outline"} 
                  size={14} 
                  color={isStorageQuotaReached ? "#b45309" : "#3b82f6"} 
                />
                <Text style={[styles.limitInfoText, isStorageQuotaReached && styles.limitInfoTextWarning]}>
                  Stockage: {currentStorageGB.toFixed(2)}GB / {(storageQuotaGB / 1024).toFixed(1)}TB
                </Text>
              </View>
            </View>
          )}

          <View style={styles.contentContainer}>
            {isAdding || isEditing ? (
              <FormComponent
                isEditing={!!isEditing}
                isSubmitting={isSubmitting}
                title={title}
                description={description}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                onPickImage={handlePickImage}
                imageUri={image?.uri || (isEditing?.imageUrl)}
              />
            ) : (
              <TouchableOpacity onPress={handleBeginAdd} style={styles.addButton}>
                <Ionicons name="add" size={22} color="#f87b1b" />
                <Text style={styles.addButtonText}>Ajouter un type de dossier</Text>
              </TouchableOpacity>
            )}

            {isLoading && !isAdding && !isEditing ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#11224e" size="large" />
            ) : (
              <FlatList
                data={folderTypes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: isAdding || isEditing ? 0 : 16 }}
                ListEmptyComponent={
                  !isLoading ? <Text style={styles.emptyText}>Aucun type de dossier. Appuyez sur &quot;Ajouter&quot; pour en créer un.</Text> : null
                }
              />
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
      {selectedFolderType && (
        <QuestionTypeManagerModal
          visible={isQuestionModalVisible}
          onClose={() => setIsQuestionModalVisible(false)}
          folderType={selectedFolderType}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f87b1b',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: '#f87b1b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f87b1b',
  },
  // Form Styles
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11224e',
  },
  imagePicker: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f87b1b',
    borderStyle: 'dashed',
    backgroundColor: '#fff7ed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerText: {
    color: '#f87b1b',
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f87b1b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, color: '#111827', fontSize: 16 },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#f87b1b',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  submitButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButtonText: { color: '#1f2937', fontWeight: '600', fontSize: 16 },
  // List Item Styles
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f87b1b',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#e5e7eb',
  },
  itemTextContainer: { flex: 1, marginRight: 16 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#11224e' },
  itemDescription: { color: '#6b7280', marginTop: 4, fontSize: 14 },
  itemActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  emptyText: { textAlign: 'center', marginTop: 48, color: '#6b7280', fontSize: 16, paddingHorizontal: 20 },
  limitsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  limitInfoBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  limitInfoBannerWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  limitInfoText: {
    color: '#1e40af',
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  limitInfoTextWarning: {
    color: '#b45309',
  },
});
