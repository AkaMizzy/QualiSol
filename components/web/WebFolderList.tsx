import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useWebFolders } from "@/hooks/useWebFolders";
import {
    assignPhotoToFolder,
    Ged,
    getPhotoAvantByFolder,
} from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DroppableFolderCard from "./DroppableFolderCard";
import PhotoTypeSelectionModal from "./PhotoTypeSelectionModal";

interface WebFolderListProps {
  galerieState: ReturnType<
    typeof import("@/hooks/useWebGalerie").useWebGalerie
  >;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string, folderTitle: string) => void;
}

export default function WebFolderList({
  galerieState,
  selectedFolderId,
  onFolderSelect,
}: WebFolderListProps) {
  const { token } = useAuth();
  const {
    folders,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    projectMap,
    zoneMap,
    projects,
    zones,
    filters,
    setProjectFilter,
    setZoneFilter,
    clearAllFilters,
    hasActiveFilters,
  } = useWebFolders();
  const { updatePhotoAssignment, refetch: refetchGalerie } = galerieState;

  // State for pending drop and modal
  const [pendingDrop, setPendingDrop] = useState<{
    photoId: string;
    folderId: string;
    folderTitle: string;
    photoAvants: Ged[];
  } | null>(null);

  const handleDrop = async (photoId: string, folderId: string) => {
    if (!token) return;

    try {
      // Find folder details
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) {
        Alert.alert("Erreur", "Dossier introuvable");
        return;
      }

      // Fetch all photoAvant for this folder
      const photoAvants = await getPhotoAvantByFolder(token, folderId);

      // Show modal with photoAvants
      setPendingDrop({
        photoId,
        folderId,
        folderTitle: folder.title,
        photoAvants,
      });
    } catch (err) {
      console.error("Failed to prepare photo assignment:", err);
      Alert.alert("Erreur", "Échec de la préparation de l'assignation");
    }
  };

  const handlePhotoAvantSelected = async () => {
    if (!pendingDrop || !token) return;

    const { photoId, folderId } = pendingDrop;

    try {
      // PhotoAvant uses folder ID as idsource
      updatePhotoAssignment(photoId, folderId, "photoavant");
      setPendingDrop(null);

      await assignPhotoToFolder(token, photoId, folderId, "photoavant");

      Alert.alert("Succès", 'Photo assignée comme "Situation Avant"');
      await refetchGalerie();
    } catch (err) {
      Alert.alert("Erreur", "Échec de l'assignation");
      await refetchGalerie();
    }
  };

  const handlePhotoApresSelected = async (photoAvantId: string) => {
    if (!pendingDrop || !token) return;

    const { photoId } = pendingDrop;

    try {
      // PhotoApres uses photoAvant ID as idsource (key change!)
      updatePhotoAssignment(photoId, photoAvantId, "photoapres");
      setPendingDrop(null);

      await assignPhotoToFolder(token, photoId, photoAvantId, "photoapres");

      Alert.alert("Succès", 'Photo assignée comme "Situation Après"');
      await refetchGalerie();
    } catch (err) {
      Alert.alert("Erreur", "Échec de l'assignation");
      await refetchGalerie();
    }
  };

  const handleCancelSelection = () => {
    setPendingDrop(null);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des dossiers...</Text>
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
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>📁 Dossiers</Text>
            <Text style={styles.headerSubtitle}>
              {folders.length} dossier{folders.length !== 1 ? "s" : ""} affiché
              {folders.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearAllFilters}
            >
              <Ionicons name="close-circle" size={16} color={COLORS.white} />
              <Text style={styles.clearFiltersText}>Effacer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Dropdowns */}
      <View style={styles.filtersContainer}>
        {/* Project Filter */}
        <View style={styles.filterDropdownContainer}>
          <Ionicons name="business-outline" size={14} color={COLORS.gray} />
          <select
            style={styles.filterDropdown as any}
            value={filters.projectId || ""}
            onChange={(e: any) => setProjectFilter(e.target.value || null)}
          >
            <option value="">Tous les projets</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </View>

        {/* Zone Filter */}
        <View style={styles.filterDropdownContainer}>
          <Ionicons name="layers-outline" size={14} color={COLORS.gray} />
          <select
            style={styles.filterDropdown as any}
            value={filters.zoneId || ""}
            onChange={(e: any) => setZoneFilter(e.target.value || null)}
            disabled={zones.length === 0}
          >
            <option value="">Toutes les zones</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.title}
              </option>
            ))}
          </select>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={COLORS.gray}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un dossier..."
          placeholderTextColor={COLORS.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.folderList}
        contentContainerStyle={styles.folderListContent}
      >
        {folders.map((folder) => (
          <DroppableFolderCard
            key={folder.id}
            folder={folder}
            onDrop={handleDrop}
            projectName={
              folder.project_id ? projectMap.get(folder.project_id) : undefined
            }
            zoneName={folder.zone_id ? zoneMap.get(folder.zone_id) : undefined}
            isSelected={selectedFolderId === folder.id}
            onSelect={onFolderSelect}
          />
        ))}

        {folders.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="folder-open-outline"
              size={48}
              color={COLORS.gray}
            />
            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? "Aucun dossier trouvé"
                : "Aucun dossier disponible"}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.emptyResetButton}
                onPress={clearAllFilters}
              >
                <Text style={styles.emptyResetText}>
                  Réinitialiser les filtres
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Photo Type Selection Modal */}
      <PhotoTypeSelectionModal
        visible={!!pendingDrop}
        folderTitle={pendingDrop?.folderTitle || ""}
        photoAvants={pendingDrop?.photoAvants || []}
        onSelectPhotoAvant={handlePhotoAvantSelected}
        onSelectPhotoApres={handlePhotoApresSelected}
        onCancel={handleCancelSelection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ef4444",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  filtersContainer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexWrap: "wrap",
  },
  filterDropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flex: 1,
    minWidth: 120,
  },
  filterDropdown: {
    border: "none",
    background: "transparent",
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.tertiary,
    cursor: "pointer",
    outline: "none",
    flex: 1,
    minWidth: 80,
  } as any,
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchIcon: {
    position: "absolute",
    left: 24,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 10,
    paddingLeft: 40,
    paddingRight: 16,
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.tertiary,
  },
  folderList: {
    flex: 1,
  },
  folderListContent: {
    padding: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    color: "#ef4444",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  emptyResetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyResetText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
});
