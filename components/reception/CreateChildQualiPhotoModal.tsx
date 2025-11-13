// import PictureAnnotator from '@/components/PictureAnnotator';
import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { CreateGedInput, Ged, createGed, describeImage } from '@/services/gedService';
import { Folder } from '@/services/qualiphotoService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceNoteRecorder from '../VoiceNoteRecorder';

type FormProps = {
  onClose: () => void;
  onSuccess: (created: Ged) => void;
  parentItem: Folder;
  projectTitle: string;
  zoneTitle: string;
};

export function CreateChildQualiPhotoForm({ onClose, onSuccess, parentItem, projectTitle, zoneTitle }: FormProps) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [creationCount, setCreationCount] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const [isAnnotatorVisible, setAnnotatorVisible] = useState(false);
  const [annotatorBaseUri, setAnnotatorBaseUri] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const canSave = useMemo(() => !!photo && !submitting && !isGeneratingDescription && !isUploadingAudio, [photo, submitting, isGeneratingDescription, isUploadingAudio]);

  useEffect(() => {
    async function loadAuthorName() {
      if (!token || !user) {
        setAuthorName('Utilisateur inconnu');
        return;
      }

      // Set a fallback name immediately from context if available
      if (user.firstname) {
        setAuthorName(`${user.firstname} ${user.lastname || ''}`.trim());
      } else {
        setAuthorName('Chargement...');
      }

      try {
        const baseUrl = API_CONFIG.BASE_URL?.replace(/\/$/, '') || '';
        const url = `${baseUrl}/api/users`;
        
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const users = await res.json();
          if (Array.isArray(users)) {
            const currentUser = users.find(u => u.id === user.id);
            if (currentUser && currentUser.firstname) {
              setAuthorName(`${currentUser.firstname} ${currentUser.lastname || ''}`.trim());
              return; // Found user, exit
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch user list for author name", e);
      }

      // If fetch fails or user not found, stick with context or default
      if (user.firstname) {
        setAuthorName(`${user.firstname} ${user.lastname || ''}`.trim());
      } else {
         setAuthorName(user.email || 'Utilisateur inconnu');
      }
    }
    loadAuthorName();
  }, [token, user]);

  const handleGenerateDescription = useCallback(async (photoToDescribe: { uri: string; name: string; type: string }) => {
    if (!photoToDescribe || !token) {
      return;
    }
    setIsGeneratingDescription(true);
    setError(null);
    try {
      const description = await describeImage(token, photoToDescribe);
      setComment(prev => prev ? `${prev}\n${description}` : description);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate description');
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [token]);

  const resetForm = () => {
    setTitle('');
    setComment('');
    setPhoto(null);
    setLatitude(null);
    setLongitude(null);
    setAudioUri(null);
    setLocationStatus('idle');
    setError(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true }); // Scroll to top
  };

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'L\'autorisation d\'accéder à la caméra est requise.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = uri.split('/').pop() || 'photo.jpg';
      const fileType = fileName.split('.').pop() || 'jpeg';

      const newPhoto = {
        uri,
        name: fileName,
        type: `image/${fileType}`,
      };

      setPhoto(newPhoto);
      handleGenerateDescription(newPhoto);
    }
  }, [handleGenerateDescription]);

  const openAnnotatorForExisting = () => {
    if (!photo) return;
    setAnnotatorBaseUri(photo.uri);
    setAnnotatorVisible(true);
  };

  const handleSubmit = async () => {
    if (!token || !photo || !user) {
      setError('Impossible de soumettre : informations utilisateur ou photo manquantes.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateGedInput = {
        idsource: parentItem.id,
        title: title || 'Situation Avant',
        kind: 'photoavant',
        description: comment,
        author: authorName,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        file: photo,
      };

      const result = await createGed(token, payload);

      if (audioUri) {
        setIsUploadingAudio(true);
        try {
          const audioPayload: CreateGedInput = {
            idsource: result.data.id,
            title: `Note vocale pour ${title || 'Situation Avant'}`,
            kind: 'audio',
            author: authorName,
            file: {
              uri: audioUri,
              name: `note_${Date.now()}.m4a`,
              type: 'audio/m4a',
            },
          };
          await createGed(token, audioPayload);
        } catch (audioErr: any) {
          Alert.alert('Erreur Audio', `La photo a été enregistrée, mais l'envoi de la note vocale a échoué : ${audioErr.message}`);
        } finally {
          setIsUploadingAudio(false);
        }
      }

      onSuccess(result.data);
      setCreationCount(prev => prev + 1);
      resetForm();
      handlePickPhoto(); // Re-open camera for next photo
    } catch (e: any) {
      setError(e?.message || 'Échec de l\'enregistrement de la photo "avant".');
      Alert.alert('Erreur', e?.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // Auto-trigger camera when form is ready
    const timer = setTimeout(() => {
      handlePickPhoto();
    }, 500);

    return () => clearTimeout(timer);
  }, [handlePickPhoto]);

  useEffect(() => {
    const fetchLocation = async () => {
      setLocationStatus('fetching');
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied.');
          setLocationStatus('error');
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
        setLocationStatus('success');
      } catch (error) {
        console.warn('Could not fetch location automatically.', error);
        setLocationStatus('error');
      }
    };
    fetchLocation();
  }, []);

  return (
    <>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerStopButton}>
            <Text style={styles.stopButtonText}></Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {parentItem.title || `Titre de la dossier`}
            </Text>
          </View>
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>{creationCount}</Text>
            <Ionicons name="images-outline" size={20} color="#11224e" />
          </View>
        </View>

        {error && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color="#b45309" />
            <Text style={styles.alertBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={16} color="#b45309" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Parent Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {`${projectTitle} • ${zoneTitle}`}
                </Text>
              </View>
            </View>
          
            <View style={styles.separator} />

            {/* New Photo Card */}
          

            {photo ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: photo.uri }} style={styles.imagePreview} />
                <View style={styles.imageActions}>
                  <TouchableOpacity style={[styles.iconButton, styles.iconButtonSecondary]} onPress={handlePickPhoto}>
                    <Ionicons name="camera-reverse-outline" size={20} color="#11224e" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconButton, styles.iconButtonSecondary]} onPress={openAnnotatorForExisting}>
                    <Ionicons name="create-outline" size={20} color="#11224e" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconButton, styles.iconButtonSecondary]} onPress={() => setPhoto(null)}>
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoPickerButton} onPress={handlePickPhoto}>
                <Ionicons name="camera-outline" size={24} color="#475569" />
                <Text style={styles.photoPickerText}>Ajouter une Situation avant</Text>
              </TouchableOpacity>
            )}
            <View style={{ marginTop: 16, gap: 12 }}>
              <View style={[styles.inputWrap]}>
                <Ionicons name="text-outline" size={16} color="#6b7280" />
                <TextInput
                  placeholder="Titre "
                  placeholderTextColor="#9ca3af"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputWrap, { alignItems: 'flex-start' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6b7280" style={{ marginTop: 4 }} />
                <TextInput
                  placeholder="Description "
                  placeholderTextColor="#9ca3af"
                  value={comment}
                  onChangeText={setComment}
                  style={[styles.input, { height: 160 }]}
                  multiline
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                  editable={!isGeneratingDescription}
                />
                {isGeneratingDescription && (
                  <View style={styles.descriptionLoadingOverlay}>
                    <ActivityIndicator size="small" color="#11224e" />
                    <Text style={styles.descriptionLoadingText}>Analyse en cours...</Text>
                  </View>
                )}
              </View>
              <VoiceNoteRecorder
                onRecordingComplete={setAudioUri}
                onTranscriptionComplete={(text) => {
                  setComment(prev => (prev ? `${prev}\n${text}` : text));
                }}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.stopButton} onPress={onClose}>
            <Text style={styles.stopButtonText}>Arrêter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitButton, !canSave && styles.submitButtonDisabled]} disabled={!canSave} onPress={handleSubmit}>
            {submitting ? (
              <>
                <Ionicons name="hourglass" size={16} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Enregistrement...</Text>
              </>
            ) : isGeneratingDescription ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Génération IA...</Text>
              </>
            ) : isUploadingAudio ? (
                <>
                  <Ionicons name="mic-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Note vocale...</Text>
                </>
            ) : (
              <>
                <Ionicons name="save" size={16} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
    {isAnnotatorVisible && annotatorBaseUri && (
      <Modal
        animationType="fade"
        visible={isAnnotatorVisible}
        onRequestClose={() => setAnnotatorVisible(false)}
      >
        {/* <PictureAnnotator
          baseImageUri={annotatorBaseUri}
          onClose={() => setAnnotatorVisible(false)}
          onSaved={(image) => {
            setPhoto(image);
            setAnnotatorVisible(false);
          }}
          title="Annoter la photo"
        /> */}
      </Modal>
    )}
    </>
  );
}

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (created: Ged) => void;
  parentItem: Folder;
  projectTitle: string;
  zoneTitle: string;
};

