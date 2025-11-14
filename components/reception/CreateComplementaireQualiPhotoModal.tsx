
import { useAuth } from '@/contexts/AuthContext';
import * as gedService from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceNoteRecorder from '../VoiceNoteRecorder';

export type QualiPhotoItem = {
  id: string;
  project_title?: string | null;
  id_qualiphoto_parent?: string | null;
  zone_title?: string | null;
  date_taken?: string | null;
  photo?: string | null;
};

type FormProps = {
  onClose: () => void;
  onSuccess: (created: gedService.Ged) => void;
  childItem: QualiPhotoItem;
  parentTitle?: string | null;
};

function CreateComplementaireQualiPhotoForm({ onClose, onSuccess, childItem, parentTitle }: FormProps) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [isAnnotatorVisible, setAnnotatorVisible] = useState(false);
  const [annotatorBaseUri, setAnnotatorBaseUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const canSave = useMemo(() => !!photo && !submitting && !isGeneratingDescription, [photo, submitting, isGeneratingDescription]);

  const handleGenerateDescription = useCallback(async (photoToDescribe: { uri: string; name: string; type: string }) => {
    if (!photoToDescribe || !token) {
      return;
    }
    setIsGeneratingDescription(true);
    setError(null);
    try {
      const description = await gedService.describeImage(token, photoToDescribe);
      setComment(prev => prev ? `${prev}\n${description}` : description);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate description');
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
    if (!token || !photo || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await gedService.createGed(token, {
        idsource: childItem.id,
        title: title || 'Situation Après',
        kind: 'photoapres',
        author: `${user.firstname} ${user.lastname}`,
        description: comment || undefined,
        latitude: latitude ? String(latitude) : undefined,
        longitude: longitude ? String(longitude) : undefined,
        file: photo,
      });

      if (audioUri) {
        try {
          const audioPayload: gedService.CreateGedInput = {
            idsource: result.data.id,
            title: `Note vocale pour ${title || 'Situation Après'}`,
            kind: 'audio',
            author: `${user.firstname} ${user.lastname}`,
            file: {
              uri: audioUri,
              name: `note_${Date.now()}.m4a`,
              type: 'audio/m4a',
            },
          };
          await gedService.createGed(token, audioPayload);
        } catch (audioErr: any) {
          Alert.alert('Erreur Audio', `La photo a été enregistrée, mais l'envoi de la note vocale a échoué : ${audioErr.message}`);
        }
      }

      onSuccess(result.data);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Échec de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

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
    fetchLocation();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        handlePickPhoto();
    }, 500);
    return () => clearTimeout(timer);
  }, [handlePickPhoto]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <View style={{width: 50}} />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {parentTitle}
              </Text>
              {!!childItem.project_title && !!childItem.zone_title && (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {`${childItem.project_title} • ${childItem.zone_title}`}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.headerStopButton}>
                <Ionicons name="close" size={28} color="#11224e" />
            </TouchableOpacity>
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

          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
          >
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
                    <Text style={styles.photoPickerText}>Ajouter une Situation après</Text>
                </TouchableOpacity>
                )}

                <View style={{ marginTop: 16, gap: 12 }}>
                    <View style={[styles.inputWrap]}>
                        <Ionicons name="text-outline" size={16} color="#6b7280" />
                        <TextInput
                        placeholder="Titre (optionnel)"
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
                    <View style={[styles.inputWrap, { alignItems: 'flex-start' }]}>
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6b7280" style={{ marginTop: 4 }} />
                        <TextInput
                        placeholder="Description"
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
            <TouchableOpacity style={[styles.submitButton, !canSave && styles.submitButtonDisabled]} disabled={!canSave} onPress={handleSubmit}>
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
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
      {isAnnotatorVisible && annotatorBaseUri && (
        <Modal
          animationType="fade"
          visible={isAnnotatorVisible}
          onRequestClose={() => setAnnotatorVisible(false)}
        >
          {/* <PictureAnnotator
            baseImageUri={annotatorBaseUri}
            onClose={() => setAnnotatorVisible(false)}
            onSaved={(image: { uri: string; name: string; type: string }) => {
              setPhoto(image);
              setAnnotatorVisible(false);
              handleGenerateDescription(image);
            }}
            title="Annoter la photo complémentaire"
          /> */}
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}


type ModalProps = {
    visible: boolean;
    onClose: () => void;
    onSuccess: (created: gedService.Ged) => void;
    childItem: QualiPhotoItem;
    parentTitle?: string | null;
};

export default function CreateComplementaireQualiPhotoModal({ visible, onClose, onSuccess, childItem, parentTitle }: ModalProps) {
    if (!visible) return null;
    
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <CreateComplementaireQualiPhotoForm 
          onClose={onClose}
          onSuccess={onSuccess}
          childItem={childItem}
          parentTitle={parentTitle}
        />
      </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    headerStopButton: { padding: 8, minWidth: 50, alignItems: 'flex-end' },
    stopButtonText: { color: '#f87b1b', fontWeight: '600', fontSize: 16 },
    headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#f87b1b' },
    headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    content: { flex: 1, paddingHorizontal: 16 },
    alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
    alertBannerText: { color: '#b45309', flex: 1, fontSize: 12 },
    card: { 
      backgroundColor: '#F8FAFC',
      paddingTop: 16,
    },
    separator: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16, },
    photoPickerButton: { borderWidth: 2, borderColor: '#f87b1b', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', gap: 8, },
    photoPickerText: { color: '#475569', fontWeight: '600', },
    imagePreviewContainer: { position: 'relative', },
    imagePreview: { width: '100%', aspectRatio: 2 / 1, borderRadius: 12, },
    imageActions: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8, },
    iconButton: { padding: 10, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 99, },
    iconButtonSecondary: { backgroundColor: '#f1f5f9', borderRadius: 99, padding: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f87b1b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, position: 'relative' },
    input: { flex: 1, color: '#111827', fontSize: 16 },
    descriptionLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: 10, gap: 8, },
    descriptionLoadingText: { color: '#11224e', fontWeight: '600', fontSize: 12, },
    footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    submitButton: { backgroundColor: '#f87b1b', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, height: 48, flex: 1 },
    submitButtonDisabled: { backgroundColor: '#d1d5db' },
    submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});


