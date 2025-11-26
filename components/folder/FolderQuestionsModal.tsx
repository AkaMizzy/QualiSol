import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth, User } from '@/contexts/AuthContext';
import * as gedService from '@/services/gedService';
import { CreateGedInput, Ged } from '@/services/gedService';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import MapSelectionModal from './MapSelectionModal';

const SUPPORTED_TYPES = ['long_text', 'text', 'list', 'boolean', 'date', 'number', 'taux', 'photo', 'voice', 'GPS'];

interface FolderQuestionsModalProps {
  folderId: string | null;
  visible: boolean;
  onClose: () => void;
}

function QuestionInput({
  item,
  token,
  user,
  answer,
}: {
  item: Ged;
  token: string | null;
  user: User | null;
  answer?: Ged;
}) {
  const [value, setValue] = useState(answer?.description || item.value || '');
  const [boolValue, setBoolValue] = useState(answer?.description === 'true' || item.value === 'true');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(!!answer);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded' | 'playing'>('idle');
  const [duration, setDuration] = useState(0);
  const [isMapVisible, setMapVisible] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    answer?.latitude && answer?.longitude
      ? { latitude: parseFloat(answer.latitude), longitude: parseFloat(answer.longitude) }
      : null
  );

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'recording') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const requestAudioPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('Désolé, nous avons besoin des autorisations du microphone pour que cela fonctionne !');
      return false;
    }
    return true;
  };

  const startRecording = async () => {
    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      setStatus('recording');
      setDuration(0);
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      setStatus('idle');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      const status = await recording.getStatusAsync();
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      if (status.isRecording && status.durationMillis) {
        setDuration(Math.round(status.durationMillis / 1000));
      }
      setStatus('recorded');
    } catch (err) {
      console.error('Failed to stop recording', err);
      setStatus('idle');
    }
  };

  const playSound = async () => {
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordingUri! });
      setSound(newSound);
      await newSound.replayAsync();
      setStatus('playing');
      newSound.setOnPlaybackStatusUpdate(playbackStatus => {
        if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
          setStatus('recorded');
        }
      });
      return;
    }

    const currentStatus = await sound.getStatusAsync();
    if (currentStatus.isLoaded && currentStatus.isPlaying) {
      await sound.pauseAsync();
      setStatus('recorded');
    } else {
      await sound.replayAsync();
      setStatus('playing');
    }
  };

  const handleRerecord = () => {
    if (sound) {
      sound.unloadAsync();
    }
    setRecordingUri(null);
    setSound(null);
    setDuration(0);
    setStatus('idle');
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Désolé, nous avons besoin des autorisations de la caméra pour que cela fonctionne !');
      return false;
    }
    return true;
  };

  const requestGalleryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Désolé, nous avons besoin des autorisations de la galerie pour que cela fonctionne !');
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleChooseFromGallery = async () => {
    const hasPermission = await requestGalleryPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSelectImage = () => {
    Alert.alert(
      'Sélectionner une image',
      'Choisissez une option',
      [
        {
          text: 'Prendre une photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choisir de la galerie',
          onPress: handleChooseFromGallery,
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirm = (date: Date) => {
    setValue(date.toISOString().split('T')[0]);
    hideDatePicker();
  };

  const handleSubmit = async () => {
    if (!token || !user || isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    try {
      let answerPayload: CreateGedInput;

      if (item.type === 'photo') {
        if (!image) {
          setIsSubmitting(false);
          return;
        }
        answerPayload = {
          idsource: item.id,
          title: `Réponse: ${item.title}`,
          kind: 'answer',
          author: user.id,
          type: 'answer',
          file: {
            uri: image.uri,
            type: image.mimeType || 'image/jpeg',
            name: image.fileName || 'photo.jpg',
          },
        };
      } else if (item.type === 'voice') {
        if (!recordingUri) {
          setIsSubmitting(false);
          return;
        }
        answerPayload = {
          idsource: item.id,
          title: `Réponse: ${item.title}`,
          kind: 'answer',
          author: user.id,
          type: 'answer',
          file: {
            uri: recordingUri,
            type: 'audio/m4a',
            name: `voice-answer-${Date.now()}.m4a`,
          },
        };
      } else if (item.type === 'GPS') {
        if (!location) {
          setIsSubmitting(false);
          return;
        }
        answerPayload = {
          idsource: item.id,
          title: `Réponse: ${item.title}`,
          kind: 'answer',
          author: user.id,
          type: 'answer',
          latitude: String(location.latitude),
          longitude: String(location.longitude),
        };
      } else {
        const answerValue = item.type === 'boolean' ? String(boolValue) : value;
        if (!answerValue) {
          setIsSubmitting(false);
          return;
        }
        answerPayload = {
          idsource: item.id,
          title: `Réponse: ${item.title}`,
          kind: 'answer',
          author: user.id,
          description: answerValue,
          type: 'answer',
        };
      }

      await gedService.createGed(token, answerPayload);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIconName = (type: Ged['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'text':
        return 'text';
      case 'long_text':
        return 'document-text-outline';
      case 'number':
        return 'calculator-outline';
      case 'taux':
        return 'analytics-outline';
      case 'date':
        return 'calendar-outline';
      case 'list':
        return 'list-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const renderSubmitButton = () => {
    if (isSubmitting) {
      return <ActivityIndicator size="small" color="#f87b1b" style={styles.submitButton} />;
    }
    if (isSubmitted) {
      return <Ionicons name="checkmark-circle" size={24} color="#22c55e" style={styles.submitButton} />;
    }
    const canSubmit =
      item.type === 'photo'
        ? !!image
        : item.type === 'voice'
          ? !!recordingUri
          : item.type === 'GPS'
            ? !!location
            : !!value || item.type === 'boolean';
    return (
      <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting || isSubmitted || !canSubmit}>
        <Ionicons
          name="send-outline"
          size={24}
          color={canSubmit ? '#f87b1b' : '#d1d5db'}
          style={styles.submitButton}
        />
      </TouchableOpacity>
    );
  };

  if (item.type === 'GPS') {
    return (
      <>
        <TouchableOpacity
          style={styles.gpsContainer}
          onPress={() => !isSubmitted && setMapVisible(true)}
          disabled={isSubmitted}>
          <View style={styles.gpsContent}>
            {location ? (
              <View style={styles.gpsDetailsContainer}>
                <MapView
                  style={styles.miniMap}
                  initialRegion={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}>
                  <Marker coordinate={location} />
                </MapView>
                <Text style={styles.gpsCoordinates}>
                  Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}
                </Text>
              </View>
            ) : (
              <View style={styles.gpsDetailsContainer}>
                <Ionicons name="location-outline" size={28} color="#f87b1b" />
                <Text style={styles.gpsPlaceholder}>choisir un emplacement</Text>
              </View>
            )}
          </View>
          {renderSubmitButton()}
        </TouchableOpacity>
        <MapSelectionModal
          visible={isMapVisible}
          onClose={() => setMapVisible(false)}
          onLocationSelect={selectedLocation => {
            setLocation(selectedLocation);
          }}
        />
      </>
    );
  }

  if (item.type === 'voice') {
    // Submitted view
    if (isSubmitted && answer?.url) {
      return (
        <View style={styles.audioPlayerContainer}>
          <Text>Réponse enregistrée.</Text>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
        </View>
      );
    }

    // Recording view
    if (status === 'recording') {
      return (
        <View style={[styles.voiceContainer, styles.recordingContainer]}>
          <ActivityIndicator size="small" color="#dc2626" />
          <Text style={styles.timerText}>{formatDuration(duration)}</Text>
          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    // Recorded / Preview view
    if (status === 'recorded' || status === 'playing') {
      return (
        <View style={styles.voiceContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.audioPlayerContainer, styles.recordedContainer]}>
              <TouchableOpacity onPress={playSound} style={styles.playerButton}>
                <Ionicons name={status === 'playing' ? 'pause-circle' : 'play-circle'} size={32} color="#11224e" />
              </TouchableOpacity>
              <Text style={styles.recordedText}>{formatDuration(duration)}</Text>
            </View>
            <TouchableOpacity onPress={handleRerecord} style={styles.playerButton}>
              <Ionicons name="trash-outline" size={28} color="#ef4444" />
            </TouchableOpacity>
          </View>
          {renderSubmitButton()}
        </View>
      );
    }

    // Idle view
    return (
      <TouchableOpacity style={styles.voiceIdleContainer} onPress={startRecording}>
        <Ionicons name="mic-outline" size={24} color="#f87b1b" />
        <Text style={styles.voiceButtonText}>Ajouter une note vocale</Text>
      </TouchableOpacity>
    );
  }

  if (item.type === 'photo') {
    return (
      <View style={styles.photoContainer}>
        <View style={styles.photoContent}>
          {isSubmitted && answer?.url ? (
            <Image source={{ uri: answer.url }} style={styles.previewImage} />
          ) : image ? (
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
          ) : (
            <TouchableOpacity style={styles.photoButton} onPress={handleSelectImage}>
              <Ionicons name="add-circle-outline" size={32} color="#11224e" />
              <Text style={styles.photoButtonText}>Ajouter une photo</Text>
            </TouchableOpacity>
          )}
        </View>
        {renderSubmitButton()}
      </View>
    );
  }

  if (item.type === 'boolean') {
    return (
      <View style={[styles.inputContainer, styles.switchContainer]}>
        <Switch
          value={boolValue}
          onValueChange={setBoolValue}
          trackColor={{ false: '#767577', true: '#f87b1b' }}
          thumbColor={boolValue ? '#ffffff' : '#f4f3f4'}
          disabled={isSubmitted}
        />
        <View style={styles.submitButtonContainer}>{renderSubmitButton()}</View>
      </View>
    );
  }

  if (item.type === 'date') {
    return (
      <>
        <TouchableOpacity onPress={showDatePicker} style={styles.inputContainer} disabled={isSubmitted}>
          <Ionicons name={getIconName(item.type)} size={22} style={styles.inputIcon} />
          <Text style={[styles.input, !value && styles.placeholderText]}>
            {value || 'YYYY-MM-DD'}
          </Text>
          {renderSubmitButton()}
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
        />
      </>
    );
  }

  const input = (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={setValue}
      placeholderTextColor="#9ca3af"
      editable={!isSubmitted}
      keyboardType={
        item.type === 'number' ? 'numeric' : item.type === 'taux' ? 'decimal-pad' : 'default'
      }
      multiline={item.type === 'long_text'}
      placeholder={
        item.type === 'date'
          ? 'YYYY-MM-DD'
          : item.type === 'list'
            ? 'Sélectionnez une option'
            : 'Saisissez la réponse'
      }
    />
  );

  return (
    <View style={styles.inputContainer}>
      <Ionicons name={getIconName(item.type)} size={22} style={styles.inputIcon} />
      {input}
      {item.type === 'taux' && <Text style={styles.tauxSymbol}>%</Text>}
      {renderSubmitButton()}
    </View>
  );
}

export default function FolderQuestionsModal({ folderId, visible, onClose }: FolderQuestionsModalProps) {
  const { token, user } = useAuth();
  const [geds, setGeds] = useState<Ged[]>([]);
  const [answers, setAnswers] = useState<Map<string, Ged>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function fetchGedsAndAnswers() {
      if (!token || !folderId || !visible) {
        setGeds([]);
        setAnswers(new Map());
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const fetchedGeds = await gedService.getGedsBySource(token, folderId, 'question');
        const filteredGeds = fetchedGeds.filter(ged => ged.type && SUPPORTED_TYPES.includes(ged.type));
        setGeds(filteredGeds);

        if (filteredGeds.length > 0) {
          const questionIds = filteredGeds.map(q => q.id);
          const fetchedAnswers = await gedService.getGedsBySource(token, questionIds, 'answer');
          const answersMap = new Map<string, Ged>();
          fetchedAnswers.forEach(ans => {
            if (ans.idsource) {
              answersMap.set(ans.idsource, ans);
            }
          });
          setAnswers(answersMap);
        }
      } catch (err) {
        setError('Impossible de charger les questions ou les réponses.');
        console.error('Failed to fetch geds or answers:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGedsAndAnswers();
  }, [folderId, token, visible]);

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Questions du Dossier</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
            <Ionicons name="close-circle" size={32} color="#f87b1b" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#11224e" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={geds}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.questionContainer}>
                <Text style={styles.questionLabel}>{item.title}</Text>
                <QuestionInput item={item} token={token} user={user} answer={answers.get(item.id)} />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text>Aucune question pour ce dossier.</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11224e',
  },
  closeIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -4 }], // Adjust based on icon size and padding
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  questionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87b1b',
    paddingHorizontal: 12,
  },
  inputIcon: {
    color: '#f87b1b',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  switchContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 150,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87b1b',
    padding: 12,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 80,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87b1b',
    padding: 12,
  },
  voiceRecordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  voiceButtonText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#11224e',
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  recordedContainer: {
    backgroundColor: '#e0e7ff',
    borderColor: '#a5b4fc',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  recordedText: {
    color: '#3730a3',
    fontWeight: '600',
  },
  playerButton: {
    padding: 8,
  },
  audioText: {
    fontSize: 14,
    color: '#374151',
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87b1b',
    padding: 12,
    minHeight: 80,
  },
  gpsContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  gpsDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniMap: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  gpsCoordinates: {
    fontSize: 14,
    color: '#11224e',
    flexShrink: 1,
  },
  gpsPlaceholder: {
    marginLeft: 10,
    fontSize: 14,
    color: '#9ca3af',
  },
  photoContent: {
    flex: 1,
    marginRight: 8,
  },
  photoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    width: '100%',
  },
  photoButtonText: {
    marginTop: 8,
    color: '#11224e',
    fontSize: 14,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  tauxSymbol: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  submitButton: {
    paddingLeft: 8,
  },
  submitButtonContainer: {
    position: 'absolute',
    right: 0,
    height: '100%',
    justifyContent: 'center',
    paddingRight: 12,
    zIndex: 1,
  },
  recordingContainer: {
    justifyContent: 'space-between',
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  timerText: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 16,
  },
  stopButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  voiceIdleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87b1b',
    padding: 12,
  },
});
