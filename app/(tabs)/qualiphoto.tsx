import AppHeader from '@/components/AppHeader';
import CreateQualiPhotoModal from '@/components/reception/CreateQualiPhotoModal';
import QualiPhotoDetail from '@/components/reception/QualiPhotoDetail';
import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import folderService, { Folder, Project, Zone } from '@/services/folderService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


function formatDateForGrid(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    // Ensure date string is in a format that new Date() can parse reliably
    const compliantDateStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    return new Intl.DateTimeFormat('fr-FR', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(compliantDateStr));
  } catch {
    return '';
  }
}

export default function QualiPhotoGalleryScreen() {
  const { user, token } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Folder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailProjectTitle, setDetailProjectTitle] = useState<string | undefined>(undefined);
  const [detailZoneTitle, setDetailZoneTitle] = useState<string | undefined>(undefined);
  const [detailFolderTitle, setDetailFolderTitle] = useState<string | undefined>(undefined);


  // Filter states
  const [projects, setProjects] = useState<Project[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [allZones, setAllZones] = useState<Zone[]>([]); // All zones for display purposes
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [selectedZone, setSelectedZone] = useState<string | undefined>(undefined);
  const [projectOpen, setProjectOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);

  // Guards to prevent re-entrant and out-of-order updates
  const fetchingRef = useRef(false);
  const requestIdRef = useRef(0);

  const filteredFolders = React.useMemo(() => {
    return folders.filter(folder => {
        const projectMatch = !selectedProject || folder.project_id === selectedProject;
        const zoneMatch = !selectedZone || folder.zone_id === selectedZone;
        return projectMatch && zoneMatch;
    });
  }, [folders, selectedProject, selectedZone]);

  const fetchFolders = useCallback(async () => {
    if (!token) return;

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    setIsLoading(true);
    setErrorMessage(null);
    const requestId = ++requestIdRef.current;

    try {
      const items = await folderService.getAllFolders(token);

      if (requestId !== requestIdRef.current) return;

      // Sort folders by creation date, latest first
      const sortedItems = items.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setFolders(sortedItems);

    } catch (e) {
      if (requestId === requestIdRef.current) {
        console.error('Failed to load folders', e);
        setErrorMessage('Échec du chargement des dossiers. Tirez pour réessayer.');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        fetchingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [token]);


  const refresh = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      await fetchFolders();
    } finally {
      setIsRefreshing(false);
    }
  }, [token, fetchFolders]);

  // Load folders on mount/token change
  useEffect(() => {
    if (token) {
      fetchFolders();
    }
  }, [token, fetchFolders]);

  // Load projects on mount
  useEffect(() => {
    async function fetchProjects() {
      if (!token) return;
      setLoadingProjects(true);
      try {
        const fetchedProjects = await folderService.getAllProjects(token);
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Failed to load projects', error);
        // Handle error appropriately in UI
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, [token]);

  // Load all zones on mount (for display purposes)
  useEffect(() => {
    async function fetchAllZones() {
      if (!token) return;
      try {
        const fetchedZones = await folderService.getAllZones(token);
        setAllZones(fetchedZones);
      } catch (error) {
        console.error('Failed to load all zones', error);
      }
    }
    fetchAllZones();
  }, [token]);

  // Load zones when project changes
  useEffect(() => {
    async function fetchZones() {
      if (!token || !selectedProject) {
        setZones([]);
        setSelectedZone(undefined);
        return;
      }
      setLoadingZones(true);
      try {
        const fetchedZones = await folderService.getZonesByProjectId(selectedProject, token);
        setZones(fetchedZones);
      } catch (error) {
        console.error('Failed to load zones', error);
        setZones([]);
      } finally {
        setLoadingZones(false);
      }
    }
    fetchZones();
  }, [selectedProject, token]);

  const renderItem = useCallback(({ item }: { item: Folder }) => {
    const projectTitle = item.project_id 
      ? projects.find(p => p.id === item.project_id)?.title 
      : null;
    const zoneTitle = item.zone_id 
      ? allZones.find(z => z.id === item.zone_id)?.title 
      : null;

    // Check if current user is assigned as the technician for this folder
    const isAssignedAsTechnician = item.technicien_id && user?.id && String(item.technicien_id) === String(user.id);

    return (
      <Pressable
          style={({ pressed }) => [
            styles.card, 
            pressed && styles.pressed,
            isAssignedAsTechnician && styles.technicianCard
          ]}
          onPress={() => { 
            if (isAssignedAsTechnician) {
              Alert.alert(
                'Accès limité',
                'Vous êtes assigné comme technicien sur ce dossier. Vous pouvez consulter les photos via l\'écran "Danger".',
                [{ text: 'Compris', style: 'default' }]
              );
              return;
            }
            setSelectedItem(item); 
            setDetailProjectTitle(projectTitle || undefined);
            setDetailZoneTitle(zoneTitle || undefined);
            setDetailFolderTitle(item.title);
            setDetailVisible(true); 
          }}
      >
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
          </Text>
          {isAssignedAsTechnician && (
            <View style={styles.technicianBadge}>
              <Ionicons name="lock-closed" size={12} color="#6b7280" />
              <Text style={styles.technicianBadgeText}>Assigné comme technicien</Text>
            </View>
          )}
          <View style={styles.infoRow}>
              <Image source={ICONS.chantierPng} style={{ width: 14, height: 14 }} />
              <Text style={styles.infoText} numberOfLines={1}>{projectTitle || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color="#f87b1b" />
              <Text style={styles.infoText} numberOfLines={1}>{zoneTitle || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#f87b1b" />
            <Text style={styles.infoText}>{formatDateForGrid(item.created_at)}</Text>
          </View>
        </View>
      </Pressable>
    );
  }, [projects, allZones, user?.id]);

  const keyExtractor = useCallback((item: Folder) => item.id, []);

  const renderEmptyList = () => {
    if (errorMessage) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Impossible de charger les dossiers</Text>
          <Text style={styles.emptySubtitle}>{errorMessage}</Text>
        </View>
      );
    }
    if (selectedProject || selectedZone) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Aucun dossier trouvé</Text>
          <Text style={styles.emptySubtitle}>
            Aucun dossier ne correspond aux filtres sélectionnés.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Aucun dossier pour le moment</Text>
        <Text style={styles.emptySubtitle}>
          Tirez pour actualiser ou créer un nouveau dossier.
        </Text>
      </View>
    );
  };

  

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <View style={styles.header}>
        
        <View style={styles.filterContainer}>
          <View style={styles.filtersRow}>
            <View style={styles.dropdownsContainer}>
              {/* Project dropdown */}
              <View style={styles.dropdownWrap}>
                <Pressable 
                  accessibilityRole="button" 
                  accessibilityLabel="Projet" 
                  onPress={() => { setProjectOpen(v => !v); setZoneOpen(false); }} 
                  style={styles.selectBtn}
                >
                  <Text style={[styles.selectText, !selectedProject && styles.selectPlaceholder]} numberOfLines={1}>
                    {selectedProject ? (projects.find(p => p.id === selectedProject)?.title || 'chantier') : 'chantier'}
                  </Text>
                </Pressable>
                {projectOpen && (
                  <View style={styles.selectMenu}>
                    <ScrollView>
                      <Pressable 
                        style={styles.selectItem} 
                        onPress={() => { 
                          setSelectedProject(undefined); 
                          setSelectedZone(undefined); 
                          setProjectOpen(false); 
                        }}
                      >
                        <Text style={styles.selectItemText}>Tous les chantiers</Text>
                      </Pressable>
                      {loadingProjects ? (
                        <View style={styles.selectItem}><ActivityIndicator /></View>
                      ) : (
                        projects.map(p => (
                          <Pressable 
                            key={p.id} 
                            style={styles.selectItem} 
                            onPress={() => { 
                              setSelectedProject(p.id); 
                              setSelectedZone(undefined); 
                              setProjectOpen(false); 
                            }}
                          >
                            <Text numberOfLines={1} style={styles.selectItemText}>{p.title}</Text>
                          </Pressable>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Zone dropdown */}
              <View style={[styles.dropdownWrap, !selectedProject && styles.dropdownDisabled]}>
                <Pressable 
                  accessibilityRole="button" 
                  accessibilityLabel="Zone" 
                  disabled={!selectedProject} 
                  onPress={() => { 
                    if (!selectedProject) return; 
                    setZoneOpen(v => !v); 
                    setProjectOpen(false); 
                  }} 
                  style={[styles.selectBtn, !selectedProject && styles.selectBtnDisabled]}
                >
                  <Text style={[styles.selectText, !selectedZone && styles.selectPlaceholder]} numberOfLines={1}>
                    {selectedZone ? (zones.find(z => z.id === selectedZone)?.title || 'Zone') : (selectedProject ? 'Zone' : 'Zone')}
                  </Text>
                </Pressable>
                {selectedProject && zoneOpen && (
                  <View style={styles.selectMenu}>
                    <ScrollView>
                      <Pressable 
                        style={styles.selectItem} 
                        onPress={() => { 
                          setSelectedZone(undefined); 
                          setZoneOpen(false); 
                        }}
                      >
                        <Text style={styles.selectItemText}>Toutes les zones</Text>
                      </Pressable>
                      {loadingZones ? (
                        <View style={styles.selectItem}><ActivityIndicator /></View>
                      ) : (
                        zones.map(z => (
                          <Pressable 
                            key={z.id} 
                            style={styles.selectItem} 
                            onPress={() => { 
                              setSelectedZone(z.id); 
                              setZoneOpen(false); 
                            }}
                          >
                            <Text numberOfLines={1} style={styles.selectItemText}>{z.title}</Text>
                          </Pressable>
                        ))
                      )}
                      {zones.length === 0 && !loadingZones && (
                        <View style={styles.selectItem}>
                          <Text style={styles.selectItemText}>Aucune zone</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.actionsWrapper}>
              <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Nouveau dossier"
                  onPress={() => setModalVisible(true)}
                  disabled={!selectedProject || !selectedZone}
                  style={[styles.addFolderButton, (!selectedProject || !selectedZone) && styles.addFolderButtonDisabled]}
                >
                <Image source={ICONS.folder} style={{ width: 32, height: 32 }} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
       
        {isLoading && folders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator color="#11224e" size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredFolders}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.row}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshing={isRefreshing}
            onRefresh={refresh}
            ListEmptyComponent={renderEmptyList}
            ListFooterComponent={
              <>
                {/* Spacer for custom tab bar */}
                <View style={{ height: 50 }} />
              </>
            }
          />
        )}
      </View>

      <CreateQualiPhotoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        projectId={selectedProject}
        zoneId={selectedZone}
        onSuccess={(created) => {
          setModalVisible(false);
          if (created) {
            // Validate that the folder was created with a complete ID
            if (!created.id) {
              console.error('Created folder missing ID:', created);
              Alert.alert('Erreur', 'Le dossier a été créé mais manque d\'informations. Veuillez réessayer.');
              fetchFolders(); // Refresh to show the new folder
              return;
            }
            const projectTitle = projects.find(p => p.id === selectedProject)?.title;
            const zoneTitle = allZones.find(z => z.id === selectedZone)?.title;
            setDetailProjectTitle(projectTitle);
            setDetailZoneTitle(zoneTitle);
            setDetailFolderTitle(created.title);
            setSelectedItem(created);
            setDetailVisible(true);
          }
          // Refresh list in background to include the new item
          fetchFolders();
        }}
      />

      <QualiPhotoDetail
        visible={detailVisible}
        item={selectedItem}
        onClose={() => { setDetailVisible(false); setSelectedItem(null); }}
        projects={projects}
        zones={allZones}
        projectTitle={detailProjectTitle}
        zoneTitle={detailZoneTitle}
        folderTitle={detailFolderTitle}
      />

      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f87b1b',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  addFolderButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f87b1b',
    borderRadius: 12,
  },
  addFolderButtonDisabled: {
    opacity: 0.4,
  },
  filterContainer: {
    marginTop: 4,
  },
  filterHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f87b1b',
  },
  dropdownWrap: {
    position: 'relative',
    flex: 1,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  selectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f87b1b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  selectBtnDisabled: {
    backgroundColor: '#f9fafb',
  },
  actionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 14,
  },
  selectPlaceholder: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  selectMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 240,
    zIndex: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  selectItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  selectItemText: {
    color: '#11224e',
    fontWeight: '600',
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: '#f87b1b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  listContent: {
    paddingVertical: 12,
    gap: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    flex: 1,
    maxWidth: '49%',
    marginHorizontal: 4,
    
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f87b1b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: 12,
  },
  pressed: {
      transform: [{ scale: 0.98 }],
      backgroundColor: '#f9fafb'
  },
  cardBody: {
      flex: 1,
      gap: 8,
  },
  cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#f87b1b',
      marginBottom: 8,
      textAlign: 'center',
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#f8fafc',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
  },
  infoText: {
      fontSize: 12,
      color: '#4b5563',
      flex: 1,
  },
  loadingMoreWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    marginVertical: 20,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    color: '#f87b1b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  technicianCard: {
    borderColor: '#9ca3af',
    backgroundColor: '#f9fafb',
  },
  technicianBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'center',
    marginBottom: 4,
  },
  technicianBadgeText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
});


