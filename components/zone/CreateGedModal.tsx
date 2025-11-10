import { useAuth } from '@/contexts/AuthContext';
import { createGed, type CreateGedInput } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  zoneId: string;
  onSuccess?: () => void;
};

export default function CreateGedModal({ visible, onClose, zoneId, onSuccess }: Props) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Get user's current location every time modal opens
  useEffect(() => {
    if (visible) {
      // Reset location first, then get fresh location
      setLatitude(null);
      setLongitude(null);
      getCurrentLocation();
    } else {
      // Reset location when modal closes
      setLatitude(null);
      setLongitude(null);
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        setIsGettingLocation(false);
        return;
      }

      // Get fresh current location each time (no cache)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
    } catch (err) {
      console.error('Error getting location:', err);
      // Silently fail - location is optional
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la caméra pour prendre une photo');
        return;
      }

      // Open camera to take a new photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setImageAsset(result.assets[0]);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (!selectedImage || !imageAsset) {
      setError('Veuillez sélectionner une image');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get file extension from URI or use default
      const uriParts = imageAsset.uri.split('.');
      const fileType = imageAsset.type || `image/${uriParts[uriParts.length - 1]}`;
      const fileName = imageAsset.fileName || `photo_${Date.now()}.${uriParts[uriParts.length - 1]}`;

      // Get username from token (primary) or user object (fallback)
      let authorName = 'Unknown User';
      
      // First try to get username from token (as stored by backend)
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
            // Use username from token (firstname + " " + lastname as set in backend)
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
      
      // Fallback to user object if token decode failed or username not in token
      if (authorName === 'Unknown User' && user) {
        const name = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
        if (name) {
          authorName = name;
        } else if (user.email) {
          authorName = user.email;
        }
      }

      const input: CreateGedInput = {
        idsource: zoneId,
        title: title.trim(),
        description: description.trim() || undefined,
        kind: 'delimitation',
        author: authorName,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        file: {
          uri: imageAsset.uri,
          type: fileType,
          name: fileName,
        },
      };

      await createGed(token!, input);
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedImage(null);
      setImageAsset(null);
      setLatitude(null);
      setLongitude(null);
      setError(null);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création de la photo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setDescription('');
      setSelectedImage(null);
      setImageAsset(null);
      setLatitude(null);
      setLongitude(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          disabled={isSubmitting}
        >
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>

        {/* Error Banner */}
        {error && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconContainer}>
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
            </View>
            <Text style={styles.alertBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)} style={styles.alertCloseButton}>
              <Ionicons name="close" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Title Input */}
          <View style={[styles.card, styles.firstCard]}>
            <View style={styles.labelContainer}>
              <Ionicons name="text-outline" size={18} color="#f87b1b" />
              <Text style={styles.label}>Titre *</Text>
            </View>
            <TextInput
              style={[styles.input, focusedInput === 'title' && styles.inputFocused]}
              value={title}
              onChangeText={setTitle}
              placeholder="Donnez un titre à votre photo"
              placeholderTextColor="#9ca3af"
              editable={!isSubmitting}
              onFocus={() => setFocusedInput('title')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Description Input */}
          <View style={styles.card}>
            <View style={styles.labelContainer}>
              <Ionicons name="document-text-outline" size={18} color="#f87b1b" />
              <Text style={styles.label}>Description</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea, focusedInput === 'description' && styles.inputFocused]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ajoutez une description (optionnel)"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              editable={!isSubmitting}
              onFocus={() => setFocusedInput('description')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Image Picker */}
          <View style={styles.card}>
            <View style={styles.labelContainer}>
              <Ionicons name="image-outline" size={18} color="#f87b1b" />
              <Text style={styles.label}>Photo *</Text>
            </View>
            {selectedImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      setSelectedImage(null);
                      setImageAsset(null);
                    }}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="trash" size={20} color="#FFFFFF" />
                    <Text style={styles.removeImageText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handlePickImage}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <View style={styles.imagePickerIconContainer}>
                  <Ionicons name="camera" size={40} color="#f87b1b" />
                </View>
                <Text style={styles.imagePickerTitle}>Prendre une photo</Text>
                <Text style={styles.imagePickerSubtitle}>Appuyez pour ouvrir la caméra</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location Status */}
          {isGettingLocation && (
            <View style={styles.card}>
              <View style={styles.locationStatusContainer}>
                <ActivityIndicator color="#f87b1b" size="small" />
                <View style={styles.locationStatusTextContainer}>
                  <Text style={styles.locationStatusTitle}>Obtention de votre localisation</Text>
                  <Text style={styles.locationStatusSubtitle}>Veuillez patienter...</Text>
                </View>
              </View>
            </View>
          )}
          {latitude !== null && longitude !== null && !isGettingLocation && (
            <View style={styles.card}>
              <View style={styles.labelContainer}>
                <Ionicons name="location" size={18} color="#f87b1b" />
                <Text style={styles.label}>Localisation</Text>
              </View>
              <View style={styles.locationInfoContainer}>
                <View style={styles.locationIconContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <View style={styles.locationInfoTextContainer}>
                  <Text style={styles.locationInfoTitle}>Localisation capturée</Text>
                  <Text style={styles.locationInfoText}>
                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !title.trim() || !selectedImage}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Ajouter la photo</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 60,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBannerText: {
    color: '#991b1b',
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  alertCloseButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 20,
  },
  scrollContent: {
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  firstCard: {
    marginTop: 0,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11224e',
    letterSpacing: -0.3,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#11224e',
    backgroundColor: '#FFFFFF',
    fontFamily: 'System',
  },
  inputFocused: {
    borderColor: '#f87b1b',
    backgroundColor: '#fffbeb',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    gap: 10,
  },
  imagePickerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef3e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11224e',
    marginTop: 6,
  },
  imagePickerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 8,
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  locationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  locationStatusTextContainer: {
    flex: 1,
  },
  locationStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 2,
  },
  locationStatusSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  locationInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfoTextContainer: {
    flex: 1,
  },
  locationInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 2,
  },
  locationInfoText: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: '#f87b1b',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#f87b1b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
