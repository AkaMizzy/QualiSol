import VoiceNoteRecorder from '@/components/VoiceNoteRecorder';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { describeImage, transcribeAudio } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddImageModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; description: string; image: ImagePicker.ImagePickerAsset | null; voiceNote: { uri: string; type: string; name: string; } | null; author: string; latitude: number | null; longitude: number | null; }) => void;
}

export default function AddImageModal({ visible, onClose, onAdd }: AddImageModalProps) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [voiceNote, setVoiceNote] = useState<{ uri: string; type: string; name: string; } | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const prevVisibleRef = useRef(visible);

  const handleGenerateDescription = useCallback(async (photoToDescribe: ImagePicker.ImagePickerAsset) => {
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
  }, [token]);

  const handleTranscribeAudio = useCallback(async (audioUri: string, audioType: string) => {
    if (!audioUri || !token) {
      return;
    }
    setIsTranscribing(true);
    try {
      const fileName = audioUri.split('/').pop() || `voicenote-${Date.now()}.m4a`;
      const audioFile = {
        uri: audioUri,
        type: audioType,
        name: fileName,
      };
      const transcribedText = await transcribeAudio(token, audioFile);
      setDescription(prev => prev ? `${prev}\n${transcribedText}` : transcribedText);
    } catch (e: any) {
      console.error('Failed to transcribe audio:', e);
    } finally {
      setIsTranscribing(false);
    }
  }, [token]);

  const handleRecordingComplete = useCallback((uri: string | null) => {
    if (uri) {
      const voiceNoteData = {
        uri,
        type: 'audio/m4a',
        name: `voicenote-${Date.now()}.m4a`,
      };
      setVoiceNote(voiceNoteData);
      // Automatically transcribe the audio
      handleTranscribeAudio(uri, 'audio/m4a');
    } else {
      setVoiceNote(null);
    }
  }, [handleTranscribeAudio]);

  const handleChoosePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Désolé, nous avons besoin des autorisations de l\'appareil photo pour que cela fonctionne !');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setImage(selectedImage);
      handleGenerateDescription(selectedImage);
    }
  }, [handleGenerateDescription]);

  useEffect(() => {
    const prevVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !prevVisible) {
      // Modal just opened, trigger camera
      handleChoosePhoto();
    } else if (!visible && prevVisible) {
      // Modal just closed, reset form
      setTitle('');
      setDescription('');
      setImage(null);
      setVoiceNote(null);
      setLatitude(null);
      setLongitude(null);
      setIsGeneratingDescription(false);
      setIsTranscribing(false);
    }
  }, [visible, handleChoosePhoto]);

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

  const handleAdd = () => {
    if (!title || !image) {
      Alert.alert('Informations manquantes', 'Veuillez fournir un titre et une image.');
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

    onAdd({ title, description, image, voiceNote, author: authorName, latitude, longitude });
    setTitle('');
    setDescription('');
    setImage(null);
    setVoiceNote(null);
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
              
              <View style={styles.imageContainer}>
                <TouchableOpacity style={styles.imagePicker} onPress={handleChoosePhoto}>
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
                
                <Text style={styles.label}>Description</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ajoutez une courte description (facultatif)"
                    placeholderTextColor={COLORS.gray}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    editable={!isGeneratingDescription && !isTranscribing}
                  />
                  {(isGeneratingDescription || isTranscribing) && (
                    <View style={styles.descriptionLoadingOverlay}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.descriptionLoadingText}>
                        {isGeneratingDescription ? 'Analyse en cours...' : 'Transcription en cours...'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              <VoiceNoteRecorder 
                onRecordingComplete={handleRecordingComplete}
                onTranscriptionComplete={(text) => {
                  // This is handled by automatic transcription, but keep for manual transcription if needed
                  setDescription(prev => prev ? `${prev}\n${text}` : text);
                }}
              />
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAdd}>
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
});
