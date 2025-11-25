import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import CreateFolderModal from '@/components/folder/CreateFolderModal';
import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import folderService, { Folder, Project, Zone } from '@/services/folderService';
import { getAllFolderTypes } from '@/services/folderTypeService';
import { Image } from 'expo-image';

function formatDateForGrid(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
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

const FolderCard = ({ item, projectTitle, zoneTitle }: { item: Folder; projectTitle?: string; zoneTitle?: string; }) => (
  <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
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

export default function PvScreen() {
  const { token, user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Filter states
  const [projects, setProjects] = useState<Project[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [selectedZone, setSelectedZone] = useState<string | undefined>(undefined);
  const [projectOpen, setProjectOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [allZones, setAllZones] = useState<Zone[]>([]);

  const fetchFolders = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const folderTypes = await getAllFolderTypes(token);
      const pvFolderType = folderTypes.find((ft) => ft.title === 'Pv');

      if (pvFolderType) {
        const fetchedFolders = await folderService.getAllFolders(token, pvFolderType.id);
        setFolders(fetchedFolders);
      } else {
        setError('Le type de dossier "Pv" est introuvable.');
      }
    } catch (err) {
      setError('Impossible de charger les dossiers.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#11224e" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <View style={styles.filterContainer}>
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
                {selectedProject ? (projects.find(p => p.id === selectedProject)?.title || 'Chantier') : 'Chantier'}
              </Text>
              <Ionicons name={projectOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#f87b1b" />
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
                {selectedZone ? (zones.find(z => z.id === selectedZone)?.title || 'Zone') : 'Zone'}
              </Text>
              <Ionicons name={zoneOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#f87b1b" />
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
        <TouchableOpacity style={[styles.addButton, (!selectedProject || !selectedZone) && styles.addButtonDisabled]} onPress={() => setIsModalVisible(true)} disabled={!selectedProject || !selectedZone}>
          <Image source={ICONS.pv} style={{ width: 28, height: 28 }} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={folders}
        renderItem={({ item }) => {
          const projectTitle = projects.find(p => p.id === item.project_id)?.title;
          const zoneTitle = allZones.find(z => z.id === item.zone_id)?.title;
          return <FolderCard item={item} projectTitle={projectTitle} zoneTitle={zoneTitle} />;
        }}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Aucun dossier trouvé.</Text>
          </View>
        }
      />
      <CreateFolderModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSuccess={() => {
          fetchFolders();
          setIsModalVisible(false);
        }}
        projectId={selectedProject}
        zoneId={selectedZone}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  addButton: {
    padding: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 16,
    gap: 12,
  },
  dropdownsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  dropdownWrap: {
    flex: 1,
    position: 'relative',
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  selectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectBtnDisabled: {
    backgroundColor: '#f3f4f6',
  },
  selectText: {
    fontSize: 14,
    color: '#11224e',
  },
  selectPlaceholder: {
    color: '#6b7280',
  },
  selectMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  selectItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectItemText: {
    fontSize: 14,
    color: '#11224e',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
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
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  listContent: {
    paddingVertical: 12,
    gap: 12,
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
});
