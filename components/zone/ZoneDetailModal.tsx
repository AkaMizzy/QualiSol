import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

type ZoneRecord = {
  id: string;
  title: string;
  code?: string | null;
  logo?: string | null;
  zone_logo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  id_zone?: string | null; // parent id
  level?: number | null;
  zone_type_id?: string | number | null;
  zone_type_title?: string | null;
  id_project?: string | number | null;
  project_title?: string | null;
  project_code?: string | null;
  status?: number | boolean | null;
  assigned_user?: string | null;
  assigned_user_firstname?: string | null;
  assigned_user_lastname?: string | null;
  assigned_user_email?: string | null;
  control?: string | null;
  control_user_firstname?: string | null;
  control_user_lastname?: string | null;
  technicien?: string | null;
  technicien_user_firstname?: string | null;
  technicien_user_lastname?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  zoneId?: string | null;
  onUpdated?: () => void;
};

function getZoneLogoUrl(z?: { logo?: string | null; zone_logo?: string | null } | null) {
  if (!z) return null;
  const raw = z.zone_logo ?? z.logo ?? null;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${API_CONFIG.BASE_URL}${path}`;
}

export default function ZoneDetailModal({ visible, onClose, zoneId }: Props) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [zone, setZone] = useState<ZoneRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function toNumberOrNull(value: unknown): number | null {
      if (value === null || value === undefined) return null;
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : null;
    }

    async function loadZone() {
      if (!visible || !zoneId) { setZone(null); setError(null); return; }
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/user/zones/${zoneId}`,(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined) as any);
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) {
            const normalized: ZoneRecord = {
              ...(data as ZoneRecord),
              latitude: toNumberOrNull((data as any)?.latitude),
              longitude: toNumberOrNull((data as any)?.longitude),
            };
            setZone(normalized);
          }
          else setError(typeof data?.error === 'string' ? data.error : 'Chargement de la zone échoué');
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

  // Note: static OSM URL kept for potential fallback use

  function getMiniMapHtml() {
    const lat = Number(zone?.latitude);
    const lng = Number(zone?.longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const centerLat = hasCoords ? lat : 33.5731;
    const centerLng = hasCoords ? lng : -7.5898;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style> html, body, #miniMap { height: 100%; } body { margin: 0; padding: 0; } #miniMap { width: 100%; } </style>
      </head>
      <body>
        <div id="miniMap"></div>
        <script>
          const miniMap = L.map('miniMap', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLng}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(miniMap);
          ${hasCoords ? `L.marker([${lat}, ${lng}]).addTo(miniMap);` : ''}
          setTimeout(() => { miniMap.invalidateSize(); }, 100);
        </script>
      </body>
      </html>
    `;
  }

  function getFullViewMapHtml() {
    if (!Number.isFinite(zone?.latitude as number) || !Number.isFinite(zone?.longitude as number)) return '';
    const lat = Number(zone?.latitude);
    const lng = Number(zone?.longitude);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style> html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; } </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lng}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
          L.marker([${lat}, ${lng}]).addTo(map);
        </script>
      </body>
      </html>
    `;
  }

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
          <View style={styles.placeholder} />
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
          {/* Hero: Logo + title/code */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {getZoneLogoUrl(zone) ? (
                <Image source={{ uri: getZoneLogoUrl(zone) as string }} style={styles.heroLogo} resizeMode="cover" />
              ) : (
                <View style={[styles.heroLogo, styles.heroLogoPlaceholder]}>
                  <Ionicons name="image-outline" size={20} color="#9ca3af" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{zone?.title || '—'}</Text>
                <Text style={styles.sub} numberOfLines={1}>{zone?.code || '—'}</Text>
              </View>
              {/* Status badge */}
              {(() => {
                const raw = zone?.status as any;
                const active = raw === 1 || raw === true || raw === '1';
                return (
                  <View style={{ backgroundColor: active ? '#e9f7ef' : '#f4f5f7', borderColor: active ? '#c6f0d9' : '#e5e7eb', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 }}>
                    <Text style={{ color: active ? '#2ecc71' : '#6b7280', fontSize: 11, fontWeight: '600' }}>{active ? 'Actif' : 'Inactif'}</Text>
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Metadata */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Métadonnées</Text>
            <View style={{ marginTop: 8, gap: 8 }}>
              <MetaRow icon="albums-outline" label="Type" value={zone?.zone_type_title || '—'} />
              <MetaRow icon="trail-sign-outline" label="Niveau" value={typeof zone?.level === 'number' ? String(zone?.level) : '—'} />
              <MetaRow icon="git-branch-outline" label="Zone parente" value={zone?.id_zone || '—'} />
              <MetaRow icon="business-outline" label="Projet" value={zone?.project_title ? `${zone.project_title}${zone.project_code ? ` · ${zone.project_code}` : ''}` : '—'} />
              <MetaRow icon="location-outline" label="Latitude" value={Number.isFinite(zone?.latitude as number) ? String(zone?.latitude) : '—'} />
              <MetaRow icon="location-outline" label="Longitude" value={Number.isFinite(zone?.longitude as number) ? String(zone?.longitude) : '—'} />
              <MetaRow icon="person-outline" label="Assigné à" value={(() => {
                const n = [zone?.assigned_user_firstname || '', zone?.assigned_user_lastname || ''].join(' ').trim();
                if (n) return n;
                if (zone?.assigned_user_email) return zone.assigned_user_email;
                if (zone?.assigned_user) return String(zone.assigned_user);
                return '—';
              })()} />
              <MetaRow icon="shield-checkmark-outline" label="Contrôleur" value={(() => {
                const n = [zone?.control_user_firstname || '', zone?.control_user_lastname || ''].join(' ').trim();
                if (n) return n;
                if (zone?.control) return String(zone.control);
                return '—';
              })()} />
              <MetaRow icon="construct-outline" label="Technicien" value={(() => {
                const n = [zone?.technicien_user_firstname || '', zone?.technicien_user_lastname || ''].join(' ').trim();
                if (n) return n;
                if (zone?.technicien) return String(zone.technicien);
                return '—';
              })()} />
            </View>
          </View>

          {/* Map preview (Leaflet in WebView, like DeclarationDetailsModal) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}> 
              <Text style={styles.cardTitle}>Localisation</Text>
            </View>
            {Number.isFinite(zone?.latitude as number) && Number.isFinite(zone?.longitude as number) ? (
              <TouchableOpacity onPress={() => setIsMapVisible(true)}>
                <View style={styles.mapContainer}>
                  <WebView
                    source={{ html: getMiniMapHtml() }}
                    style={styles.map}
                    javaScriptEnabled
                    scrollEnabled={false}
                  />
                  <View style={styles.mapOverlay}>
                    <Text style={styles.mapCoordinates}>{`${Number(zone?.latitude).toFixed(5)}, ${Number(zone?.longitude).toFixed(5)}`}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.meta}>Localisation indisponible</Text>
            )}
          </View>
        </ScrollView>
        {/* Full-screen Map Modal */}
        <Modal visible={isMapVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsMapVisible(false)}>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setIsMapVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Vue Carte</Text>
              </View>
              <View style={styles.placeholder} />
            </View>
            <WebView
              source={{ html: getFullViewMapHtml() }}
              style={{ flex: 1 }}
              javaScriptEnabled
            />
          </View>
        </Modal>
      </SafeAreaView>
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
  placeholder: { width: 40 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  alertBannerText: { color: '#b45309', flex: 1, fontSize: 12 },
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 16, marginHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#f3f4f6' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#11224e' },
  title: { fontSize: 16, fontWeight: '700', color: '#11224e' },
  sub: { color: '#6b7280', marginTop: 2 },
  heroLogo: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#f3f4f6' },
  heroLogoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  meta: { color: '#374151' },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    marginTop: 8,
  },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 6,
  },
  mapCoordinates: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
});


