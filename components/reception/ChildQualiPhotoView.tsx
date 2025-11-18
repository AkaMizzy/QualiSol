import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import API_CONFIG from '@/app/config/api';
import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { Ged, getGedsBySource } from '@/services/gedService';
import { Folder } from '@/services/qualiphotoService';

import CreateComplementaireQualiPhotoModal from './CreateComplementaireQualiPhotoModal';

type ChildQualiPhotoViewProps = {
  item: Ged;
  parentFolder: Folder;
  onClose: () => void;
  subtitle: string;
  projectTitle: string;
  zoneTitle: string;
};

export const ChildQualiPhotoView: React.FC<ChildQualiPhotoViewProps> = ({
  item,
  parentFolder,
  onClose,
  subtitle,
  projectTitle,
  zoneTitle,
}) => {
  const { token } = useAuth();
  const [afterPhotos, setAfterPhotos] = useState<Ged[]>([]);
  const [isLoadingAfter, setIsLoadingAfter] = useState(false);
  const [isCreateAfterModalVisible, setCreateAfterModalVisible] = useState(false);

  useEffect(() => {
    async function fetchAfterPhotos() {
      if (!token || !item?.id) return;

      setIsLoadingAfter(true);
      try {
        const photos = await getGedsBySource(token, item.id, 'photoapres');
        setAfterPhotos(photos);
      } catch (error) {
        console.error('Failed to fetch after photos:', error);
        setAfterPhotos([]);
      } finally {
        setIsLoadingAfter(false);
      }
    }

    fetchAfterPhotos();
  }, [item?.id, token]);

  const handleAddAfterPhoto = () => {
    setCreateAfterModalVisible(true);
  };

  const handleAfterPhotoSuccess = (createdGed: Ged) => {
    setAfterPhotos(prev => [...prev, createdGed]);
    setCreateAfterModalVisible(false);
  };

  const getFullImageUrl = (relativeUrl: string | null | undefined): string | null => {
    if (!relativeUrl) return null;
    return `${API_CONFIG.BASE_URL}${relativeUrl}`;
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer les détails"
        onPress={onClose}
        style={styles.closeBtn}
      >
        <Ionicons name="arrow-back" size={28} color="#f87b1b" />
      </Pressable>
      <View style={styles.headerTitles}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.headerActionsContainer}>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={handleAddAfterPhoto}
          accessibilityLabel="Ajouter une photo complémentaire"
        >
          <Image source={ICONS.cameraGif} style={styles.headerActionIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      {header}
      <ScrollView bounces>
        <View style={styles.content}>
          <View>
            <Text style={styles.sectionTitle}>Situation avant</Text>
            {item.url ? (
              <TouchableOpacity onPress={() => {}} style={styles.photoContainer}>
                <Image source={{ uri: getFullImageUrl(item.url) as string }} style={styles.childThumbnail} />
                <View style={styles.childGridOverlay}>
                  <Text style={styles.childGridTitle} numberOfLines={1}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          <View>
            <Text style={styles.sectionTitle}>Situation après</Text>
            {isLoadingAfter ? (
              <ActivityIndicator style={{ marginVertical: 12 }} />
            ) : afterPhotos.length > 0 ? (
              afterPhotos.map(photo => (
                <TouchableOpacity key={photo.id} onPress={() => {}} style={styles.photoContainer}>
                  <Image source={{ uri: getFullImageUrl(photo.url) as string }} style={styles.childThumbnail} />
                  <View style={styles.childGridOverlay}>
                    <Text style={styles.childGridTitle} numberOfLines={1}>{photo.title}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noAfterPhotosText}>Aucune photo après n&apos;a encore été ajoutée.</Text>
            )}
          </View>
          {afterPhotos.length > 0 && (
            <View style={styles.comparisonContainer}>
              <View style={styles.comparisonGrid}>
                {/* "Avant" Column */}
                <View style={styles.comparisonColumn}>
                  <Text style={styles.columnHeader}>Situation avant</Text>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        placeholder="Description"
                        value={item.description || ''}
                        style={[styles.input, { minHeight: 80 }]}
                        multiline
                        editable={false}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Notes vocales</Text>
                    <View style={styles.voiceNotesPlaceholder}>
                      <Ionicons name="mic-outline" size={20} color="#9ca3af" />
                      <Text style={styles.placeholderText}>Bientôt disponible</Text>
                    </View>
                  </View>
                </View>

                {/* "Après" Column */}
                <View style={styles.comparisonColumn}>
                  <Text style={styles.columnHeader}>Situation après</Text>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        placeholder="Description"
                        value={afterPhotos[0]?.description || ''}
                        style={[styles.input, { minHeight: 80 }]}
                        multiline
                        editable={false}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Notes vocales</Text>
                    <View style={styles.voiceNotesPlaceholder}>
                      <Ionicons name="mic-outline" size={20} color="#9ca3af" />
                      <Text style={styles.placeholderText}>Bientôt disponible</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <CreateComplementaireQualiPhotoModal
        visible={isCreateAfterModalVisible}
        onClose={() => setCreateAfterModalVisible(false)}
        onSuccess={handleAfterPhotoSuccess}
        childItem={{
          id: item.id,
          project_title: projectTitle,
          zone_title: zoneTitle,
          // You might need to pass other properties if the modal requires them
        }}
        parentTitle={item.title}
      />
    </>
  );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      closeBtn: {
        width: 40,
        height: 40,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f87b1b',
      },
      headerTitles: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 50,
      },
      headerActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
      },
      headerAction: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        marginLeft: 8,
      },
      headerActionIcon: {
        width: 35,
        height: 35,
      },
      title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f87b1b',
      },
      subtitle: {
        marginTop: 4,
        fontSize: 13,
        color: '#6b7280',
      },
      content: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 24,
        gap: 24,
      },
      sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f87b1b',
        marginBottom: 8,
      },
      noAfterPhotosText: {
        textAlign: 'center',
        color: '#6b7280',
        paddingVertical: 16,
        fontSize: 13,
      },
      photoContainer: {
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      },
      childThumbnail: {
        width: '100%',
        aspectRatio: 16/9,
        backgroundColor: '#f3f4f6',
      },
      childGridOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      childGridTitle: {
        color: '#f87b1b',
        fontSize: 12,
        fontWeight: 'bold',
        flex: 1,
      },
      comparisonContainer: {
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
      },
      comparisonTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#11224e',
        marginBottom: 16,
        textAlign: 'center',
      },
      comparisonGrid: {
        flexDirection: 'row',
        gap: 12,
      },
      comparisonColumn: {
        flex: 1,
        gap: 12,
      },
      columnHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f87b1b',
        marginBottom: 8,
        textAlign: 'center',
      },
      infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
      infoLabel: {
        color: '#f87b1b',
        fontSize: 12,
        marginBottom: 8,
        fontWeight: '600',
      },
      inputWrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 80,
      },
      input: {
        flex: 1,
        color: '#111827',
        fontSize: 14,
        textAlignVertical: 'top',
      },
      voiceNotesPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
      },
      placeholderText: {
        color: '#9ca3af',
        fontSize: 13,
        fontStyle: 'italic',
      },
});
