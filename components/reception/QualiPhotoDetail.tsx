import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Folder, Project, Zone } from '@/services/folderService';
import { Ged, getGedsBySource } from '@/services/gedService';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChildQualiPhotoView } from './ChildQualiPhotoView';
import CreateChildQualiPhotoModal from './CreateChildQualiPhotoModal';
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
  onUpdate?: (item: Partial<Folder>) => void;
  projectTitle?: string;
  zoneTitle?: string;
  folderTitle?: string;
};

// Step 1: Create the custom hook for all logic
function useQualiPhotoDetail({ visible, item: initialItem, projects, zones, onUpdate, projectTitle: propProjectTitle, zoneTitle: propZoneTitle, folderTitle: propFolderTitle }: Props) {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isChildModalVisible, setChildModalVisible] = useState(false);
  const [item, setItem] = useState<Folder | null>(initialItem || null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  const [isGeneratingPdf] = useState(false);
  const [selectedGed, setSelectedGed] = useState<Ged | null>(null);
  const [childGeds, setChildGeds] = useState<Ged[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [childrenWithAfterPhotos, setChildrenWithAfterPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialItem && propFolderTitle && !initialItem.title) {
      setItem({ ...initialItem, title: propFolderTitle });
    } else {
      setItem(initialItem || null);
    }
  }, [initialItem, propFolderTitle]);

  const fetchChildren = useCallback(async () => {
    if (token && item) {
      setIsLoadingChildren(true);
      try {
        const geds = await getGedsBySource(token, item.id, 'photoavant', sortOrder);
        setChildGeds(geds);
        
        // Check for each child if it has "after" photos
        const afterPhotosMap = new Set<string>();
        await Promise.all(
          geds.map(async (ged) => {
            try {
              const afterPhotos = await getGedsBySource(token, ged.id, 'photoapres', 'desc');
              if (afterPhotos && afterPhotos.length > 0) {
                afterPhotosMap.add(ged.id);
              }
            } catch (error) {
              // Silently fail if we can't check for after photos
              console.warn(`Failed to check after photos for child ${ged.id}:`, error);
            }
          })
        );
        setChildrenWithAfterPhotos(afterPhotosMap);
      } catch (error) {
        console.error("Failed to fetch child GEDs:", error);
        setChildGeds([]);
        setChildrenWithAfterPhotos(new Set());
      } finally {
        setIsLoadingChildren(false);
      }
    }
  }, [token, item, sortOrder]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  
  useEffect(() => {
    if (visible && !selectedGed) {
      fetchChildren();
    }
  }, [visible, selectedGed, fetchChildren]);

  useEffect(() => {
    setItem(initialItem || null);
    if (initialItem) {
        setSortOrder('desc');
        setLayoutMode('list');
        setSelectedGed(null);
    }
  }, [initialItem]);

  const subtitle = useMemo(() => {
    if (!item) return '';
    if (propProjectTitle && propZoneTitle) return `${propProjectTitle} • ${propZoneTitle}`;
    const projectTitle = projects.find(p => p.id === item.project_id)?.title || '—';
    const zoneTitle = zones.find(z => z.id === item.zone_id)?.title || '—';
    return `${projectTitle} • ${zoneTitle}`;
  }, [item, projects, zones, propProjectTitle, propZoneTitle]);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    if (!visible) {
      sound?.unloadAsync();
      setSound(null);
      setSelectedGed(null);
    }
  }, [visible, sound]);

  const handleItemUpdate = (updatedItem: Partial<Folder>) => {
    if (item) {
      const newItem = { ...item, ...updatedItem };
      setItem(newItem);
      if (onUpdate) {
        onUpdate(newItem);
      }
    }
  };

  const handleAvantPhotoUpdate = (updatedPhoto: Ged) => {
    // The child component's "avant" photo has been updated.
    // To see the change, we need to update the selectedGed state and refetch.
    setSelectedGed(updatedPhoto);
    fetchChildren();
  };

  const handleChildCreationSuccess = (createdGed: Ged) => {
    fetchChildren();
  };
  
  const projectTitle = useMemo(() => propProjectTitle || (item ? projects.find(p => p.id === item.project_id)?.title || 'N/A' : 'N/A'), [item, projects, propProjectTitle]);
  const zoneTitle = useMemo(() => propZoneTitle || (item ? zones.find(z => z.id === item.zone_id)?.title || 'N/A' : 'N/A'), [item, zones, propZoneTitle]);


  return {
    user,
    insets,
    isChildModalVisible,
    setChildModalVisible,
    item,
    sortOrder,
    setSortOrder,
    layoutMode,
    setLayoutMode,
    isGeneratingPdf,
    selectedGed,
    setSelectedGed,
    childGeds,
    isLoadingChildren,
    subtitle,
    handleItemUpdate,
    handleAvantPhotoUpdate,
    handleChildCreationSuccess,
    projectTitle,
    zoneTitle,
    childrenWithAfterPhotos
  };
}

// Step 2: Create the pure presentational component
function QualiPhotoDetailView({
  visible,
  onClose,
  ...props
}: {
  visible: boolean;
  onClose: () => void;
  [key: string]: any;
}) {
  const {
    user,
    insets,
    isChildModalVisible,
    setChildModalVisible,
    item,
    sortOrder,
    setSortOrder,
    layoutMode,
    setLayoutMode,
    isGeneratingPdf,
    selectedGed,
    setSelectedGed,
    childGeds,
    isLoadingChildren,
    subtitle,
    handleItemUpdate,
    handleChildCreationSuccess,
    projectTitle,
    zoneTitle,
    childrenWithAfterPhotos,
    handleAvantPhotoUpdate,
  } = props;

  if (!item) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#11224e" />
      </View>
    );
  }

  if (selectedGed) {
    return (
      <View style={[styles.container]}>
        <AppHeader user={user || undefined} onNavigate={() => setSelectedGed(null)} />
        <ChildQualiPhotoView
          item={selectedGed}
          parentFolder={item}
          onClose={() => setSelectedGed(null)}
          subtitle={subtitle}
          projectTitle={projectTitle}
          zoneTitle={zoneTitle}
          onAvantPhotoUpdate={handleAvantPhotoUpdate}
        />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container]}>
        <AppHeader user={user || undefined} onNavigate={onClose} />
        <ParentQualiPhotoView
          item={item}
          onClose={onClose}
          subtitle={subtitle}
          handleGeneratePdf={() => {}}
          isGeneratingPdf={isGeneratingPdf}
          childGeds={childGeds}
          onChildPress={setSelectedGed}
          playSound={() => {}}
          isPlaying={false}
          handleMapPress={() => {}}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          setChildModalVisible={setChildModalVisible}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          isLoadingChildren={isLoadingChildren}
          setItem={handleItemUpdate}
          onItemUpdate={handleItemUpdate}
          projectTitle={projectTitle}
          zoneTitle={zoneTitle}
          childrenWithAfterPhotos={childrenWithAfterPhotos}
        />
      </View>
      <CreateChildQualiPhotoModal
        visible={isChildModalVisible}
        onClose={() => setChildModalVisible(false)}
        onSuccess={handleChildCreationSuccess}
        parentItem={item}
        projectTitle={projectTitle}
        zoneTitle={zoneTitle}
      />
      
    </>
  );
}

// Step 3: Update the main component to connect the hook and the view
export default function QualiPhotoDetail(props: Props) {
  const logic = useQualiPhotoDetail(props);

  if (!props.visible) return null;

  return (
    <Modal visible={props.visible} onRequestClose={props.onClose} animationType="slide" presentationStyle="fullScreen">
      <QualiPhotoDetailView {...props} {...logic} />
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


