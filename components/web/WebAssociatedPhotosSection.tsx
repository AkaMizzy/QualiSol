import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
    assignPhotoToFolder,
    Ged,
    generateFolderReport,
    getAssociatedPhotosByFolder,
    updateGed,
} from "@/services/gedService";
import { getInactiveStatusId } from "@/services/statusService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import DropZone from "./DropZone";
import ImagePreviewModal from "./ImagePreviewModal";
import PhotoAvantSelectionModal from "./PhotoAvantSelectionModal";

interface WebAssociatedPhotosSectionProps {
  selectedFolderId: string | null;
  folderTitle?: string;
  onPhotoAssigned?: () => void; // Callback to refresh galerie after assignment
}

export default function WebAssociatedPhotosSection({
  selectedFolderId,
  folderTitle,
  onPhotoAssigned,
}: WebAssociatedPhotosSectionProps) {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<Ged[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Ged | null>(null);
  const [showPhotoAvantModal, setShowPhotoAvantModal] = useState(false);
  const [pendingPhotoId, setPendingPhotoId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [inactiveStatusId, setInactiveStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFolderId || !token) {
      setPhotos([]);
      return;
    }

    const fetchAssociatedPhotos = async () => {
      try {
        setLoading(true);
        setError(null);
        const associatedPhotos = await getAssociatedPhotosByFolder(
          token,
          selectedFolderId,
        );
        setPhotos(associatedPhotos);
      } catch (err) {
        console.error("Failed to fetch associated photos:", err);
        setError("Échec du chargement des photos associées");
      } finally {
        setLoading(false);
      }
    };

    void fetchAssociatedPhotos();
  }, [selectedFolderId, token]);

  // Fetch inactive status ID on mount
  useEffect(() => {
    const fetchInactiveStatus = async () => {
      if (token) {
        const statusId = await getInactiveStatusId(token);
        setInactiveStatusId(statusId);
      }
    };
    fetchInactiveStatus();
  }, [token]);

  // Handle photo deactivation
  const handleDeactivate = useCallback(
    async (photoId: string) => {
      if (!token || !inactiveStatusId) {
        alert("Impossible de désactiver la photo. Statut introuvable.");
        return;
      }

      try {
        await updateGed(token, photoId, { status_id: inactiveStatusId });
        // Refresh photos to reflect the change
        if (selectedFolderId) {
          const updatedPhotos = await getAssociatedPhotosByFolder(
            token,
            selectedFolderId,
          );
          setPhotos(updatedPhotos);
        }
      } catch (error) {
        console.error("Failed to deactivate photo:", error);
        alert("Échec de la désactivation de la photo.");
      }
    },
    [token, inactiveStatusId, selectedFolderId],
  );

  // Check if a photo is inactive
  const isPhotoInactive = useCallback(
    (photo: Ged): boolean => {
      return inactiveStatusId !== null && photo.status_id === inactiveStatusId;
    },
    [inactiveStatusId],
  );

  // Create photo pairs based on idsource relationship
  // Each photoApres has idsource pointing to its photoAvant
  const photoAvants = photos.filter((p) => p.kind === "photoavant");
  const photoApres = photos.filter((p) => p.kind === "photoapres");

  // Create pairs: { avant: Ged, apres?: Ged }
  const photoPairs = photoAvants.map((avant) => {
    const apres = photoApres.find((ap) => ap.idsource === avant.id);
    return { avant, apres };
  });

  // Also include orphaned photoApres (those without a matching photoAvant)
  const orphanedApres = photoApres.filter(
    (ap) => !photoAvants.some((av) => av.id === ap.idsource),
  );

  // Handle drop into Situation Avant zone
  const handleDropPhotoAvant = async (photoId: string) => {
    if (!selectedFolderId || !token) return;

    try {
      await assignPhotoToFolder(token, photoId, selectedFolderId, "photoavant");

      // Refresh photos
      const updatedPhotos = await getAssociatedPhotosByFolder(
        token,
        selectedFolderId,
      );
      setPhotos(updatedPhotos);

      // Refresh galerie to remove assigned photo from qualiphoto list
      onPhotoAssigned?.();

      // Show success alert
      Alert.alert(
        "✅ Photo assignée",
        "La photo a été assignée comme Situation Avant",
        [{ text: "OK" }],
      );
    } catch (err) {
      console.error("Failed to assign photo avant:", err);
      Alert.alert("Erreur", "Échec de l'assignation de la photo", [
        { text: "OK" },
      ]);
    }
  };

  // Handle drop into Situation Après zone
  const handleDropPhotoApres = async (
    photoId: string,
    photoAvantId: string,
  ) => {
    if (!selectedFolderId || !token) return;

    try {
      // Assign as photoApres with idsource pointing to the specific photoAvant from this row
      await assignPhotoToFolder(token, photoId, photoAvantId, "photoapres");

      // Refresh photos
      const updatedPhotos = await getAssociatedPhotosByFolder(
        token,
        selectedFolderId,
      );
      setPhotos(updatedPhotos);

      // Refresh galerie to remove assigned photo from qualiphoto list
      onPhotoAssigned?.();

      // Show success alert
      Alert.alert(
        "✅ Photo assignée",
        "La photo a été assignée comme Situation Après",
        [{ text: "OK" }],
      );
    } catch (err) {
      console.error("Failed to assign photo apres:", err);
      Alert.alert("Erreur", "Échec de l'assignation de la photo", [
        { text: "OK" },
      ]);
    }
  };

  // Handle photo avant selection from modal
  const handlePhotoAvantSelect = async (photoAvantId: string) => {
    if (!pendingPhotoId || !token) return;

    try {
      setShowPhotoAvantModal(false);

      // Assign as photoApres with idsource pointing to photoAvant
      await assignPhotoToFolder(
        token,
        pendingPhotoId,
        photoAvantId,
        "photoapres",
      );

      // Refresh photos
      if (selectedFolderId) {
        const updatedPhotos = await getAssociatedPhotosByFolder(
          token,
          selectedFolderId,
        );
        setPhotos(updatedPhotos);
      }

      // Show success alert
      Alert.alert(
        "✅ Photo assignée",
        "La photo a été assignée comme Situation Après",
        [{ text: "OK" }],
      );

      setPendingPhotoId(null);
    } catch (err) {
      console.error("Failed to assign photo apres:", err);
      Alert.alert("Erreur", "Échec de l'assignation de la photo", [
        { text: "OK" },
      ]);
      setPendingPhotoId(null);
    }
  };

  const handleGeneratePdf = async () => {
    if (!selectedFolderId || !token) return;

    setGeneratingPdf(true);
    setPdfError(null);

    try {
      const result = await generateFolderReport(token, selectedFolderId);

      // Open PDF in new tab
      if (result.data && result.data.url) {
        const pdfUrl = `${API_CONFIG.BASE_URL}${result.data.url}`;
        window.open(pdfUrl, "_blank");
      } else {
        setPdfError("URL du PDF non disponible");
      }
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      setPdfError(error.message || "Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!selectedFolderId) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={64} color={COLORS.gray} />
        <Text style={styles.emptyTitle}>Aucun dossier sélectionné</Text>
        <Text style={styles.emptySubtitle}>
          Sélectionnez un dossier pour voir les photos associées
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des photos...</Text>
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
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Photos Associées</Text>
            {folderTitle && (
              <Text style={styles.headerSubtitle}>Dossier: {folderTitle}</Text>
            )}
            {pdfError && <Text style={styles.headerError}>⚠️ {pdfError}</Text>}
          </View>
          <View style={styles.headerActions}>
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.pdfButton,
                generatingPdf && styles.pdfButtonDisabled,
              ]}
              onPress={handleGeneratePdf}
              disabled={generatingPdf || !selectedFolderId}
            >
              {generatingPdf ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="document-text" size={18} color={COLORS.white} />
              )}
              <Text style={styles.pdfButtonText}>
                {generatingPdf ? "Génération..." : "PDF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Paired before/after photos */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {photoPairs.map((pair) => (
            <View key={pair.avant.id} style={styles.pairRow}>
              {/* Left: Photo Avant - with drop zone */}
              <DropZone
                onDrop={handleDropPhotoAvant}
                highlightColor={COLORS.primary}
              >
                <div
                  style={{
                    cursor: isPhotoInactive(pair.avant)
                      ? "not-allowed"
                      : "pointer",
                    opacity: isPhotoInactive(pair.avant) ? 0.5 : 1,
                    filter: isPhotoInactive(pair.avant)
                      ? "grayscale(100%)"
                      : "none",
                  }}
                >
                  <TouchableOpacity
                    style={styles.pairCard}
                    onPress={() => setPreviewPhoto(pair.avant)}
                    disabled={isPhotoInactive(pair.avant)}
                  >
                    {pair.avant.url && (
                      <Image
                        source={{
                          uri: `${API_CONFIG.BASE_URL}${pair.avant.url}`,
                        }}
                        style={styles.pairImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.pairOverlay}>
                      <View style={styles.pairBadge}>
                        <Ionicons
                          name="camera-outline"
                          size={14}
                          color={COLORS.white}
                        />
                        <Text style={styles.pairBadgeText}>Avant</Text>
                      </View>
                      <Text style={styles.pairTitle} numberOfLines={2}>
                        {pair.avant.title || "Sans titre"}
                      </Text>
                      <Text style={styles.pairDate}>
                        {new Date(pair.avant.created_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </Text>
                    </View>

                    {/* Deactivate Button for Photo Avant */}
                    {!isPhotoInactive(pair.avant) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              "Voulez-vous vraiment désactiver cette photo ?",
                            )
                          ) {
                            handleDeactivate(pair.avant.id);
                          }
                        }}
                        style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "12px",
                          backgroundColor: "#ef4444",
                          border: "none",
                          borderRadius: "50%",
                          width: "36px",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                          transition: "all 0.2s",
                        }}
                        title="Désactiver la photo"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.1)";
                          e.currentTarget.style.backgroundColor = "#dc2626";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.backgroundColor = "#ef4444";
                        }}
                      >
                        <Ionicons
                          name="eye-off-outline"
                          size={18}
                          color={COLORS.white}
                        />
                      </button>
                    )}

                    {/* Inactive Badge for Photo Avant */}
                    {isPhotoInactive(pair.avant) && (
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          backgroundColor: "#6b7280",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                        }}
                      >
                        <Text style={styles.pairBadgeText}>Inactive</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </div>
              </DropZone>

              {/* Separator */}
              <View style={styles.pairSeparator}>
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color={COLORS.primary}
                />
              </View>

              {/* Right: Photo Après (or placeholder) - with drop zone */}
              <DropZone
                onDrop={handleDropPhotoApres}
                highlightColor="#10b981"
                data={pair.avant.id}
                disabled={!!pair.apres} // Disable if photoApres already exists
              >
                {pair.apres ? (
                  <div
                    style={{
                      cursor: isPhotoInactive(pair.apres)
                        ? "not-allowed"
                        : "pointer",
                      opacity: isPhotoInactive(pair.apres) ? 0.5 : 1,
                      filter: isPhotoInactive(pair.apres)
                        ? "grayscale(100%)"
                        : "none",
                    }}
                  >
                    <TouchableOpacity
                      style={styles.pairCard}
                      onPress={() => setPreviewPhoto(pair.apres!)}
                      disabled={isPhotoInactive(pair.apres)}
                    >
                      {pair.apres.url && (
                        <Image
                          source={{
                            uri: `${API_CONFIG.BASE_URL}${pair.apres.url}`,
                          }}
                          style={styles.pairImage}
                          resizeMode="cover"
                        />
                      )}
                      <View style={styles.pairOverlay}>
                        <View style={[styles.pairBadge, styles.pairBadgeGreen]}>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={14}
                            color={COLORS.white}
                          />
                          <Text style={styles.pairBadgeText}>Après</Text>
                        </View>
                        <Text style={styles.pairTitle} numberOfLines={2}>
                          {pair.apres.title || "Sans titre"}
                        </Text>
                        <Text style={styles.pairDate}>
                          {new Date(pair.apres.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </Text>
                      </View>

                      {/* Deactivate Button for Photo Après */}
                      {!isPhotoInactive(pair.apres) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "Voulez-vous vraiment désactiver cette photo ?",
                              )
                            ) {
                              handleDeactivate(pair.apres!.id);
                            }
                          }}
                          style={{
                            position: "absolute",
                            bottom: "12px",
                            right: "12px",
                            backgroundColor: "#ef4444",
                            border: "none",
                            borderRadius: "50%",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            transition: "all 0.2s",
                          }}
                          title="Désactiver la photo"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.backgroundColor = "#dc2626";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.backgroundColor = "#ef4444";
                          }}
                        >
                          <Ionicons
                            name="eye-off-outline"
                            size={18}
                            color={COLORS.white}
                          />
                        </button>
                      )}

                      {/* Inactive Badge for Photo Après */}
                      {isPhotoInactive(pair.apres) && (
                        <View
                          style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            backgroundColor: "#6b7280",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                          }}
                        >
                          <Text style={styles.pairBadgeText}>Inactive</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </div>
                ) : (
                  <View style={styles.pairCardPlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={48}
                      color={COLORS.gray}
                    />
                    <Text style={styles.placeholderText}>
                      Aucune photo après
                    </Text>
                  </View>
                )}
              </DropZone>
            </View>
          ))}

          {/* Show orphaned photoApres if any */}
          {orphanedApres.length > 0 && (
            <View style={styles.orphanedSection}>
              <Text style={styles.orphanedTitle}>
                Photos après sans correspondance
              </Text>
              {orphanedApres.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    cursor: isPhotoInactive(photo) ? "not-allowed" : "pointer",
                    opacity: isPhotoInactive(photo) ? 0.5 : 1,
                    filter: isPhotoInactive(photo) ? "grayscale(100%)" : "none",
                  }}
                >
                  <TouchableOpacity
                    style={styles.photoCard}
                    onPress={() => setPreviewPhoto(photo)}
                    disabled={isPhotoInactive(photo)}
                  >
                    {photo.url && (
                      <Image
                        source={{ uri: `${API_CONFIG.BASE_URL}${photo.url}` }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoTitle} numberOfLines={2}>
                        {photo.title || "Sans titre"}
                      </Text>
                      <Text style={styles.photoDate}>
                        {new Date(photo.created_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </Text>
                    </View>

                    {/* Deactivate Button for Orphaned Photo */}
                    {!isPhotoInactive(photo) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              "Voulez-vous vraiment désactiver cette photo ?",
                            )
                          ) {
                            handleDeactivate(photo.id);
                          }
                        }}
                        style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "12px",
                          backgroundColor: "#ef4444",
                          border: "none",
                          borderRadius: "50%",
                          width: "36px",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                          transition: "all 0.2s",
                        }}
                        title="Désactiver la photo"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.1)";
                          e.currentTarget.style.backgroundColor = "#dc2626";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.backgroundColor = "#ef4444";
                        }}
                      >
                        <Ionicons
                          name="eye-off-outline"
                          size={18}
                          color={COLORS.white}
                        />
                      </button>
                    )}

                    {/* Inactive Badge for Orphaned Photo */}
                    {isPhotoInactive(photo) && (
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          backgroundColor: "#6b7280",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                        }}
                      >
                        <Text style={styles.pairBadgeText}>Inactive</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </div>
              ))}
            </View>
          )}

          {/* Empty state */}
          {photoPairs.length === 0 && (
            <View style={styles.emptyStateInner}>
              <Ionicons name="images-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyStateText}>Aucune photo associée</Text>
              <Text style={styles.emptyStateSubtext}>
                Ce dossier n'a pas encore de photos avant/après
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <ImagePreviewModal
        visible={!!previewPhoto}
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />

      <PhotoAvantSelectionModal
        visible={showPhotoAvantModal}
        photoAvants={photoAvants}
        onSelect={handlePhotoAvantSelect}
        onClose={() => {
          setShowPhotoAvantModal(false);
          setPendingPhotoId(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 24,
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  photoCount: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoCountText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as any,
  headerError: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: "#ef4444",
    marginTop: 4,
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  } as any,
  pdfButtonDisabled: {
    opacity: 0.6,
  },
  pdfButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  } as any,
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.primary,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
  } as any,
  photoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  photoImage: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.gray2,
  },
  photoOverlay: {
    padding: 12,
    backgroundColor: COLORS.white,
  },
  photoTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  photoDate: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: COLORS.lightWhite,
  },
  emptyTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.xLarge,
    color: COLORS.tertiary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    textAlign: "center",
  },
  emptyStateInner: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  } as any,
  emptyStateText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.gray,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
    textAlign: "center",
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  } as any,
  pairCard: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  pairImage: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.gray2,
  },
  pairOverlay: {
    padding: 12,
    backgroundColor: COLORS.white,
  },
  pairBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  } as any,
  pairBadgeGreen: {
    backgroundColor: "#10b981",
  },
  pairBadgeText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small - 2,
    color: COLORS.white,
  },
  pairTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  pairDate: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  pairSeparator: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pairCardPlaceholder: {
    flex: 1,
    height: 200,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.gray2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  } as any,
  placeholderText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  orphanedSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: COLORS.gray2,
  },
  orphanedTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.tertiary,
    marginBottom: 16,
  },
});
