import companyService from '@/services/companyService';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Company } from '../types/company';

interface CompanyEditModalProps {
  visible: boolean;
  onClose: () => void;
  company: Company | null;
  onUpdated: (updatedCompany: Company) => void;
}

const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    required = false
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    multiline?: boolean;
    required?: boolean;
}) => (
    <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
            {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
            style={[styles.input, multiline && styles.multilineInput]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
        />
    </View>
);

export default function CompanyEditModal({
  visible,
  onClose,
  company,
  onUpdated,
}: CompanyEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    email: '',
    foundedYear: '',
    phone1: '',
    phone2: '',
    website: '',
    email2: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        title: company.title || '',
        description: company.description || '',
        email: company.email || '',
        foundedYear: company.foundedYear?.toString() || '',
        phone1: company.sector?.phone1 || '',
        phone2: company.sector?.phone2 || '',
        website: company.sector?.website || '',
        email2: company.sector?.email2 || '',
      });
    }
  }, [company]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePickLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie pour sélectionner un logo');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de sélectionner une image');
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'organisme est requis');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Erreur', 'L\'email principal est requis');
      return false;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return false;
    }
    if (formData.email2 && !/\S+@\S+\.\S+/.test(formData.email2)) {
      Alert.alert('Erreur', 'Veuillez entrer un email secondaire valide');
      return false;
    }
    if (formData.foundedYear && (isNaN(Number(formData.foundedYear)) || Number(formData.foundedYear) < 1800 || Number(formData.foundedYear) > new Date().getFullYear())) {
      Alert.alert('Erreur', 'Veuillez entrer une année de création valide');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !company) return;

    setIsLoading(true);
    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        email: formData.email.trim(),
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : null,
        sector: {
          phone1: formData.phone1.trim() || null,
          phone2: formData.phone2.trim() || null,
          website: formData.website.trim() || null,
          email2: formData.email2.trim() || null,
        },
      };

      const updatedCompany = await companyService.updateCompany(updateData, logoUri);
      onUpdated(updatedCompany);
      onClose();
      Alert.alert('Succès', 'Les informations de l\'organisme ont été mises à jour');
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier l&apos;organisme</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#f87b1b" />
            ) : (
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Company Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations générales</Text>

            {/* Logo Selection */}
            <View style={styles.logoContainer}>
              <Text style={styles.inputLabel}>Logo de l&apos;organisme</Text>
              <TouchableOpacity onPress={handlePickLogo} style={styles.logoButton}>
                <Ionicons name="image-outline" size={24} color="#11224e" />
                <Text style={styles.logoButtonText}>Modifier le logo</Text>
              </TouchableOpacity>
              {logoUri && (
                <View style={styles.logoPreview}>
                  <Image source={{ uri: logoUri }} style={styles.logoImage} />
                </View>
              )}
            </View>

            <InputField
              label="Nom de l'organisme"
              value={formData.title}
              onChangeText={(text) => handleInputChange('title', text)}
              placeholder="Entrez le nom de l'organisme"
              required
            />

            <InputField
              label="Description"
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Description de l'organisme"
              multiline
            />

            <InputField
              label="Email principal"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              placeholder="email@exemple.com"
              keyboardType="email-address"
              required
            />

            <InputField
              label="Année de création"
              value={formData.foundedYear}
              onChangeText={(text) => handleInputChange('foundedYear', text)}
              placeholder="2020"
              keyboardType="numeric"
            />
          </View>

          {/* Sector Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations du secteur</Text>

            <InputField
              label="Téléphone principal"
              value={formData.phone1}
              onChangeText={(text) => handleInputChange('phone1', text)}
              placeholder="+33 1 23 45 67 89"
              keyboardType="phone-pad"
            />

            <InputField
              label="Téléphone secondaire"
              value={formData.phone2}
              onChangeText={(text) => handleInputChange('phone2', text)}
              placeholder="+33 1 23 45 67 90"
              keyboardType="phone-pad"
            />

            <InputField
              label="Site web"
              value={formData.website}
              onChangeText={(text) => handleInputChange('website', text)}
              placeholder="https://www.exemple.com"
              keyboardType="default"
            />

            <InputField
              label="Email secondaire"
              value={formData.email2}
              onChangeText={(text) => handleInputChange('email2', text)}
              placeholder="contact@exemple.com"
              keyboardType="email-address"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11224e',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#f87b1b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#11224e',
    backgroundColor: 'white',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
  },
  logoButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#11224e',
    marginLeft: 8,
  },
  logoPreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
} as const;
