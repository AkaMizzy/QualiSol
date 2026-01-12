import { useAuth } from '@/contexts/AuthContext';
import folderService, { type Folder, type Project, type Zone } from '@/services/folderService';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface FolderFilters {
  projectId: string | null;
  zoneId: string | null;
}

export function useWebFolders() {
  const { token } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Entity filters
  const [filters, setFilters] = useState<FolderFilters>({
    projectId: null,
    zoneId: null,
  });

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch folders, projects, and zones in parallel
      const [allFolders, allProjects, allZones] = await Promise.all([
        folderService.getAllFolders(token),
        folderService.getAllProjects(token),
        folderService.getAllZones(token),
      ]);
      
      setFolders(allFolders);
      setProjects(allProjects);
      setZones(allZones);
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      setError('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Create lookup maps for efficient access
  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => map.set(p.id, p.title));
    return map;
  }, [projects]);

  const zoneMap = useMemo(() => {
    const map = new Map<string, string>();
    zones.forEach(z => map.set(z.id, z.title));
    return map;
  }, [zones]);

  // Filtered zones based on selected project
  const filteredZones = useMemo(() => {
    if (!filters.projectId) return zones;
    return zones.filter(z => z.project_id === filters.projectId);
  }, [zones, filters.projectId]);

  // Apply all filters to folders
  const filteredFolders = useMemo(() => {
    let result = folders;
    
    // Filter by project
    if (filters.projectId) {
      result = result.filter(f => f.project_id === filters.projectId);
    }
    
    // Filter by zone
    if (filters.zoneId) {
      result = result.filter(f => f.zone_id === filters.zoneId);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(folder => 
        folder.title.toLowerCase().includes(query) ||
        folder.code.toLowerCase().includes(query) ||
        folder.description?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [folders, filters, searchQuery]);

  const setProjectFilter = (projectId: string | null) => {
    setFilters(prev => ({
      ...prev,
      projectId,
      // Reset zone when project changes
      zoneId: null,
    }));
  };

  const setZoneFilter = (zoneId: string | null) => {
    setFilters(prev => ({
      ...prev,
      zoneId,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      projectId: null,
      zoneId: null,
    });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.projectId !== null || filters.zoneId !== null || searchQuery !== '';

  return {
    folders: filteredFolders,
    allFolders: folders,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refetch: fetchData,
    projectMap,
    zoneMap,
    // Filter data
    projects,
    zones: filteredZones,
    filters,
    setProjectFilter,
    setZoneFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}
