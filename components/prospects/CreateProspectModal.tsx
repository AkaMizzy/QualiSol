import { createGed } from '@/services/gedService';
import { createProspect, scanBusinessCard } from '@/services/prospectService';
import { getAuthToken } from '@/services/secureStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

interface CreateProspectModalProps {
  visible: boolean;
  onClose: () => void;
}

type ScanStep = 'scan' | 'processing' | 'form';

export default function CreateProspectModal({ visible, onClose }: CreateProspectModalProps) {
  const [currentStep, setCurrentStep] = useState<ScanStep>('scan');
  const [prospectCompany, setProspectCompany] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone1, setPhone1] = useState('');
  const [rectoImage, setRectoImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [versoImage, setVersoImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [fadeAnim] = useState(new Animated.Value(1));
  
  const handleImagePick = async (type: 'recto' | 'verso') => {
    Alert.alert(
      'Choisir une image',
      'Souhaitez-vous prendre une photo ou en choisir une dans votre galerie ?',
      [
        {
          text: 'Prendre une photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission refusée', 'La permission d\'accès à la caméra est requise pour prendre des photos.');
              return;
            }
            launchPicker('camera', type);
          },
        },
        {
          text: 'Choisir de la galerie',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission refusée', 'La permission d\'accès à la galerie est requise pour ajouter des images.');
              return;
            }
            launchPicker('library', type);
          },
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  const launchPicker = async (pickerType: 'camera' | 'library', imageType: 'recto' | 'verso') => {
    let result;
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3] as [number, number],
      quality: 0.8,
    };

    if (pickerType === 'camera') {
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (imageType === 'recto') {
        setRectoImage(result.assets[0]);
      } else {
        setVersoImage(result.assets[0]);
      }
    }
  };

  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  const transitionToStep = (nextStep: ScanStep) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(() => setCurrentStep(nextStep), 200);
  };

  const handleScanBusinessCard = async () => {
    if (!rectoImage && !versoImage) {
      Alert.alert(
        'Aucune image',
        'Veuillez d\'abord prendre une photo de la carte de visite.'
      );
      return;
    }

    transitionToStep('processing');

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Token d\'authentification non trouvé.');
      }

      const imageToScan = rectoImage || versoImage;
      const base64Image = await convertImageToBase64(imageToScan!.uri);

      const result = await scanBusinessCard(token, base64Image);

      if (result.success && result.data) {
        setExtractedData(result.data);
        setProspectCompany(result.data.prospectcompany || '');
        setFirstName(result.data.firstname || '');
        setLastName(result.data.lastname || '');
        setEmail(result.data.email || '');
        setPhone1(result.data.phone1 || '');
        transitionToStep('form');
      }
    } catch (error) {
      console.error('Error scanning business card:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'analyser la carte de visite. Veuillez réessayer.'
      );
      transitionToStep('scan');
    }
  };

  const handleSkipScan = () => {
    transitionToStep('form');
  };

  const handleReset = () => {
    setProspectCompany('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone1('');
    setRectoImage(null);
    setVersoImage(null);
    setExtractedData(null);
    setCurrentStep('scan');
    onClose();
  };

  const handleSubmit = async () => {
    if (!firstName || !lastName || !email) {
      Alert.alert('Champs obligatoires', 'Veuillez remplir le prénom, le nom et l\'email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Email non valide', 'Veuillez saisir une adresse e-mail valide.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Token d\'authentification non trouvé.');
      }

      const prospectData: {
        prospectcompany?: string;
        firstname: string;
        lastname: string;
        email: string;
        phone1?: string;
      } = {
        firstname: firstName,
        lastname: lastName,
        email: email,
      };

      if (prospectCompany) {
        prospectData.prospectcompany = prospectCompany;
      }
      if (phone1) {
        prospectData.phone1 = phone1;
      }
      
      const prospectRes = await createProspect(token, prospectData);
      const prospectId = prospectRes.data.id;

      const uploadPromises = [];
      if (rectoImage) {
        uploadPromises.push(
          createGed(token, {
            idsource: prospectId,
            title: `CV Recto - ${firstName} ${lastName}`,
            kind: 'cv_recto',
            author: 'user',
            file: {
              uri: rectoImage.uri,
              type: rectoImage.mimeType || 'image/jpeg',
              name: rectoImage.fileName || 'recto.jpg',
            },
          })
        );
      }

      if (versoImage) {
        uploadPromises.push(
          createGed(token, {
            idsource: prospectId,
            title: `CV Verso - ${firstName} ${lastName}`,
            kind: 'cv_verso',
            author: 'user',
            file: {
              uri: versoImage.uri,
              type: versoImage.mimeType || 'image/jpeg',
              name: versoImage.fileName || 'verso.jpg',
            },
          })
        );
      }

      await Promise.all(uploadPromises);
      handleReset();
    } catch (error) {
      console.error('Failed to create prospect:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création du prospect.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderScanStep = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <View style={styles.scanHeader}>
        <Ionicons name="scan" size={64} color="#f87b1b" />
        <Text style={styles.scanTitle}>Scanner une Carte de Visite</Text>
        <Text style={styles.scanSubtitle}>
          Prenez une photo de la carte pour extraire automatiquement les informations
        </Text>
      </View>

      <View style={styles.imagePickerRow}>
        <Pressable style={styles.imagePickerLarge} onPress={() => handleImagePick('recto')}>
          {rectoImage ? (
            <Image source={{ uri: rectoImage.uri }} style={styles.previewImageLarge} />
          ) : (
            <>
              <Ionicons name="camera" size={48} color="#f87b1b" />
              <Text style={styles.imagePickerLabel}>Recto</Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.imagePickerLarge} onPress={() => handleImagePick('verso')}>
          {versoImage ? (
            <Image source={{ uri: versoImage.uri }} style={styles.previewImageLarge} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={48} color="#64748b" />
              <Text style={styles.imagePickerLabelSecondary}>Verso</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.scanActions}>
        <Pressable
          style={[styles.primaryButton, !(rectoImage || versoImage) && styles.buttonDisabled]}
          onPress={handleScanBusinessCard}
          disabled={!(rectoImage || versoImage)}
        >
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Analyser avec IA</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleSkipScan}>
          <Text style={styles.secondaryButtonText}>Saisir manuellement</Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderProcessingStep = () => (
    <Animated.View style={[styles.stepContainer, styles.processingContainer, { opacity: fadeAnim }]}>
      <View style={styles.processingContent}>
        <ActivityIndicator size="large" color="#f87b1b" />
        <Text style={styles.processingTitle}>Analyse en cours...</Text>
        <Text style={styles.processingSubtitle}>
          L&apos;IA extrait les informations de la carte de visite
        </Text>
        
        <View style={styles.processingSteps}>
          <View style={styles.processingStep}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.processingStepText}>Image reçue</Text>
          </View>
          <View style={styles.processingStep}>
            <ActivityIndicator size="small" color="#f87b1b" />
            <Text style={styles.processingStepText}>Analyse GPT-4...</Text>
          </View>
          <View style={styles.processingStep}>
            <Ionicons name="ellipse-outline" size={20} color="#cbd5e1" />
            <Text style={[styles.processingStepText, styles.processingStepInactive]}>
              Extraction des données
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderFormStep = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Informations du Prospect</Text>
         
        </View>

        <View style={styles.form}>
          <FormInput
            icon="business"
            placeholder="Société"
            value={prospectCompany}
            onChangeText={setProspectCompany}
            autoDetected={extractedData?.prospectcompany}
          />
          <FormInput
            icon="person-outline"
            placeholder="Nom"
            value={lastName}
            onChangeText={setLastName}
            required
            autoDetected={extractedData?.lastname}
          />
          <FormInput
            icon="person"
            placeholder="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            required
            autoDetected={extractedData?.firstname}
          />
          <FormInput
            icon="mail"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            required
            autoDetected={extractedData?.email}
          />
          <FormInput
            icon="call"
            placeholder="Téléphone"
            value={phone1}
            onChangeText={setPhone1}
            keyboardType="phone-pad"
            autoDetected={extractedData?.phone1}
          />
        </View>

        <View style={styles.formActions}>
          <Pressable
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Enregistrer</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleReset}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Annuler</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Animated.View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau Prospect</Text>
            <Pressable onPress={handleReset} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#64748b" />
            </Pressable>
          </View>

          {currentStep === 'scan' && renderScanStep()}
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'form' && renderFormStep()}
        </View>
      </View>
    </Modal>
  );
}

