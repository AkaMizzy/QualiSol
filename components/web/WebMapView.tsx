import API_CONFIG from '@/app/config/api';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { MapPhoto, useMapData } from '@/hooks/useMapData';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Type declarations for Leaflet (will be dynamically imported on web)
declare const L: any;

interface WebMapViewProps {
  onViewFolder?: (folderId: string, photoAvantId?: string) => void;
}

export default function WebMapView({ onViewFolder }: WebMapViewProps) {
  const { photos, loading, error, mapCenter, selectedPhotoTypes, togglePhotoType, allPhotos } = useMapData();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<MapPhoto | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Load Leaflet CSS and JS dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Check if CSS already exists
    const existingCss = document.querySelector('link[href*="leaflet"]');
    if (!existingCss) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      cssLink.crossOrigin = '';
      document.head.appendChild(cssLink);
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="leaflet"]');
    if (existingScript) {
      // Script exists but L might not be ready yet
      const checkL = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkL);
          setLeafletLoaded(true);
        }
      }, 100);
      return () => clearInterval(checkL);
    }

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Initialize map when container is ready
  const initializeMap = useCallback(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    
    // Clean up existing map if any
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        // Ignore cleanup errors
      }
      mapRef.current = null;
    }

    const L = (window as any).L;
    if (!L) return;

    try {
      // Create map
      mapRef.current = L.map(mapContainerRef.current).setView(
        [mapCenter.lat, mapCenter.lng],
        6 // Default zoom level for France
      );

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      setMapReady(true);
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  }, [leafletLoaded, mapCenter.lat, mapCenter.lng]);

  // Effect to initialize map when leaflet is loaded and container is available
  useEffect(() => {
    if (leafletLoaded && mapContainerRef.current && !mapRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [leafletLoaded, initializeMap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when photos change
  useEffect(() => {
    if (!mapRef.current || !leafletLoaded || !mapReady) return;

    const L = (window as any).L;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add markers for each photo
    photos.forEach((photo) => {
      if (!photo.latitude || !photo.longitude) return;

      const lat = parseFloat(photo.latitude);
      const lng = parseFloat(photo.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      // Create custom icon based on photo type
      const iconColor = getIconColor(photo.kind);
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px;
          height: 32px;
          background: ${iconColor};
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 14px;
          ">📷</span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current);
      
      // Add click handler
      marker.on('click', () => {
        setSelectedPhoto(photo);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have photos
    if (photos.length > 0) {
      const bounds = photos
        .filter(p => p.latitude && p.longitude)
        .map(p => [parseFloat(p.latitude!), parseFloat(p.longitude!)]);
      
      if (bounds.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [photos, leafletLoaded, mapReady]);

  const getIconColor = (kind: string): string => {
    switch (kind) {
      case 'qualiphoto':
        return '#3b82f6'; // Blue
      case 'photoavant':
        return '#22c55e'; // Green
      case 'photoapres':
        return '#eab308'; // Yellow
      default:
        return '#3b82f6';
    }
  };

  const getPhotoTypeLabel = (kind: string): string => {
    switch (kind) {
      case 'qualiphoto':
        return 'QualiPhoto';
      case 'photoavant':
        return 'Situation Avant';
      case 'photoapres':
        return 'Situation Après';
      default:
        return kind;
    }
  };

  const handleViewFolder = () => {
    if (!selectedPhoto || !onViewFolder) return;

    if (selectedPhoto.kind === 'photoavant') {
      // PhotoAvant: idsource is folder ID
      onViewFolder(selectedPhoto.idsource);
    } else if (selectedPhoto.kind === 'photoapres') {
      // PhotoApres: idsource is photoAvant ID, need to find folder through photoAvant
      onViewFolder(selectedPhoto.idsource, selectedPhoto.id);
    }
    setSelectedPhoto(null);
  };

  if (loading || !leafletLoaded) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {loading ? 'Chargement des photos...' : 'Chargement de la carte...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>🗺️ Carte des Photos</Text>
          <Text style={styles.headerSubtitle}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} avec coordonnées GPS
          </Text>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedPhotoTypes.has('qualiphoto') && styles.filterButtonActiveBlue,
            ]}
            onPress={() => togglePhotoType('qualiphoto')}
          >
            <View style={[styles.filterDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={[
              styles.filterText,
              selectedPhotoTypes.has('qualiphoto') && styles.filterTextActive,
            ]}>
              QualiPhoto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedPhotoTypes.has('photoavant') && styles.filterButtonActiveGreen,
            ]}
            onPress={() => togglePhotoType('photoavant')}
          >
            <View style={[styles.filterDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[
              styles.filterText,
              selectedPhotoTypes.has('photoavant') && styles.filterTextActive,
            ]}>
              Avant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedPhotoTypes.has('photoapres') && styles.filterButtonActiveYellow,
            ]}
            onPress={() => togglePhotoType('photoapres')}
          >
            <View style={[styles.filterDot, { backgroundColor: '#eab308' }]} />
            <Text style={[
              styles.filterText,
              selectedPhotoTypes.has('photoapres') && styles.filterTextActive,
            ]}>
              Après
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        style={{ 
          flex: 1, 
          width: '100%', 
          height: '100%',
          minHeight: 400,
        }} 
      />

      {/* Photo Detail Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedPhoto(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {selectedPhoto && (
              <>
                {/* Photo Preview */}
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: selectedPhoto.url ? `${API_CONFIG.BASE_URL}${selectedPhoto.url}` : '' }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedPhoto(null)}
                  >
                    <Ionicons name="close" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                {/* Photo Info */}
                <View style={styles.photoInfo}>
                  <Text style={styles.photoTitle}>{selectedPhoto.title || 'Sans titre'}</Text>
                  
                  <View style={styles.infoRow}>
                    <View style={[styles.typeBadge, { backgroundColor: getIconColor(selectedPhoto.kind) }]}>
                      <Text style={styles.typeBadgeText}>
                        {getPhotoTypeLabel(selectedPhoto.kind)}
                      </Text>
                    </View>
                  </View>

                  {selectedPhoto.description && (
                    <Text style={styles.photoDescription} numberOfLines={3}>
                      {selectedPhoto.description}
                    </Text>
                  )}

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.infoText}>
                      {parseFloat(selectedPhoto.latitude!).toFixed(6)}, {parseFloat(selectedPhoto.longitude!).toFixed(6)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.infoText}>
                      {new Date(selectedPhoto.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  {(selectedPhoto.kind === 'photoavant' || selectedPhoto.kind === 'photoapres') && (
                    <TouchableOpacity
                      style={styles.viewFolderButton}
                      onPress={handleViewFolder}
                    >
                      <Ionicons name="folder-outline" size={20} color={COLORS.white} />
                      <Text style={styles.viewFolderButtonText}>
                        Voir le dossier et photos associées
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Empty State */}
      {photos.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="map-outline" size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}>
            Aucune photo avec coordonnées GPS
          </Text>
          <Text style={styles.emptySubtext}>
            Les photos prises avec la géolocalisation apparaîtront ici
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  errorText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: '#ef4444',
  },
  header: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 20,
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  filterButtonActiveBlue: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  filterButtonActiveGreen: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  filterButtonActiveYellow: {
    backgroundColor: '#fef9c3',
    borderColor: '#eab308',
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  filterTextActive: {
    color: COLORS.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    maxWidth: 400,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  photoPreviewContainer: {
    position: 'relative',
    aspectRatio: 4 / 3,
    backgroundColor: '#f3f4f6',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInfo: {
    padding: 16,
  },
  photoTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.tertiary,
    marginBottom: 8,
  },
  photoDescription: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  viewFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  viewFolderButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
  },
  emptyText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.tertiary,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