export default function CreateChildQualiPhotoModal({ visible, onClose, onSuccess, parentItem, projectTitle, zoneTitle }: ModalProps) {
  if (!visible) return null;
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <CreateChildQualiPhotoForm 
        onClose={onClose}
        onSuccess={onSuccess}
        parentItem={parentItem}
        projectTitle={projectTitle}
        zoneTitle={zoneTitle}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerStopButton: { padding: 8, },
  stopButtonText: { color: '#f87b1b', fontWeight: '600', fontSize: 16 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  counterContainer: {
    minWidth: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11224e',
  },
  content: { flex: 1, paddingHorizontal: 16 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  alertBannerText: { color: '#b45309', flex: 1, fontSize: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 16, marginHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardHeaderText: { flex: 1, alignItems: 'center' },
  cardTitle: { fontSize: 12, color: '#11224e', fontWeight: '500' },
  cardSubtitle: {
    fontSize: 12,
    color: '#11224e',
    marginTop: 2,
  },
  
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },

  parentPhotoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  parentPhoto: {
    width: '100%',
    aspectRatio: 2 / 1,
    backgroundColor: '#e5e7eb',
  },
  parentInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  parentInfoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  photoPickerButton: {
    borderWidth: 2,
    borderColor: '#f87b1b',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  photoPickerText: {
    color: '#475569',
    fontWeight: '600',
  },

  imagePreviewContainer: {
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 2 / 1,
    borderRadius: 12,
  },
  imageActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 99,
  },
  iconButtonSecondary: {
    backgroundColor: '#f1f5f9',
    borderRadius: 99,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },

  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f87b1b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, position: 'relative' },
  input: { flex: 1, color: '#111827', fontSize: 16 },

  descriptionLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    gap: 8,
  },
  descriptionLoadingText: {
    color: '#11224e',
    fontWeight: '600',
    fontSize: 12,
  },

  stopButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 48,
    flex: 1,
    borderWidth: 1,
    borderColor: '#f87b1b'
  },

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  submitButton: { backgroundColor: '#f87b1b', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, height: 48, flex: 1 },
  submitButtonDisabled: { backgroundColor: '#d1d5db' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
