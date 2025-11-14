import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ged, getGedsBySource } from '@/services/gedService';
import { Folder } from '@/services/qualiphotoService';

import CreateComplementaireQualiPhotoModal from './CreateComplementaireQualiPhotoModal';

const cameraIcon = require('@/assets/icons/camera.gif');

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const replaced = dateStr.replace(' ', 'T');
  const date = new Date(replaced);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
    // The createGed API response doesn't include created_at, leading to a crash.
    // We'll add a fallback to the current date to ensure the PhotoCard can render.
    const newGedWithDate = {
      ...createdGed,
      created_at: (createdGed as any).created_at || new Date().toISOString(),
    };
    setAfterPhotos(prev => [...prev, newGedWithDate]);
    setCreateAfterModalVisible(false);
  };

  const getFullImageUrl = (relativeUrl: string | null | undefined): string | null => {
    if (!relativeUrl) return null;
    return `${API_CONFIG.BASE_URL}${relativeUrl}`;
  };

  const header = (
    <View style={styles.header}>
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Ionicons name="arrow-back" size={28} color="#f87b1b" />
      </Pressable>
      <View style={styles.headerTitles}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
        {/* <Text style={styles.subtitle}>{formatDate(item.createdAt)}</Text> */}
      </View>
      <View style={styles.headerActionsContainer} />
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
                  {item.created_at && <Text style={styles.childGridDate}>{formatDate(item.created_at)}</Text>}
                </View>
              </TouchableOpacity>
            ) : null}
            {item.description && (
              <View style={styles.metaCard}>
                <View style={styles.metaHeader}>
                  <Text style={styles.metaLabel}>Description</Text>
                  <TouchableOpacity onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                    <Ionicons name={isDescriptionExpanded ? "chevron-up" : "ellipsis-horizontal"} size={23} color="#f87b1b" />
                  </TouchableOpacity>
                </View>
                <Text 
                  style={[styles.metaValue, styles.metaMultiline]} 
                  numberOfLines={isDescriptionExpanded ? undefined : 1}
                >
                  {item.description}
                </Text>
              </View>
            )}
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
                    {photo.created_at && <Text style={styles.childGridDate}>{formatDate(photo.created_at)}</Text>}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <TouchableOpacity
                  onPress={handleAddAfterPhoto}
                  accessibilityLabel="Ajouter une photo complémentaire"
                  style={styles.cameraCTA}
                >
                  <Image source={cameraIcon} style={styles.cameraCTAIcon} />
                  <Text style={styles.cameraCTALabel}>Situation après</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        backgroundColor: '#FFFFFF',
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
      },
      headerActionsContainer: {
        width: 40, // to balance the close button
      },
      title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f87b1b',
      },
      subtitle: {
        marginTop: 2,
        fontSize: 14,
        color: '#8E8E93',
      },
      content: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 24,
        gap: 24,
      },
      metaCard: {
        marginTop: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
      metaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
      },
      metaLabel: {
        color: '#f87b1b',
        fontSize: 12,
        marginBottom: 2,
        fontWeight: '600',
      },
      metaValue: {
        color: '#0f172a',
        fontSize: 14,
        fontWeight: '600',
      },
      metaMultiline: {
        lineHeight: 20,
      },
      sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f87b1b',
        marginBottom: 8,
      },
      cameraCTALabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#11224e',
        marginLeft: 8,
      },
      cameraCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#f87b1b',
        paddingVertical: 10,
        borderRadius: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        marginHorizontal: 12,
      },
      cameraCTAIcon: {
        width: 32,
        height: 32,
        resizeMode: 'contain',
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
        marginRight: 4,
      },
      childGridDate: {
        color: '#f87b1b',
        fontSize: 12,
        fontWeight: '600',
      },
});
