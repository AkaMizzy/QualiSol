import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Folder, Project, qualiphotoService, Zone } from '@/services/qualiphotoService';
import { Audio } from 'expo-av';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, StyleSheet, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateChildQualiPhotoForm } from './CreateChildQualiPhotoModal';
import { ParentQualiPhotoView } from './ParentQualiPhotoView';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  visible: boolean;
  onClose: () => void;
  item?: Folder | null;
  projects: Project[];
  zones: Zone[];
};

 export default function QualiPhotoDetail({ visible, onClose, item: initialItem, projects, zones }: Props) {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isChildModalVisible, setChildModalVisible] = useState(false);
  const [children, setChildren] = useState<Folder[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [item, setItem] = useState<Folder | null>(initialItem || null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  useEffect(() => {
    setItem(initialItem || null);
    setSortOrder('desc'); // Reset sort order when item changes
    setLayoutMode('list');
  }, [initialItem]);

  useEffect(() => {
    if (item && item.id && token) {
        setIsLoadingChildren(true);
        qualiphotoService.getChildren(item.id, token, sortOrder)
          .then(setChildren)
          .catch(() => setChildren([]))
          .finally(() => setIsLoadingChildren(false));
    } else {
      setChildren([]);
    }
  }, [item, token, sortOrder]);

  const subtitle = useMemo(() => {
    if (!item) return '';
    const projectTitle = projects.find(p => p.id === item.project_id)?.title || '—';
    const zoneTitle = zones.find(z => z.id === item.zone_id)?.title || '—';
    return `${projectTitle} • ${zoneTitle}`;
  }, [item, projects, zones]);

  async function playSound() {
    // This functionality is deprecated for Folders
  }

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    if (!visible) {
      sound?.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  }, [visible, sound]);

  
  const handleChildSuccess = () => {
    if (initialItem && token) {
      setIsLoadingChildren(true);
      qualiphotoService.getChildren(initialItem.id, token, sortOrder)
        .then(setChildren)
        .catch(() => setChildren([]))
        .finally(() => setIsLoadingChildren(false));
    }
  };
  

  const handleMapPress = () => {
    // This functionality is deprecated for Folders
  };

   const renderDetailView = () => {
    if (!item) return null;
    
    // The logic to differentiate between parent and child will be handled later.
    // For now, we only display the parent view.
    return (
        <ParentQualiPhotoView
          item={item}
          onClose={onClose}
          subtitle={subtitle}
          handleGeneratePdf={handleGeneratePdf}
          isGeneratingPdf={isGeneratingPdf}
          childFolders={children}
          playSound={playSound}
          isPlaying={isPlaying}
          handleMapPress={handleMapPress}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          setChildModalVisible={setChildModalVisible}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          isLoadingChildren={isLoadingChildren}
          setItem={setItem}
          onItemUpdate={(updated) => setItem({ ...item, ...updated })}
          projectTitle={projects.find(p => p.id === item.project_id)?.title || 'N/A'}
          zoneTitle={zones.find(z => z.id === item.zone_id)?.title || 'N/A'}
        />
      );
  };

   const handleGeneratePdf = async () => {
    if (!item || !token) return;
    setIsGeneratingPdf(true);
    try {
        const { fileUrl } = await qualiphotoService.generatePdf(item.id, token);
        const absoluteUrl = `https://api.qualitravaux.net${fileUrl}`; // Assuming this is the base URL
        
        const supported = await Linking.canOpenURL(absoluteUrl);
        if (supported) {
            await Linking.openURL(absoluteUrl);
        } else {
            Alert.alert('Erreur', `Impossible d'ouvrir l'URL: ${absoluteUrl}`);
        }
        } catch (err) {
        console.error("PDF Generation Error", err);
        Alert.alert('Erreur', 'Échec de la génération du PDF.');
    } finally {
        setIsGeneratingPdf(false);
    }
   };

   return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader user={user || undefined} onNavigate={onClose} />
        {isChildModalVisible ? (
          <CreateChildQualiPhotoForm
            parentItem={initialItem!}
            onSuccess={handleChildSuccess}
            onClose={() => setChildModalVisible(false)}
            projectTitle={projects.find(p => p.id === initialItem?.project_id)?.title || 'N/A'}
            zoneTitle={zones.find(z => z.id === initialItem?.zone_id)?.title || 'N/A'}
          />
          
        ) : (
          renderDetailView()
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
  
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11224e',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#8E8E93',
  },
  scrollContent: {},
  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  staticContent: {
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
  metaMuted: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  metaMultiline: {
    lineHeight: 20,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactImage: {
    width: 110,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87b1b',
    overflow: 'hidden',
  },
  compactRight: {
    flex: 1,
    gap: 6,
  },
  compactAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactAudioText: {
    color: '#11224e',
    fontWeight: '600',
  },
  compactDescription: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  compImageLine: {
    marginBottom: 8,
  },
  compImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  compRowBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compDescriptionFull: {
    flex: 1,
    color: '#0f172a',
    fontSize: 13,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  playButton: {
    // styles for the play button
  },
  playerMeta: {
    flex: 1,
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  playerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  mapPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  addChildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#11224e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addChildButtonTextView: {
    flex: 1,
  },
  addChildButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  childListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f87b1b',
    marginBottom: 8,

  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  childListContainer: {
    marginTop: 8,
    gap: 12,
  },
  childItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  childThumbnail: {
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#f3f4f6',
  },
  childItemContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  childComment: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'right',
  },
  childDate: {
    fontSize: 11,
    color: '#6b7280',
    marginRight: 8,
  },
  complementaireContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderColor: '#f87b1b',
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  compareButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f87b1b',
  },
  childGridItem: {
    width: '49%',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  eyeIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 4,
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
  inlineMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  inlineMetaItem: {
    flex: 1,
  },
  borderedMetaRow: {
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    paddingTop: 10,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewCloseButton: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
  commentModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#f87b1b',
  },
  commentModalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  commentInput: {
    width: '100%',
    height: 100,
    borderColor: '#f87b1b',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    textAlignVertical: 'top',
  },
  commentModalActions: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
    width: '100%',
  },
  commentModalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  commentModalSaveButton: {
    backgroundColor: '#f87b1b',
  },
  commentModalButtonText: {
    fontSize: 16,
  },
  hiddenImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f87b1b',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  hiddenImageText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  hiddenImageSubText: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 12,
  },
  childListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  cameraCTAContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCTALabel: {
    fontSize: 12,
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
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  sortButton: {
    width: 40, // Adjusted for symmetry
    height: 40, // Adjusted for symmetry
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
    width: 80, // Fixed width for two buttons
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
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f87b1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  childList: {
    marginTop: 8,
  },
  childListColumnWrapper: {
    justifyContent: 'space-between',
  },
  childGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  signatureFieldsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  signatureModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  signatureModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40, // for safe area
  },
  signatureModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});


