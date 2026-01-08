import { useAuth } from '@/contexts/AuthContext';
import { Ged, getAllGeds } from '@/services/gedService';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface WebGaleriePhoto extends Ged {
  isAssigned: boolean;
}

export function useWebGalerie() {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<WebGaleriePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const PHOTOS_PER_PAGE = 10;

  const fetchPhotos = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const allGeds = await getAllGeds(token);
      
      // Filter for qualiphotos and previously assigned photos
      const galeriePhotos = allGeds
        .filter(g => g.kind === 'qualiphoto' || g.kind === 'photoavant' || g.kind === 'photoapres')
        .map(g => ({
          ...g,
          isAssigned: g.kind !== 'qualiphoto', // Assigned if not qualiphoto
        }))
        // Sort by date only (newest first)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPhotos(galeriePhotos);
    } catch (err) {
      console.error('Failed to fetch galerie photos:', err);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchPhotos();
  }, [fetchPhotos]);

  // Filter photos by selected date if specified
  const filteredPhotos = useMemo(() => {
    if (!selectedDate) return photos;
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const nextDay = new Date(selected);
    nextDay.setDate(nextDay.getDate() + 1);
    
    return photos.filter(p => {
      const photoDate = new Date(p.created_at);
      return photoDate >= selected && photoDate < nextDay;
    });
  }, [photos, selectedDate]);

  const totalPages = Math.ceil(filteredPhotos.length / PHOTOS_PER_PAGE);
  
  // Use useMemo to ensure paginatedPhotos recalculates when photos array changes
  const paginatedPhotos = useMemo(() => {
    return filteredPhotos.slice(
      currentPage * PHOTOS_PER_PAGE,
      (currentPage + 1) * PHOTOS_PER_PAGE
    );
  }, [filteredPhotos, currentPage, PHOTOS_PER_PAGE]);

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  const updatePhotoAssignment = (photoId: string, folderId: string) => {
    setPhotos(prev =>
      prev.map(photo =>
        photo.id === photoId
          ? { ...photo, idsource: folderId, kind: 'photoavant', isAssigned: true }
          : photo
      )
    );
  };

  const clearDateFilter = () => {
    setSelectedDate('');
    setCurrentPage(0);
  };

  return {
    photos: paginatedPhotos,
    allPhotos: filteredPhotos,
    loading,
    error,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    refetch: fetchPhotos,
    updatePhotoAssignment,
    selectedDate,
    setSelectedDate,
    clearDateFilter,
  };
}
