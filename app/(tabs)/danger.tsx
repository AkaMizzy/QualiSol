import AppHeader from "@/components/AppHeader";
import { AssignedGedView } from "@/components/danger/AssignedGedView";
import GalerieCard from "@/components/galerie/GalerieCard";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Folder } from "@/services/folderService";
import { Ged, getAssignedGeds } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ITEMS_PER_PAGE = 2;

function formatDateForGrid(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const compliantDateStr = dateStr.includes("T")
      ? dateStr
      : dateStr.replace(" ", "T");
    return new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(compliantDateStr));
  } catch {
    return "";
  }
}

export default function DangerScreen() {
  const { user, token } = useAuth();
  const [assignedGeds, setAssignedGeds] = useState<Ged[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGed, setSelectedGed] = useState<Ged | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const fetchAssignedGeds = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Use the new endpoint to get all assigned GEDs
      const items = await getAssignedGeds(token);

      // Filter for pictures/visual content only
      const visualItems = items.filter(
        (item) =>
          ["qualiphoto", "photoavant", "photoapres"].includes(item.kind) ||
          (item.url &&
            (item.url.endsWith(".jpg") ||
              item.url.endsWith(".jpeg") ||
              item.url.endsWith(".png"))),
      );

      // Sort by creation date, latest first
      const sortedItems = visualItems.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setAssignedGeds(sortedItems);
    } catch (e) {
      console.error("Failed to load assigned GEDs", e);
      setErrorMessage("Échec du chargement. Tirez pour réessayer.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      await fetchAssignedGeds();
    } finally {
      setIsRefreshing(false);
    }
  }, [token, fetchAssignedGeds]);

  useEffect(() => {
    if (token) {
      fetchAssignedGeds();
    }
  }, [token, fetchAssignedGeds]);

  const handleAvantPhotoUpdate = (updatedPhoto: Ged) => {
    setSelectedGed(updatedPhoto);
    setAssignedGeds((prev) =>
      prev.map((item) => (item.id === updatedPhoto.id ? updatedPhoto : item)),
    );
  };

  // Pagination logic
  const totalPages = Math.ceil(assignedGeds.length / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const pages = [];
    for (let i = 0; i < assignedGeds.length; i += ITEMS_PER_PAGE) {
      pages.push(assignedGeds.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [assignedGeds]);

  const currentPageImages = useMemo(() => {
    return paginatedData[currentPage] || [];
  }, [paginatedData, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />

      {isLoading && !isRefreshing ? (
        <View style={styles.skeletonContainer}>
          {[...Array(2)].map((_, index) => (
            <View key={index} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.galleryContainer}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
            }
          >
            <View style={styles.contentContainer}>
              {currentPageImages.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={64}
                    color="#10b981"
                  />
                  <Text style={styles.emptyTitle}>
                    {errorMessage
                      ? "Impossible de charger"
                      : "Aucune situation assignée"}
                  </Text>
                  {errorMessage ? (
                    <Text style={styles.emptySubtitle}>{errorMessage}</Text>
                  ) : (
                    <Text style={styles.emptySubtitle}>
                      Vous n&apos;avez aucune situation qui vous a été assignée
                      pour le moment.
                    </Text>
                  )}
                </View>
              ) : (
                currentPageImages.map((item: Ged) => (
                  <View key={item.id} style={styles.imageContainer}>
                    <GalerieCard
                      item={item}
                      onPress={() => {
                        setSelectedGed(item);
                        setDetailVisible(true);
                      }}
                      hasVoiceNote={!!item.urlvoice}
                    />
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 150 }} />
          </ScrollView>

          <View style={styles.bottomBar}>
            <View style={styles.navigationControls}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentPage === 0 && styles.navButtonHidden,
                ]}
                onPress={handlePrevPage}
                disabled={currentPage === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentPage >= totalPages - 1 && styles.navButtonHidden,
                ]}
                onPress={handleNextPage}
                disabled={currentPage >= totalPages - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={28}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {totalPages > 1 && (
              <View style={styles.pageInfoContainer}>
                <Text style={styles.pageText}>
                  Page {currentPage + 1} / {totalPages}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <Modal
        visible={detailVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          {selectedGed && (
            <AssignedGedView
              item={selectedGed}
              parentFolder={{} as Folder}
              onClose={() => {
                setDetailVisible(false);
                setSelectedGed(null);
                fetchAssignedGeds();
              }}
              subtitle={`Assigné à vous • ${formatDateForGrid(selectedGed.created_at)}`}
              projectTitle=""
              zoneTitle=""
              onAvantPhotoUpdate={handleAvantPhotoUpdate}
              readOnly={true}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  galleryContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SIZES.medium,
    paddingTop: SIZES.medium,
  },
  imageContainer: {
    marginBottom: SIZES.medium,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 300,
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    paddingTop: SIZES.medium,
    paddingBottom: SIZES.large,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightWhite,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.large,
    marginBottom: SIZES.small,
  },
  navButton: {
    padding: SIZES.small,
    borderRadius: 50,
    backgroundColor: COLORS.lightWhite,
  },
  navButtonHidden: {
    opacity: 0,
  },
  centerAddButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  centerAddButtonIcon: {
    width: 32,
    height: 32,
  },
  pageInfoContainer: {
    alignItems: "center",
  },
  pageText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: SIZES.medium,
    marginTop: SIZES.medium,
  },
  skeletonCard: {
    height: 200,
    backgroundColor: "#E0E0E0",
    borderRadius: SIZES.medium,
    marginBottom: SIZES.medium,
  },
});
