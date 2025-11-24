import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import CreateFolderModal from '@/components/folder/CreateFolderModal';
import { useAuth } from '@/contexts/AuthContext';
import folderService, { Folder, Project, Zone } from '@/services/folderService';
import { getAllFolderTypes } from '@/services/folderTypeService';

const FolderCard = ({ item }: { item: Folder }) => (
  <TouchableOpacity style={styles.card}>
    <View style={styles.cardIcon}>
      <Ionicons name="folder-outline" size={24} color="#f87b1b" />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={3}>{item.description || 'Aucune description'}</Text>
    </View>
    <View style={styles.cardFooter}>
      <Ionicons name="barcode-outline" size={14} color="#6b7280" />
      <Text style={styles.cardCode}>{item.code}</Text>
    </View>
  </TouchableOpacity>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dossiers de Pv</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)} disabled={!selectedProject || !selectedZone}>
          <Ionicons name="add-circle-outline" size={28} color={(!selectedProject || !selectedZone) ? '#a0a0a0' : '#f87b1b'} />
        </TouchableOpacity>
      </View>
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
      </View>
      <FlatList
        data={folders}
        renderItem={({ item }) => <FolderCard item={item} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Aucun dossier trouvé.</Text>
          </View>
        }
      />
      <CreateFolderModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSuccess={(newFolder) => {
          setFolders(prev => [newFolder as Folder, ...prev]);
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#11224e',
  },
  addButton: {
    padding: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dropdownsContainer: {
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
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  grid: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#11224e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardIcon: {
    alignSelf: 'flex-start',
    backgroundColor: '#f87b1b1a',
    borderRadius: 9999,
    padding: 8,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6b7280',
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cardCode: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
  },
});