// Helper Components
const FormInput = ({ icon, placeholder, value, onChangeText, keyboardType, required, autoDetected }: any) => (
  <View style={styles.inputContainer}>
    <View style={styles.inputHeader}>
      <View style={styles.inputLabelRow}>
        <Ionicons name={icon} size={18} color="#f87b1b" />
        <Text style={styles.inputLabel}>
          {placeholder}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>
     
    </View>
    <TextInput
      style={[styles.input, autoDetected && styles.inputAutoDetected]}
      placeholder={placeholder}
      placeholderTextColor="#cbd5e1"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
    />
  </View>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '92%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  stepContainer: {
    padding: 24,
    minHeight: 400,
  },
  
  // Scan Step
  scanHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scanTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    textAlign: 'center',
  },
  scanSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  imagePickerLarge: {
    flex: 1,
    height: 180,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  previewImageLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  imagePickerLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#f87b1b',
  },
  imagePickerLabelSecondary: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  scanActions: {
    gap: 12,
  },

  // Processing Step
  processingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContent: {
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
  },
  processingSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  processingSteps: {
    marginTop: 32,
    gap: 16,
    width: '100%',
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingStepText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  processingStepInactive: {
    color: '#cbd5e1',
  },

  // Form Step
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  aiMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  aiMessageText: {
    fontSize: 12,
    color: '#f87b1b',
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  required: {
    color: '#ef4444',
  },
  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  autoDetectedText: {
    fontSize: 11,
    color: '#f87b1b',
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  inputAutoDetected: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f0f9ff',
  },
  formActions: {
    marginTop: 24,
    gap: 12,
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f87b1b',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#f87b1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 12,
    color: '#f87b1b',
    fontWeight: '600',
  },
});

