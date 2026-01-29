import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";

import API_CONFIG from "@/app/config/api";
import { ICONS } from "@/constants/Icons";
import { useAuth } from "@/contexts/AuthContext";
import folderService, { Folder } from "@/services/folderService";
import { Ged, getGedsBySource } from "@/services/gedService";
import { getAllStatuses, Status } from "@/services/statusService";
import { isVideoFile } from "@/utils/mediaUtils";
import { ResizeMode, Video } from "expo-av";
import CustomAlert from "../CustomAlert";
import QualiPhotoEditModal from "./QualiPhotoEditModal";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDate(dateStr: string) {
  const replaced = dateStr.replace(" ", "T");
  const date = new Date(replaced);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type ParentQualiPhotoViewProps = {
  item: Folder;
  onClose: () => void;
  subtitle: string;
  handleGeneratePdf: () => void;
  isGeneratingPdf: boolean;
  childGeds: Ged[];
  onChildPress: (ged: Ged) => void;
  playSound: () => void;
  isPlaying: boolean;
  handleMapPress: () => void;
  layoutMode: "grid" | "list";
  setLayoutMode: (mode: "grid" | "list") => void;
  setChildModalVisible: (visible: boolean) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  isLoadingChildren: boolean;
  setItem: (item: Folder) => void;
  onItemUpdate: (item: Partial<Folder>) => void;
  projectTitle: string;
  zoneTitle: string;
  companyTitle?: string;
  childrenWithAfterPhotos: Set<string>;
};

export const ParentQualiPhotoView: React.FC<ParentQualiPhotoViewProps> = ({
  item,
  onClose,
  subtitle,
  handleGeneratePdf,
  isGeneratingPdf,
  childGeds,
  onChildPress,
  playSound,
  isPlaying,
  handleMapPress,
  layoutMode,
  setLayoutMode,
  setChildModalVisible,
  sortOrder,
  setSortOrder,
  isLoadingChildren,
  setItem,
  onItemUpdate,
  projectTitle,
  zoneTitle,
  companyTitle,
  childrenWithAfterPhotos,
}) => {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [statuses, setStatuses] = React.useState<Status[]>([]);
  const [currentStatus, setCurrentStatus] = React.useState<Status | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [alertInfo, setAlertInfo] = React.useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  // Map to store apres photos for each avant photo (child ged)
  const [apresPhotosMap, setApresPhotosMap] = React.useState<
    Map<string, Ged[]>
  >(new Map());
  const [isLoadingApresPhotos, setIsLoadingApresPhotos] = React.useState(false);

  const isTablet = width >= 768;

  React.useEffect(() => {
    async function fetchStatuses() {
      if (!token) return;
      try {
        const fetchedStatuses = await getAllStatuses(token);
        setStatuses(fetchedStatuses);
        const initialStatus = fetchedStatuses.find(
          (s) => s.id === item.status_id,
        );
        setCurrentStatus(initialStatus || null);
      } catch (error) {
        console.error("Failed to fetch statuses:", error);
      }
    }

    fetchStatuses();
  }, [token, item.status_id]);

  // Fetch apres photos for grid mode on tablets
  React.useEffect(() => {
    async function fetchApresPhotos() {
      if (!token || layoutMode !== "grid" || childGeds.length === 0) {
        return;
      }

      setIsLoadingApresPhotos(true);
      try {
        const apresMap = new Map<string, Ged[]>();

        // Fetch apres photos for each child ged that has them
        await Promise.all(
          childGeds.map(async (childGed) => {
            if (childrenWithAfterPhotos.has(childGed.id)) {
              try {
                const apresPhotos = await getGedsBySource(
                  token,
                  childGed.id,
                  "photoapres",
                );
                if (apresPhotos.length > 0) {
                  apresMap.set(childGed.id, apresPhotos);
                }
              } catch (error) {
                console.error(
                  `Failed to fetch apres photos for ${childGed.id}:`,
                  error,
                );
              }
            }
          }),
        );

        setApresPhotosMap(apresMap);
      } catch (error) {
        console.error("Failed to fetch apres photos:", error);
      } finally {
        setIsLoadingApresPhotos(false);
      }
    }

    fetchApresPhotos();
  }, [token, layoutMode, isTablet, childGeds, childrenWithAfterPhotos]);

  const handleValidate = async () => {
    const activeStatus = statuses.find((s) => s.status === "Active");
    if (!token || !item?.id || !activeStatus) {
      setAlertInfo({
        visible: true,
        type: "error",
        title: "Erreur",
        message:
          'Impossible de valider, statut "Active" non trouvé ou session invalide.',
      });
      return;
    }

    if (childGeds.length !== childrenWithAfterPhotos.size) {
      setAlertInfo({
        visible: true,
        type: "error",
        title: "Validation impossible",
        message:
          'Toutes les photos "avant" doivent avoir une photo "après" correspondante pour valider.',
      });
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await folderService.updateFolder(
        item.id,
        { status_id: activeStatus.id },
        token,
      );
      setCurrentStatus(activeStatus);
      setAlertInfo({
        visible: true,
        type: "success",
        title: "Succès",
        message: "Le dossier a été validé.",
      });
    } catch (error) {
      console.error("Failed to validate folder status:", error);
      setAlertInfo({
        visible: true,
        type: "error",
        title: "Erreur",
        message: "Échec de la validation du dossier.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isValidated = currentStatus?.status === "Active";
  const canValidate =
    childGeds.length > 0 && childGeds.length === childrenWithAfterPhotos.size;

  const handleSharePhoto = async (ged: Ged) => {
    try {
      const imageUrl = `${API_CONFIG.BASE_URL}${ged.url}`;

      // Build rich metadata message
      const parts = [];
      parts.push(`📸 ${ged.title}`);
      parts.push("");

      if (companyTitle) {
        parts.push(`🏢 Entreprise: ${companyTitle}`);
      }

      if (projectTitle) {
        parts.push(`🏗️ Projet: ${projectTitle}`);
      }

      if (zoneTitle) {
        parts.push(`📍 Zone: ${zoneTitle}`);
      }

      if (ged.author) {
        parts.push(`👤 Auteur: ${ged.author}`);
      }

      parts.push("");
      parts.push(`🔗 ${imageUrl}`);
      parts.push("");
      parts.push("━━━━━━━━━━━");
      parts.push("📱 Qualisol | Muntadaacom");

      const message = parts.join("\n");

      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error("Error sharing photo:", error);
    }
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer les détails"
        onPress={onClose}
        style={styles.closeBtn}
      >
        <Ionicons name="arrow-back" size={28} color="#f87b1b" />
      </Pressable>
      <View style={styles.headerTitles}>
        {!!item?.title && (
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
        )}
        {!!item && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.headerActionsContainer}>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => setChildModalVisible(true)}
          accessibilityLabel="Ajouter une photo avant"
        >
          <Image source={ICONS.cameraPng} style={styles.headerActionIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => setIsEditModalVisible(true)}
          accessibilityLabel="Éditer"
        >
          <Image source={ICONS.edit} style={styles.headerActionIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
  return (
    <>
      {header}

      <ScrollView bounces>
        <View style={[styles.content, { paddingTop: 20 }]}>
          <>
            <View style={styles.childPicturesContainer}>
              <View
                style={[
                  styles.childListHeader,
                  childGeds.length === 0 && { justifyContent: "center" },
                ]}
              >
                {childGeds.length > 0 && (
                  <View style={styles.layoutToggleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.layoutToggleButton,
                        layoutMode === "list" &&
                          styles.layoutToggleButtonActive,
                      ]}
                      onPress={() => setLayoutMode("list")}
                    >
                      <Ionicons
                        name="list"
                        size={20}
                        color={layoutMode === "list" ? "#FFFFFF" : "#11224e"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.layoutToggleButton,
                        layoutMode === "grid" &&
                          styles.layoutToggleButtonActive,
                      ]}
                      onPress={() => setLayoutMode("grid")}
                    >
                      <Ionicons
                        name="grid"
                        size={20}
                        color={layoutMode === "grid" ? "#FFFFFF" : "#11224e"}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                {childGeds.length === 0 && <View style={{ height: 40 }} />}
                {childGeds.length > 0 && (
                  <TouchableOpacity
                    style={styles.sortButton}
                    onPress={() =>
                      setSortOrder((current) =>
                        current === "asc" ? "desc" : "asc",
                      )
                    }
                    accessibilityLabel={
                      sortOrder === "desc"
                        ? "Trier par ordre croissant"
                        : "Trier par ordre décroissant"
                    }
                  >
                    <Ionicons
                      name={sortOrder === "desc" ? "arrow-down" : "arrow-up"}
                      size={24}
                      color="#f87b1b"
                    />
                  </TouchableOpacity>
                )}
              </View>
              {isLoadingChildren && <Text>Chargement...</Text>}
              {!isLoadingChildren && childGeds.length === 0 && (
                <Text style={styles.noChildrenText}>
                  Aucune photo suivie n&apos;a encore été ajoutée.
                </Text>
              )}
              <View
                style={
                  (layoutMode === "list" && isTablet) || layoutMode === "grid"
                    ? styles.childGridContainer
                    : styles.childListContainer
                }
              >
                {layoutMode === "grid" ? (
                  // Grid mode: Display avant and apres side by side with headers
                  <View style={styles.gridPairContainer}>
                    {/* Section Headers */}
                    <View style={styles.gridHeaderRow}>
                      <Text style={styles.gridSectionHeader}>
                        Situation Avant
                      </Text>
                      <Text style={styles.gridSectionHeader}>
                        Situation Après
                      </Text>
                    </View>

                    {/* Cards */}
                    {childGeds.map((ged) => {
                      const hasAfterPhoto = childrenWithAfterPhotos.has(ged.id);
                      const borderColor = hasAfterPhoto ? "#10b981" : "#EE4B2B";
                      const apresPhotos = apresPhotosMap.get(ged.id);

                      return (
                        <View key={ged.id} style={styles.gridPairRow}>
                          {/* Left: Situation Avant Card */}
                          <TouchableOpacity
                            style={[
                              styles.gridCard,
                              { borderColor, borderWidth: 2.5 },
                            ]}
                            onPress={() => onChildPress(ged)}
                          >
                            {ged.url ? (
                              isVideoFile(ged.url) ? (
                                <View style={styles.thumbnailContainer}>
                                  <Video
                                    source={{
                                      uri: `${API_CONFIG.BASE_URL}${ged.url}`,
                                    }}
                                    style={styles.childThumbnail}
                                    resizeMode={ResizeMode.COVER}
                                    shouldPlay={false}
                                    isMuted={true}
                                  />
                                  <View style={styles.playIconOverlay}>
                                    <Ionicons
                                      name="play-circle"
                                      size={32}
                                      color="rgba(255, 255, 255, 0.9)"
                                    />
                                  </View>
                                </View>
                              ) : (
                                <Image
                                  source={{
                                    uri: `${API_CONFIG.BASE_URL}${ged.url}`,
                                  }}
                                  style={styles.childThumbnail}
                                />
                              )
                            ) : (
                              <View
                                style={[
                                  styles.childThumbnail,
                                  { backgroundColor: "#e5e7eb" },
                                ]}
                              />
                            )}
                            <View style={styles.childGridOverlay}>
                              <Text
                                style={styles.childGridTitle}
                                numberOfLines={1}
                              >
                                {ged.title}
                              </Text>
                              {ged.created_at && (
                                <Text style={styles.childGridDate}>
                                  {formatDate(ged.created_at)}
                                </Text>
                              )}
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleSharePhoto(ged);
                                }}
                                style={styles.shareButton}
                                accessibilityLabel="Partager cette photo"
                              >
                                <Ionicons
                                  name="share-social-outline"
                                  size={18}
                                  color="#f87b1b"
                                />
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>

                          {/* Right: Situation Apres Card */}
                          {apresPhotos && apresPhotos.length > 0 ? (
                            <TouchableOpacity
                              style={[
                                styles.gridCard,
                                { borderColor, borderWidth: 2.5 },
                              ]}
                              onPress={() => onChildPress(ged)}
                            >
                              {apresPhotos[0].url ? (
                                isVideoFile(apresPhotos[0].url) ? (
                                  <View style={styles.thumbnailContainer}>
                                    <Video
                                      source={{
                                        uri: `${API_CONFIG.BASE_URL}${apresPhotos[0].url}`,
                                      }}
                                      style={styles.childThumbnail}
                                      resizeMode={ResizeMode.COVER}
                                      shouldPlay={false}
                                      isMuted={true}
                                    />
                                    <View style={styles.playIconOverlay}>
                                      <Ionicons
                                        name="play-circle"
                                        size={32}
                                        color="rgba(255, 255, 255, 0.9)"
                                      />
                                    </View>
                                  </View>
                                ) : (
                                  <Image
                                    source={{
                                      uri: `${API_CONFIG.BASE_URL}${apresPhotos[0].url}`,
                                    }}
                                    style={styles.childThumbnail}
                                  />
                                )
                              ) : (
                                <View
                                  style={[
                                    styles.childThumbnail,
                                    { backgroundColor: "#e5e7eb" },
                                  ]}
                                />
                              )}
                              <View style={styles.childGridOverlay}>
                                <Text
                                  style={styles.childGridTitle}
                                  numberOfLines={1}
                                >
                                  {apresPhotos[0].title}
                                </Text>
                                {apresPhotos[0].created_at && (
                                  <Text style={styles.childGridDate}>
                                    {formatDate(apresPhotos[0].created_at)}
                                  </Text>
                                )}
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleSharePhoto(apresPhotos[0]);
                                  }}
                                  style={styles.shareButton}
                                  accessibilityLabel="Partager cette photo"
                                >
                                  <Ionicons
                                    name="share-social-outline"
                                    size={18}
                                    color="#f87b1b"
                                  />
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <View
                              style={[
                                styles.gridCard,
                                styles.placeholderCard,
                                { borderColor: "#EE4B2B", borderWidth: 2.5 },
                              ]}
                            >
                              <Ionicons
                                name="camera-outline"
                                size={48}
                                color="#94a3b8"
                              />
                              <Text style={styles.placeholderText}>
                                Aucune photo après
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  // List mode: Display cards normally
                  childGeds.map((ged) => {
                    const hasAfterPhoto = childrenWithAfterPhotos.has(ged.id);
                    const borderColor = hasAfterPhoto ? "#10b981" : "#EE4B2B";

                    return (
                      <TouchableOpacity
                        key={ged.id}
                        style={[
                          [
                            styles.childListItem,
                            { width: isTablet ? "49%" : "100%" },
                          ],
                          { borderColor, borderWidth: 2.5 },
                        ]}
                        onPress={() => onChildPress(ged)}
                      >
                        {ged.url ? (
                          isVideoFile(ged.url) ? (
                            <View style={styles.thumbnailContainer}>
                              <Video
                                source={{
                                  uri: `${API_CONFIG.BASE_URL}${ged.url}`,
                                }}
                                style={styles.childThumbnail}
                                resizeMode={ResizeMode.COVER}
                                shouldPlay={false}
                                isMuted={true}
                              />
                              <View style={styles.playIconOverlay}>
                                <Ionicons
                                  name="play-circle"
                                  size={32}
                                  color="rgba(255, 255, 255, 0.9)"
                                />
                              </View>
                            </View>
                          ) : (
                            <Image
                              source={{
                                uri: `${API_CONFIG.BASE_URL}${ged.url}`,
                              }}
                              style={styles.childThumbnail}
                            />
                          )
                        ) : (
                          <View
                            style={[
                              styles.childThumbnail,
                              { backgroundColor: "#e5e7eb" },
                            ]}
                          />
                        )}
                        <View style={styles.childGridOverlay}>
                          <Text style={styles.childGridTitle} numberOfLines={1}>
                            {ged.title}
                          </Text>
                          {ged.created_at && (
                            <Text style={styles.childGridDate}>
                              {formatDate(ged.created_at)}
                            </Text>
                          )}
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleSharePhoto(ged);
                            }}
                            style={styles.shareButton}
                            accessibilityLabel="Partager cette photo"
                          >
                            <Ionicons
                              name="share-social-outline"
                              size={18}
                              color="#f87b1b"
                            />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          </>
          <TouchableOpacity
            style={[
              styles.validateButton,
              isValidated
                ? styles.validatedButton
                : !canValidate || isUpdatingStatus
                  ? styles.disabledValidateButton
                  : {},
            ]}
            onPress={handleValidate}
            disabled={isUpdatingStatus || !canValidate || isValidated}
            accessibilityLabel="Valider le dossier"
          >
            {isUpdatingStatus ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.validateButtonText}>
                {isValidated ? "Dossier Validé" : "Valider le Dossier"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <QualiPhotoEditModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        item={item}
        onSuccess={(updatedItem) => {
          onItemUpdate(updatedItem);
          setIsEditModalVisible(false);
        }}
      />
      <CustomAlert
        visible={alertInfo.visible}
        type={alertInfo.type}
        title={alertInfo.title}
        message={alertInfo.message}
        onClose={() => setAlertInfo((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  closeBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  headerTitles: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 50,
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    marginLeft: 8,
  },
  disabledHeaderAction: {
    opacity: 0.5,
  },
  headerActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  headerActionIcon: {
    width: 32,
    height: 32,
  },
  headerPlanIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  folderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  folderIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  folderTitleContainer: {
    flex: 1,
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f87b1b",
  },
  folderSubtitle: {
    fontSize: 12,
    color: "#8E8E93",
  },
  folderMeta: {
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  folderMetaText: {
    fontSize: 12,
    color: "#6b7280",
    flexShrink: 1,
  },
  folderContentContainer: {
    paddingTop: 12,
    marginTop: 12,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f87b1b",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 12,
  },
  imageWrap: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f87b1b",
    overflow: "hidden",
  },
  toggleActionsButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  inlineActionsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#f87b1b",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#f3f4f6",
  },
  metaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f87b1b",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  metaRow: {
    marginBottom: 10,
    borderTopWidth: 1,
    borderColor: "#f87b1b",
    paddingTop: 10,
  },
  metaLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 2,
    fontWeight: "600",
  },
  metaValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
  },
  metaMultiline: {
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f87b1b",
    marginBottom: 8,
  },
  childThumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#f3f4f6",
  },
  childGridItem: {
    width: "49%",
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  childGridItemSplit: {
    width: "100%",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  childListItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  childGridOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  childGridTitle: {
    color: "#f87b1b",
    fontSize: 12,
    fontWeight: "bold",
    flex: 1,
    marginRight: 4,
  },
  childGridDate: {
    color: "#f87b1b",
    fontSize: 12,
    fontWeight: "bold",
  },
  noChildrenText: {
    textAlign: "center",
    color: "#6b7280",
    paddingVertical: 16,
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    width: 32,
    height: 32,
  },
  childListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sortButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  layoutToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f87b1b",
    overflow: "hidden",
    width: 80,
    height: 40,
  },
  layoutToggleButton: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  layoutToggleButtonActive: {
    backgroundColor: "#f87b1b",
  },
  childGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  childListContainer: {
    marginTop: 8,
  },
  childPicturesContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: "#f87b1b",
    marginVertical: 16,
    marginHorizontal: 12,
  },
  readMoreText: {
    color: "#f87b1b",
    fontSize: 12,
    marginTop: 4,
    textDecorationLine: "underline",
  },
  metaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  childFolderCard: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f87b1b",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  childFolderTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#11224e",
    textAlign: "center",
  },
  validateButton: {
    backgroundColor: "#f87b1b",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  validatedButton: {
    backgroundColor: "#4ade80",
  },
  disabledValidateButton: {
    backgroundColor: "#a1a1aa",
  },
  validateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  gridPairContainer: {
    width: "100%",
  },
  gridHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  gridSectionHeader: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#f87b1b",
    textAlign: "center",
  },
  gridPairRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  gridCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  placeholderCard: {
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150,
    gap: 8,
  },
  shareButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
  },
  thumbnailContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#f3f4f6",
    position: "relative",
  },
  playIconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});
