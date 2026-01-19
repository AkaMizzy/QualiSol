import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Ged, getAssociatedPhotosByFolder } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImagePreviewModal from "./ImagePreviewModal";

interface WebAssociatedPhotosSectionProps {
  selectedFolderId: string | null;
  folderTitle?: string;
}

export default function WebAssociatedPhotosSection({
  selectedFolderId,
  folderTitle,
}: WebAssociatedPhotosSectionProps) {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<Ged[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Ged | null>(null);

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

  // Group photos by type
  const photoAvants = photos.filter((p) => p.kind === "photoavant");
  const photoApres = photos.filter((p) => p.kind === "photoapres");

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
            <Text style={styles.headerTitle}>🖼️ Photos Associées</Text>
            {folderTitle && (
              <Text style={styles.headerSubtitle}>Dossier: {folderTitle}</Text>
            )}
          </View>
          <View style={styles.photoCount}>
            <Text style={styles.photoCountText}>
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Situation Avant Section */}
          {photoAvants.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.sectionTitle}>Situation Avant</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{photoAvants.length}</Text>
                </View>
              </View>

              <View style={styles.photoGrid}>
                {photoAvants.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={styles.photoCard}
                    onPress={() => setPreviewPhoto(photo)}
                  >
                    {photo.url && (
                      <Image
                        source={{ uri: photo.url }}
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
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Situation Après Section */}
          {photoApres.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#10b981"
                />
                <Text style={[styles.sectionTitle, { color: "#10b981" }]}>
                  Situation Après
                </Text>
                <View style={[styles.badge, { backgroundColor: "#10b981" }]}>
                  <Text style={styles.badgeText}>{photoApres.length}</Text>
                </View>
              </View>

              <View style={styles.photoGrid}>
                {photoApres.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={styles.photoCard}
                    onPress={() => setPreviewPhoto(photo)}
                  >
                    {photo.url && (
                      <Image
                        source={{ uri: photo.url }}
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
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {photos.length === 0 && (
            <View style={styles.emptyStateInner}>
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={COLORS.gray}
              />
              <Text style={styles.emptyStateText}>
                Aucune photo associée à ce dossier
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Glissez-déposez des qualiphotos pour les assigner
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
});
