import API_CONFIG from '@/app/config/api';
import AppHeader from '@/components/AppHeader';
import PreviewModal from '@/components/PreviewModal';
import CreateProspectModal from '@/components/prospects/CreateProspectModal';
import { getGedsByIds } from '@/services/gedService';
import { Prospect, searchProspects } from '@/services/prospectService';
import { getAuthToken, getUser } from '@/services/secureStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProspectsScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | undefined>();
  const [selectedMediaTitle, setSelectedMediaTitle] = useState<string | undefined>();
  const [prospectModalVisible, setProspectModalVisible] = useState(false);

  useEffect(() => {
    async function loadAuthData() {
      const storedToken = await getAuthToken();
      setToken(storedToken);
      const storedUser = await getUser();
      setUser(storedUser);
    }
    loadAuthData();
  }, []);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (term: string, authToken: string | null) => {
        if (!authToken || term.length < 2) {
          setResults([]);
          return;
        }
        setIsLoading(true);
        try {
          const prospects = await searchProspects(authToken, term);
          if (prospects.length > 0) {
            const prospectIds = prospects.map(p => p.id);
            const images = await getGedsByIds(authToken, prospectIds);
            
            const imagesMap = images.reduce((acc, image) => {
              if (!acc[image.idsource]) {
                acc[image.idsource] = {};
              }
              if (image.kind === 'cv_recto') {
                acc[image.idsource].rectoUrl = image.url ?? undefined;
              } else if (image.kind === 'cv_verso') {
                acc[image.idsource].versoUrl = image.url ?? undefined;
              }
              return acc;
            }, {} as Record<string, { rectoUrl?: string; versoUrl?: string }>);

            const combinedResults = prospects.map(prospect => ({
              ...prospect,
              ...imagesMap[prospect.id],
            }));
            setResults(combinedResults);
          } else {
            setResults([]);
          }
        } catch (error) {
          console.error('Failed to search prospects:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm, token);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, token, debouncedSearch]);

  const handleImagePress = (url: string | undefined, title: string) => {
    if (url) {
      setSelectedMediaUrl(url);
      setSelectedMediaTitle(title);
      setPreviewVisible(true);
    }
  };

  const renderItem = ({ item }: { item: Prospect }) => {
    const fullRectoUrl = item.rectoUrl ? `${API_CONFIG.BASE_URL}${item.rectoUrl}` : undefined;
    const fullVersoUrl = item.versoUrl ? `${API_CONFIG.BASE_URL}${item.versoUrl}` : undefined;

    return (
      <View style={styles.itemContainer}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{`${item.firstname?.[0] || ''}${item.lastname?.[0] || ''}`}</Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.itemTitle}>{`${item.firstname} ${item.lastname}`}</Text>
            {item.prospectcompany && <Text style={styles.itemCompany}>{item.prospectcompany}</Text>}
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.contactInfo}>
            <Ionicons name="mail-outline" size={16} color="#f87b1b" />
            <Text style={styles.itemText}>{item.email}</Text>
          </View>
          {item.phone1 && (
            <View style={styles.contactInfo}>
              <Ionicons name="call-outline" size={16} color="#f87b1b" />
              <Text style={styles.itemText}>{item.phone1}</Text>
            </View>
          )}
        </View>
        <View style={styles.imagesContainer}>
          {fullRectoUrl ? (
            <Pressable style={styles.image} onPress={() => handleImagePress(fullRectoUrl, `Recto - ${item.firstname} ${item.lastname}`)}>
              <Image source={{ uri: fullRectoUrl }} style={styles.imageFill} contentFit="cover" />
            </Pressable>
          ) : <View style={[styles.image, styles.imagePlaceholder]}><Text style={styles.placeholderText}>Recto</Text></View>}
          {fullVersoUrl ? (
            <Pressable style={styles.image} onPress={() => handleImagePress(fullVersoUrl, `Verso - ${item.firstname} ${item.lastname}`)}>
              <Image source={{ uri: fullVersoUrl }} style={styles.imageFill} contentFit="cover" />
            </Pressable>
          ) : <View style={[styles.image, styles.imagePlaceholder]}><Text style={styles.placeholderText}>Verso</Text></View>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={22} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Nom, société, téléphone..."
          placeholderTextColor="#8E8E93"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <Pressable onPress={() => setSearchTerm('')} style={styles.clearIcon}>
            <Ionicons name="close-circle" size={22} color="#8E8E93" />
          </Pressable>
        )}
        <Pressable style={styles.addButton} onPress={() => setProspectModalVisible(true)}>
          <Ionicons name="person-add-outline" size={22} color="#f87b1b" />
        </Pressable>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#f87b1b" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchTerm.length < 2
                  ? 'Veuillez saisir au moins 2 caractères pour rechercher.'
                  : 'Aucun prospect trouvé.'}
              </Text>
            </View>
          )}
        />
      )}
      <PreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        mediaUrl={selectedMediaUrl}
        mediaType="image"
        title={selectedMediaTitle}
      />
      <CreateProspectModal
        visible={prospectModalVisible}
        onClose={() => setProspectModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#11224e',
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
  addButton: {
    marginLeft: 8,
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  itemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f87b1b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11224e',
  },
  itemCompany: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cardBody: {
    marginBottom: 16,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  image: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
});
