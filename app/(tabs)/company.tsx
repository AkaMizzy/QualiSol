import { useAuth } from '@/contexts/AuthContext';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import CompanyEditModal from '../../components/company/CompanyEditModal';
import CustomAlert from '../../components/CustomAlert';
import companyService from '../../services/companyService';
import { Company } from '../../types/company';

export default function CompanyScreen() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchCompany = async () => {
      try {
        setIsLoading(true);
        const companyData = await companyService.getCompany();
        setCompany(companyData);
      } catch (error) {
        Alert.alert('Erreur', error instanceof Error ? error.message : 'Erreur lors du chargement de l\'organisme');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [user]);

  const handleCompanyUpdated = (updatedCompany: Company) => {
    setCompany(updatedCompany);
    setAlertVisible(true);
  };

  const handleLogoUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission d'accès", "Vous devez autoriser l'accès à la galerie pour changer le logo.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync();
    if (pickerResult.canceled) {
      return;
    }

    if (pickerResult.assets && pickerResult.assets.length > 0) {
      const uri = pickerResult.assets[0].uri;
      if (company && user) {
        setIsUploading(true);
        try {
          const authorName = [user.firstname, user.lastname].filter(Boolean).join(' ');
          const updatedCompany = await companyService.uploadCompanyLogo(company.id, authorName, uri);
          setCompany(updatedCompany);
          Alert.alert('Succès', 'Le logo a été mis à jour.');
        } catch (error) {
          Alert.alert('Erreur', error instanceof Error ? error.message : "Erreur lors de la mise à jour du logo.");
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const getStatusStyle = (status?: string) => {
    const isActive = status === 'active' || status === '1';
    return isActive
      ? { bg: '#e9f7ef', color: '#2ecc71', border: '#c6f0d9', label: 'Actif' }
      : { bg: '#f4f5f7', color: '#6b7280', border: '#e5e7eb', label: 'Inactif' };
  };

  const InfoRow = ({ icon, label, value, isLink = false }: { icon: string; label: string; value?: string | number | null; isLink?: boolean }) => {
    if (!value) return null;
    
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoIconContainer}>
          <Ionicons name={icon as any} size={20} color="#f87b1b" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={[styles.infoValue, isLink && styles.linkText]}>
            {value}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#11224e" size="large" />
        <Text style={styles.loadingText}>Chargement de l&apos;organisme...</Text>
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="business-outline" size={48} color="#6b7280" />
        <Text style={styles.errorTitle}>Aucun organisme trouvé</Text>
        <Text style={styles.errorText}>
          Votre compte n&apos;est associé à aucun organisme pour le moment.
        </Text>
      </View>
    );
  }

  const statusBadge = getStatusStyle(company.status);

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <AppHeader user={user || undefined} />
        <ScrollView 
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleLogoUpload} disabled={isUploading}>
              <View style={styles.logoContainer}>
                {company.logo ? (
                  <Image source={{ uri: company.logo }} style={styles.logo} />
                ) : (
                  <View style={styles.defaultLogo}>
                    <Ionicons name="business" size={32} color="#f87b1b" />
                  </View>
                )}
                {isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Text style={styles.companyTitle}>{company.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.border }]}>
                  <Text style={[styles.statusText, { color: statusBadge.color }]}>
                    {statusBadge.label}
                  </Text>
                </View>
              </View>
              {company.description && (
                <Text style={styles.companyDescription}>{company.description}</Text>
              )}
            </View>
          </View>

          {/* Company Information */}
          <View style={styles.section}>
            <View style={styles.infoContainer}>
              <InfoRow icon="mail-outline" label="Email" value={company.email || '-'} />
              <InfoRow icon="call-outline" label="Téléphone" value={company.phone || '-'} />
              <InfoRow icon="business-outline" label="Adresse" value={company.address || '-'} />
              <InfoRow icon="map-outline" label="Ville" value={company.city || '-'} />
              <InfoRow icon="flag-outline" label="Pays" value={company.country || '-'} />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setEditModalVisible(true)}
            >
              <Ionicons name="create-outline" size={20} color="#f87b1b" />
              <Text style={styles.actionButtonText}>Modifier les informations</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Edit Modal */}
      <CompanyEditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        company={company}
        onUpdated={handleCompanyUpdated}
      />

      <CustomAlert
        visible={alertVisible}
        type="success"
        title="Succès"
        message="Les informations de l'organisme ont été mises à jour"
        onClose={() => setAlertVisible(false)}
        duration={3000}
      />
    </>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#11224e',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logoContainer: {
    marginRight: 16,
    position: 'relative',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  defaultLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  companyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11224e',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  companyDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 16,
  },
  infoContainer: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 40,
    alignItems: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#11224e',
    fontWeight: '500',
  },
  linkText: {
    color: '#f87b1b',
  },
  actionsContainer: {
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f87b1b',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f87b1b',
  },
} as const;
