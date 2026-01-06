import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import API_CONFIG from '../../app/config/api';
import { deleteUser } from '../../services/userService';
import { CompanyUser } from '../../types/user';
import UpdateUserComp from './UpdateUserComp';

interface UserDetailModalProps {
  visible: boolean;
  user: CompanyUser | null;
  onClose: () => void;
  onUserUpdated?: (updatedUser: CompanyUser) => void;
  onUserDeleted?: (userId: string) => void;
}

export default function UserDetailModal({ visible, user, onClose, onUserUpdated, onUserDeleted }: UserDetailModalProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<CompanyUser | null>(user);

  React.useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  if (!currentUser) return null;

  const getRoleStyle = (roleName?: string) => {
    const lowerCaseRole = roleName?.toLowerCase();
    return lowerCaseRole === 'admin'
      ? { bg: '#e3f2fd', color: '#1976d2', border: '#bbdefb', label: 'Admin' }
      : { bg: '#ffffff', color: '#f87b1b', border: '#f87b1b', label: 'Utilisateur' };
  };

  const getStatusStyle = (statusName?: string) => {
    const lowerCaseStatus = statusName?.toLowerCase();
    return lowerCaseStatus === 'actif' || lowerCaseStatus === 'active'
      ? { bg: '#e9f7ef', color: '#2ecc71', border: '#c6f0d9', label: 'Actif' }
      : { bg: '#f4f5f7', color: '#6b7280', border: '#e5e7eb', label: 'Inactif' };
  };

  const roleStyle = getRoleStyle(currentUser.role?.name);
  const statusStyle = getStatusStyle(currentUser.status?.name);

  // Build avatar URL if photo exists
  const avatarUrl = currentUser.photo
    ? `${API_CONFIG.BASE_URL}${currentUser.photo}`
    : null;

  const handleUserUpdated = (updatedUser: CompanyUser) => {
    setCurrentUser(updatedUser);
    onUserUpdated?.(updatedUser);
  };

  const handleDeleteUser = async () => {
    if (!currentUser) return;

    Alert.alert(
      'Supprimer l\'utilisateur',
      `Êtes-vous sûr de vouloir supprimer ${currentUser.firstname} ${currentUser.lastname} ? Cette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(currentUser.id);
              onUserDeleted?.(currentUser.id);
              onClose();
              Alert.alert('Succès', 'Utilisateur supprimé avec succès');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer l\'utilisateur');
            }
          },
        },
      ]
    );
  };

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
          <Text style={styles.modalTitle}>Détails de l&apos;utilisateur</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleDeleteUser}
              style={styles.deleteButton}
            >
              <Ionicons name="trash" size={22} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowUpdateModal(true)}
              style={styles.editButton}
            >
              <Ionicons name="pencil" size={22} color="#f87b1b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#6b7280" />
                </View>
              )}
            </View>
            <Text style={styles.userName}>
              {currentUser.firstname} {currentUser.lastname}
            </Text>
            <Text style={styles.userEmail}>{currentUser.email}</Text>
          </View>

          {/* Status & Role Cards */}
          <View style={styles.badgesSection}>
            {currentUser.role?.name && (
              <View style={[styles.badgeCard, { backgroundColor: roleStyle.bg, borderColor: roleStyle.border }]}>
                <View style={styles.badgeHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={roleStyle.color} />
                  <Text style={[styles.badgeTitle, { color: roleStyle.color }]}>Rôle</Text>
                </View>
                <Text style={[styles.badgeValue, { color: roleStyle.color }]}>
                  {roleStyle.label}
                </Text>
              </View>
            )}

            {currentUser.status?.name && (
              <View style={[styles.badgeCard, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                <View style={styles.badgeHeader}>
                  <Ionicons name="checkmark-circle" size={20} color={statusStyle.color} />
                  <Text style={[styles.badgeTitle, { color: statusStyle.color }]}>Statut</Text>
                </View>
                <Text style={[styles.badgeValue, { color: statusStyle.color }]}>
                  {statusStyle.label}
                </Text>
              </View>
            )}
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de contact</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="mail" size={18} color="#11224e" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email principal</Text>
                  <Text style={styles.infoValue}>{currentUser.email}</Text>
                </View>
              </View>

              {currentUser.email_second && (
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="mail-outline" size={18} color="#11224e" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email secondaire</Text>
                    <Text style={styles.infoValue}>{currentUser.email_second}</Text>
                  </View>
                </View>
              )}

              {currentUser.phone1 && (
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="call" size={18} color="#11224e" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Téléphone principal</Text>
                    <Text style={styles.infoValue}>{currentUser.phone1}</Text>
                  </View>
                </View>
              )}

              {currentUser.phone2 && (
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="call-outline" size={18} color="#11224e" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Téléphone secondaire</Text>
                    <Text style={styles.infoValue}>{currentUser.phone2}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person" size={18} color="#11224e" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Prénom</Text>
                  <Text style={styles.infoValue}>{currentUser.firstname}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person-outline" size={18} color="#11224e" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nom</Text>
                  <Text style={styles.infoValue}>{currentUser.lastname}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <UpdateUserComp
          visible={showUpdateModal}
          user={currentUser}
          onClose={() => setShowUpdateModal(false)}
          onUserUpdated={handleUserUpdated}
        />
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
  headerActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  deleteButton: {
    padding: 4,
  },
  editButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#11224e',
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
    marginBottom: 16,
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
  userName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#11224e',
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  badgesSection: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 24,
  },
  badgeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
  },
  badgeHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginLeft: 6,
    textTransform: 'uppercase' as const,
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '700' as const,
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
  infoCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoItemLast: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase' as const,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
} as const;
