import API_CONFIG from "@/app/config/api";
import { useAuth } from "@/contexts/AuthContext";
import folderService, { Folder, Project } from "@/services/folderService";
import { FolderType, updateFolderType } from "@/services/folderTypeService";
import { createGed, updateGedFile } from "@/services/gedService";
import { getUsers } from "@/services/userService";
import { CompanyUser } from "@/types/user";
import { compressImage } from "@/utils/imageCompression";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { any } from "zod";
import AppHeader from "../AppHeader";
import FolderCard from "../folder/FolderCard";
import CreateFolderModal from "./CreateFolderModal";
import FolderAnswersSummaryModal from "./FolderAnswersSummaryModal";

type Props = {
  visible: boolean;
  onClose: () => void;
  folderType: FolderType | null;
  onSuccess: (updatedType: FolderType) => void;
  onManageQuestions: () => void;
  onDelete: () => void;
};

export default function UpdateFolderTypeModal({
  visible,
  onClose,
  folderType,
  onSuccess,
  onManageQuestions,
  onDelete,
}: Props) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Folder Creation State
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Folder Answers View State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  useEffect(() => {
    if (visible && token) {
      loadUsers();
      loadProjects();
      loadFolders();
    }
  }, [visible, token]);

  const loadProjects = async () => {
    if (!token) return;
    setLoadingProjects(true);
    try {
      const projectsData = await folderService.getAllProjects(token);
      if (Array.isArray(projectsData)) {
        setProjects(projectsData);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const usersData = await getUsers();
      if (Array.isArray(usersData)) {
        setUsers(usersData);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadFolders = async () => {
    if (!token || !folderType || !user) return;
    setLoadingFolders(true);
    try {
      const foldersData = await folderService.getAllFolders(
        token,
        folderType.id,
      );
      if (Array.isArray(foldersData)) {
        // Filter by company_id
        const companyFolders = foldersData.filter(
          (f) =>
            f.company_id === user.company_id &&
            (f.foldertype_id === folderType.id ||
              f.foldertype === folderType.id),
        );
        setFolders(companyFolders);
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
    } finally {
      setLoadingFolders(false);
    }
  };

  const getSelectedFolderTitle = () => {
    if (!selectedFolderId) return "Sélectionner un dossier";
    const folder = folders.find((f) => f.id === selectedFolderId);
    if (!folder) return "Dossier inconnu";

    const owner = users.find((u) => u.id === folder.owner_id);
    const ownerName = owner
      ? `${owner.firstname || ""} ${owner.lastname || ""}`.trim() || owner.email
      : "Propriétaire inconnu";

    return `${folder.title} - ${ownerName}`;
  };

  const visibleFolders = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // compare dates only, ignore time

    return folders
      .filter((f) => {
        // Date-range filter: only show folders active today (dd <= today <= df)
        if (f.dd) {
          const start = new Date(
            f.dd.includes("T") ? f.dd : f.dd.replace(" ", "T"),
          );
          start.setHours(0, 0, 0, 0);
          if (today < start) return false;
        }
        if (f.df) {
          const end = new Date(
            f.df.includes("T") ? f.df : f.df.replace(" ", "T"),
          );
          end.setHours(0, 0, 0, 0);
          if (today > end) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // Newest first
      });
  }, [folders]);

  const renderFolderRows = () => {
    if (loadingFolders) {
      return (
        <View style={styles.foldersLoadingWrap}>
          <ActivityIndicator size="small" color="#f87b1b" />
          <Text style={styles.foldersLoadingText}>
            Chargement des contrôles…
          </Text>
        </View>
      );
    }

    if (visibleFolders.length === 0) {
      return (
        <View style={styles.foldersEmptyWrap}>
          <Text style={styles.foldersEmptyText}>
            Aucun contrôle actif aujourd'hui
          </Text>
        </View>
      );
    }

    const rows: Folder[][] = [];
    for (let i = 0; i < visibleFolders.length; i += 2) {
      rows.push(visibleFolders.slice(i, i + 2));
    }

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.folderRow}>
        {row.map((folder) => {
          const projTitle = folder.project_id
            ? projects.find((p) => p.id === folder.project_id)?.title
            : undefined;
          return (
            <FolderCard
              key={folder.id}
              item={folder}
              iconSource={
                folderType?.imageUrl ? { uri: folderType.imageUrl } : undefined
              }
              projectTitle={projTitle}
              folderTypeTitle={folderType?.title}
              onPress={() => {
                setSelectedFolderId(folder.id);
                setShowAnswersModal(true);
              }}
            />
          );
        })}
        {row.length === 1 && <View style={styles.folderCardPlaceholder} />}
      </View>
    ));
  };

  useEffect(() => {
    if (folderType) {
      setTitle(folderType.title);
      setImage(null); // Reset new image selection, show existing URL
    }
  }, [folderType, visible]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "La permission d’accès à la galerie est requise.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const compressed = await compressImage(result.assets[0].uri);
      setImage({
        ...result.assets[0],
        uri: compressed.uri,
        width: compressed.width,
        height: compressed.height,
      } as ImagePickerAsset);
    }
  };

  const handleSubmit = async () => {
    if (!token || !folderType || !user) return;
    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update folder type details (title only for now)
      const updatedType = await updateFolderType(
        folderType.id,
        { title },
        token,
      );

      let finalType = { ...folderType, ...updatedType };

      // 2. Handle Image Update if a new image was selected
      if (image && image.uri) {
        const file = {
          uri: image.uri,
          name: image.fileName || `photo_${Date.now()}.jpg`,
          type: image.type === "image" ? "image/jpeg" : "video/mp4",
        };

        if (folderType.imageGedId) {
          // Update existing GED
          const updatedGed = await updateGedFile(
            token,
            folderType.imageGedId,
            file,
          );
          finalType = {
            ...finalType,
            imageUrl: `${API_CONFIG.BASE_URL}${updatedGed.url}`,
            imageGedId: updatedGed.id,
          };
        } else {
          // Create new GED
          const gedData = await createGed(token, {
            idsource: folderType.id,
            title: `Icon for ${folderType.title}`,
            kind: "folder_type_icon",
            author: user.id,
            file,
            answer: any,
          });
          finalType = {
            ...finalType,
            imageUrl: `${API_CONFIG.BASE_URL}${gedData.data.url}`,
            imageGedId: gedData.data.id,
          };
        }
      }
      onSuccess(finalType);
      onClose();
    } catch (error) {
      console.error("Failed to update folder type:", error);
      Alert.alert("Erreur", "Échec de la mise à jour.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!folderType) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <FolderAnswersSummaryModal
        visible={showAnswersModal}
        onClose={() => setShowAnswersModal(false)}
        folderId={selectedFolderId}
        folderTitle={getSelectedFolderTitle()}
        users={users}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#f8fafc" }}
      >
        <SafeAreaView style={styles.container}>
          <AppHeader
            user={user || undefined}
            showNotifications={false}
            showProfile={true}
            onLogoPress={onClose}
          />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section: Image + Title Side-by-Side */}
            <View style={styles.headerRowContainer}>
              {/* Image Picker */}
              <TouchableOpacity
                onPress={handlePickImage}
                style={styles.compactImageWrapper}
              >
                {image ? (
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.compactCircleImage}
                  />
                ) : folderType.imageUrl ? (
                  <Image
                    source={{ uri: folderType.imageUrl }}
                    style={styles.compactCircleImage}
                  />
                ) : (
                  <View style={styles.compactPlaceholderCircle}>
                    <Ionicons name="camera" size={24} color="#f87b1b" />
                  </View>
                )}
                <View style={styles.compactEditIconBadge}>
                  <Ionicons name="pencil" size={10} color="white" />
                </View>
              </TouchableOpacity>

              {/* Title Input */}
              <View style={styles.compactTitleContainer}>
                <Text style={styles.label}>Titre</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Nom du type de dossier"
                    style={styles.input}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Quick Actions Row */}
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                onPress={onManageQuestions}
                style={[
                  styles.quickActionButton,
                  { flex: 1, borderColor: "#11224e" },
                ]}
              >
                <Ionicons name="list" size={20} color="#11224e" />
                <Text
                  style={{ color: "#11224e", fontWeight: "600", marginLeft: 8 }}
                >
                  Questions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Supprimer",
                    "Êtes-vous sûr de vouloir supprimer ce type de dossier ?",
                    [
                      { text: "Annuler", style: "cancel" },
                      {
                        text: "Supprimer",
                        style: "destructive",
                        onPress: () => {
                          onDelete();
                          onClose();
                        },
                      },
                    ],
                  );
                }}
                style={[
                  styles.quickActionButton,
                  { flex: 1, borderColor: "#ef4444" },
                ]}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text
                  style={{ color: "#ef4444", fontWeight: "600", marginLeft: 8 }}
                >
                  Supprimer
                </Text>
              </TouchableOpacity>
            </View>

            {/* Create Folder Section - Dedicated Modal Trigger */}
            <View style={{ marginBottom: 24 }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: "#f87b1b",
                    flexDirection: "row",
                    gap: 8,
                  },
                ]}
                onPress={() => setShowCreateFolderModal(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="white" />
                <Text style={styles.submitButtonText}>
                  Assigner un contrôle
                </Text>
              </TouchableOpacity>
            </View>

            {/* User Answers Overview Section */}
            <View>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={20}
                    color="#f87b1b"
                  />
                  <Text style={styles.sectionTitle}>Suivi des contrôles</Text>
                </View>
              </View>

              <View style={styles.foldersSection}>{renderFolderRows()}</View>
            </View>
          </ScrollView>

          <CreateFolderModal
            visible={showCreateFolderModal}
            onClose={() => setShowCreateFolderModal(false)}
            folderType={folderType}
            users={users}
            projects={projects}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.button, styles.submitButton]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  imageWrapper: {
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  circleImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#f3f4f6",
  },
  placeholderCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fdba74",
    borderStyle: "dashed",
  },
  editIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#f87b1b",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  imageLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
  },
  input: {
    fontSize: 14,
    color: "#111827",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#4b5563",
    fontWeight: "600",
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: "#f87b1b",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  startSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIconButton: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
  },
  // Compact Header Styles
  headerRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 16,
  },
  compactImageWrapper: {
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCircleImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f3f4f6",
  },
  compactPlaceholderCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fdba74",
    borderStyle: "dashed",
  },
  compactEditIconBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#f87b1b",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  compactTitleContainer: {
    flex: 1,
  },
  quickActionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  createFolderSection: {
    marginTop: 12,
    paddingTop: 12,
    // borderTopWidth removed as requested
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  iconActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fdba74",
  },
  iconActionButtonDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    opacity: 0.5,
  },
  userPickerContainer: {
    marginBottom: 12,
    zIndex: 10,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerButtonText: {
    fontSize: 14,
    color: "#111827",
  },
  dropdown: {
    position: "absolute",
    top: "100%", // Below the picker button
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemSelected: {
    backgroundColor: "#fff7ed",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  dropdownItemTextSelected: {
    color: "#f87b1b",
    fontWeight: "600",
  },

  usersListContainer: {
    paddingVertical: 12,
    gap: 12,
  },
  userAvatarItem: {
    alignItems: "center",
    width: 60,
  },
  userAvatarItemSelected: {
    opacity: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarCircleSelected: {
    backgroundColor: "#fff7ed",
    borderColor: "#f87b1b",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  avatarInitialsSelected: {
    color: "#f87b1b",
  },
  userAvatarName: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
  },
  userAvatarNameSelected: {
    color: "#f87b1b",
    fontWeight: "600",
  },
  answersPanel: {
    marginTop: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  emptyAnswersText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  answersTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
    marginBottom: 8,
  },
  answersth: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  answerRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    alignItems: "center",
  },
  answerCell: {
    fontSize: 12,
    color: "#374151",
  },
  answerDetailText: {
    fontSize: 10,
    color: "#6b7280",
  },
  foldersSection: {
    marginTop: 8,
  },
  folderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  folderCardPlaceholder: {
    flex: 1,
  },
  foldersLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 24,
  },
  foldersLoadingText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  foldersEmptyWrap: {
    alignItems: "center",
    paddingVertical: 24,
  },
  foldersEmptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },
});
