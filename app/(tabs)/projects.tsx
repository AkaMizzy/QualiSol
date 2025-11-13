import AppHeader from '@/components/AppHeader';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import ProjectDetailModal from '@/components/projects/ProjectDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { getAllProjects, Project } from '@/services/projectService';
import { formatDisplayDate } from '@/utils/dateFormat';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProjectsScreen() {
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const { width } = useWindowDimensions();
  const [createVisible, setCreateVisible] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const refreshProjects = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const refreshed = await getAllProjects(token);
      setProjects(refreshed);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshProjects();
  }, [token, refreshProjects]);

  const columnCount = width >= 900 ? 3 : 2;
  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth = (width - horizontalPadding * 2 - gap * (columnCount - 1)) / columnCount;

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <AppHeader user={user || undefined} />
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#11224e' }}>Chantiers</Text>
              <Text style={{ marginTop: 4, color: '#6b7280' }}>Gérez et consultez vos chantiers en cours</Text>
            </View>
            <TouchableOpacity onPress={() => setCreateVisible(true)} style={[styles.button]}>
              <Ionicons name="add-circle" size={20} color="#f87b1b" />
              <Text style={styles.ButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1, paddingHorizontal: horizontalPadding }}>
          {isLoading && projects.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#11224e" />
            </View>
          ) : (
            <FlatList
              contentContainerStyle={{ paddingBottom: 100 }}
              data={projects}
              numColumns={columnCount}
              columnWrapperStyle={{ gap }}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View style={{ height: gap }} />}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity activeOpacity={0.8} onPress={() => { setSelectedProject(item); setDetailVisible(true); }} style={[styles.card, { width: cardWidth, borderColor: '#e5e7eb', shadowColor: '#000' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      {item.code ? <Text style={styles.cardMeta}>Code · {item.code}</Text> : <Text style={styles.cardMeta}>Code · —</Text>}
                      <Text style={styles.cardSub}>Du {formatDisplayDate(item.dd)} au {formatDisplayDate(item.df)}</Text>
                      {item.project_type_title ? <Text style={styles.cardMeta}>Type · {item.project_type_title}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </SafeAreaView>
      
      <CreateProjectModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={refreshProjects}
      />
      <ProjectDetailModal
        visible={detailVisible}
        onClose={() => { setDetailVisible(false); setSelectedProject(null); }}
        project={selectedProject}
        onUpdated={refreshProjects}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f87b1b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
    shadowColor: '#f87b1b',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  ButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87b1b',
    marginLeft: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'white',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11224e',
  },
  cardSub: {
    marginTop: 4,
    color: '#374151',
  },
  cardMeta: {
    marginTop: 4,
    color: '#6b7280',
  },
});
