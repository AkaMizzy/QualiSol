import VoiceNoteRecorder from '@/components/VoiceNoteRecorder';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import companyService from '@/services/companyService';
import { getAllGeds } from '@/services/gedService';
import { Company } from '@/types/company';
// import { describeImage } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

interface AddImageModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; description: string; image: ImagePicker.ImagePickerAsset | null; voiceNote: { uri: string; type: string; name: string; } | null; author: string; latitude: number | null; longitude: number | null; level: number; type: string | null; categorie: string | null; }, shouldClose: boolean) => void;
  openCameraOnShow?: boolean;
}

export default function AddImageModal({ visible, onClose, onAdd, openCameraOnShow = false }: AddImageModalProps) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [voiceNote, setVoiceNote] = useState<{ uri: string; type: string; name: string; } | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [level, setLevel] = useState(5);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(null);
  const [severitySliderWidth, setSeveritySliderWidth] = useState(0);
  const prevVisibleRef = useRef(visible);

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  
  // Storage quota state
  const [currentStorageGB, setCurrentStorageGB] = useState(0);
  const [storageQuotaGB, setStorageQuotaGB] = useState(0);
  const [isStorageQuotaReached, setIsStorageQuotaReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const ANOMALY_CATEGORIES = [
    { key: 'securite', label: 'Sécurité' },
    { key: 'conformite', label: 'Conformité' },
    { key: 'technique', label: 'Technique' },
    { key: 'observation', label: 'Observation' },
  ] as const;

  const ANOMALY_TYPES = [
    { key: 'Incendie', label: 'Incendie', icon: 'flame-outline' },
    { key: 'Inondation', label: 'Inondation', icon: 'water-outline' },
    { key: 'Structure', label: 'Structure', icon: 'business-outline' },
    { key: 'Électrique', label: 'Électrique', icon: 'flash-outline' },
    { key: 'CVC', label: 'CVC', icon: 'snow-outline' },
    { key: 'Autre', label: 'Autre', icon: 'ellipsis-horizontal-outline' },
  ] as const;
  /* const handleGenerateDescription = useCallback(async (photoToDescribe: ImagePicker.ImagePickerAsset) => {
    if (!photoToDescribe || !token) {
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const photoFile = {
        uri: photoToDescribe.uri,
        name: photoToDescribe.fileName || photoToDescribe.uri.split('/').pop() || 'photo.jpg',
        type: photoToDescribe.type || 'image/jpeg',
      };
      const description = await describeImage(token, photoFile);
      setDescription(prev => prev ? `${prev}\n${description}` : description);
    } catch (e: any) {
      console.error('Failed to generate description:', e);
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [token]); */

  const handleRecordingComplete = useCallback((uri: string | null) => {
    if (uri) {
      const voiceNoteData = {
        uri,
        type: 'audio/m4a',
        name: `voicenote-${Date.now()}.m4a`,
      };
      setVoiceNote(voiceNoteData);
      // Automatically transcribe the audio
      // handleTranscribeAudio(uri, 'audio/m4a');
    } else {
      setVoiceNote(null);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Désolé, nous avons besoin des autorisations de l\'appareil photo pour que cela fonctionne !');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setImage(selectedImage);
      // handleGenerateDescription(selectedImage);
    }
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Désolé, nous avons besoin des autorisations de la galerie pour que cela fonctionne !');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
    });

    if (!result.canceled) {
        const selectedImage = result.assets[0];
        setImage(selectedImage);
    }
  }, []);

  const showImagePickerOptions = useCallback(() => {
    Alert.alert(
        "Choisir une image",
        "Voulez-vous prendre une nouvelle photo ou en choisir une depuis votre galerie ?",
        [
            {
                text: "Prendre une photo",
                onPress: handleTakePhoto,
            },
            {
                text: "Choisir depuis la galerie",
                onPress: handlePickFromGallery,
            },
            {
                text: "Annuler",
                style: "cancel",
            },
        ]
    );
  }, [handleTakePhoto, handlePickFromGallery]);

  useEffect(() => {
    const prevVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !prevVisible && openCameraOnShow) {
      // Modal just opened, trigger camera with a delay
      const timer = setTimeout(() => {
        showImagePickerOptions();
      }, 400);

      return () => clearTimeout(timer);
    } else if (!visible && prevVisible) {
      // Modal just closed, reset form
      setTitle('');
      setDescription('');
      setImage(null);
      setVoiceNote(null);
      setLatitude(null);
      setLongitude(null);
      setIsGeneratingDescription(false);
      setLevel(5);
      setSelectedType(null);
      setSelectedCategorie(null);
    }
  }, [visible, showImagePickerOptions, openCameraOnShow]);

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
        const storageQuotaGB = company.sizeimages || 1; // Quota in GB
        
        setCurrentStorageGB(storageUsedGB);
        setStorageQuotaGB(storageQuotaGB);
        setIsStorageQuotaReached(storageUsedGB >= storageQuotaGB);
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

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
      } catch (error) {
        console.warn('Could not fetch location automatically.', error);
      }
    };
    if (visible) {
      fetchLocation();
    }
  }, [visible]);

  const onSeverityPan = useCallback((event: PanGestureHandlerGestureEvent) => {
    if (severitySliderWidth <= 0) return;
    const x = event.nativeEvent.x;
    const newLevel = Math.max(0, Math.min(10, Math.round((x / severitySliderWidth) * 10)));
    setLevel(prevLevel => {
        if (newLevel !== prevLevel) {
            return newLevel;
        }
        return prevLevel;
    });
  }, [severitySliderWidth]);

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return '#FF3B30'; // High - Red
    if (severity >= 5) return '#FF9500'; // Medium - Orange
    return '#34C759'; // Low - Green
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 7) return 'Haute';
    if (severity >= 5) return 'Moyenne';
    return 'Basse';
  };

  const handleAdd = (shouldClose: boolean) => {
    if (!title || !image) {
      Alert.alert('Informations manquantes', 'Veuillez fournir un titre et une image.');
      return;
    }

    if (isStorageQuotaReached) {
      Alert.alert(
        'Quota de stockage dépassé',
        `Vous avez atteint votre quota de stockage de ${storageQuotaGB.toFixed(2)}GB. Utilisation actuelle: ${currentStorageGB.toFixed(2)}GB. Veuillez mettre à niveau votre plan.`
      );
      return;
    }

    let authorName = 'Unknown User';

    if (token) {
      try {
        const payload = token.split('.')[1];
        if (payload) {
          let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const decodedString = atob(base64);
          const decodedPayload = JSON.parse(decodedString);
          if (decodedPayload.username) {
            authorName = decodedPayload.username;
          } else if (decodedPayload.email) {
            authorName = decodedPayload.email;
          } else if (decodedPayload.identifier) {
            authorName = decodedPayload.identifier;
          }
        }
      } catch (err) {
        console.error('Error decoding token:', err);
      }
    }

    if (authorName === 'Unknown User' && user) {
      const name = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
      if (name) {
        authorName = name;
      } else if (user.email) {
        authorName = user.email;
      }
    }

    onAdd({ title, description, image, voiceNote, author: authorName, latitude, longitude, level, type: selectedType, categorie: selectedCategorie }, shouldClose);
    
    if (!shouldClose) {
        setTitle('');
        setDescription('');
        setImage(null);
        setVoiceNote(null);
        setLevel(5);
        setSelectedType(null);
        setSelectedCategorie(null);
        showImagePickerOptions();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
          <View style={styles.modalContent}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.headerTitle}>Ajouter une nouvelle image</Text>
              
              {/* Storage Quota Banner */}
              {!loadingLimits && companyInfo && (
                <View style={[styles.limitInfoBanner, isStorageQuotaReached && styles.limitInfoBannerWarning]}>
                  <Ionicons 
                    name={isStorageQuotaReached ? "warning" : "cloud-outline"} 
                    size={16} 
                    color={isStorageQuotaReached ? "#b45309" : "#3b82f6"} 
                  />
                  <Text style={[styles.limitInfoText, isStorageQuotaReached && styles.limitInfoTextWarning]}>
                    Stockage: {currentStorageGB.toFixed(2)}GB / {storageQuotaGB.toFixed(2)}GB
                    {isStorageQuotaReached && " - Quota dépassé"}
                  </Text>
                </View>
              )}
              
              <View style={styles.imageContainer}>
                <TouchableOpacity style={styles.imagePicker} onPress={showImagePickerOptions}>
                  {image ? (
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera-outline" size={48} color={COLORS.gray} />
                      <Text style={styles.imagePickerText}>Prendre une photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {image && (
                  <TouchableOpacity style={styles.deleteButton} onPress={() => setImage(null)}>
                    <Ionicons name="trash-outline" size={24} color={COLORS.deleteColor} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.form}>
                <Text style={styles.label}>Titre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ex: 'Photo d'inspection du site'"
                  placeholderTextColor={COLORS.gray}
                  value={title}
                  onChangeText={setTitle}
                />
                
                <VoiceNoteRecorder 
                  onRecordingComplete={handleRecordingComplete}
                  onTranscriptionComplete={(text) => {
                    // This is handled by automatic transcription, but keep for manual transcription if needed
                    setDescription(prev => prev ? `${prev}\n${text}` : text);
                  }}
                />
              </View>
              
              {/* Anomaly Type Selection */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Type d&apos;anomalie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScrollView}>
                  {ANOMALY_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.key}
                      style={[styles.typeButton, selectedType === type.key && styles.typeButtonSelected]}
                      onPress={() => setSelectedType(type.key)}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={20}
                        color={selectedType === type.key ? '#FFFFFF' : '#11224e'}
                      />
                      <Text style={[styles.typeButtonText, selectedType === type.key && styles.typeButtonTextSelected]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Anomaly Category Selection */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Catégorie d&apos;anomalie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollView}>
                  {ANOMALY_CATEGORIES.map(category => (
                    <TouchableOpacity
                      key={category.key}
                      style={[
                        styles.categoryButton,
                        selectedCategorie === category.key && styles.categoryButtonSelected,
                      ]}
                      onPress={() => setSelectedCategorie(category.key)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          selectedCategorie === category.key && styles.categoryButtonTextSelected,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Severity Slider */}
              <View style={styles.sectionContainer}>
                <Text style={styles.severityTitle}>Niveau de sévérité</Text>
                <PanGestureHandler onGestureEvent={onSeverityPan}>
                  <View 
                    style={styles.severityContainer}
                    onLayout={(event) => setSeveritySliderWidth(event.nativeEvent.layout.width)}
                  >
                    <View style={styles.severityHeader}>
                      <Text style={[styles.severityValue, { color: getSeverityColor(level) }]}>
                        {level}/10
                      </Text>
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(level) }]}>
                        <Text style={styles.severityBadgeText}>{getSeverityText(level)}</Text>
                      </View>
                    </View>
                    <View style={styles.severitySlider}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.severityDot,
                            level >= value && [styles.severityDotActive, { backgroundColor: getSeverityColor(level) }],
                            level === value && [styles.severityDotSelected, { borderColor: getSeverityColor(level) }],
                          ]}
                          onPress={() => setLevel(value)}
                          activeOpacity={0.7}
                        />
                      ))}
                    </View>
                  </View>
                </PanGestureHandler>
              </View>

              <View style={[styles.form, { marginTop: 20 }]}>
                <Text style={styles.label}>Description</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ajoutez une courte description (facultatif)"
                    placeholderTextColor={COLORS.gray}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    editable={!isGeneratingDescription}
                  />
                  {(isGeneratingDescription) && (
                    <View style={styles.descriptionLoadingOverlay}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.descriptionLoadingText}>
                        Analyse en cours...
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>Arrêt</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, styles.addButton, isStorageQuotaReached && styles.addButtonDisabled]} 
                  onPress={() => handleAdd(false)}
                  disabled={isStorageQuotaReached}
                >
                  <Text style={styles.buttonText}>Ajouter l&apos;image</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        maxHeight: '90%',
        backgroundColor: COLORS.white,
        borderTopLeftRadius: SIZES.xLarge,
        borderTopRightRadius: SIZES.xLarge,
        padding: SIZES.large,
    },
    headerTitle: {
        textAlign: 'center',
        fontFamily: FONT.bold,
        fontSize: SIZES.xLarge,
        marginBottom: SIZES.large,
        color: COLORS.secondary,
    },
    labelContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    sparkleButton: {
        padding: SIZES.small,
    },
    imageContainer: {
        width: '100%',
        marginBottom: SIZES.large,
    },
    imagePicker: {
        width: '100%',
        height: 180,
        backgroundColor: COLORS.lightWhite,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SIZES.medium,
        borderWidth: 2,
        borderColor: COLORS.gray2,
        borderStyle: 'dashed',
    },
    imagePickerPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePickerText: {
        fontFamily: FONT.medium,
        color: COLORS.gray,
        marginTop: SIZES.small,
        fontSize: SIZES.medium,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: SIZES.medium,
    },
    deleteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 20,
    },
    form: {
        width: '100%',
    },
    voiceNoteContainer: {
      marginBottom: SIZES.medium,
    },
    label: {
        fontFamily: FONT.medium,
        fontSize: SIZES.medium,
        color: COLORS.secondary,
        marginBottom: SIZES.small,
        alignSelf: 'flex-start',
    },
    input: {
        width: '100%',
        padding: SIZES.medium,
        backgroundColor: COLORS.lightWhite,
        borderRadius: SIZES.small,
        marginBottom: SIZES.medium,
        fontFamily: FONT.regular,
        fontSize: SIZES.medium,
        borderWidth: 1,
        borderColor: COLORS.gray2,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: SIZES.large,
        width: '100%',
        paddingBottom: SIZES.medium,
    },
    button: {
        flex: 1,
        paddingVertical: SIZES.medium,
        borderRadius: SIZES.medium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.lightWhite,
        marginRight: SIZES.small,
        borderWidth: 1,
        borderColor: COLORS.gray2,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        marginLeft: SIZES.small,
    },
    buttonText: {
        color: COLORS.white,
        fontFamily: FONT.bold,
        fontSize: SIZES.medium,
    },
    cancelButtonText: {
        color: COLORS.secondary,
    },
    descriptionLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SIZES.small,
        gap: 8,
    },
    descriptionLoadingText: {
        color: COLORS.primary,
        fontFamily: FONT.medium,
        fontSize: SIZES.small,
    },
    sectionContainer: {
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.primary,
      marginBottom: 12,
    },
    severityTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#334155',
      marginBottom: 12,
    },
    typeScrollView: {
      gap: 10,
      paddingHorizontal: 2,
    },
    typeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f1f5f9',
      borderRadius: 99,
      paddingVertical: 8,
      paddingHorizontal: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: COLORS.gray2,
    },
    typeButtonSelected: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    typeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.secondary,
    },
    typeButtonTextSelected: {
      color: '#FFFFFF',
    },
    categoryScrollView: {
      gap: 10,
      paddingHorizontal: 2,
    },
    categoryButton: {
      backgroundColor: '#f1f5f9',
      borderRadius: 99,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: COLORS.gray2,
    },
    categoryButtonSelected: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    categoryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.secondary,
    },
    categoryButtonTextSelected: {
      color: '#FFFFFF',
    },
    severityContainer: {
      alignItems: 'center',
      marginTop: 8,
    },
    severityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    severityValue: {
      fontSize: 18,
      fontWeight: '600',
    },
    severityBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    severityBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    severitySlider: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    severityDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#E5E5EA',
      borderWidth: 2,
      borderColor: '#E5E5EA',
    },
    severityDotActive: {
      borderColor: '#E5E5EA',
    },
    severityDotSelected: {
      backgroundColor: '#FFFFFF',
      borderWidth: 3,
    },
    limitInfoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginHorizontal: 0,
      marginTop: 12,
      marginBottom: 8,
      borderRadius: 10,
    },
    limitInfoBannerWarning: {
      backgroundColor: '#fffbeb',
      borderColor: '#f59e0b',
    },
    limitInfoText: {
      color: '#1e40af',
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    limitInfoTextWarning: {
      color: '#b45309',
    },
    addButtonDisabled: {
      backgroundColor: '#d1d5db',
      opacity: 0.6,
    },
});
