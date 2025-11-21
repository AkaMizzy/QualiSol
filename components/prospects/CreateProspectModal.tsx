import { createGed } from '@/services/gedService';
import { createProspect } from '@/services/prospectService';
import { getAuthToken } from '@/services/secureStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function CreateProspectModal({ visible, onClose }: CreateProspectModalProps) {
  const [prospectCompany, setProspectCompany] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone1, setPhone1] = useState('');
  const [rectoImage, setRectoImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [versoImage, setVersoImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      quality: 1,
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

  const handleReset = () => {
    setProspectCompany('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone1('');
    setRectoImage(null);
    setVersoImage(null);
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

      // 1. Create prospect
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

      // 2. Upload images to GED
      const uploadPromises = [];
      if (rectoImage) {
        uploadPromises.push(
          createGed(token, {
            idsource: prospectId,
            title: `CV Recto - ${firstName} ${lastName}`,
            kind: 'cv_recto',
            author: 'user', // Replace with actual user info if available
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
            author: 'user', // Replace with actual user info if available
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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Créer un Prospect</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close-circle-outline" size={30} color="#f87b1b" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Société"
                placeholderTextColor="#f87b1b"
                value={prospectCompany}
                onChangeText={setProspectCompany}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor="#f87b1b"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Prénom"
                placeholderTextColor="#f87b1b"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#f87b1b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Téléphone"
                placeholderTextColor="#f87b1b"
                value={phone1}
                onChangeText={setPhone1}
                keyboardType="phone-pad"
              />

              <View style={styles.imagePickerContainer}>
                
                 {/* Verso Image Picker */}
                 <Pressable style={styles.imagePicker} onPress={() => handleImagePick('verso')}>
                  {versoImage ? (
                    <Image source={{ uri: versoImage.uri }} style={styles.previewImage} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color="#f87b1b" />
                      <Text style={styles.imagePickerText}>Carte de visite (Verso)</Text>
                    </>
                  )}
                </Pressable>
                {/* Recto Image Picker */}
                <Pressable style={styles.imagePicker} onPress={() => handleImagePick('recto')}>
                  {rectoImage ? (
                    <Image source={{ uri: rectoImage.uri }} style={styles.previewImage} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color="#f87b1b" />
                      <Text style={styles.imagePickerText}>Carte de visite (Recto)</Text>
                    </>
                  )}
                </Pressable>
               
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Enregistrer</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleReset}
                disabled={isLoading}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Annuler</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingBottom: 15,
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f87b1b',
  },
  form: {
    gap: 12,
  },
  input: {
    height: 50,
    borderColor: '#f87b1b',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F2F2F7',
    fontSize: 16,
    color: '#1C1C1E',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  imagePicker: {
    flex: 1,
    height: 120,
    borderWidth: 2,
    borderColor: '#f87b1b',
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F2',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 12,
    color: '#f87b1b',
    fontWeight: '600',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 25,
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#f87b1b',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#1C1C1E',
  },
});
