// import PictureAnnotator from '@/components/PictureAnnotator';
import { useAuth } from '@/contexts/AuthContext';
import * as gedService from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type QualiPhotoItem = {
  id: string;
  project_title?: string | null;
  id_qualiphoto_parent?: string | null;
  zone_title?: string | null;
  date_taken?: string | null;
  photo?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (created: gedService.Ged) => void;
  childItem: QualiPhotoItem;
  parentTitle?: string | null;
};

export default function CreateComplementaireQualiPhotoModal({ visible, onClose, onSuccess, childItem, parentTitle }: Props) {
  const { token, user } = useAuth();
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
    if (status !== 'granted') return;

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
        title: `Photo Après - ${parentTitle || childItem.project_title || ''}`,
        kind: 'photoapres',
        author: `${user.firstname} ${user.lastname}`,
        description: comment || undefined,
        latitude: latitude ? String(latitude) : undefined,
        longitude: longitude ? String(longitude) : undefined,
        file: photo,
      });
      onSuccess(result.data);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Échec de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
  }

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
    if (visible) {
      const timer = setTimeout(() => {
        handlePickPhoto();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, handlePickPhoto]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {parentTitle || childItem.project_title || String(childItem.id_qualiphoto_parent || childItem.id)}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
          >
            {/* Parent info (target child for this complementary) */}
            <View style={styles.parentInfoCard}>
              <Text style={styles.parentInfoTitle} numberOfLines={1}>
                {(childItem.project_title || 'Projet') + ' • ' + (childItem.zone_title || 'Zone') + (childItem.date_taken ? ' • ' + formatDate(childItem.date_taken) : '')}
              </Text>
              <View style={styles.parentPhotoWrap}>
                {childItem.photo && <Image source={{ uri: childItem.photo }} style={styles.parentPhoto} />}
              </View>
            </View>
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
                <Text style={styles.photoPickerText}>Ajouter une Photo &quot;après&quot;</Text>
              </TouchableOpacity>
            )}

            {/* Voice note and transcription */}
            <View style={{ marginTop: 16 }}>
              <View style={styles.voiceActionsContainer}>
                  <TouchableOpacity
                    style={[styles.voiceRecordButton, styles.transcribeButton, (!photo || isGeneratingDescription) && styles.buttonDisabled]}
                    onPress={() => photo && handleGenerateDescription(photo)}
                    disabled={!photo || isGeneratingDescription}
                  >
                    {isGeneratingDescription ? (
                      <ActivityIndicator size="small" color="#11224e" />
                    ) : (
                      <Image source={require('@/assets/icons/chatgpt.png')} style={{ width: 24, height: 24 }} />
                    )}
                  </TouchableOpacity>
              </View>
              <View style={{ marginTop: 12 }}>
                <View style={[styles.inputWrap, { alignItems: 'flex-start' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6b7280" style={{ marginTop: 4 }} />
                  <TextInput
                    placeholder="Introduction"
                    placeholderTextColor="#9ca3af"
                    value={comment}
                    onChangeText={setComment}
                    style={[styles.input, { height: 150 }]}
                    multiline
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 300);
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

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="warning" size={16} color="#b45309" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
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
            onSaved={(image: { uri: string; name: string; type: string }) => {
              setPhoto(image);
              setAnnotatorVisible(false);
              handleGenerateDescription(image);
            }}
            title="Annoter la photo complémentaire"
          /> */}
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  content: { flex: 1, paddingHorizontal: 16 },
  closeButton: { padding: 8 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  parentInfoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#f87b1b' },
  parentInfoTitle: { fontSize: 12, color: '#11224e', fontWeight: '600', marginBottom: 8 },
  parentPhotoWrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#f87b1b' },
  parentPhoto: { width: '100%', aspectRatio: 16/10, backgroundColor: '#e5e7eb' },
  photoPickerButton: { borderWidth: 2, borderColor: '#f87b1b', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', gap: 8, marginTop: 16 },
  photoPickerText: { color: '#475569', fontWeight: '600' },
  imagePreviewContainer: { position: 'relative', marginTop: 16 },
  imagePreview: { width: '100%', aspectRatio: 16/10, borderRadius: 12 },
  imageActions: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 },
  iconButton: { padding: 10, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 99 },
  iconButtonSecondary: { backgroundColor: '#f1f5f9', borderRadius: 99, padding: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginTop: 16, borderRadius: 10 },
  errorText: { color: '#b45309', fontSize: 12, flex: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  submitButton: { backgroundColor: '#f87b1b', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, height: 48, alignSelf: 'center', width: '92%' },
  submitButtonDisabled: { backgroundColor: '#d1d5db' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  voiceActionsContainer: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  voiceRecordButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 50, backgroundColor: '#f1f5f9', borderRadius: 10, borderWidth: 1, borderColor: '#f87b1b', maxWidth: 100 },
  transcribeButton: {},
  buttonDisabled: { opacity: 0.5, backgroundColor: '#e5e7eb' },
  buttonContentWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f87b1b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, position: 'relative' },
  input: { flex: 1, color: '#111827' },
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
  recordingWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 10 },
  recordingText: { color: '#dc2626', fontWeight: '600' },
  stopButton: { padding: 4 },
  audioPlayerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f1f5f9', paddingHorizontal: 12, height: 50, borderRadius: 10, flex: 1, borderWidth: 1, borderColor: '#f87b1b' },
  playButton: {},
  deleteButton: {},
});


