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
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
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
  const [level, setLevel] = useState(5);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [severitySliderWidth, setSeveritySliderWidth] = useState(0);

  const [isAnnotatorVisible, setAnnotatorVisible] = useState(false);
  const [annotatorBaseUri, setAnnotatorBaseUri] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const canSave = useMemo(() => !!photo && !!selectedType && !submitting && !isGeneratingDescription && !isUploadingAudio, [photo, selectedType, submitting, isGeneratingDescription, isUploadingAudio]);

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
    setLevel(5);
    setSelectedType(null);
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
        level: level,
        type: selectedType || undefined,
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

  const ANOMALY_TYPES = [
    { key: 'type1', label: 'Incendie', icon: 'flame-outline' },
    { key: 'type2', label: 'Inondation', icon: 'water-outline' },
    { key: 'type3', label: 'Structure', icon: 'business-outline' },
    { key: 'type4', label: 'Électrique', icon: 'flash-outline' },
    { key: 'type5', label: 'CVC', icon: 'snow-outline' },
    { key: 'type6', label: 'Autre', icon: 'ellipsis-horizontal-outline' },
  ] as const;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {`${projectTitle} • ${zoneTitle}`}
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
          <View style={styles.card}>
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
              <VoiceNoteRecorder
                onRecordingComplete={setAudioUri}
                onTranscriptionComplete={(text) => {
                  setComment(prev => (prev ? `${prev}\n${text}` : text));
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

            {/* Severity Slider */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Niveau de sévérité</Text>
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

            <View style={{ marginTop: 16, gap: 12 }}>
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
    </GestureHandlerRootView>
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
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
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

  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
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
    borderColor: '#e2e8f0',
  },
  typeButtonSelected: {
    backgroundColor: '#f87b1b',
    borderColor: '#f87b1b',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11224e',
  },
  typeButtonTextSelected: {
    color: '#FFFFFF',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
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
