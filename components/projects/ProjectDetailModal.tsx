import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import folderService, { Folder } from "@/services/folderService";
import {
  deleteProject,
  Project,
  updateProject,
} from "@/services/projectService";
import { getUsers } from "@/services/userService";
import { CompanyUser } from "@/types/user";
import { formatDisplayDate } from "@/utils/dateFormat";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import CreateQualiPhotoModal from "../reception/CreateQualiPhotoModal";
import FolderContextModal from "./FolderContextModal";

type Props = {
  visible: boolean;
  onClose: () => void;
  project?: Project | null;
  onEdit?: (project: Project) => void;
  onUpdated?: () => void;
};

export default function ProjectDetailModal({
  visible,
  onClose,
  project,
  onUpdated,
}: Props) {
  const { token, user } = useAuth();
  const isSuperAdmin = user?.role === "Super Admin";

  const [folders, setFolders] = useState<Folder[]>([]);
  const [usersList, setUsersList] = useState<CompanyUser[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isCreateFolderModalVisible, setIsCreateFolderModalVisible] =
    useState(false);

  // Enable smooth layout animations on Android
  if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // Collapsible sections state
  const [openOverview, setOpenOverview] = useState(true);
  // Relations section removed
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [openMore, setOpenMore] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editDd, setEditDd] = useState<string>("");
  const [editDf, setEditDf] = useState<string>("");
  // ownerOpen and companyUsers removed
  const [isSaving, setIsSaving] = useState(false);
  const [isDdPickerVisible, setDdPickerVisible] = useState(false);
  const [isDfPickerVisible, setDfPickerVisible] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  // Rotate chevrons
  const rotateAnim = useRef({
    overview: new Animated.Value(1),
    folders: new Animated.Value(1),
    more: new Animated.Value(0),
  }).current;

  function toggleSection(section: "overview" | "folders" | "more") {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const map = {
      overview: [openOverview, setOpenOverview],
      folders: [foldersOpen, setFoldersOpen],
      more: [openMore, setOpenMore],
    } as const;
    const [isOpen, setIsOpen] = map[section];
    setIsOpen(!isOpen);
    Animated.timing(rotateAnim[section], {
      toValue: !isOpen ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function Chevron({ section }: { section: "overview" | "folders" | "more" }) {
    const spin = rotateAnim[section].interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "180deg"],
    });
    return (
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="chevron-down" size={16} color="#9ca3af" />
      </Animated.View>
    );
  }

  const handleDelete = () => {
    if (!project || !token) return;

    Alert.alert(
      "Supprimer le projet",
      `Êtes-vous sûr de vouloir supprimer "${project.title}" ?\n\n⚠️ Attention : Toutes les zones associées à ce projet seront également supprimées. Cette action est irréversible.`,
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
              await deleteProject(token, project.id);
              Alert.alert(
                "Succès",
                "Projet et zones associées supprimés avec succès",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      onClose();
                      if (onUpdated) {
                        onUpdated();
                      }
                    },
                  },
                ],
              );
            } catch (e: any) {
              Alert.alert(
                "Erreur",
                e?.message || "Échec de la suppression du projet",
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteFolder = (folderId: string, folderTitle: string) => {
    if (!token) return;

    Alert.alert(
      "Supprimer le dossier",
      `Êtes-vous sûr de vouloir supprimer le dossier "${folderTitle}" ?\n\nCette action est irréversible.`,
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
              await folderService.deleteFolder(folderId, token);
              // Remove locally
              setFolders((prev) => prev.filter((f) => f.id !== folderId));
              Alert.alert("Succès", "Dossier supprimé avec succès");
            } catch (e: any) {
              console.error("Failed to delete folder", e);
              Alert.alert(
                "Erreur",
                e?.message || "Échec de la suppression du dossier",
              );
            }
          },
        },
      ],
    );
  };

  const handleOpenReport = (url: string | null | undefined) => {
    if (url) {
      Linking.openURL(url).catch((err) =>
        Alert.alert("Erreur", "Impossible d'ouvrir le lien"),
      );
    } else {
      Alert.alert("Info", "Aucun document disponible.");
    }
  };

  const handleCaptureLocation = async () => {
    if (!project || !token) return;

    Alert.alert(
      "Capturer la position",
      "Voulez-vous capturer votre position GPS actuelle?",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Capturer",
          onPress: async () => {
            try {
              setIsCapturingLocation(true);

              // Request permission
              const { status } =
                await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                Alert.alert(
                  "Permission refusée",
                  "La permission de localisation est nécessaire pour capturer votre position.",
                );
                return;
              }

              // Get current position
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });

              // Update project with location data
              const response = await updateProject(token, project.id, {
                latitude: location.coords.latitude.toString(),
                longitude: location.coords.longitude.toString(),
                altitude: location.coords.altitude?.toString() || null,
                accuracy: location.coords.accuracy?.toString() || null,
                altitudeAccuracy:
                  location.coords.altitudeAccuracy?.toString() || null,
              });

              // Update local state
              if (response.data && onUpdated) {
                onUpdated();
              }

              Alert.alert(
                "Succès",
                "Position GPS capturée et enregistrée avec succès.",
              );
            } catch (error: any) {
              console.error("Location capture error:", error);
              Alert.alert(
                "Erreur",
                error?.message ||
                  "Impossible de capturer la position GPS. Vérifiez que votre GPS est activé.",
              );
            } finally {
              setIsCapturingLocation(false);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!project || !token) {
        setFolders([]);
        return;
      }

      // Load folders
      setIsLoadingFolders(true);
      try {
        const [allFolders, allUsers] = await Promise.all([
          folderService.getAllFolders(token),
          getUsers(),
        ]);

        if (!cancelled) {
          setFolders(allFolders.filter((f) => f.project_id === project.id));
          setUsersList(allUsers);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        if (!cancelled) setIsLoadingFolders(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [project, token]);

  useEffect(() => {
    // initialize edit fields when opening or when project changes
    if (project) {
      // Owner edit removed
      setEditTitle(project.title || "");
      setEditDescription(project.description || "");
      setEditDd(project.dd || "");
      setEditDf(project.df || "");
    }
  }, [project]);

  // Owner derivation removed

  if (!project) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <AppHeader
          user={user || undefined}
          showNotifications={false}
          showProfile={true}
          onLogoPress={onClose} // Use logo to close or navigate back
          rightComponent={
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          }
        />
        {/* Loading/Error */}
        {isLoading ? (
          <View style={{ padding: 16, alignItems: "center" }}>
            <ActivityIndicator color="#11224e" />
          </View>
        ) : null}
        {error ? (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color="#b45309" />
            <Text style={styles.alertBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={16} color="#b45309" />
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* CTA Row */}
          <View style={styles.ctaRow}>
            {!isEditing ? (
              <Pressable
                onPress={() => setIsEditing(true)}
                android_ripple={{ color: "#fde7d4" }}
                style={styles.ctaButton}
              >
                <Ionicons name="create-outline" size={16} color="#f87b1b" />
                <Text style={styles.ctaText}>Modifier</Text>
              </Pressable>
            ) : null}
            {!isEditing ? (
              <Pressable
                onPress={handleDelete}
                android_ripple={{ color: "#fde7d4" }}
                style={styles.ctaButton}
              >
                <Ionicons name="trash-outline" size={16} color="#f87b1b" />
                <Text style={styles.ctaText}>Supprimer</Text>
              </Pressable>
            ) : null}

            {isEditing ? (
              <Pressable
                disabled={isSaving}
                onPress={async () => {
                  if (!project || !token) return;

                  // Validation
                  if (!editTitle.trim()) {
                    Alert.alert("Erreur", "Le titre est requis");
                    return;
                  }

                  // Check for duplicate role assignments (Removed as we only have Owner)
                  // const roles = [editOwner].filter(Boolean);
                  // const uniqueRoles = new Set(roles);

                  // Date validation
                  if (editDd && editDf) {
                    const start = new Date(editDd);
                    const end = new Date(editDf);
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                      Alert.alert("Erreur", "Dates invalides");
                      return;
                    }
                    if (start >= end) {
                      Alert.alert(
                        "Erreur",
                        "La date de fin doit être postérieure à la date de début",
                      );
                      return;
                    }
                  }

                  try {
                    setIsSaving(true);
                    await updateProject(token, project.id, {
                      title: editTitle,
                      description: editDescription || undefined,
                      dd: editDd,
                      df: editDf,
                      // owner_id not updated here as relations section is removed
                    });
                    setIsEditing(false);
                    // reflect local change quickly
                    if (onUpdated) onUpdated();
                    Alert.alert("Succès", "Projet mis à jour avec succès");
                  } catch (e: any) {
                    Alert.alert("Erreur", e?.message || "Mise à jour échouée");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                android_ripple={{ color: "#fde7d4" }}
                style={[styles.ctaButton, isSaving && { opacity: 0.6 }]}
              >
                <Ionicons name="save-outline" size={16} color="#f87b1b" />
                <Text style={styles.ctaText}>
                  {isSaving ? "Sauvegarde..." : "Enregistrer"}
                </Text>
              </Pressable>
            ) : null}
            {isEditing ? (
              <Pressable
                onPress={() => {
                  setIsEditing(false);
                  if (project) {
                    // setEditOwner removed
                    setEditTitle(project.title || "");
                    setEditDescription(project.description || "");
                    setEditDd(project.dd || "");
                    setEditDf(project.df || "");
                  }
                }}
                android_ripple={{ color: "#fde7d4" }}
                style={styles.ctaButton}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color="#f87b1b"
                />
                <Text style={styles.ctaText}>Annuler</Text>
              </Pressable>
            ) : null}
          </View>

          {/* PDF Buttons Row */}
          {!isEditing ? (
            <View style={styles.pdfRow}>
              <Pressable
                onPress={() => handleOpenReport(project.urlreport1)}
                android_ripple={{ color: "#fde7d4" }}
                style={styles.ctaButton}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#f87b1b"
                />
                <Text style={styles.ctaText}>PDF 1</Text>
              </Pressable>
              <Pressable
                onPress={() => handleOpenReport(project.urlreport2)}
                android_ripple={{ color: "#fde7d4" }}
                style={styles.ctaButton}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#f87b1b"
                />
                <Text style={styles.ctaText}>PDF 2</Text>
              </Pressable>
              <Pressable
                onPress={() => handleOpenReport(project.urlreport3)}
                android_ripple={{ color: "#fde7d4" }}
                style={styles.ctaButton}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#f87b1b"
                />
                <Text style={styles.ctaText}>PDF 3</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Overview Card (always visible) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.cardTitle}>Aperçu</Text>
              </View>
            </View>
            <View style={{ marginTop: 8, gap: 6 }}>
              {/* 2. Title - editable or view-only */}
              {!isEditing ? (
                <Pressable
                  android_ripple={{ color: "#f3f4f6" }}
                  style={styles.itemRow}
                >
                  <Ionicons name="text-outline" size={16} color="#6b7280" />
                  <Text style={styles.meta}>
                    Titre · {project.title || "—"}
                  </Text>
                </Pressable>
              ) : (
                <>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="text-outline" size={16} color="#6b7280" />
                    <TextInput
                      placeholder="Titre du projet"
                      placeholderTextColor="#9ca3af"
                      value={editTitle}
                      onChangeText={setEditTitle}
                      style={{ flex: 1, color: "#111827", fontSize: 14 }}
                    />
                  </View>
                  {/* GPS Icon - Separate */}
                  <TouchableOpacity
                    onPress={handleCaptureLocation}
                    disabled={isCapturingLocation}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 12,
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    {isCapturingLocation ? (
                      <ActivityIndicator size="small" color="#6b7280" />
                    ) : (
                      <Ionicons
                        name="location"
                        size={20}
                        color={
                          !project.latitude || !project.longitude
                            ? "#ef4444"
                            : "#22c55e"
                        }
                      />
                    )}
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        fontWeight: "500",
                      }}
                    >
                      {!project.latitude || !project.longitude
                        ? "Capturer la position GPS"
                        : "Position GPS capturée"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Folders List Section (New) */}
          <View style={styles.card}>
            <Pressable
              onPress={() => toggleSection("folders")}
              style={styles.cardHeader}
              android_ripple={{ color: "#f3f4f6" }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                <Text style={styles.cardTitle}>
                  Dossiers ({folders.length})
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent toggle
                    setIsCreateFolderModalVisible(true);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#f87b1b",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Chevron section="folders" />
            </Pressable>
            {foldersOpen && (
              <View style={{ marginTop: 8 }}>
                {isLoadingFolders ? (
                  <ActivityIndicator
                    size="small"
                    color="#11224e"
                    style={{ marginVertical: 10 }}
                  />
                ) : folders.length === 0 ? (
                  <View style={{ padding: 12, alignItems: "center" }}>
                    <Text style={{ color: "#9ca3af", fontStyle: "italic" }}>
                      Aucun dossier associé
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {folders.map((folder) => (
                      <TouchableOpacity
                        key={folder.id}
                        onPress={() => setSelectedFolder(folder)}
                        activeOpacity={0.7}
                        style={{
                          backgroundColor: "#f9fafb",
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#e5e7eb",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#111827",
                            }}
                            numberOfLines={1}
                          >
                            {folder.title}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                fontFamily: "System",
                                fontWeight: "500",
                                // fontFamily:
                                //   Platform.OS === "ios"
                                //     ? "Courier"
                                //     : "monospace",
                              }}
                            >
                              {(() => {
                                const owner = usersList.find(
                                  (u) => u.id === folder.owner_id,
                                );
                                return owner
                                  ? `${owner.firstname} ${owner.lastname}`
                                  : "Non assigné";
                              })()}
                            </Text>
                            {folder.created_at ? (
                              <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                                • {formatDisplayDate(folder.created_at)}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        {/* Optional status or icon */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          {/* Folder Icon - purely visual now, or keep as part of row */}
                          {/* Delete Button */}
                          <TouchableOpacity
                            onPress={() =>
                              handleDeleteFolder(folder.id, folder.title)
                            }
                            style={{
                              padding: 6,
                              // backgroundColor: "#fee2e2",
                              // borderRadius: 8,
                            }}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#ef4444"
                            />
                          </TouchableOpacity>

                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#9ca3af"
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        <FolderContextModal
          visible={!!selectedFolder}
          folder={selectedFolder}
          onClose={() => setSelectedFolder(null)}
          token={token || null}
        />

        <CreateQualiPhotoModal
          visible={isCreateFolderModalVisible}
          onClose={() => setIsCreateFolderModalVisible(false)}
          onSuccess={async () => {
            // Refresh folder list
            if (project && token) {
              setIsLoadingFolders(true);
              try {
                const allFolders = await folderService.getAllFolders(token);
                setFolders(
                  allFolders.filter((f) => f.project_id === project.id),
                );
              } catch (e) {
                console.error("Failed to reload folders", e);
              } finally {
                setIsLoadingFolders(false);
              }
            }
            setIsCreateFolderModalVisible(false);
          }}
          projectId={project?.id}
          assignedOwnerId={user?.id}
        />

        {/* Date Pickers */}
        <DateTimePickerModal
          isVisible={isDdPickerVisible}
          mode="date"
          onConfirm={(date) => {
            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
            const y = date.getFullYear();
            const m = pad(date.getMonth() + 1);
            const d = pad(date.getDate());
            setEditDd(`${y}-${m}-${d}`);
            setDdPickerVisible(false);
          }}
          onCancel={() => setDdPickerVisible(false)}
          date={editDd ? new Date(editDd) : new Date()}
        />
        <DateTimePickerModal
          isVisible={isDfPickerVisible}
          mode="date"
          onConfirm={(date) => {
            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
            const y = date.getFullYear();
            const m = pad(date.getMonth() + 1);
            const d = pad(date.getDate());
            setEditDf(`${y}-${m}-${d}`);
            setDfPickerVisible(false);
          }}
          onCancel={() => setDfPickerVisible(false)}
          date={editDf ? new Date(editDf) : new Date()}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  headerTitleRow: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: { padding: 8 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#11224e" },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  alertBannerText: { color: "#b45309", flex: 1, fontSize: 12 },
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#f87b1b" },
  meta: { color: "#374151", marginTop: 2 },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  pdfRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 8,
    marginTop: 12,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f87b1b",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  ctaText: { color: "#f87b1b", fontWeight: "600", fontSize: 12 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
});
