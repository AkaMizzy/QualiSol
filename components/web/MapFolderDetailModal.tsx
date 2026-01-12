import API_CONFIG from '@/app/config/api';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import folderService, { Folder } from '@/services/folderService';
import { Ged, getGedsBySource } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface MapFolderDetailModalProps {
  visible: boolean;
  folderId: string | null;
  photoId?: string; // The photo that was clicked on the map
  onClose: () => void;
}

interface FolderPhoto {
  id: string;
  ged: Ged;
  afterPhoto?: Ged; // For photoAvant, the linked photoApres
}

export default function MapFolderDetailModal({
  visible,
  folderId,
  photoId,
  onClose,
}: MapFolderDetailModalProps) {
  const { token } = useAuth();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [photos, setPhotos] = useState<FolderPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<Ged | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [zoneName, setZoneName] = useState<string>('');

  useEffect(() => {
    if (!visible || !folderId || !token) {
      setFolder(null);
      setPhotos([]);
      setLoading(true);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch folder details
        const folderData = await folderService.getFolderById(folderId, token);
        setFolder(folderData);

        if (folderData) {
          // Fetch project and zone names
          if (folderData.project_id) {
            const projects = await folderService.getAllProjects(token);
            const project = projects.find(p => p.id === folderData.project_id);
            setProjectName(project?.title || '');
          }
          if (folderData.zone_id) {
            const zones = await folderService.getAllZones(token);
            const zone = zones.find(z => z.id === folderData.zone_id);
            setZoneName(zone?.title || '');
          }
        }

        // Fetch all photoAvant for this folder
        const photoAvants = await getGedsBySource(token, folderId, 'photoavant');
        
        // For each photoAvant, fetch its photoApres
        const photosWithAfter: FolderPhoto[] = await Promise.all(
          photoAvants.map(async (ged) => {
            const afterPhotos = await getGedsBySource(token, ged.id, 'photoapres');
            return {
              id: ged.id,
              ged,
              afterPhoto: afterPhotos.length > 0 ? afterPhotos[0] : undefined,
            };
          })
        );

        setPhotos(photosWithAfter);
      } catch (error) {
        console.error('Error fetching folder data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [visible, folderId, token]);

  const getImageUrl = (ged: Ged) => {
    return ged.url ? `${API_CONFIG.BASE_URL}${ged.url}` : '';
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="folder-open-outline" size={24} color={COLORS.primary} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {loading ? 'Chargement...' : folder?.title || 'Dossier'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Chargement des données...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {/* Left Side - Folder Info */}
              <View style={styles.folderInfo}>
                <Text style={styles.sectionTitle}>Informations du Dossier</Text>
                
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text-outline" size={18} color={COLORS.gray} />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Code</Text>
                      <Text style={styles.infoValue}>{folder?.code || '-'}</Text>
                    </View>
                  </View>

                  {folder?.description && (
                    <View style={styles.infoRow}>
                      <Ionicons name="information-circle-outline" size={18} color={COLORS.gray} />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Description</Text>
                        <Text style={styles.infoValue} numberOfLines={3}>
                          {folder.description}
                        </Text>
                      </View>
                    </View>
                  )}

                  {projectName && (
                    <View style={styles.infoRow}>
                      <Ionicons name="business-outline" size={18} color={COLORS.gray} />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Projet</Text>
                        <Text style={styles.infoValue}>{projectName}</Text>
                      </View>
                    </View>
                  )}

                  {zoneName && (
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={18} color={COLORS.gray} />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Zone</Text>
                        <Text style={styles.infoValue}>{zoneName}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Date de création</Text>
                      <Text style={styles.infoValue}>
                        {folder?.created_at
                          ? new Date(folder.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.statsCard}>
                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>{photos.length}</Text>
                    <Text style={styles.statLabel}>Photo Avant</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>
                      {photos.filter(p => p.afterPhoto).length}
                    </Text>
                    <Text style={styles.statLabel}>Photo Après</Text>
                  </View>
                </View>
              </View>

              {/* Right Side - Photos */}
              <View style={styles.photosSection}>
                <Text style={styles.sectionTitle}>Photos du Dossier</Text>
                
                {photos.length === 0 ? (
                  <View style={styles.emptyPhotos}>
                    <Ionicons name="images-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.emptyText}>Aucune photo dans ce dossier</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.photosList} showsVerticalScrollIndicator={false}>
                    {photos.map((photoItem) => (
                      <View 
                        key={photoItem.id} 
                        style={[
                          styles.photoCard,
                          photoItem.id === photoId && styles.photoCardHighlighted,
                        ]}
                      >
                        <View style={styles.photoRow}>
                          {/* Photo Avant */}
                          <TouchableOpacity
                            style={styles.photoContainer}
                            onPress={() => setSelectedPreview(photoItem.ged)}
                          >
                            <View style={styles.photoLabel}>
                              <View style={[styles.labelDot, { backgroundColor: '#22c55e' }]} />
                              <Text style={styles.labelText}>Avant</Text>
                            </View>
                            <Image
                              source={{ uri: getImageUrl(photoItem.ged) }}
                              style={styles.photoImage}
                              resizeMode="cover"
                            />
                            <Text style={styles.photoTitle} numberOfLines={1}>
                              {photoItem.ged.title || 'Sans titre'}
                            </Text>
                          </TouchableOpacity>

                          {/* Arrow */}
                          <View style={styles.arrowContainer}>
                            <Ionicons name="arrow-forward" size={24} color={COLORS.gray} />
                          </View>

                          {/* Photo Après */}
                          {photoItem.afterPhoto ? (
                            <TouchableOpacity
                              style={styles.photoContainer}
                              onPress={() => setSelectedPreview(photoItem.afterPhoto!)}
                            >
                              <View style={styles.photoLabel}>
                                <View style={[styles.labelDot, { backgroundColor: '#eab308' }]} />
                                <Text style={styles.labelText}>Après</Text>
                              </View>
                              <Image
                                source={{ uri: getImageUrl(photoItem.afterPhoto) }}
                                style={styles.photoImage}
                                resizeMode="cover"
                              />
                              <Text style={styles.photoTitle} numberOfLines={1}>
                                {photoItem.afterPhoto.title || 'Sans titre'}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={[styles.photoContainer, styles.noPhoto]}>
                              <Ionicons name="image-outline" size={32} color={COLORS.gray} />
                              <Text style={styles.noPhotoText}>Pas de photo après</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          )}
        </View>
      </Pressable>

      {/* Photo Preview Modal */}
      {selectedPreview && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedPreview(null)}>
          <Pressable style={styles.previewOverlay} onPress={() => setSelectedPreview(null)}>
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: getImageUrl(selectedPreview) }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{selectedPreview.title || 'Sans titre'}</Text>
                {selectedPreview.description && (
                  <Text style={styles.previewDescription}>{selectedPreview.description}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.previewClose}
                onPress={() => setSelectedPreview(null)}
              >
                <Ionicons name="close-circle" size={36} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: COLORS.lightWhite,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.tertiary,
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  content: {
    flexDirection: 'row',
    flex: 1,
  },
  folderInfo: {
    width: 320,
    padding: 20,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: COLORS.lightWhite,
  },
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: FONT.bold,
    fontSize: 28,
    color: COLORS.primary,
  },
  statLabel: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  photosSection: {
    flex: 1,
    padding: 20,
  },
  emptyPhotos: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginTop: 12,
  },
  photosList: {
    flex: 1,
  },
  photoCard: {
    backgroundColor: COLORS.lightWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photoCardHighlighted: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#fff7ed',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  photoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  photoImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  photoTitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.tertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  noPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
  },
  noPhotoText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 8,
  },
  arrowContainer: {
    width: 40,
    alignItems: 'center',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '90%',
    maxWidth: 800,
    maxHeight: '90%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    maxHeight: 600,
  },
  previewInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  previewTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.white,
  },
  previewDescription: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: '#d1d5db',
    marginTop: 8,
  },
  previewClose: {
    position: 'absolute',
    top: -50,
    right: 0,
  },
});
