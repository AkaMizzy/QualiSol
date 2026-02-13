import API_CONFIG from "@/app/config/api";
import { useAuth } from "@/contexts/AuthContext";
import folderService, { CreateFolderPayload } from "@/services/folderService";
import { FolderType, updateFolderType } from "@/services/folderTypeService";
import { createGed, updateGedFile } from "@/services/gedService";
import { getUsers } from "@/services/userService";
import { CompanyUser } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  folderType: FolderType | null;
  onSuccess: (updatedType: FolderType) => void;
};

export default function UpdateFolderTypeModal({
  visible,
  onClose,
  folderType,
  onSuccess,
}: Props) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Folder Creation State
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (visible && token) {
      loadUsers();
    }
  }, [visible, token]);

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

  const getSelectedUserName = () => {
    if (!selectedUserId) return "Sélectionner un propriétaire";
    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return "Utilisateur inconnu";
    return (
      `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
      user.email ||
      "Utilisateur sans nom"
    );
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

    if (!result.canceled) {
      setImage(result.assets[0]);
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
            answer: undefined,
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

  const handleCreateFolder = async () => {
    if (!selectedUserId) {
      Alert.alert("Erreur", "Veuillez sélectionner un propriétaire.");
      return;
    }
    if (!folderType || !token) return;

    setIsCreatingFolder(true);
    try {
      const payload: CreateFolderPayload = {
        code: `F-${Date.now().toString(36).toUpperCase()}`,
        title: folderType.title,
        description: folderType.description || undefined,
        owner_id: selectedUserId,
        foldertype_id: folderType.id,
        project_id: undefined,
        zone_id: undefined,
        control_id: undefined,
        technicien_id: undefined,
      };

      await folderService.createFolder(payload, token);
      Alert.alert("Succès", "Dossier créé avec succès !");
      // Optional: Close modal or reset selection
      setSelectedUserId("");
      onClose();
    } catch (error) {
      console.error("Failed to create folder from type:", error);
      Alert.alert("Erreur", "Échec de la création du dossier.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  if (!folderType) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Modifier le type</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {/* Image Picker */}
              <View style={styles.imageContainer}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  style={styles.imageWrapper}
                >
                  {image ? (
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.circleImage}
                    />
                  ) : folderType.imageUrl ? (
                    <Image
                      source={{ uri: folderType.imageUrl }}
                      style={styles.circleImage}
                    />
                  ) : (
                    <View style={styles.placeholderCircle}>
                      <Ionicons name="camera" size={32} color="#f87b1b" />
                    </View>
                  )}
                  <View style={styles.editIconBadge}>
                    <Ionicons name="pencil" size={14} color="white" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.imageLabel}>Modifier l'icône</Text>
              </View>

              {/* Title Input */}
              <View style={styles.formGroup}>
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

              {/* Create Folder Section */}
              <View style={styles.createFolderSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="folder-open-outline"
                    size={20}
                    color="#f87b1b"
                  />
                  <Text style={styles.sectionTitle}>
                    Créer un dossier à partir de ce type
                  </Text>
                </View>

                <View style={styles.userPickerContainer}>
                  <Text style={styles.label}>Propriétaire</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowUserPicker(!showUserPicker)}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !selectedUserId && { color: "#9ca3af" },
                      ]}
                    >
                      {getSelectedUserName()}
                    </Text>
                    <Ionicons
                      name={showUserPicker ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>

                  {showUserPicker && (
                    <View style={styles.dropdown}>
                      <ScrollView
                        nestedScrollEnabled
                        style={{ maxHeight: 200 }}
                      >
                        {users.map((u) => (
                          <TouchableOpacity
                            key={u.id}
                            style={[
                              styles.dropdownItem,
                              selectedUserId === u.id &&
                                styles.dropdownItemSelected,
                            ]}
                            onPress={() => {
                              setSelectedUserId(u.id);
                              setShowUserPicker(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                selectedUserId === u.id &&
                                  styles.dropdownItemTextSelected,
                              ]}
                            >
                              {`${u.firstname || ""} ${u.lastname || ""}`.trim() ||
                                u.email}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.createFolderButton,
                    (!selectedUserId || isCreatingFolder) &&
                      styles.createFolderButtonDisabled,
                  ]}
                  onPress={handleCreateFolder}
                  disabled={!selectedUserId || isCreatingFolder}
                >
                  {isCreatingFolder ? (
                    <ActivityIndicator size="small" color="#f87b1b" />
                  ) : (
                    <>
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color="#f87b1b"
                      />
                      <Text style={styles.createFolderButtonText}>
                        Créer le dossier
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

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
      </TouchableWithoutFeedback>
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
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 32,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f3f4f6",
  },
  placeholderCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  imageLabel: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    color: "#111827",
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#4b5563",
    fontWeight: "600",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#f87b1b",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  // New Styles for Create Folder Section
  createFolderSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  userPickerContainer: {
    marginBottom: 16,
    zIndex: 10, // Ensure dropdown floats above other elements
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  createFolderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 12,
    paddingVertical: 12,
    borderStyle: "dashed",
  },
  createFolderButtonDisabled: {
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  createFolderButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f87b1b",
  },
});
