import API_CONFIG from '@/app/config/api';
import CreateGedModal from '@/components/zone/CreateGedModal';
import { useAuth } from '@/contexts/AuthContext';
import { deleteZone, getZoneById, getZonePictures, type Ged, type Zone } from '@/services/zoneService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ZoneType = { id: string; title: string; description: string | null } | null;
type Project = { id: string; title: string; code: string } | null;
type Owner = { id: string; firstname?: string; lastname?: string; email?: string } | null;
type Control = { id: string; firstname?: string; lastname?: string; email?: string } | null;
type Technicien = { id: string; firstname?: string; lastname?: string; email?: string } | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  zoneId?: string | null;
  onUpdated?: () => void;
};

export default function ZoneDetailModal({ visible, onClose, zoneId, onUpdated }: Props) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [zone, setZone] = useState<Zone | null>(null);
  const [zoneType, setZoneType] = useState<ZoneType>(null);
  const [project, setProject] = useState<Project>(null);
  const [owner, setOwner] = useState<Owner>(null);
  const [control, setControl] = useState<Control>(null);
  const [technicien, setTechnicien] = useState<Technicien>(null);
  const [pictures, setPictures] = useState<Ged[]>([]);
  const [isLoadingPictures, setIsLoadingPictures] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCreateGedModalVisible, setIsCreateGedModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (!zoneId || !token) return;

    Alert.alert(
      'Supprimer la zone',
      'Êtes-vous sûr de vouloir supprimer cette zone ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteZone(token, zoneId);
              Alert.alert('Succès', 'Zone supprimée avec succès', [
                {
                  text: 'OK',
                  onPress: () => {
                    onClose();
                    // Call onUpdated if available to refresh the parent list
                    if (onUpdated) {
                      onUpdated();
                    }
                  },
                },
              ]);
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Échec de la suppression de la zone');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    let cancelled = false;
    async function loadZone() {
      if (!visible || !zoneId || !token) { 
        setZone(null); 
        setZoneType(null);
        setProject(null);
        setOwner(null);
        setControl(null);
        setTechnicien(null);
        setPictures([]);
        setError(null); 
        return; 
      }
      setIsLoading(true);
      setError(null);
      try {
        const zoneData = await getZoneById(token, zoneId);
        if (!cancelled) {
          setZone(zoneData);
          
          // Fetch related data
          const tasks: Promise<void>[] = [];
          
          // Fetch zone type
          if (zoneData.zonetype_id) {
            tasks.push((async () => {
              try {
                const res = await fetch(`${API_CONFIG.BASE_URL}/api/zonetype/${zoneData.zonetype_id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!cancelled && res.ok) {
                  setZoneType({ id: data.id, title: data.title, description: data.description });
                }
              } catch {
                if (!cancelled) setZoneType(null);
              }
            })());
          }
          
          // Fetch project
          if (zoneData.project_id) {
            tasks.push((async () => {
              try {
                const res = await fetch(`${API_CONFIG.BASE_URL}/api/projets/${zoneData.project_id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!cancelled && res.ok) {
                  setProject({ id: data.id, title: data.title, code: data.code });
                }
              } catch {
                if (!cancelled) setProject(null);
              }
            })());
          }
          
          // Fetch all company users in a single request
          tasks.push((async () => {
            try {
              const res = await fetch(`${API_CONFIG.BASE_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const users = await res.json();
              if (!cancelled && res.ok && Array.isArray(users)) {
                if (zoneData.owner_id) {
                  const ownerUser = users.find((u: any) => String(u.id) === String(zoneData.owner_id));
                  if (ownerUser) setOwner(ownerUser);
                }
                if (zoneData.control_id) {
                  const controlUser = users.find((u: any) => String(u.id) === String(zoneData.control_id));
                  if (controlUser) setControl(controlUser);
                }
                if (zoneData.technicien_id) {
                  const technicienUser = users.find((u: any) => String(u.id) === String(zoneData.technicien_id));
                  if (technicienUser) setTechnicien(technicienUser);
                }
              }
            } catch {
              // Ignore errors for user fetching
            }
          })());
          
          await Promise.all(tasks);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Chargement de la zone échoué');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadZone();
    return () => { cancelled = true; };
  }, [visible, zoneId, token]);

  // Fetch zone pictures
  const loadPictures = async () => {
    if (!visible || !zoneId || !token) {
      setPictures([]);
      return;
    }
    setIsLoadingPictures(true);
    try {
      const picturesData = await getZonePictures(token, zoneId);
      setPictures(picturesData);
    } catch (e: any) {
      // Silently fail for pictures - don't show error to user
      setPictures([]);
    } finally {
      setIsLoadingPictures(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchPictures() {
      if (!visible || !zoneId || !token) {
        setPictures([]);
        return;
      }
      setIsLoadingPictures(true);
      try {
        const picturesData = await getZonePictures(token, zoneId);
        if (!cancelled) {
          setPictures(picturesData);
        }
      } catch (e: any) {
        if (!cancelled) {
          // Silently fail for pictures - don't show error to user
          setPictures([]);
        }
      } finally {
        if (!cancelled) setIsLoadingPictures(false);
      }
    }
    fetchPictures();
    return () => { cancelled = true; };
  }, [visible, zoneId, token]);

// Note: static OSM URL kept for potential fallback use

// function getMiniMapHtml() {
//   const lat = Number(zone?.latitude);
//   const lng = Number(zone?.longitude);
//   const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
//   const centerLat = hasCoords ? lat : 33.5731;
//   const centerLng = hasCoords ? lng : -7.5898;
//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
//       <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
//       <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
//       <style> html, body, #miniMap { height: 100%; } body { margin: 0; padding: 0; } #miniMap { width: 100%; } </style>
//     </head>
//     <body>
//       <div id="miniMap"></div>
//       <script>
//         const miniMap = L.map('miniMap', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLng}], 14);
//         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(miniMap);
//         ${hasCoords ? `L.marker([${lat}, ${lng}]).addTo(miniMap);` : ''}
//         setTimeout(() => { miniMap.invalidateSize(); }, 100);
//       </script>
//     </body>
//     </html>
//   `;
// }

// function getFullViewMapHtml() {
//   if (!Number.isFinite(zone?.latitude as number) || !Number.isFinite(zone?.longitude as number)) return '';
//   const lat = Number(zone?.latitude);
//   const lng = Number(zone?.longitude);
//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
//       <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
//       <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
//       <style> html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; } </style>
//     </head>
//     <body>
//       <div id="map"></div>
//       <script>
//         const map = L.map('map').setView([${lat}, ${lng}], 15);
//         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
//         L.marker([${lat}, ${lng}]).addTo(map);
//       </script>
//     </body>
//     </html>
//   `;
// }
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{zone?.title || 'Détail de la zone'}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleDelete} 
            style={styles.deleteButton}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Ionicons name="trash-outline" size={24} color="#dc2626" />
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color="#b45309" />
            <Text style={styles.alertBannerText}>{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <Ionicons name="close" size={16} color="#b45309" />
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator color="#11224e" />
          </View>
        ) : null}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero: title/code */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.heroLogo, styles.heroLogoPlaceholder]}>
                <Ionicons name="map-outline" size={20} color="#9ca3af" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{zone?.title || '—'}</Text>
                <Text style={styles.sub} numberOfLines={1}>{zone?.code || '—'}</Text>
              </View>
            </View>
            {zone?.description ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                <Text style={styles.meta}>{zone.description}</Text>
              </View>
            ) : null}
          </View>

          {/* Metadata */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Métadonnées</Text>
            <View style={{ marginTop: 8, gap: 8 }}>
              <MetaRow icon="albums-outline" label="Type" value={zoneType?.title || '—'} />
              <MetaRow icon="business-outline" label="Projet" value={project ? `${project.title}${project.code ? ` · ${project.code}` : ''}` : '—'} />
              <MetaRow icon="person-outline" label="Propriétaire" value={(() => {
                if (owner) {
                  const n = [owner.firstname || '', owner.lastname || ''].join(' ').trim();
                  if (n) return n;
                  if (owner.email) return owner.email;
                }
                return '—';
              })()} />
              <MetaRow icon="shield-checkmark-outline" label="Contrôleur" value={(() => {
                if (control) {
                  const n = [control.firstname || '', control.lastname || ''].join(' ').trim();
                  if (n) return n;
                  if (control.email) return control.email;
                }
                return '—';
              })()} />
              <MetaRow icon="construct-outline" label="Technicien" value={(() => {
                if (technicien) {
                  const n = [technicien.firstname || '', technicien.lastname || ''].join(' ').trim();
                  if (n) return n;
                  if (technicien.email) return technicien.email;
                }
                return '—';
              })()} />
            </View>
          </View>

          {/* GED Pictures Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Zone délimitation</Text>
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={() => setIsCreateGedModalVisible(true)}
              >
                <Ionicons name="add-circle" size={20} color="#f87b1b" />
                <Text style={styles.addPhotoButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            {isLoadingPictures ? (
              <View style={styles.picturesLoadingContainer}>
                <ActivityIndicator color="#11224e" size="small" />
                <Text style={styles.picturesLoadingText}>Chargement des photos...</Text>
              </View>
            ) : pictures.length === 0 ? (
              <View style={styles.picturesEmptyContainer}>
                <Ionicons name="images-outline" size={32} color="#9ca3af" />
                <Text style={styles.picturesEmptyText}>Aucune photo disponible</Text>
              </View>
            ) : (
              <View style={styles.picturesGrid}>
                {pictures.map((picture) => {
                  const imageUrl = picture.url
                    ? picture.url.startsWith('http')
                      ? picture.url
                      : `${API_CONFIG.BASE_URL}${picture.url}`
                    : null;
                  
                  return (
                    <View key={picture.id} style={styles.pictureItem}>
                      {imageUrl ? (
                        <TouchableOpacity
                          onPress={() => setPreviewImage(imageUrl)}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.pictureImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.picturePlaceholder}>
                          <Ionicons name="image-outline" size={24} color="#9ca3af" />
                        </View>
                      )}
                      {picture.title && (
                        <Text style={styles.pictureTitle} numberOfLines={1}>
                          {picture.title}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <SafeAreaView style={styles.previewContainer}>
          <View style={[styles.previewHeader, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              style={styles.previewCloseButton}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Create GED Modal */}
      {zoneId && (
        <CreateGedModal
          visible={isCreateGedModalVisible}
          onClose={() => setIsCreateGedModalVisible(false)}
          zoneId={zoneId}
          onSuccess={loadPictures}
        />
      )}
    </Modal>
  );
}

function MetaRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.itemRow}>
      <Ionicons name={icon} size={16} color="#6b7280" />
      <Text style={styles.meta}>{label} · {value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  closeButton: { padding: 8 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  deleteButton: { padding: 8 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  alertBannerText: { color: '#b45309', flex: 1, fontSize: 12 },
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 16, marginHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#f3f4f6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#11224e' },
  addPhotoButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 8 },
  addPhotoButtonText: { fontSize: 14, fontWeight: '600', color: '#f87b1b' },
  title: { fontSize: 16, fontWeight: '700', color: '#11224e' },
  sub: { color: '#6b7280', marginTop: 2 },
  heroLogo: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#f3f4f6' },
  heroLogoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  meta: { color: '#374151' },
  picturesLoadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, justifyContent: 'center' },
  picturesLoadingText: { color: '#6b7280', fontSize: 14 },
  picturesEmptyContainer: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  picturesEmptyText: { color: '#9ca3af', fontSize: 14 },
  picturesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  pictureItem: { width: '47%', marginBottom: 8 },
  pictureImage: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#f3f4f6' },
  picturePlaceholder: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  pictureTitle: { marginTop: 6, fontSize: 12, color: '#6b7280', textAlign: 'center' },
  previewContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  previewHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, paddingHorizontal: 16, alignItems: 'flex-end' },
  previewCloseButton: { padding: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 20 },
  previewImage: { width: '100%', height: '100%' },
});


