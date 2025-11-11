import PictureAnnotator from '@/components/PictureAnnotator';
import ZonePictureEditor from '@/components/ZonePictureEditor';
import { useAuth } from '@/contexts/AuthContext';
import qualiphotoService, { QualiPhotoItem, QualiZone } from '@/services/qualiphotoService';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FormProps = {
  onClose: () => void;
  onSuccess: (created: Partial<QualiPhotoItem>) => void;
  parentItem: QualiPhotoItem;
};

export function CreateChildQualiPhotoForm({ onClose, onSuccess, parentItem }: FormProps) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [voiceNote, setVoiceNote] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranscribed, setIsTranscribed] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [creationCount, setCreationCount] = useState(0);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const [annotatedPlan, setAnnotatedPlan] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [isPlanEditorVisible, setPlanEditorVisible] = useState(false);
  const [currentZoneLogo, setCurrentZoneLogo] = useState<string | null>(null);

  const [zones, setZones] = useState<QualiZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(parentItem.id_zone);

  const [isAnnotatorVisible, setAnnotatorVisible] = useState(false);
  const [annotatorBaseUri, setAnnotatorBaseUri] = useState<string | null>(null);

  const durationIntervalRef = useRef<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionPromiseRef = useRef<Promise<any> | null>(null);

  const canSave = useMemo(() => !!photo && !submitting, [photo, submitting]);

  const resetForm = () => {
    setTitle('');
    setComment('');
    setPhoto(null);
    setVoiceNote(null);
    setRecording(null);
    setAnnotatedPlan(null);
    if (sound) sound.unloadAsync();
    setSound(null);
    setIsPlaying(false);
    setIsRecording(false);
    setRecordingDuration(0);
    setSelectedZoneId(parentItem.id_zone); // Reset to parent's zone
    setLatitude(null);
    setLongitude(null);
    setLocationStatus('idle');
    setError(null);
    descriptionPromiseRef.current = null;
    scrollViewRef.current?.scrollTo({ y: 0, animated: true }); // Scroll to top
  };

  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  const startDescriptionGeneration = useCallback((photoToDescribe: { uri: string; name: string; type: string }) => {
    if (!token) return;

    setIsGeneratingDescription(true);
    const promise = qualiphotoService.describeImage(photoToDescribe, token)
      .then(result => {
        setComment(prev => (prev ? `${prev}\n${result.description}` : result.description));
        return result.description; // Pass description to next .then()
      })
      .catch(e => {
        // Silently fail for the user, but log it.
        console.warn('Failed to auto-generate description:', e);
        // Rethrow to allow handleSubmit to know it failed
        throw e;
      })
      .finally(() => {
        setIsGeneratingDescription(false);
      });
    
    descriptionPromiseRef.current = promise;
  }, [token]);

  const handleGenerateDescription = useCallback(async (photoToDescribe: { uri: string; name: string; type: string }) => {
    if (!photoToDescribe || !token) {
      Alert.alert('Erreur', "Veuillez d'abord sélectionner une image.");
      return;
    }
    setIsGeneratingDescription(true);
    setError(null);
    try {
      const result = await qualiphotoService.describeImage(photoToDescribe, token);
      setComment(prev => prev ? `${prev}\n${result.description}` : result.description);
    } catch (e: any) {
      setError(e?.message || 'Échec de la génération de la description');
      Alert.alert('Erreur', e?.message || 'Une erreur est survenue lors de la génération de la description.');
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [token]);

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'L\'autorisation d\'accéder à la caméra est requise.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newPhoto = { uri: asset.uri, name: `photo-${Date.now()}.jpg`, type: 'image/jpeg' };
      setPhoto(newPhoto);
      startDescriptionGeneration(newPhoto);
    }
  }, [startDescriptionGeneration]);

  const handleEnhanceDescription = async () => {
    if (!comment || !token) {
      Alert.alert('Erreur', 'Aucune description à améliorer.');
      return;
    }
    setIsEnhancing(true);
    setError(null);
    try {
      const result = await qualiphotoService.enhanceDescription(comment, token);
      setComment(result.enhancedDescription);
    } catch (e: any) {
      setError(e?.message || 'Échec de l\'amélioration');
      Alert.alert('Erreur d\'amélioration', e?.message || 'Une erreur est survenue lors de l\'amélioration de la description.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const openAnnotatorForExisting = () => {
    if (!photo) return;
    setAnnotatorBaseUri(photo.uri);
    setAnnotatorVisible(true);
  };

  const handleSubmit = async () => {
    if (!token || !photo) return;
    setSubmitting(true);
    setError(null);

    try {
      const created = await qualiphotoService.createChild(parentItem.id, {
        title: title || parentItem.title || undefined,
        commentaire: comment,
        photo,
        photo_plan: annotatedPlan || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        voice_note: voiceNote || undefined,
      }, token);

      if (created.id && descriptionPromiseRef.current) {
        descriptionPromiseRef.current
          .then(generatedDescription => {
            if (generatedDescription && generatedDescription.trim() !== '' && comment.trim() !== generatedDescription.trim()) {
              qualiphotoService.updateQualiPhoto(
                created.id as string,
                { commentaire: comment ? `${comment}\n${generatedDescription}` : generatedDescription },
                token
              ).catch(e => {
                console.warn('Background description update failed:', e);
              });
            }
          })
          .catch(e => {
            // The error is already logged in startDescriptionGeneration
          });
      }

      onSuccess(created);
      setCreationCount(prev => prev + 1);
      resetForm();
      handlePickPhoto();
    } catch (e: any) {
      setError(e?.message || 'Échec de l\'enregistrement de la photo "avant".');
    } finally {
      setSubmitting(false);
    }
  };

  async function startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès au microphone est requis pour enregistrer l\'audio.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setIsRecording(false);
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      const newVoiceNote = { uri, name: `voicenote-${Date.now()}.m4a`, type: 'audio/m4a' };
      setVoiceNote(newVoiceNote);
      setIsTranscribed(false);
      // Automatically transcribe the voice note
      transcribeVoiceNote(newVoiceNote);
    }
    setRecording(null);
  }

  async function playSound() {
    if (!voiceNote) return;
    if (isPlaying && sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
      return;
    }
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
      return;
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: voiceNote.uri });
    setSound(newSound);
    setIsPlaying(true);
    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setIsPlaying(false);
        newSound.setPositionAsync(0);
      }
    });
    await newSound.playAsync();
  }

  const resetVoiceNote = () => {
    if (sound) sound.unloadAsync();
    setVoiceNote(null);
    setSound(null);
    setIsPlaying(false);
    setIsTranscribed(false);
  };

  const transcribeVoiceNote = async (voiceNoteToTranscribe: { uri: string; name: string; type: string }) => {
    if (!voiceNoteToTranscribe || !token) {
      return;
    }
    setIsTranscribing(true);
    setError(null);
    try {
      const result = await qualiphotoService.transcribeVoiceNote(voiceNoteToTranscribe, token);
      setComment(prev => prev ? `${prev}\n${result.transcription}` : result.transcription);
      setIsTranscribed(true);
    } catch (e: any) {
      setError(e?.message || 'Échec de la transcription');
      Alert.alert('Erreur de Transcription', e?.message || 'Une erreur est survenue lors de la transcription.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTranscribe = async () => {
    if (!voiceNote || !token) {
      Alert.alert('Erreur', 'Aucune note vocale à transcrire.');
      return;
    }
    await transcribeVoiceNote(voiceNote);
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  useEffect(() => {
    async function loadZones() {
      if (!token || !parentItem?.id_project) return;
      setZonesLoading(true);
      setZonesError(null);
      try {
        const fetched = await qualiphotoService.getZonesByProject(parentItem.id_project, token);
        setZones(fetched);
      } catch (e: any) {
        setZonesError(e?.message || 'Impossible de charger les zones');
      } finally {
        setZonesLoading(false);
      }
    }
    loadZones();
  }, [token, parentItem?.id_project]);

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
                  {`${parentItem.project_title} • ${parentItem.zone_title}${parentItem.date_taken ? ` • ${formatDate(parentItem.date_taken)}` : ''}`}
                </Text>
              </View>
            </View>
            {parentItem.photo && creationCount === 0 ? (
              <View style={styles.parentPhotoContainer}>
                <Image source={{ uri: parentItem.photo }} style={styles.parentPhoto} />
              </View>
            ) : null}
          
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
                <Text style={styles.photoPickerText}>{`Ajouter une Photo "Avant"`}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.voiceNoteContainer}>
              {isRecording ? (
                <View style={styles.recordingWrap}>
                  <Text style={styles.recordingText}>Enregistrement... {formatDuration(recordingDuration)}</Text>
                  <TouchableOpacity style={styles.stopRecordingButton} onPress={stopRecording}>
                    <Ionicons name="stop-circle" size={24} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.voiceActionsContainer}>
                  {voiceNote ? (
                    <View style={styles.audioPlayerWrap}>
                      <TouchableOpacity style={styles.playButton} onPress={playSound}>
                        <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={28} color="#11224e" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.deleteButton, isTranscribed && styles.buttonDisabled]} onPress={resetVoiceNote} disabled={isTranscribed}>
                        <Ionicons name="trash-outline" size={20} color={isTranscribed ? '#9ca3af' : '#dc2626'} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.voiceRecordButton} onPress={startRecording}>
                       <View style={styles.buttonContentWrapper}>
                        <Ionicons name="mic-outline" size={24} color="#11224e" />
                      </View>
                    </TouchableOpacity>
                  )}
                   <TouchableOpacity
                    style={[
                      styles.voiceRecordButton,
                      styles.transcribeButton,
                      (!voiceNote || isTranscribing) && styles.buttonDisabled,
                    ]}
                    onPress={handleTranscribe}
                    disabled={!voiceNote || isTranscribing}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator size="small" color="#11224e" />
                    ) : (
                      <View style={styles.buttonContentWrapper}>
                        <Ionicons name="volume-high-outline" size={25} color="#11224e" />
                        <Ionicons name="arrow-forward-circle-outline" size={20} color="#11224e" />
                        <Ionicons name="document-text-outline" size={20} color="#11224e" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.voiceRecordButton,
                      styles.transcribeButton,
                      (isGeneratingDescription || !photo) && styles.buttonDisabled,
                    ]}
                    onPress={() => photo && handleGenerateDescription(photo)}
                    disabled={isGeneratingDescription || !photo}
                  >
                    {isGeneratingDescription ? (
                      <ActivityIndicator size="small" color="#11224e" />
                    ) : (
                      <Image source={require('@/assets/icons/chatgpt.png')} style={{ width: 24, height: 24 }} />
                    )}
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ marginTop: 16, gap: 12 }}>
                <View style={[styles.inputWrap]}>
                  <Ionicons name="text-outline" size={16} color="#6b7280" />
                  <TextInput
                    placeholder="Titre"
                    placeholderTextColor="#9ca3af"
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                  />
                </View>
                <View style={[styles.inputWrap, { alignItems: 'flex-start' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6b7280" style={{ marginTop: 4 }} />
                  <TextInput
                    placeholder="Introduction (optionnel)"
                    placeholderTextColor="#9ca3af"
                    value={comment}
                    onChangeText={setComment}
                    style={[styles.input, { height: 160, paddingRight: 40 }]}
                    multiline
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />
                  <TouchableOpacity
                      style={styles.enhanceButton}
                      onPress={handleEnhanceDescription}
                      disabled={isEnhancing || !comment}
                  >
                      {isEnhancing ? (
                          <ActivityIndicator size="small" color="#f87b1b" />
                      ) : (
                          <Ionicons name="sparkles-outline" size={20} color={!comment ? '#d1d5db' : '#f87b1b'} />
                      )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Zone Selector */}
            <View style={{ gap: 8 }}>
              {zonesLoading ? (
                <ActivityIndicator size="small" color="#11224e" />
              ) : zonesError ? (
                <View style={styles.alertBanner}>
                  <Ionicons name="warning" size={16} color="#b45309" />
                  <Text style={styles.alertBannerText}>{zonesError}</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneList}>
                  {zones.map(zone => {
                    const selected = zone.id === selectedZoneId;
                    return (
                      <TouchableOpacity
                        key={zone.id}
                        style={[styles.zoneItem, selected && styles.zoneItemSelected]}
                        onPress={() => {
                          setSelectedZoneId(zone.id);
                          if (zone.logo) {
                            setCurrentZoneLogo(zone.logo);
                            setPlanEditorVisible(true);
                          } else {
                            Alert.alert("Pas de plan", "Cette zone n'a pas de plan de zone à éditer.");
                          }
                        }}
                      >
                        {annotatedPlan && selected ? (
                          <Image source={{ uri: annotatedPlan.uri }} style={styles.zoneLogo} />
                        ) : zone.logo ? (
                          <Image source={{ uri: zone.logo }} style={styles.zoneLogo} />
                        ) : (
                          <View style={[styles.zoneLogo, { backgroundColor: '#e5e7eb' }]} />
                        )}
                        <Text style={[styles.zoneTitle, selected && { color: '#11224e' }]} numberOfLines={1}>{zone.title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
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
        <PictureAnnotator
          baseImageUri={annotatorBaseUri}
          onClose={() => setAnnotatorVisible(false)}
          onSaved={(image) => {
            setPhoto(image);
            setAnnotatorVisible(false);
            startDescriptionGeneration(image);
          }}
          title="Annoter la photo"
        />
      </Modal>
    )}
    {isPlanEditorVisible && (
      <Modal
        animationType="slide"
        visible={isPlanEditorVisible}
        onRequestClose={() => setPlanEditorVisible(false)}
      >
        <ZonePictureEditor
          baseImageUri={currentZoneLogo}
          onClose={() => setPlanEditorVisible(false)}
          onSaved={(image) => {
            setAnnotatedPlan(image);
            setPlanEditorVisible(false);
          }}
          title="Annoter le plan de zone"
        />
      </Modal>
    )}
    </>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (created: Partial<QualiPhotoItem>) => void;
  parentItem: QualiPhotoItem;
};

export default function CreateChildQualiPhotoModal({ visible, onClose, onSuccess, parentItem }: ModalProps) {
  if (!visible) return null;
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <CreateChildQualiPhotoForm 
        onClose={onClose}
        onSuccess={onSuccess}
        parentItem={parentItem}
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

  voiceNoteContainer: {
    marginTop: 12,
  },
  voiceActionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  voiceRecordButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f87b1b'
  },
  transcribeButton: {},
  buttonDisabled: { opacity: 0.5, backgroundColor: '#e5e7eb' },
  recordingWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 10 },
  recordingText: { color: '#dc2626', fontWeight: '600' },
  stopRecordingButton: { padding: 4 },
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
  audioPlayerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f1f5f9', paddingHorizontal: 12, height: 50, borderRadius: 10, flex: 1, borderWidth: 1, borderColor: '#f87b1b' },
  playButton: {},
  deleteButton: {},

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  submitButton: { backgroundColor: '#f87b1b', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, height: 48, flex: 1 },
  submitButtonDisabled: { backgroundColor: '#d1d5db' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // Zone selector styles
  zoneList: { gap: 8, paddingVertical: 4 },
  zoneItem: { width: 110, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 8, alignItems: 'center', backgroundColor: '#fff' },
  zoneItemSelected: { borderColor: '#f87b1b', backgroundColor: '#fff7ed' },
  zoneLogo: { width: 64, height: 64, borderRadius: 8, marginBottom: 6 },
  zoneTitle: { fontSize: 12, color: '#475569', textAlign: 'center' },
  enhanceButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#fff'
  },
});
