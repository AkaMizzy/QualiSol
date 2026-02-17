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
    getMyGeds,
    updateGed,
    updateGedFile,
} from "@/services/gedService";
import {
    createOfflineRecord,
    deleteOfflineRecord,
    getOfflineRecords,
} from "@/services/offlineStorageService";
import { startSyncMonitoring } from "@/services/syncService";
import { getUsers } from "@/services/userService";
import { OfflineRecord } from "@/types/offlineTypes";
import { CompanyUser } from "@/types/user";
import { isVideoFile } from "@/utils/mediaUtils";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
import UserSelectionModal from "../UserSelectionModal";
import BulkAddImageModal from "./BulkAddImageModal";

const IMAGES_PER_PAGE = 2;

interface SharedGalerieScreenProps {
  creationMode: "upload" | "capture";
  customButtonIcon?: any;
  allowOffline?: boolean; // Default: false - controls offline storage/sync functionality
  useBulkModal?: boolean; // Default: false - use BulkAddImageModal instead of AddImageModal
  fetchData?: (token: string) => Promise<Ged[]>; // Optional custom fetch function
  enableAssignment?: boolean;
}

export default function SharedGalerieScreen({
  creationMode,
  customButtonIcon,
  allowOffline = false,
  useBulkModal = false,
  fetchData,
  enableAssignment = false,
}: SharedGalerieScreenProps) {
  const { token, user } = useAuth();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
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

  // Assignment state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [itemToAssign, setItemToAssign] = useState<Ged | null>(null);

  const isTablet = width >= 768;

  const fetchGeds = useCallback(async () => {
    if (token) {
      try {
        setLoading(true);
        // Use custom fetchData if provided, otherwise default to getMyGeds
        const fetchedGeds = fetchData
          ? await fetchData(token)
          : await getMyGeds(token);
        setGeds(fetchedGeds);
      } catch (error) {
        console.error("Failed to fetch geds:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [token, fetchData]);

  const fetchOfflineRecords = useCallback(async () => {
    if (!allowOffline) return; // Skip if offline mode disabled
    try {
      const records = await getOfflineRecords();
      setOfflineRecords(records);
    } catch (error) {
      console.error("Failed to fetch offline records:", error);
    }
  }, [allowOffline]);

  const fetchUsers = useCallback(async () => {
    if (token) {
      try {
        const users = await getUsers();
        setCompanyUsers(users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    }
  }, [token]);

  const checkNetworkStatus = useCallback(async () => {
    if (!allowOffline) {
      setNetworkStatus("online"); // Always assume online when offline mode disabled
      return;
    }
    const connectivity = await getConnectivity();
    setNetworkStatus(connectivity.status);
  }, [allowOffline]);

  useEffect(() => {
    fetchGeds();
    fetchOfflineRecords();
    checkNetworkStatus();
  }, [fetchGeds, fetchOfflineRecords, checkNetworkStatus]);

  // Start sync monitoring when token is available
  useEffect(() => {
    if (!token) return;
    if (!allowOffline) return; // Skip sync monitoring if offline mode disabled

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
  }, [token, allowOffline, fetchGeds, fetchOfflineRecords]);

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
    if (enableAssignment) {
      void fetchUsers();
    }
    setRefreshing(false);
  }, [
    fetchGeds,
    fetchOfflineRecords,
    checkNetworkStatus,
    enableAssignment,
    fetchUsers,
  ]);

  // Initial fetch for users
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    skipRefresh?: boolean,
  ) => {
    if (!token || !user || !data.image) return;

    // Check network status
    const connectivity = await getConnectivity();
    const isOnline = connectivity.status === "online";

    // If offline mode disabled and we're offline, show error and return
    if (!allowOffline && !isOnline) {
      Alert.alert(
        "Connexion requise",
        "Cette fonctionnalité nécessite une connexion Internet. Veuillez vous connecter et réessayer.",
        [{ text: "OK" }],
      );
      return;
    }

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
          audioFile: data.voiceNote // NEW - pass audio directly
            ? {
                uri: data.voiceNote.uri,
                type: data.voiceNote.type,
                name: data.voiceNote.name,
              }
            : undefined,
          audiotxt: data.audiotxt,
          iatxt: data.iatxt,
          mode: data.mode,
          answer: undefined,
        });

        // Refresh the gallery ONLY if not skipped (e.g. for bulk uploads, only refresh on last item)
        if (!skipRefresh) {
          setCurrentPage(0);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          await fetchGeds();
        }
      } else if (allowOffline) {
        // OFFLINE: Save to SQLite (only if allowed)
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
        if (!skipRefresh) {
          setCurrentPage(0);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          await fetchOfflineRecords();
        }
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

  const handleOpenAssignModal = () => {
    if (selectedItem) {
      setItemToAssign(selectedItem);
      setAssignModalVisible(true);
    }
  };

  const handleAssignUser = async (user: CompanyUser) => {
    if (!token || !itemToAssign) return;

    try {
      // Optimistic update
      const updatedGed: Ged = { ...itemToAssign, assigned: user.id };
      setGeds((prevGeds) =>
        prevGeds.map((g) => (g.id === itemToAssign.id ? updatedGed : g)),
      );
      setSelectedItem(updatedGed); // Update preview

      // API Call
      await updateGed(token, itemToAssign.id, { assigned: user.id });

      setAssignModalVisible(false);
      setItemToAssign(null);
    } catch (error) {
      console.error("Failed to assign user:", error);
      Alert.alert("Erreur", "Impossible d'assigner l'utilisateur.");
      // Revert optimistic update could be done here if needed
    }
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

  // Voice notes are now stored in urlvoice field - no need for separate lookup

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

      {/* Network status indicator - only show when offline AND allowOffline enabled */}
      {allowOffline && networkStatus === "offline" && (
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: SIZES.medium,
            paddingVertical: SIZES.small,
          }}
        >
          <View style={styles.networkBadge}>
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={COLORS.white}
            />
            <Text style={styles.networkText}>Hors ligne</Text>
          </View>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.skeletonContainer}>
          {[...Array(2)].map((_, index) => (
            <View key={index} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
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
                currentPageImages.map((item: any) => {
                  const authorUser = companyUsers.find(
                    (u) => u.id === item.idauthor,
                  );
                  const displayAuthor = authorUser
                    ? authorUser.identifier
                    : item.author;

                  return (
                    <View key={item.id} style={styles.imageContainer}>
                      <GalerieCard
                        item={{ ...item, author: displayAuthor }}
                        onPress={() => {
                          // Optimistically update local state
                          setGeds((prevGeds) =>
                            prevGeds.map((g) =>
                              g.id === item.id
                                ? { ...g, vue: (g.vue || 0) + 1 }
                                : g,
                            ),
                          );

                          // Use the updated value for the preview
                          handleCardPress({
                            ...item,
                            vue: (item.vue || 0) + 1,
                          });

                          // Increment view count on backend
                          if (token && item.id) {
                            import("@/services/gedService").then(
                              ({ incrementGedView }) => {
                                incrementGedView(
                                  token,
                                  item.id,
                                  item.vue || 0,
                                ).catch((err) =>
                                  console.error("View inc failed", err),
                                );
                              },
                            );
                          }
                        }}
                        hasVoiceNote={!!item.urlvoice}
                        isOffline={item.isOffline}
                        localImagePath={item.localImagePath}
                        syncStatus={item.syncStatus}
                        isVideo={isVideoFile(item.url)}
                        height={250}
                      />
                    </View>
                  );
                })
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
                style={styles.centerAddButton}
                onPress={() => setModalVisible(true)}
              >
                <Image
                  source={customButtonIcon || ICONS.cameraPng}
                  style={styles.centerAddButtonIcon}
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
      {useBulkModal ? (
        <BulkAddImageModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onAdd={handleAddImage}
          modalTitle="Transfert en masse"
          buttonText="Transférer les images"
        />
      ) : (
        <AddImageModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onAdd={handleAddImage}
          openCameraOnShow={true}
          allowedMode={creationMode}
          placeholderText={
            creationMode === "capture"
              ? "Prendre un constat"
              : "Prendre une photo ou vidéo"
          }
          modalTitle={
            creationMode === "capture" ? "Constat" : "Ajouter une image"
          }
          buttonText={
            creationMode === "capture"
              ? "Ajouter nouveau constat"
              : "Ajouter nouvelle image"
          }
        />
      )}
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
          voiceNoteUrl={
            selectedItem?.urlvoice
              ? `${API_CONFIG.BASE_URL}${selectedItem.urlvoice}`
              : undefined
          }
          onAssign={enableAssignment ? handleOpenAssignModal : undefined}
          assignedTo={
            selectedItem.assigned
              ? companyUsers.find((u) => u.id === selectedItem.assigned)
              : undefined
          }
          audiotxt={selectedItem.audiotxt}
          gedVisible={selectedItem.visible}
          wait={selectedItem.wait}
        />
      )}
      <UserSelectionModal
        visible={assignModalVisible}
        onClose={() => setAssignModalVisible(false)}
        onSelect={handleAssignUser}
        users={companyUsers}
      />
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
  // ... removed addButton style
  bottomBar: {
    backgroundColor: COLORS.white,
    paddingTop: SIZES.medium,
    paddingBottom: SIZES.large, // Extra padding for bottom safe area visual
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
    // Lift it up slightly to break the line
    marginTop: -20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 4,
    borderColor: COLORS.white, // White border to separate from bar
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
    fontSize: SIZES.small, // Smaller text for bottom row
    color: COLORS.gray,
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
  // paginationContainer removed

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
