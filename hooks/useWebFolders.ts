import { useAuth } from '@/contexts/AuthContext';
import folderService, { type Folder, type Project, type Zone } from '@/services/folderService';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useWebFolders() {
  const { token } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredFolders = folders.filter(folder => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      folder.title.toLowerCase().includes(query) ||
      folder.code.toLowerCase().includes(query) ||
      folder.description?.toLowerCase().includes(query)
    );
  });

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
  };
}
