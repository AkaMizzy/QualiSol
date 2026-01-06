import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import API_CONFIG from '../../app/config/api';
import { useAuth } from '../../contexts/AuthContext';
import * as userService from '../../services/userService';
import { CompanyUser, UpdateUserData } from '../../types/user';

interface UpdateUserCompProps { 
  visible: boolean;
  user: CompanyUser | null;
  onClose: () => void;
  onUserUpdated: (updatedUser: CompanyUser) => void;
}

export default function UpdateUserComp({ visible, user, onClose, onUserUpdated }: UpdateUserCompProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<UpdateUserData>({
    firstname: '',
    lastname: '',
    email: '',
    phone1: '',
    phone2: '',
    email_second: '',
    status_id: '1',
  });

  // Avatar state
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);

  // Initialize form data when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone1: user.phone1 || '',
        phone2: user.phone2 || '',
        email_second: user.email_second || '',
        status_id: user.status_id,
      });
      setAvatarUri(user.photo ? `${API_CONFIG.BASE_URL}${user.photo}` : null);
      setAvatarChanged(false);
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstname?.trim()) {
      newErrors.firstname = 'Le prénom est requis';
    }

    if (!formData.lastname?.trim()) {
      newErrors.lastname = 'Le nom est requis';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'L&apos;email est requis';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Format d&apos;email invalide';
      }
    }

    if (formData.email_second && formData.email_second.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email_second)) {
        newErrors.email_second = 'Format d&apos;email secondaire invalide';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        setAvatarChanged(true);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de sélectionner l&apos;image');
    }
  };

  const handleSubmit = async () => {
    if (!user || !token) return;

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare update data
      const updateData: UpdateUserData = {
        firstname: formData.firstname?.trim(),
        lastname: formData.lastname?.trim(),
        email: formData.email?.trim(),
        phone1: formData.phone1?.trim() || undefined,
        phone2: formData.phone2?.trim() || undefined,
        email_second: formData.email_second?.trim() || undefined,
        status_id: formData.status_id,
      };

      // Update user information
      const response = await userService.updateUser(user.id, updateData, avatarChanged ? avatarUri ?? undefined : undefined);

      // Use the updated user data from the backend response
      onUserUpdated(response.user);
      Alert.alert('Succès', 'Utilisateur mis à jour avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de mettre à jour l&apos;utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (user) {
      setFormData({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone1: user.phone1 || '',
        phone2: user.phone2 || '',
        email_second: user.email_second || '',
        status_id: user.status_id,
      });
      setAvatarUri(user.photo ? `${API_CONFIG.BASE_URL}${user.photo}` : null);
      setAvatarChanged(false);
      setErrors({});
    }
  };

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#11224e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Modifier l&apos;utilisateur</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Ionicons name="refresh" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handleAvatarPick} style={styles.avatarContainer}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#6b7280" />
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarLabel}>Appuyez pour changer la photo</Text>
          </View>

          {/* Status Switch */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut</Text>
            <View style={styles.statusSwitchContainer}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.status_id === '1' && styles.statusOptionActive
                ]}
                onPress={() => setFormData({ ...formData, status_id: '1' })}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.statusIndicator,
                  formData.status_id === '1' && styles.statusIndicatorActive
                ]}>
                  {formData.status_id === '1' && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={[
                  styles.statusText,
                  formData.status_id === '1' && styles.statusTextActive
                ]}>
                  Actif
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.status_id === '0' && styles.statusOptionActive
                ]}
                onPress={() => setFormData({ ...formData, status_id: '0' })}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.statusIndicator,
                  formData.status_id === '0' && styles.statusIndicatorActive
                ]}>
                  {formData.status_id === '0' && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={[
                  styles.statusText,
                  formData.status_id === '0' && styles.statusTextActive
                ]}>
                  Inactif
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            <View style={styles.formContainer}>
              {/* Name Row */}
              <View style={styles.nameRow}>
                <View style={styles.nameCol}>
                  <Text style={styles.label}>
                    Prénom <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, errors.firstname && styles.inputError]}
                    value={formData.firstname}
                    onChangeText={(text) => {
                      setFormData({ ...formData, firstname: text });
                      if (errors.firstname) {
                        setErrors({ ...errors, firstname: '' });
                      }
                    }}
                    placeholder="Prénom"
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  {errors.firstname && (
                    <Text style={styles.errorText}>{errors.firstname}</Text>
                  )}
                </View>

                <View style={styles.nameCol}>
                  <Text style={styles.label}>
                    Nom <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, errors.lastname && styles.inputError]}
                    value={formData.lastname}
                    onChangeText={(text) => {
                      setFormData({ ...formData, lastname: text });
                      if (errors.lastname) {
                        setErrors({ ...errors, lastname: '' });
                      }
                    }}
                    placeholder="Nom"
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  {errors.lastname && (
                    <Text style={styles.errorText}>{errors.lastname}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de contact</Text>
            
            <View style={styles.formContainer}>
              {/* Primary Email */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Email principal <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  placeholder="email@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Secondary Email */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email secondaire</Text>
                <TextInput
                  style={[styles.input, errors.email_second && styles.inputError]}
                  value={formData.email_second}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email_second: text });
                    if (errors.email_second) {
                      setErrors({ ...errors, email_second: '' });
                    }
                  }}
                  placeholder="email2@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {errors.email_second && (
                  <Text style={styles.errorText}>{errors.email_second}</Text>
                )}
              </View>

              {/* Primary Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone principal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone1}
                  onChangeText={(text) => setFormData({ ...formData, phone1: text })}
                  placeholder="+33 1 23 45 67 89"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              {/* Secondary Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone secondaire</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone2}
                  onChangeText={(text) => setFormData({ ...formData, phone2: text })}
                  placeholder="+33 1 23 45 67 89"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.submitButtonText}>Sauvegarder</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = {
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#11224e',
  },
  resetButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center' as const,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  avatarOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f87b1b',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#11224e',
    marginBottom: 12,
  },
  statusSwitchContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  statusOptionActive: {
    borderColor: '#f87b1b',
    backgroundColor: '#fff7ed',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  statusIndicatorActive: {
    backgroundColor: '#2ecc71',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
  },
  statusTextActive: {
    color: '#f87b1b',
    fontWeight: '600' as const,
  },
  formContainer: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  nameCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  formGroupLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
    backgroundColor: 'white',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#f87b1b',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
} as const;
