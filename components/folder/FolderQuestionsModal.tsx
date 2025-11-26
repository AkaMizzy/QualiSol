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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

const SUPPORTED_TYPES = ['long_text', 'text', 'list', 'boolean', 'date', 'number', 'taux', 'photo'];

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
          type: item.type,
          file: {
            uri: image.uri,
            type: image.mimeType || 'image/jpeg',
            name: image.fileName || 'photo.jpg',
          },
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
          type: item.type,
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
    const canSubmit = item.type === 'photo' ? !!image : !!value || item.type === 'boolean';
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
            ? 'Select an option'
            : 'Enter value'
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
});
