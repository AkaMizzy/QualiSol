import API_CONFIG from "@/app/config/api";
import AppHeader from "@/components/AppHeader";
import AddImageModal from "@/components/galerie/AddImageModal";
import GalerieCard from "@/components/galerie/GalerieCard";
import PictureAnnotator from "@/components/PictureAnnotator";
import PreviewModal from "@/components/PreviewModal";
import { ICONS } from "@/constants/Icons";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getConnectivity } from "@/services/connectivity";
import {
  Ged,
  createGed,
  deleteGed,
  getAllGeds,
  updateGedFile,
} from "@/services/gedService";
import {
  createOfflineRecord,
  deleteOfflineRecord,
  getOfflineRecords,
} from "@/services/offlineStorageService";
import { startSyncMonitoring } from "@/services/syncService";
import { OfflineRecord } from "@/types/offlineTypes";
import { isVideoFile } from "@/utils/mediaUtils";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const IMAGES_PER_PAGE = 4;

interface SharedGalerieScreenProps {
  creationMode: "upload" | "capture";
  customButtonIcon?: any;
}

export default function SharedGalerieScreen({
  creationMode,
  customButtonIcon,
}: SharedGalerieScreenProps) {
  const { token, user } = useAuth();
  const { width } = useWindowDimensions();
  const [geds, setGeds] = useState<Ged[]>([]);
  const [offlineRecords, setOfflineRecords] = useState<OfflineRecord[]>([]);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">(
    "online",
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const [selectedItem, setSelectedItem] = useState<Ged | null>(null);
  const [isAnnotatorVisible, setIsAnnotatorVisible] = useState(false);
  const [annotatorImageUri, setAnnotatorImageUri] = useState<string | null>(
    null,
  );

  const isTablet = width >= 768;

  const fetchGeds = useCallback(async () => {
    if (token) {
      try {
        setLoading(true);
        const fetchedGeds = await getAllGeds(token);
        setGeds(fetchedGeds);
      } catch (error) {
        console.error("Failed to fetch geds:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [token]);

  const fetchOfflineRecords = useCallback(async () => {
    try {
      const records = await getOfflineRecords();
      setOfflineRecords(records);
    } catch (error) {
      console.error("Failed to fetch offline records:", error);
    }
  }, []);

  const checkNetworkStatus = useCallback(async () => {
    const connectivity = await getConnectivity();
    setNetworkStatus(connectivity.status);
  }, []);

  useEffect(() => {
    fetchGeds();
    fetchOfflineRecords();
    checkNetworkStatus();
  }, [fetchGeds, fetchOfflineRecords, checkNetworkStatus]);

  // Start sync monitoring when token is available
  useEffect(() => {
    if (!token) return;

    const stopSyncMonitoring = startSyncMonitoring(token, (result) => {
      console.log(
        `Sync completed: ${result.synced} synced, ${result.failed} failed`,
      );
      // Refresh data after sync
      void fetchGeds();
      void fetchOfflineRecords();
    });

    return () => {
      stopSyncMonitoring();
    };
  }, [token, fetchGeds, fetchOfflineRecords]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad) {
        // Automatically open modal only if it's the right context?
        // The original code opened modal on first load.
        // We can keep this behavior or make it optional.
        // For now, keeping it same as original.
        setModalVisible(true);
        setIsFirstLoad(false);
      }
    }, [isFirstLoad]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchGeds(),
      fetchOfflineRecords(),
      checkNetworkStatus(),
    ]);
    setRefreshing(false);
  }, [fetchGeds, fetchOfflineRecords, checkNetworkStatus]);

  const handleAddImage = async (
    data: {
      title: string;
      chantier?: string;
      description: string;
      image: ImagePicker.ImagePickerAsset | null;
      voiceNote: { uri: string; type: string; name: string } | null;
      author: string;
      idauthor?: string;
      iddevice?: string;
      latitude: number | null;
      longitude: number | null;
      altitude: number | null;
      accuracy: number | null;
      altitudeAccuracy: number | null;
      level: number;
      type: string | null;
      categorie: string | null;
      audiotxt?: string;
      iatxt?: string;
      mode?: "upload" | "capture";
    },
    shouldClose: boolean,
  ) => {
    if (!token || !user || !data.image) return;

    // Check network status
    const connectivity = await getConnectivity();
    const isOnline = connectivity.status === "online";

    try {
      if (isOnline) {
        // ONLINE: Upload directly to backend
        const idsource = "00000000-0000-0000-0000-000000000000";
        const { uri } = data.image;
        const fileName = uri.split("/").pop() || `qualiphoto_${Date.now()}.jpg`;
        const fileType = fileName.split(".").pop() || "jpeg";

        const createdGedResponse = await createGed(token, {
          idsource,
          title: data.title,
          description: data.description,
          kind: "qualiphoto",
          author: data.author,
          idauthor: data.idauthor,
          iddevice: data.iddevice,
          chantier: data.chantier,
          latitude: data.latitude?.toString(),
          longitude: data.longitude?.toString(),
          altitude: data.altitude?.toString(),
          accuracy: data.accuracy?.toString(),
          altitudeAccuracy: data.altitudeAccuracy?.toString(),
          level: data.level,
          type: data.type || undefined,
          categorie: data.categorie || undefined,
          file: {
            uri: uri,
            type:
              data.image.type === "video"
                ? `video/${fileType}`
                : `image/${fileType}`,
            name: fileName,
          },
          audiotxt: data.audiotxt,

          iatxt: data.iatxt,
          mode: data.mode,
        });

        if (data.voiceNote) {
          await createGed(token, {
            idsource: createdGedResponse.data.id,
            title: `${data.title} Voice Note`,
            kind: "voice_note",
            author: data.author,
            idauthor: data.idauthor,
            iddevice: data.iddevice,
            file: data.voiceNote,
          });
        }

        // Refresh the gallery to show the newly uploaded picture
        await fetchGeds();
      } else {
        // OFFLINE: Save to SQLite
        await createOfflineRecord({
          idsource: "00000000-0000-0000-0000-000000 000000",
          title: data.title,
          description: data.description,
          kind: "qualiphoto",
          author: data.author,
          idauthor: data.idauthor,
          iddevice: data.iddevice,
          chantier: data.chantier,
          audiotxt: data.audiotxt,
          iatxt: data.iatxt,
          mode: data.mode,
          latitude: data.latitude?.toString(),
          longitude: data.longitude?.toString(),
          altitude: data.altitude?.toString(),
          accuracy: data.accuracy?.toString(),
          altitudeAccuracy: data.altitudeAccuracy?.toString(),
          level: data.level,
          type: data.type || undefined,
          categorie: data.categorie || undefined,
          imageUri: data.image.uri,
          voiceNoteUri: data.voiceNote?.uri,
        });

        // Refresh offline records
        await fetchOfflineRecords();
      }

      if (shouldClose) {
        setModalVisible(false);
      }
    } catch (error: any) {
      console.error("[Galerie] Failed to save/upload files:", error);
      console.error("[Galerie] Error stack:", error.stack);
      console.error("[Galerie] Error message:", error.message);

      // Handle 403 error specifically for limit reached
      if (
        error?.message?.includes("limit") ||
        error?.message?.includes("Image limit")
      ) {
        Alert.alert(
          "Limite atteinte",
          error?.message || "Vous avez atteint votre limite d'images.",
        );
      } else {
        const errorMsg = error?.message || "Erreur inconnue";
        Alert.alert(
          isOnline ? "Upload Failed" : "Erreur hors ligne",
          isOnline
            ? `Please try again. Error: ${errorMsg}`
            : `Impossible de sauvegarder localement. Erreur: ${errorMsg}`,
        );
      }
    }
  };

  const handleCardPress = (item: Ged) => {
    setSelectedItem(item);
  };

  const closePreview = () => {
    setSelectedItem(null);
  };

  const handleOpenAnnotator = () => {
    if (selectedItem?.url) {
      const fullUrl = `${API_CONFIG.BASE_URL}${selectedItem.url}`;
      setAnnotatorImageUri(fullUrl);
      setIsAnnotatorVisible(true);
    }
  };

  const handleCloseAnnotator = () => {
    setIsAnnotatorVisible(false);
    setAnnotatorImageUri(null);
    setSelectedItem(null);
  };

  const handleSaveAnnotation = async (image: {
    uri: string;
    name: string;
    type: string;
  }) => {
    if (!token || !selectedItem) {
      Alert.alert("Erreur", "Impossible de sauvegarder, session invalide.");
      return;
    }
    try {
      const updatedGed = await updateGedFile(token, selectedItem.id, image);
      setGeds((prevGeds) =>
        prevGeds.map((ged) => (ged.id === updatedGed.id ? updatedGed : ged)),
      );
      handleCloseAnnotator();
    } catch (error) {
      console.error("Failed to save annotation:", error);
      Alert.alert("Erreur", "Échec de l'enregistrement de l'annotation.");
    }
  };

  // Merge online GEDs and offline records
  const allImages = useMemo(() => {
    const onlineImages = geds
      .filter((g) => g.kind === "qualiphoto")
      .map((g) => ({
        ...g,
        isOffline: false,
        localImagePath: undefined,
        syncStatus: undefined,
      }));

    const offlineImages = offlineRecords.map((r) => ({
      ...r,
      id: r.id,
      url: null,
      size: null,
      status_id: "",
      company_id: "",
      position: null,
      level: undefined,
      isOffline: true,
      localImagePath: r.local_image_path,
      syncStatus: r.sync_status,
    })) as any[];

    return [...onlineImages, ...offlineImages].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [geds, offlineRecords]);

  const totalPages = Math.ceil(allImages.length / IMAGES_PER_PAGE);

  const handleDeleteGed = async () => {
    if (!selectedItem || !token) return;

    Alert.alert(
      "Supprimer",
      "Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const item = selectedItem as any; // Cast to access isOffline
              if (item.isOffline && item.id) {
                // Offline deletion
                await deleteOfflineRecord(item.id);
              } else if (item.id) {
                // Online deletion
                await deleteGed(token, item.id);
              }

              setModalVisible(false); // Close preview
              closePreview(); // Also close preview modal state
              await onRefresh(); // Refresh list
              Alert.alert("Succès", "Élément supprimé avec succès");
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Erreur", "Impossible de supprimer l'élément");
            }
          },
        },
      ],
    );
  };

  const paginatedData = useMemo(() => {
    const pages = [];
    for (let i = 0; i < allImages.length; i += IMAGES_PER_PAGE) {
      pages.push(allImages.slice(i, i + IMAGES_PER_PAGE));
    }
    return pages;
  }, [allImages]);

  const currentPageImages = useMemo(() => {
    return paginatedData[currentPage] || [];
  }, [paginatedData, currentPage]);

  const voiceNotesBySource = useMemo(() => {
    return geds.reduce(
      (acc, curr) => {
        if (curr.kind === "voice_note") {
          acc[curr.idsource] = true;
        }
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }, [geds]);

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
      <View style={styles.filterContainer}>
        {/* Network status indicator - only show when offline */}
        {networkStatus === "offline" && (
          <View style={styles.networkBadge}>
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={COLORS.white}
            />
            <Text style={styles.networkText}>Hors ligne</Text>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.skeletonContainer}>
          {[...Array(2)].map((_, index) => (
            <View key={index} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <ScrollView
          style={styles.galleryContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.contentContainer}>
            {currentPageImages.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>
                  Pas d&apos;images trouvées.
                </Text>
              </View>
            ) : (
              currentPageImages.map((item: any) => (
                <View key={item.id} style={styles.imageContainer}>
                  <GalerieCard
                    item={item}
                    onPress={() => handleCardPress(item)}
                    hasVoiceNote={voiceNotesBySource[item.idsource]}
                    isOffline={item.isOffline}
                    localImagePath={item.localImagePath}
                    syncStatus={item.syncStatus}
                    isVideo={isVideoFile(item.url)}
                  />
                </View>
              ))
            )}
          </View>

          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  currentPage === 0 && styles.pageButtonDisabled,
                ]}
                onPress={handlePrevPage}
                disabled={currentPage === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={currentPage === 0 ? COLORS.gray : COLORS.primary}
                />
              </TouchableOpacity>

              <View style={styles.pageIndicator}>
                <Text style={styles.pageText}>
                  {currentPage + 1} / {totalPages}
                </Text>
                <View style={styles.dotsContainer}>
                  {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                    let dotIndex = index;
                    if (totalPages > 5) {
                      if (currentPage < 3) {
                        dotIndex = index;
                      } else if (currentPage >= totalPages - 3) {
                        dotIndex = totalPages - 5 + index;
                      } else {
                        dotIndex = currentPage - 2 + index;
                      }
                    }
                    return (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          dotIndex === currentPage && styles.activeDot,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  currentPage === totalPages - 1 && styles.pageButtonDisabled,
                ]}
                onPress={handleNextPage}
                disabled={currentPage === totalPages - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={
                    currentPage === totalPages - 1
                      ? COLORS.gray
                      : COLORS.primary
                  }
                />
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 70 }} />
        </ScrollView>
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Image
          source={customButtonIcon || ICONS.cameraPng}
          style={{ width: 32, height: 32 }}
        />
      </TouchableOpacity>
      <AddImageModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddImage}
        openCameraOnShow={true}
        allowedMode={creationMode}
      />
      {selectedItem && (
        <PreviewModal
          visible={!!selectedItem && !isAnnotatorVisible}
          onClose={closePreview}
          mediaUrl={`${API_CONFIG.BASE_URL}${selectedItem.url}`}
          mediaType={
            isVideoFile(selectedItem.url)
              ? "video"
              : selectedItem.kind === "qualiphoto"
                ? "image"
                : "file"
          }
          title={selectedItem.title}
          onAnnotate={handleOpenAnnotator}
          onDelete={
            // Only allow delete if user is author or super admin (logic could be refined)
            // For now, allow delete for everyone on their own device context or simple authorized check
            // assuming backend handles auth checks too.
            handleDeleteGed
          }
          description={selectedItem.description}
          author={selectedItem.author}
          createdAt={selectedItem.created_at}
          type={selectedItem.type}
          categorie={selectedItem.categorie}
          chantier={selectedItem.chantier}
          latitude={selectedItem.latitude}
          longitude={selectedItem.longitude}
          level={selectedItem.level}
          voiceNoteUrl={(() => {
            const voiceNote = geds.find(
              (g) => g.kind === "voice_note" && g.idsource === selectedItem.id,
            );
            return voiceNote?.url
              ? `${API_CONFIG.BASE_URL}${voiceNote.url}`
              : undefined;
          })()}
        />
      )}
      <Modal visible={isAnnotatorVisible} animationType="slide">
        {annotatorImageUri && (
          <PictureAnnotator
            baseImageUri={annotatorImageUri}
            onClose={handleCloseAnnotator}
            onSaved={handleSaveAnnotation}
            title={`Annoter: ${selectedItem?.title || "Photo"}`}
          />
        )}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  addButton: {
    position: "absolute",
    bottom: 30, // Lower it slightly to be more accessible
    right: 20, // Move slightly closer to edge
    width: 64, // Slightly larger
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 999, // Ensure it stays on top
  },
  emptyText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightWhite,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightWhite,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small + 2,
    borderRadius: SIZES.large,
    marginRight: SIZES.medium,
  },
  datePickerText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginLeft: SIZES.small,
  },
  datePickerTextActive: {
    color: COLORS.primary,
    fontFamily: FONT.bold,
  },
  showAllButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small + 2,
    borderRadius: SIZES.large,
  },
  showAllButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
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
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightWhite,
  },
  pageButton: {
    padding: SIZES.small,
    borderRadius: SIZES.small,
    backgroundColor: COLORS.lightWhite,
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageIndicator: {
    alignItems: "center",
  },
  pageText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
    marginBottom: SIZES.small,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray2,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.large,
    marginRight: SIZES.small,
    backgroundColor: "#ef4444",
  },
  networkText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.white,
    marginLeft: 4,
  },
});
