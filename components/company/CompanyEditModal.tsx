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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Company } from '../../types/company';

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
    phone: '',
    address: '',
    city: '',
    pays: '',
    ice_number: '',
    prompt1: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        title: company.title || '',
        description: company.description || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        pays: company.pays || '',
        ice_number: company.ice_number || '',
        prompt1: company.prompt1 || "Critiquer et relever les anomalies dans cette image en 100 mots. Soyez critique.",
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
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        pays: formData.pays.trim() || null,
        ice_number: formData.ice_number.trim() || null,
        prompt1: formData.prompt1.trim() || null,
      };

      const updatedCompany = await companyService.updateCompany(updateData, logoUri);
      onUpdated(updatedCompany);
      onClose();
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
      <SafeAreaView style={styles.safeArea}>
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
              label="Téléphone"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              placeholder="+33 1 23 45 67 89"
              keyboardType="phone-pad"
            />
          </View>

          {/* More Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plus d&apos;informations</Text>

            <InputField
              label="Adresse"
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              placeholder="123 Rue de l'Exemple"
            />

            <InputField
              label="Ville"
              value={formData.city}
              onChangeText={(text) => handleInputChange('city', text)}
              placeholder="Paris"
            />

            <InputField
              label="Pays"
              value={formData.pays}
              onChangeText={(text) => handleInputChange('pays', text)}
              placeholder="France"
            />

            <InputField
              label="Numéro ICE"
              value={formData.ice_number}
              onChangeText={(text) => handleInputChange('ice_number', text)}
              placeholder="001234567890123"
            />
             <InputField
              label="Prompt 1"
              value={formData.prompt1}
              onChangeText={(text) => handleInputChange('prompt1', text)}
              placeholder="Prompt pour la description d'image"
              multiline
            />
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
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
