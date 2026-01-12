import { useAuth } from '@/contexts/AuthContext';
import { Ged, getMapData } from '@/services/gedService';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface MapPhoto extends Ged {
  // Computed property for marker color based on photo type
  markerColor: 'blue' | 'green' | 'yellow';
}

export function useMapData() {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<MapPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoTypes, setSelectedPhotoTypes] = useState<Set<string>>(
    new Set(['qualiphoto', 'photoavant', 'photoapres'])
  );

  const fetchMapData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getMapData(token);
      
      // Add marker color based on photo type
      const photosWithColors: MapPhoto[] = data.map(ged => ({
        ...ged,
        markerColor: getMarkerColor(ged.kind),
      }));
      
      setPhotos(photosWithColors);
    } catch (err) {
      console.error('Failed to fetch map data:', err);
      setError('Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchMapData();
  }, [fetchMapData]);

  // Filter photos by selected types
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => selectedPhotoTypes.has(p.kind));
  }, [photos, selectedPhotoTypes]);

  // Calculate map center based on photos
  const mapCenter = useMemo(() => {
    if (filteredPhotos.length === 0) {
      // Default to France center
      return { lat: 46.603354, lng: 1.888334 };
    }

    // Calculate average of all photo coordinates
    const validPhotos = filteredPhotos.filter(
      p => p.latitude && p.longitude
    );
    
    if (validPhotos.length === 0) {
      return { lat: 46.603354, lng: 1.888334 };
    }

    const sumLat = validPhotos.reduce((sum, p) => sum + parseFloat(p.latitude!), 0);
    const sumLng = validPhotos.reduce((sum, p) => sum + parseFloat(p.longitude!), 0);
    
    return {
      lat: sumLat / validPhotos.length,
      lng: sumLng / validPhotos.length,
    };
  }, [filteredPhotos]);

  const togglePhotoType = (type: string) => {
    setSelectedPhotoTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  return {
    photos: filteredPhotos,
    allPhotos: photos,
    loading,
    error,
    refetch: fetchMapData,
    mapCenter,
    selectedPhotoTypes,
    togglePhotoType,
  };
}

function getMarkerColor(kind: string): 'blue' | 'green' | 'yellow' {
  switch (kind) {
    case 'qualiphoto':
      return 'blue';
    case 'photoavant':
      return 'green';
    case 'photoapres':
      return 'yellow';
    default:
      return 'blue';
  }
}
