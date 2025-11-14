import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

import API_CONFIG from '@/app/config/api';
import { ICONS } from '@/constants/Icons';
import { Ged } from '@/services/gedService';
import { Folder } from '@/services/qualiphotoService';
import QualiPhotoEditModal from './QualiPhotoEditModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDate(dateStr: string) {
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

type ParentQualiPhotoViewProps = {
    item: Folder;
    onClose: () => void;
    subtitle: string;
    handleGeneratePdf: () => void;
    isGeneratingPdf: boolean;
    childGeds: Ged[];
    onChildPress: (ged: Ged) => void;
    playSound: () => void;
    isPlaying: boolean;
    handleMapPress: () => void;
    layoutMode: 'grid' | 'list';
    setLayoutMode: (mode: 'grid' | 'list') => void;
    setChildModalVisible: (visible: boolean) => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
    isLoadingChildren: boolean;
    setItem: (item: Folder) => void;
    onItemUpdate: (item: Partial<Folder>) => void;
    projectTitle: string;
    zoneTitle: string;
    childrenWithAfterPhotos: Set<string>;
  };
  

  export const ParentQualiPhotoView: React.FC<ParentQualiPhotoViewProps> = ({
    item,
    onClose,
    subtitle,
    handleGeneratePdf,
    isGeneratingPdf,
    childGeds,
    onChildPress,
    playSound,
    isPlaying,
    handleMapPress,
    layoutMode,
    setLayoutMode,
    setChildModalVisible,
    sortOrder,
    setSortOrder,
    isLoadingChildren,
    setItem,
    onItemUpdate,
    projectTitle,
    zoneTitle,
    childrenWithAfterPhotos,
  }) => {
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);

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
          {!!item?.title && <Text style={styles.title}>{item.title}</Text>}
          {!!item && <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>}
          {!!item?.createdAt && <Text style={styles.subtitle}>{formatDate(item.createdAt)}</Text>}
          </View>
          <View style={styles.headerActionsContainer}>
                <TouchableOpacity style={styles.headerAction} onPress={handleGeneratePdf} disabled={isGeneratingPdf} accessibilityLabel="Générer le PDF">
                    {isGeneratingPdf ? (
                        <ActivityIndicator color="#f87b1b" />
                    ) : (
                        <Image source={ICONS.pdf} style={styles.headerActionIcon} />
                    )}
                </TouchableOpacity>
              <TouchableOpacity style={styles.headerAction} onPress={() => {}} accessibilityLabel="Signatures">
                <Image source={ICONS.signature} style={styles.headerActionIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerAction} onPress={() => setIsEditModalVisible(true)} accessibilityLabel="Éditer">
                    <Image source={ICONS.edit} style={styles.headerActionIcon} />
                </TouchableOpacity>
          </View>
        </View>
      );
    return (
        <>
        {header}

        <ScrollView bounces>
          <View style={[styles.content, { paddingTop: 20 }]}>
              <>
                <View style={styles.childPicturesContainer}>
                <View style={[styles.childListHeader, childGeds.length === 0 && { justifyContent: 'center' }]}>
                  {childGeds.length > 0 && (
                    <View style={styles.layoutToggleContainer}>
                      <TouchableOpacity
                          style={[styles.layoutToggleButton, layoutMode === 'list' && styles.layoutToggleButtonActive]}
                          onPress={() => setLayoutMode('list')}
                      >
                          <Ionicons name="list" size={20} color={layoutMode === 'list' ? '#FFFFFF' : '#11224e'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                          style={[styles.layoutToggleButton, layoutMode === 'grid' && styles.layoutToggleButtonActive]}
                          onPress={() => setLayoutMode('grid')}
                      >
                          <Ionicons name="grid" size={20} color={layoutMode === 'grid' ? '#FFFFFF' : '#11224e'} />
                      </TouchableOpacity>
                   </View>
                 )}
                 <TouchableOpacity
                   onPress={() => setChildModalVisible(true)}
                   accessibilityLabel="Ajouter une photo avant"
                   style={styles.cameraCTA}
                 >
                   <Image source={require('@/assets/icons/camera.gif')} style={styles.cameraCTAIcon} />
                   <Text style={styles.cameraCTALabel}>Situation avant</Text>
                 </TouchableOpacity>
                 {childGeds.length > 0 && (
                   <TouchableOpacity
                     style={styles.sortButton}
                     onPress={() => setSortOrder(current => current === 'asc' ? 'desc' : 'asc')}
                     accessibilityLabel={sortOrder === 'desc' ? 'Trier par ordre croissant' : 'Trier par ordre décroissant'}
                   >
                     <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={24} color="#f87b1b" />
                   </TouchableOpacity>
                 )}
               </View>
                {isLoadingChildren && <Text>Chargement...</Text>}
                {!isLoadingChildren && childGeds.length === 0 && (
                  <Text style={styles.noChildrenText}>Aucune photo suivie n&apos;a encore été ajoutée.</Text>
                )}
                <View style={layoutMode === 'grid' ? styles.childGridContainer : styles.childListContainer}>
                  {childGeds.map((ged) => {
                    const hasAfterPhoto = childrenWithAfterPhotos.has(ged.id);
                    const borderColor = hasAfterPhoto ? '#10b981' : '#f87b1b'; // Green if has "after", orange if not
                    return (
                      <TouchableOpacity 
                        key={ged.id} 
                        style={[
                          layoutMode === 'grid' ? styles.childGridItem : styles.childListItem,
                          { borderColor, borderWidth: 2 }
                        ]} 
                        onPress={() => onChildPress(ged)}
                      >
                        {ged.url ? (
                          <Image source={{ uri: `${API_CONFIG.BASE_URL}${ged.url}` }} style={styles.childThumbnail} />
                        ) : (
                          <View style={[styles.childThumbnail, { backgroundColor: '#e5e7eb' }]} />
                        )}
                        <View style={styles.childGridOverlay}>
                          <Text style={styles.childGridTitle} numberOfLines={2}>{ged.title}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              </>
          </View>
        </ScrollView>
        <QualiPhotoEditModal
            visible={isEditModalVisible}
            onClose={() => setIsEditModalVisible(false)}
            item={item}
            onSuccess={(updatedItem) => {
                onItemUpdate(updatedItem);
                setIsEditModalVisible(false);
            }}
        />
      </>
    )
  }

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
      headerAction: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
      },
      headerActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
      },
      headerActionIcon: {
        width: 40,
        height: 40,
      },
      headerPlanIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#f87b1b',
      },
      folderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
      folderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      },
      folderIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#f87b1b',
      },
      folderTitleContainer: {
        flex: 1,
      },
      folderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f87b1b',
      },
      folderSubtitle: {
        fontSize: 12,
        color: '#8E8E93',
      },
      folderMeta: {
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
      folderMetaText: {
        fontSize: 12,
        color: '#6b7280',
        flexShrink: 1,
      },
      folderContentContainer: {
        paddingTop: 12,
        marginTop: 12,
        gap: 12,
      },
      title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f87b1b',
      },
      subtitle: {
        marginTop: 2,
        fontSize: 12,
        color: '#8E8E93',
      },
      content: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 24,
        gap: 12,
      },
      imageWrap: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f87b1b',
        overflow: 'hidden',
      },
      toggleActionsButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
      },
      inlineActionsButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#f87b1b',
        justifyContent: 'center',
        alignItems: 'center',
      },
      image: {
        width: '100%',
        aspectRatio: 16/9,
        backgroundColor: '#f3f4f6'
      },
      metaCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f87b1b',
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
      metaRow: {
        marginBottom: 10,
        borderTopWidth: 1,
        borderColor: '#f87b1b',
        paddingTop: 10,
      },
      metaLabel: {
        color: '#94a3b8',
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
      childThumbnail: {
        width: '100%',
        aspectRatio: 16/9,
        backgroundColor: '#f3f4f6',
      },
      childGridItem: {
        width: '49%',
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      },
      childListItem: {
        width: '100%',
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      },
      childGridOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        gap: 2,
      },
      childGridTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
      },
      childGridDate: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
      },
      noChildrenText: {
        textAlign: 'center',
        color: '#6b7280',
        paddingVertical: 16,
        fontSize: 13,
      },
      actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f87b1b',
      },
      actionButton: {
        padding: 8,
      },
      actionIcon: {
        width: 32,
        height: 32,
      },
      childListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
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
        borderWidth: 1,
        borderColor: '#f87b1b',
        paddingHorizontal: 16,
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
      sortButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
      },
      layoutToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f87b1b',
        overflow: 'hidden',
        width: 80,
        height: 40,
      },
      layoutToggleButton: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      },
      layoutToggleButtonActive: {
        backgroundColor: '#f87b1b',
      },
      childGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 8,
      },
      childListContainer: {
        marginTop: 8,
      },
      childPicturesContainer: {
        backgroundColor: '#FFFFFF',
        paddingTop: 8,
        paddingBottom: 8,
      },
      sectionSeparator: {
        height: 1,
        backgroundColor: '#f87b1b',
        marginVertical: 16,
        marginHorizontal: 12,
      },
      readMoreText: {
        color: '#f87b1b',
        fontSize: 12,
        marginTop: 4,
        textDecorationLine: 'underline',
      },
      metaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
      },
      childFolderCard: {
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f87b1b',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
       },
       childFolderTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#11224e',
        textAlign: 'center',
       },
});
