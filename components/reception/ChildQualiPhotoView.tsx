import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import API_CONFIG from '@/app/config/api';
import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { Ged, getGedsBySource } from '@/services/gedService';
import { Folder } from '@/services/qualiphotoService';

import CreateComplementaireQualiPhotoModal from './CreateComplementaireQualiPhotoModal';
import DescriptionEditModal from './DescriptionEditModal';

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
  onClose,
  subtitle,
  projectTitle,
  zoneTitle,
}) => {
  const { token } = useAuth();
  const [afterPhotos, setAfterPhotos] = useState<Ged[]>([]);
  const [isLoadingAfter, setIsLoadingAfter] = useState(true);
  const [isCreateAfterModalVisible, setCreateAfterModalVisible] = useState(false);
  
  // Local state for "avant" description to allow immediate UI updates
  const [avantDescription, setAvantDescription] = useState(item.description || '');
  
  // Description edit modal state
  const [isDescriptionModalVisible, setIsDescriptionModalVisible] = useState(false);
  const [editingDescriptionType, setEditingDescriptionType] = useState<'avant' | 'apres' | null>(null);
  const [currentItem, setCurrentItem] = useState<Ged | null>(null);

  // Update local state when item prop changes
  useEffect(() => {
    setAvantDescription(item.description || '');
  }, [item.description]);
  
  // Voice notes state
  const [voiceNotesAvant, setVoiceNotesAvant] = useState<Ged[]>([]);
  const [voiceNotesApres, setVoiceNotesApres] = useState<Ged[]>([]);
  const [isLoadingVoiceNotesAvant, setIsLoadingVoiceNotesAvant] = useState(false);
  const [isLoadingVoiceNotesApres, setIsLoadingVoiceNotesApres] = useState(false);
  
  // Audio playback state
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [playingVoiceNoteId, setPlayingVoiceNoteId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    async function fetchAfterPhotos() {
      if (!token || !item?.id) {
        setIsLoadingAfter(false);
        return;
      }

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

  // Fetch voice notes for "Situation avant"
  useEffect(() => {
    async function fetchVoiceNotesAvant() {
      if (!token || !item?.id) return;

      setIsLoadingVoiceNotesAvant(true);
      try {
        const voiceNotes = await getGedsBySource(token, item.id, 'audio');
        setVoiceNotesAvant(voiceNotes);
      } catch (error) {
        console.error('Failed to fetch voice notes avant:', error);
        setVoiceNotesAvant([]);
      } finally {
        setIsLoadingVoiceNotesAvant(false);
      }
    }

    fetchVoiceNotesAvant();
  }, [item?.id, token]);

  // Fetch voice notes for "Situation après"
  const firstAfterPhotoId = afterPhotos[0]?.id;
  useEffect(() => {
    async function fetchVoiceNotesApres() {
      if (!token || !firstAfterPhotoId) return;

      setIsLoadingVoiceNotesApres(true);
      try {
        const voiceNotes = await getGedsBySource(token, firstAfterPhotoId, 'audio');
        setVoiceNotesApres(voiceNotes);
      } catch (error) {
        console.error('Failed to fetch voice notes apres:', error);
        setVoiceNotesApres([]);
      } finally {
        setIsLoadingVoiceNotesApres(false);
      }
    }

    fetchVoiceNotesApres();
  }, [firstAfterPhotoId, token]);

  const handleAddAfterPhoto = () => {
    setCreateAfterModalVisible(true);
  };

  const handleAfterPhotoSuccess = (createdGed: Ged) => {
    setAfterPhotos(prev => [...prev, createdGed]);
    setCreateAfterModalVisible(false);
  };

  const handleOpenDescriptionEdit = (type: 'avant' | 'apres') => {
    if (type === 'avant') {
      setCurrentItem(item);
      setEditingDescriptionType('avant');
    } else {
      if (afterPhotos[0]) {
        setCurrentItem(afterPhotos[0]);
        setEditingDescriptionType('apres');
      } else {
        Alert.alert('Information', 'Aucune photo "après" disponible.');
        return;
      }
    }
    setIsDescriptionModalVisible(true);
  };

  const handleDescriptionSave = (updatedDescription: string) => {
    if (editingDescriptionType === 'avant' && currentItem) {
      // Update local state for immediate UI feedback
      // The API call is already done in the modal
      setAvantDescription(updatedDescription);
    } else if (editingDescriptionType === 'apres' && currentItem) {
      // Update the after photo description
      setAfterPhotos(prev =>
        prev.map(photo =>
          photo.id === currentItem.id ? { ...photo, description: updatedDescription } : photo
        )
      );
    }
    setIsDescriptionModalVisible(false);
    setEditingDescriptionType(null);
    setCurrentItem(null);
  };

  const getFullImageUrl = (relativeUrl: string | null | undefined): string | null => {
    if (!relativeUrl) return null;
    return `${API_CONFIG.BASE_URL}${relativeUrl}`;
  };

  const openMap = async (latitude: string | null, longitude: string | null) => {
    if (!latitude || !longitude) {
      Alert.alert('Information', 'Aucune coordonnée de localisation disponible.');
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Erreur', 'Coordonnées de localisation invalides.');
      return;
    }

    let url: string;
    if (Platform.OS === 'ios') {
      url = `maps://?q=${lat},${lon}`;
    } else {
      url = `geo:${lat},${lon}?q=${lat},${lon}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
        await Linking.openURL(googleMapsUrl);
      }
    } catch (error) {
      console.error('Error opening map:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de cartes.');
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (playingSound) {
        playingSound.unloadAsync().catch(console.error);
      }
    };
  }, [playingSound]);

  const handlePlayPauseVoiceNote = async (voiceNote: Ged) => {
    try {
      // If clicking the same note that's playing, pause/resume it
      if (playingVoiceNoteId === voiceNote.id && playingSound) {
        const status = await playingSound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await playingSound.pauseAsync();
            setIsPlaying(false);
          } else {
            // Resume if paused
            await playingSound.playAsync();
            setIsPlaying(true);
          }
        }
        return;
      }

      // If another note is playing, stop it first
      if (playingSound) {
        await playingSound.unloadAsync();
        setPlayingSound(null);
        setPlayingVoiceNoteId(null);
        setIsPlaying(false);
      }

      // If no URL, show error
      if (!voiceNote.url) {
        Alert.alert('Erreur', 'Fichier audio non disponible.');
        return;
      }

      // Build full URL
      const audioUrl = getFullImageUrl(voiceNote.url);
      if (!audioUrl) {
        Alert.alert('Erreur', 'URL audio invalide.');
        return;
      }

      // Create and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setPlayingSound(null);
            setPlayingVoiceNoteId(null);
            setIsPlaying(false);
            sound.unloadAsync().catch(console.error);
          }
        }
      });

      setPlayingSound(sound);
      setPlayingVoiceNoteId(voiceNote.id);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing voice note:', error);
      Alert.alert('Erreur', 'Impossible de lire la note vocale.');
      setPlayingSound(null);
      setPlayingVoiceNoteId(null);
      setIsPlaying(false);
    }
  };

  const renderVoiceNotesList = (voiceNotes: Ged[], isLoading: boolean) => {
    if (isLoading) {
      return (
        <View style={styles.voiceNotesContainer}>
          <ActivityIndicator size="small" color="#f87b1b" />
        </View>
      );
    }

    if (voiceNotes.length === 0) {
      return (
        <View style={styles.voiceNotesPlaceholder}>
          <Ionicons name="mic-outline" size={20} color="#9ca3af" />
          <Text style={styles.placeholderText}>Aucune note vocale</Text>
        </View>
      );
    }

      return (
        <View style={styles.voiceNotesList}>
          {voiceNotes.map((voiceNote) => {
            const isCurrentNote = playingVoiceNoteId === voiceNote.id;
            const showPause = isCurrentNote && isPlaying;
            return (
              <TouchableOpacity
                key={voiceNote.id}
                style={[styles.voiceNoteItem, isCurrentNote && styles.voiceNoteItemPlaying]}
                onPress={() => handlePlayPauseVoiceNote(voiceNote)}
              >
                <Ionicons
                  name={showPause ? 'pause-circle' : 'play-circle'}
                  size={24}
                  color={isCurrentNote ? '#f87b1b' : '#11224e'}
                />
                <Text style={styles.voiceNoteTitle} numberOfLines={1}>
                  {voiceNote.title || 'Note vocale'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
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
          style={[styles.headerAction, (isLoadingAfter || afterPhotos.length > 0) && styles.disabledHeaderAction]}
          onPress={handleAddAfterPhoto}
          disabled={isLoadingAfter || afterPhotos.length > 0}
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
            <Text style={styles.sectionTitle}>Avant</Text>
            {item.url ? (
              <TouchableOpacity onPress={() => {}} style={styles.photoContainer}>
                <Image source={{ uri: getFullImageUrl(item.url) as string }} style={styles.childThumbnail} />
                <View style={styles.childGridOverlay}>
                  <Text style={styles.childGridTitle} numberOfLines={1}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            ) : null}
            {(item.type || item.categorie) && (
              <View style={styles.metaContainer}>
                {item.type ? (
                  <Text style={styles.metaText}>
                    <Text style={styles.metaLabel}>Type: </Text>
                    {item.type}
                  </Text>
                ) : null}
                {item.categorie ? (
                  <Text style={styles.metaText}>
                    <Text style={styles.metaLabel}>Catégorie: </Text>
                    {item.categorie}
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          <View>
            <Text style={styles.sectionTitle}>Après</Text>
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
                  <View style={styles.columnHeaderContainer}>
                    <Text style={styles.columnHeader}>Avant</Text>
                    {item.latitude && item.longitude && (
                      <TouchableOpacity
                        onPress={() => openMap(item.latitude, item.longitude)}
                        style={styles.locationIconButton}
                        accessibilityLabel="Ouvrir la localisation sur la carte">
                        <Ionicons name="location" size={20} color="#f87b1b" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* "Après" Column */}
                <View style={styles.comparisonColumn}>
                  <View style={styles.columnHeaderContainer}>
                    <Text style={styles.columnHeader}>Après</Text>
                    {afterPhotos[0]?.latitude && afterPhotos[0]?.longitude && (
                      <TouchableOpacity
                        onPress={() => openMap(afterPhotos[0].latitude, afterPhotos[0].longitude)}
                        style={styles.locationIconButton}
                        accessibilityLabel="Ouvrir la localisation sur la carte">
                        <Ionicons name="location" size={20} color="#f87b1b" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.comparisonGrid}>
                <View style={styles.comparisonColumn}>
                  <View style={styles.infoCard}>
                    <TouchableOpacity onPress={() => handleOpenDescriptionEdit('avant')}>
                      <View style={styles.infoLabelContainer}>
                        <Text style={styles.infoLabel}>Description</Text>
                      </View>
                      <View style={[styles.inputWrap, { minHeight: 80 }]}>
                        <Text style={styles.descriptionText} numberOfLines={4}>
                          {avantDescription || 'Aucune description.'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.comparisonColumn}>
                  <View style={styles.infoCard}>
                    <TouchableOpacity
                      onPress={() => handleOpenDescriptionEdit('apres')}
                      disabled={!afterPhotos[0]}
                    >
                      <View style={styles.infoLabelContainer}>
                        <Text style={styles.infoLabel}>Description</Text>
                      </View>
                      <View style={[styles.inputWrap, { minHeight: 80 }]}>
                        <Text style={styles.descriptionText} numberOfLines={4}>
                          {afterPhotos[0]?.description || 'Aucune description.'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.comparisonGrid}>
                <View style={styles.comparisonColumn}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Notes vocales</Text>
                    {renderVoiceNotesList(voiceNotesAvant, isLoadingVoiceNotesAvant)}
                  </View>
                </View>
                <View style={styles.comparisonColumn}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Notes vocales</Text>
                    {renderVoiceNotesList(voiceNotesApres, isLoadingVoiceNotesApres)}
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
      {currentItem && (
        <DescriptionEditModal
          visible={isDescriptionModalVisible}
          onClose={() => {
            setIsDescriptionModalVisible(false);
            setEditingDescriptionType(null);
            setCurrentItem(null);
          }}
          onSave={handleDescriptionSave}
          initialDescription={currentItem.description || ''}
          gedItem={currentItem}
          title={editingDescriptionType === 'avant' ? 'Situation Avant' : 'Situation Après'}
        />
      )}
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
      disabledHeaderAction: {
        opacity: 0.5,
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
        marginTop: 12,
        gap: 12,
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
      },
      columnHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        gap: 8,
      },
      columnHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f87b1b',
      },
      locationIconButton: {
        padding: 4,
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
      metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
      },
      metaText: {
        fontSize: 13,
        color: '#11224e',
        backgroundColor: '#f9fafb',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        overflow: 'hidden',
      },
      metaLabel: {
        fontWeight: '600',
        color: '#f87b1b',
      },
      infoLabel: {
        color: '#f87b1b',
        fontSize: 12,
        marginBottom: 8,
        fontWeight: '600',
      },
      infoLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 8,
      },
      inputWrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
      },
      descriptionText: {
        flex: 1,
        color: '#111827',
        fontSize: 14,
        lineHeight: 20,
      },
      voiceNotesContainer: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
      },
      voiceNotesPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
      },
      placeholderText: {
        color: '#9ca3af',
        fontSize: 13,
        fontStyle: 'italic',
      },
      voiceNotesList: {
        gap: 8,
      },
      voiceNoteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
      },
      voiceNoteItemPlaying: {
        backgroundColor: '#fef3e7',
      },
      voiceNoteTitle: {
        flex: 1,
        color: '#11224e',
        fontSize: 13,
        fontWeight: '500',
      },
});
