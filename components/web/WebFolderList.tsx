import { COLORS, FONT, SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useWebFolders } from '@/hooks/useWebFolders';
import { assignPhotoToFolder, Ged, getPhotoAvantByFolder } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DroppableFolderCard from './DroppableFolderCard';
import PhotoTypeSelectionModal from './PhotoTypeSelectionModal';

interface WebFolderListProps {
  galerieState: ReturnType<typeof import('@/hooks/useWebGalerie').useWebGalerie>;
}

export default function WebFolderList({ galerieState }: WebFolderListProps) {
  const { token } = useAuth();
  const { folders, loading, error, searchQuery, setSearchQuery, projectMap, zoneMap } = useWebFolders();
  const { updatePhotoAssignment, refetch: refetchGalerie } = galerieState;

  // State for pending drop and modal
  const [pendingDrop, setPendingDrop] = useState<{
    photoId: string;
    folderId: string;
    folderTitle: string;
    photoAvants: Ged[];
  } | null>(null);

  const handleDrop = async (photoId: string, folderId: string) => {
    if (!token) return;

    try {
      // Find folder details
      const folder = folders.find(f => f.id === folderId);
      if (!folder) {
        Alert.alert('Erreur', 'Dossier introuvable');
        return;
      }

      // Fetch all photoAvant for this folder
      const photoAvants = await getPhotoAvantByFolder(token, folderId);

      // Show modal with photoAvants
      setPendingDrop({
        photoId,
        folderId,
        folderTitle: folder.title,
        photoAvants,
      });
    } catch (err) {
      console.error('Failed to prepare photo assignment:', err);
      Alert.alert('Erreur', 'Échec de la préparation de l\'assignation');
    }
  };

  const handlePhotoAvantSelected = async () => {
    if (!pendingDrop || !token) return;

    const { photoId, folderId } = pendingDrop;

    try {
      // PhotoAvant uses folder ID as idsource
      updatePhotoAssignment(photoId, folderId, 'photoavant');
      setPendingDrop(null);
      
      await assignPhotoToFolder(token, photoId, folderId, 'photoavant');
      
      Alert.alert('Succès', 'Photo assignée comme "Situation Avant"');
      await refetchGalerie();
    } catch (err) {
      Alert.alert('Erreur', 'Échec de l\'assignation');
      await refetchGalerie();
    }
  };

  const handlePhotoApresSelected = async (photoAvantId: string) => {
    if (!pendingDrop || !token) return;

    const { photoId } = pendingDrop;

    try {
      // PhotoApres uses photoAvant ID as idsource (key change!)
      updatePhotoAssignment(photoId, photoAvantId, 'photoapres');
      setPendingDrop(null);
      
      await assignPhotoToFolder(token, photoId, photoAvantId, 'photoapres');
      
      Alert.alert('Succès', 'Photo assignée comme "Situation Après"');
      await refetchGalerie();
    } catch (err) {
      Alert.alert('Erreur', 'Échec de l\'assignation');
      await refetchGalerie();
    }
  };

  const handleCancelSelection = () => {
    setPendingDrop(null);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des dossiers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dossiers</Text>
        <Text style={styles.headerSubtitle}>
          {folders.length} dossier{folders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un dossier..."
          placeholderTextColor={COLORS.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.folderList} contentContainerStyle={styles.folderListContent}>
        {folders.map((folder) => (
          <DroppableFolderCard
            key={folder.id}
            folder={folder}
            onDrop={handleDrop}
            projectName={folder.project_id ? projectMap.get(folder.project_id) : undefined}
            zoneName={folder.zone_id ? zoneMap.get(folder.zone_id) : undefined}
          />
        ))}

        {folders.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Aucun dossier trouvé' : 'Aucun dossier disponible'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Photo Type Selection Modal */}
      <PhotoTypeSelectionModal
        visible={!!pendingDrop}
        folderTitle={pendingDrop?.folderTitle || ''}
        photoAvants={pendingDrop?.photoAvants || []}
        onSelectPhotoAvant={handlePhotoAvantSelected}
        onSelectPhotoApres={handlePhotoApresSelected}
        onCancel={handleCancelSelection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 24,
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 12,
    paddingLeft: 44,
    paddingRight: 16,
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  folderList: {
    flex: 1,
  },
  folderListContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  errorText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: '#ef4444',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
});
