import API_CONFIG from '@/app/config/api';
import PreviewModal from '@/components/PreviewModal';
import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import companyService from '../../services/companyService';
import { Company } from '../../types/company';

export default function ProfileScreen() {
  const { user, logout, updateUser, token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  // Fetch company data on mount
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const companyData = await companyService.getCompany();
        setCompany(companyData);
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    };

    if (user) {
      fetchCompany();
    }
  }, [user]);

  // Watch for authentication changes and navigate automatically
  useEffect(() => {
    if (!user) {
      console.log('Profile screen detected logout, navigating to login...');
      router.replace('/(auth)/login');
    }
  }, [user]);

  const handlePickImage = async () => {
    // Request permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission requise", "Vous devez autoriser l'accès à la galerie pour changer votre photo de profil.");
      return;
    }

    // Launch image picker
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (pickerResult.canceled) {
      return;
    }

    // Upload the image
    if (pickerResult.assets && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      // Close the preview modal before uploading
      setIsPreviewVisible(false);
      await handleUploadPhoto(asset);
    }
  };
  
  const handleUploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user || !token) return;
    setIsUploading(true);
  
    const uriParts = asset.uri.split('.');
    const fileType = uriParts[uriParts.length - 1];
  
    const formData = new FormData();
    formData.append('photo', {
      uri: asset.uri,
      name: `photo_${user.id}.${fileType}`,
      type: `image/${fileType}`,
    } as any);
  
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
  
      const data = await response.json();
  
      if (response.ok) {
        Alert.alert('Succès', 'Votre photo de profil a été mise à jour.');
        if (data.photo) {
          updateUser({ photo: data.photo });
        }
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour de votre photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirmer la déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            console.log('Logging out...');
            await logout();
            console.log('Logout completed, navigation will be handled by AuthWrapper.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* App Header */}
      <AppHeader user={user || undefined} />
      
      <View style={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              style={styles.avatarLarge} 
              onPress={() => (company?.logo || user?.photo) && setIsPreviewVisible(true)} 
              disabled={isUploading || (!company?.logo && !user?.photo)}
            >
              {isUploading ? (
                <ActivityIndicator size="large" color="#f87b1b" />
              ) : company?.logo ? (
                <Image
                  source={{ uri: company.logo }}
                  style={styles.avatarImage}
                />
              ) : (
                <Image
                  source={ICONS.newIcon}
                  style={styles.avatarImage}
                />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.nameText} numberOfLines={1}>
                {user ? `${user.firstname} ${user.lastname}` : 'Chargement...'}
              </Text>
              <Text style={styles.emailText} numberOfLines={1}>{user?.email || '—'}</Text>
              <View style={styles.roleBadge}><Text style={styles.roleText}>{user?.role || 'user'}</Text></View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickItem}>
              <Ionicons name="person-outline" size={20} color="#f87b1b" />
              <Text style={styles.quickText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickItem}>
              <Ionicons name="notifications-outline" size={20} color="#f87b1b" />
              <Text style={styles.quickText}>Alertes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickItem}>
              <Ionicons name="settings-outline" size={20} color="#f87b1b" />
              <Text style={styles.quickText}>Paramètres</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="person-outline" size={20} color="#f87b1b" />
            <Text style={styles.menuText}>Informations personnelles</Text>
            <Ionicons name="chevron-forward" size={20} color="#f87b1b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={20} color="#f87b1b" />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#f87b1b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/change-password')}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#f87b1b" />
            <Text style={styles.menuText}>Changer de mot de passe</Text>
            <Ionicons name="chevron-forward" size={20} color="#f87b1b" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <Ionicons name="help-circle-outline" size={20} color="#f87b1b" />
            <Text style={styles.menuText}>Aide & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#f87b1b" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#f87b1b" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview Modal */}
      <PreviewModal
        visible={isPreviewVisible}
        onClose={() => setIsPreviewVisible(false)}
        mediaUrl={company?.logo || (user?.photo ? `${API_CONFIG.BASE_URL}${user.photo}` : undefined)}
        mediaType="image"
        title={company?.logo ? "Logo de l'organisme" : "Photo de profil"}
        onEdit={handlePickImage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f87b1b',
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden', // To keep the image within the circle
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11224e',
  },
  emailText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleText: { fontSize: 11, color: '#11224e', fontWeight: '700' },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#f87b1b',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    gap: 6,
  },
  quickText: { fontSize: 12, color: '#11224e', fontWeight: '600' },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f87b1b',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#11224e',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  logoutText: {
    fontSize: 16,
    color: '#f87b1b',
    fontWeight: '500',
    marginLeft: 8,
  },
});
