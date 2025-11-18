import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { createGed, getGedsBySource } from '@/services/gedService';
import folderService, { Folder } from '@/services/qualiphotoService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureFieldQualiphoto from '../signature/SignatureFieldQualiphoto';
import VoiceNoteRecorder from '../VoiceNoteRecorder';

type Props = {
  visible: boolean;
  onClose: () => void;
  item: (Folder & { project_title?: string; zone_title?: string; [key: string]: any; }) | null;
  onSuccess?: (updated: Partial<Folder>) => void;
};

export default function QualiPhotoEditModal({
  visible,
  onClose,
  item,
  onSuccess,
}: Props) {
  const { token, user } = useAuth();
  const [description, setDescription] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [signatures, setSignatures] = useState({
    technicien: { completed: false, signerName: '' },
    control: { completed: false, signerName: '' },
    admin: { completed: false, signerName: '' },
    });

  useEffect(() => {
    if (item) {
      setDescription(item.description || '');
      setConclusion(item.conclusion || '');
    }

    if (visible) {
       getCurrentLocation();
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
       setAuthorName(authorName);
    }

    if (visible && item && token) {
        const fetchSignatures = async () => {
          try {
            const existingSignatures = await getGedsBySource(token, item.id, 'signature');
            const newSignaturesState = {
                technicien: { completed: false, signerName: '' },
                control: { completed: false, signerName: '' },
                admin: { completed: false, signerName: '' },
            };
            existingSignatures.forEach(sig => {
                if (sig.title.includes('technicien')) {
                    newSignaturesState.technicien = { completed: true, signerName: sig.author };
                } else if (sig.title.includes('control')) {
                    newSignaturesState.control = { completed: true, signerName: sig.author };
                } else if (sig.title.includes('admin')) {
                    newSignaturesState.admin = { completed: true, signerName: sig.author };
                }
            });
            setSignatures(newSignaturesState);
          } catch (error) {
            console.error("Failed to fetch existing signatures", error);
          }
        };
        fetchSignatures();
      }
  }, [item, visible, token, user]);

  const handleClose = () => {
    setError(null);
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!token || !item) return;
    if (!description.trim() && !conclusion.trim()) {
      setError('Veuillez remplir au moins un champ.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await folderService.updateFolder(
        item.id,
        {
          description: description,
          conclusion: conclusion,
        },
        token
      );
      onSuccess?.({ ...item, description: description, conclusion: conclusion });
      handleClose();
    } catch (e: any) {
      setError(e?.message || "Échec de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleEnhance = async (text: string, setText: (text: string) => void) => {
    if (!token) return;

    setIsEnhancing(true);
    try {
      const { enhancedText } = await folderService.enhanceText(text, token);
      setText(enhancedText);
    } catch (e: any) {
      setError(e?.message || "Échec de l'amélioration");
    } finally {
      setIsEnhancing(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
    } catch (err) {
      console.error('Error getting location:', err);
    }
  };

  const handleGeneratePdf = async () => {
    if (!item || !token) return;
    setIsGeneratingPdf(true);
    setError(null);
    try {
      const newPdfGed = await folderService.generateGedParallelePdf(item.id, token);
      const pdfUrl = `${process.env.EXPO_PUBLIC_BASE_URL}${newPdfGed.url}`;
      
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Erreur', `Impossible d'ouvrir le PDF. URL: ${pdfUrl}`);
      }
    } catch (err: any) {
      console.error('Failed to generate PDF', err);
      setError(err?.response?.data?.error || err.message || 'Erreur lors de la génération du PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSignatureComplete = async (role: 'technicien' | 'control' | 'admin', signature: string) => {
    if (!token || !item || !user) return;
  
    try {
      // Correctly create the file object for React Native
      const file = {
        uri: signature, // The base64 data URI
        type: 'image/png',
        name: `${role}_signature.png`,
      };
  
      await createGed(token, {
        idsource: item.id,
        title: `Signature ${role} - ${item.title}`,
        kind: 'signature',
        author: authorName,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        file: file,
      });
  
      setSignatures(prev => ({
        ...prev,
        [role]: { completed: true, signerName: `${user.firstname} ${user.lastname}` },
      }));
    } catch (error: any) {
      console.error('Failed to save signature', error);
    }
  };

  const handleDescriptionTranscription = (text: string) => {
    setDescription(prev => (prev ? `${prev}\n${text}` : text));
  };

  const handleConclusionTranscription = (text: string) => {
    setConclusion(prev => (prev ? `${prev}\n${text}` : text));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Modifier le dossier</Text>
              <Image source={ICONS.folder} style={{ width: 24, height: 24 }} />
            </View>
            <View style={styles.placeholder} />
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

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.contextDisplay}>
              <View style={styles.contextItem}>
                <Ionicons name="briefcase-outline" size={16} color="#f87b1b" />
                <Text style={styles.contextText} numberOfLines={1}>
                  {item?.project_title || 'Projet'}
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.contextItem}>
                <Ionicons name="location-outline" size={16} color="#f87b1b" />
                <Text style={styles.contextText} numberOfLines={1}>
                  {item?.zone_title || 'Zone'}
                </Text>
              </View>
            </View>
            <View style={[styles.inputWrap, { marginTop: 16 }]}>
              <Ionicons name="text-outline" size={16} color="#f87b1b" />
              <TextInput
                placeholder="Titre"
                value={item?.title || ''}
                style={[styles.input, styles.readOnlyInput]}
                editable={false}
              />
            </View>

            {/* Introduction */}
            <View style={{ marginTop: 16 }}>
               <View style={styles.fieldLabelContainer}>
                 <Ionicons name="chatbubble-ellipses-outline" size={18} color="#f87b1b" />
                 <Text style={styles.fieldLabel}>Description</Text>
               </View>
               <VoiceNoteRecorder
                  onRecordingComplete={() => {}}
                  onTranscriptionComplete={handleDescriptionTranscription}
                  />
               <View style={[styles.inputWrap, { alignItems: 'flex-start', marginTop: 8 }]}>
                 <TextInput
                   placeholder="Saisir la description..."
                   value={description}
                   onChangeText={setDescription}
                   style={[styles.input, { height: 250, paddingRight: 60 }]}
                   multiline
                   textAlignVertical="top"
                 />
                 <TouchableOpacity
                    style={styles.enhanceButton}
                    onPress={() => handleEnhance(description, setDescription)}
                    disabled={isEnhancing || !description}
                  >
                    {isEnhancing ? (
                      <ActivityIndicator size="small" color="#f87b1b" />
                    ) : (
                      <Ionicons name="sparkles-outline" size={20} color={!description ? '#d1d5db' : '#f87b1b'} />
                    )}
                  </TouchableOpacity>
                 {description ? (
                  <TouchableOpacity style={styles.clearButton} onPress={() => setDescription('')}>
                    <Ionicons name="trash-outline" size={20} color="#EE4B2B" />
                  </TouchableOpacity>
                ) : null}
               </View>
             </View>

            {/* Conclusion */}
            <View style={{ marginTop: 16 }}>
               <View style={styles.fieldLabelContainer}>
                 <Ionicons name="chatbubble-ellipses-outline" size={18} color="#f87b1b" />
                 <Text style={styles.fieldLabel}>Conclusion</Text>
               </View>
               <VoiceNoteRecorder
                  onRecordingComplete={() => {}}
                  onTranscriptionComplete={handleConclusionTranscription}
                  />
               <View style={[styles.inputWrap, { alignItems: 'flex-start', marginTop: 8 }]}>
                 <TextInput
                   placeholder="Saisir la conclusion..."
                   value={conclusion}
                   onChangeText={setConclusion}
                   style={[styles.input, { height: 250, paddingRight: 60 }]}
                   multiline
                   textAlignVertical="top"
                 />
                 <TouchableOpacity
                    style={styles.enhanceButton}
                    onPress={() => handleEnhance(conclusion, setConclusion)}
                    disabled={isEnhancing || !conclusion}
                  >
                    {isEnhancing ? (
                      <ActivityIndicator size="small" color="#f87b1b" />
                    ) : (
                      <Ionicons name="sparkles-outline" size={20} color={!conclusion ? '#d1d5db' : '#f87b1b'} />
                    )}
                  </TouchableOpacity>
                 {conclusion ? (
                  <TouchableOpacity style={styles.clearButton} onPress={() => setConclusion('')}>
                    <Ionicons name="trash-outline" size={20} color="#EE4B2B" />
                  </TouchableOpacity>
                ) : null}
               </View>
             </View>
             <View style={{ marginTop: 16 }}>
              <View style={styles.fieldLabelContainer}>
                  <Ionicons name="pencil-outline" size={18} color="#11224e" />
                  <Text style={styles.fieldLabel}>Signatures</Text>
              </View>
              <View style={styles.signaturesContainer}>
                  <SignatureFieldQualiphoto
                  role="technicien"
                  roleLabel="Technicien"
                  onSignatureComplete={(role, sig) => handleSignatureComplete('technicien', sig)}
                  isCompleted={signatures.technicien.completed}
                  signerName={signatures.technicien.signerName}
                  />
                  <SignatureFieldQualiphoto
                  role="control"
                  roleLabel="Contrôle"
                  onSignatureComplete={(role, sig) => handleSignatureComplete('control', sig)}
                  isCompleted={signatures.control.completed}
                  signerName={signatures.control.signerName}
                  />
                  <SignatureFieldQualiphoto
                  role="admin"
                  roleLabel="Client"
                  onSignatureComplete={(role, sig) => handleSignatureComplete('admin', sig)}
                  isCompleted={signatures.admin.completed}
                  signerName={signatures.admin.signerName}
                  />
              </View>
              </View>

           </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={styles.footerActionButton}
                onPress={handleGeneratePdf}
                disabled={isGeneratingPdf}
                accessibilityLabel="Générer le PDF"
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator color="#f87b1b" />
                ) : (
                  <Image source={ICONS.pdf} style={styles.footerActionIcon} />
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              disabled={submitting}
              onPress={handleSubmit}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Enregistrement...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save" size={16} color="#f87b1b" />
                  <Text style={styles.submitButtonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  closeButton: { padding: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  alertBannerText: { color: '#b45309', flex: 1, fontSize: 12 },
  contextDisplay: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  contextItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  contextText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  separator: { width: 1, height: '60%', backgroundColor: '#d1d5db' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f87b1b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, position: 'relative' },
  input: { flex: 1, color: '#111827', fontSize: 16 },
  readOnlyInput: { backgroundColor: '#f9fafb', color: '#6b7280' },
  fieldLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  fieldLabel: { fontSize: 16, fontWeight: '700', color: '#f87b1b' },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  submitButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f87b1b',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 48,
    flex: 1,
  },
  submitButtonDisabled: { backgroundColor: '#d1d5db' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#f87b1b' },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  enhanceButton: {
    position: 'absolute',
    top: 12,
    right: 40,
    zIndex: 1,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  footerActionButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  footerActionIcon: {
    width: 30,
    height: 30,
  },
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
});
