import AppHeader from '@/components/AppHeader';
import CreateQualiPhotoModal from '@/components/reception/CreateQualiPhotoModal';
// import QualiPhotoDetail from '@/components/reception/QualiPhotoDetail';
import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import folderService, { Folder } from '@/services/qualiphotoService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


function formatDateForGrid(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return '';
  }
}

export default function QualiPhotoGalleryScreen() {
  const { user, token } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Folder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guards to prevent re-entrant and out-of-order updates
  const fetchingRef = useRef(false);
  const requestIdRef = useRef(0);

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

      setFolders(items);

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

  const renderItem = useCallback(({ item }: { item: Folder }) => (
    <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => { setSelectedItem(item); setDetailVisible(true); }}
    >
        <View style={styles.cardHeader}>
            <Image source={ICONS.folder} style={{ width: 48, height: 48, marginRight: 12 }} />
            <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
            </Text>
        </View>
        <View style={styles.cardBody}>
            <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={14} color="#6b7280" />
                <Text style={styles.infoText} numberOfLines={1}>{item.project_id || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.infoText} numberOfLines={1}>{item.zone_id || 'N/A'}</Text>
            </View>
            <View style={styles.cardFooter}>
                 <Text style={styles.cardDate}>{formatDateForGrid(item.createdAt)}</Text>
            </View>
        </View>
    </Pressable>
  ), []);

  const keyExtractor = useCallback((item: Folder) => item.id, []);

  

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <View style={styles.header}>
        
        <View style={styles.filterContainer}>
          <View style={styles.filtersRow}>
            <View style={styles.actionsWrapper}>
              <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Nouveau dossier"
                  onPress={() => setModalVisible(true)}
                  style={styles.addFolderButton}
                >
                <Image source={ICONS.folder} style={{ width: 32, height: 32 }} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Mes Dossiers</Text>
        </View>
        <FlatList
          data={folders}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={refresh}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyWrap}><ActivityIndicator color="#11224e" /></View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>{errorMessage ? 'Impossible de charger les dossiers' : 'Aucun dossier pour le moment'}</Text>
                {errorMessage ? <Text style={styles.emptySubtitle}>{errorMessage}</Text> : <Text style={styles.emptySubtitle}>Tirez pour actualiser ou créer un nouveau dossier.</Text>}
              </View>
            )
          }
          ListFooterComponent={
            <>
              {/* Spacer for custom tab bar */}
              <View style={{ height: 50 }} />
            </>
          }
        />
      </View>

      <CreateQualiPhotoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={(created) => {
          setModalVisible(false);
          if (created) {
            setSelectedItem(created as Folder);
            setDetailVisible(true);
          }
          // Refresh list in background to include the new item
          fetchFolders();
        }}
      />

      {/* <QualiPhotoDetail
        visible={detailVisible}
        item={selectedItem}
        onClose={() => { setDetailVisible(false); setSelectedItem(null); }}
      /> */}

      
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
    marginVertical: 8,
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
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  cardBody: {
      flex: 1,
      gap: 6,
  },
  cardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: '#11224e',
      marginRight: 8,
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
  cardFooter: {
      marginTop: 8,
      alignItems: 'center',
  },
  cardDate: {
      fontSize: 11,
      color: '#9ca3af',
      fontWeight: '500',
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
});


