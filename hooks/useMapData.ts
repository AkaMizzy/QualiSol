import { useAuth } from '@/contexts/AuthContext';
import folderService, { Folder, Project, Zone } from '@/services/folderService';
import { Ged, getMapData } from '@/services/gedService';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface MapPhoto extends Ged {
  // Computed property for marker color based on photo type
  markerColor: 'blue' | 'green' | 'yellow';
  // Folder info for filtering (only for photoavant, resolved for photoapres)
  folderId?: string;
}

export interface MapFilters {
  projectId: string | null;
  zoneId: string | null;
  folderId: string | null;
}

export function useMapData() {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<MapPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoTypes, setSelectedPhotoTypes] = useState<Set<string>>(
    new Set(['qualiphoto', 'photoavant', 'photoapres'])
  );
  
  // Filter data
  const [projects, setProjects] = useState<Project[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [filters, setFilters] = useState<MapFilters>({
    projectId: null,
    zoneId: null,
    folderId: null,
  });

  const fetchMapData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch photos, projects, zones, and folders in parallel
      const [photoData, projectData, zoneData, folderData] = await Promise.all([
        getMapData(token),
        folderService.getAllProjects(token),
        folderService.getAllZones(token),
        folderService.getAllFolders(token),
      ]);
      
      setProjects(projectData);
      setZones(zoneData);
      setFolders(folderData);
      
      // Create a map of photoAvant IDs to their folder IDs for quick lookup
      const photoAvantToFolder = new Map<string, string>();
      photoData.forEach(ged => {
        if (ged.kind === 'photoavant') {
          photoAvantToFolder.set(ged.id, ged.idsource);
        }
      });
      
      // Add marker color and folder ID based on photo type
      const photosWithColors: MapPhoto[] = photoData.map(ged => {
        let folderId: string | undefined;
        if (ged.kind === 'photoavant') {
          folderId = ged.idsource;
        } else if (ged.kind === 'photoapres') {
          // For photoapres, idsource is photoAvant ID, get folder from photoAvant
          folderId = photoAvantToFolder.get(ged.idsource);
        }
        
        return {
          ...ged,
          markerColor: getMarkerColor(ged.kind),
          folderId,
        };
      });
      
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

  // Filtered zones based on selected project
  const filteredZones = useMemo(() => {
    if (!filters.projectId) return zones;
    return zones.filter(z => z.project_id === filters.projectId);
  }, [zones, filters.projectId]);

  // Filtered folders based on selected project and zone
  const filteredFolders = useMemo(() => {
    let result = folders;
    if (filters.projectId) {
      result = result.filter(f => f.project_id === filters.projectId);
    }
    if (filters.zoneId) {
      result = result.filter(f => f.zone_id === filters.zoneId);
    }
    return result;
  }, [folders, filters.projectId, filters.zoneId]);

  // Filter photos by selected types and entity filters
  const filteredPhotos = useMemo(() => {
    let result = photos.filter(p => selectedPhotoTypes.has(p.kind));
    
    // Filter by folder (includes photoavant and photoapres of that folder)
    if (filters.folderId) {
      result = result.filter(p => p.folderId === filters.folderId);
    } else if (filters.zoneId) {
      // Filter by zone - need to get folders of this zone
      const zoneFolderIds = new Set(folders.filter(f => f.zone_id === filters.zoneId).map(f => f.id));
      result = result.filter(p => !p.folderId || zoneFolderIds.has(p.folderId));
    } else if (filters.projectId) {
      // Filter by project - need to get folders of this project
      const projectFolderIds = new Set(folders.filter(f => f.project_id === filters.projectId).map(f => f.id));
      result = result.filter(p => !p.folderId || projectFolderIds.has(p.folderId));
    }
    
    return result;
  }, [photos, selectedPhotoTypes, filters, folders]);

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

  const setProjectFilter = (projectId: string | null) => {
    setFilters(prev => ({
      ...prev,
      projectId,
      // Reset zone and folder when project changes
      zoneId: null,
      folderId: null,
    }));
  };

  const setZoneFilter = (zoneId: string | null) => {
    setFilters(prev => ({
      ...prev,
      zoneId,
      // Reset folder when zone changes
      folderId: null,
    }));
  };

  const setFolderFilter = (folderId: string | null) => {
    setFilters(prev => ({
      ...prev,
      folderId,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      projectId: null,
      zoneId: null,
      folderId: null,
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
    // Filter data
    projects,
    zones: filteredZones,
    folders: filteredFolders,
    filters,
    setProjectFilter,
    setZoneFilter,
    setFolderFilter,
    clearAllFilters,
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
