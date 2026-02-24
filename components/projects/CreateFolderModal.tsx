import { useAuth } from "@/contexts/AuthContext";
import folderService, {
  CreateFolderPayload,
  Project,
} from "@/services/folderService";
import { FolderType } from "@/services/folderTypeService";
import { CompanyUser } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import AppHeader from "../AppHeader";
import ProjectSelectionModal from "./ProjectSelectionModal";
import UserSelectionModal from "./UserSelectionModal";

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  folderType: FolderType;
  users: CompanyUser[];
  projects: Project[];
}

export default function CreateFolderModal({
  visible,
  onClose,
  folderType,
  users,
  projects,
}: CreateFolderModalProps) {
  const { token, user } = useAuth();

  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [ddDate, setDdDate] = useState<Date | null>(null);
  const [isDdPickerVisible, setDdPickerVisibility] = useState(false);

  const [dfDate, setDfDate] = useState<Date | null>(null);
  const [isDfPickerVisible, setDfPickerVisibility] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return "Une date";
    return date.toLocaleDateString("fr-FR");
  };

  const getSelectedUserName = () => {
    if (!selectedUserId) return "Sélectionner un propriétaire";
    const userToFind = users.find((u) => u.id === selectedUserId);
    if (!userToFind) return "Utilisateur inconnu";
    return (
      `${userToFind.firstname || ""} ${userToFind.lastname || ""}`.trim() ||
      userToFind.email ||
      "Utilisateur sans nom"
    );
  };

  const getSelectedProjectTitle = () => {
    if (!selectedProjectId) return "Sélectionner un chantier";
    const project = projects.find((p) => p.id === selectedProjectId);
    return project?.title || "Chantier inconnu";
  };

  const handleCreateFolder = async () => {
    if (!selectedUserId) {
      Alert.alert("Erreur", "Veuillez sélectionner un propriétaire.");
      return;
    }
    if (!selectedProjectId) {
      Alert.alert("Erreur", "Veuillez sélectionner un chantier.");
      return;
    }
    if (!folderType || !token) return;

    setIsCreatingFolder(true);
    try {
      const payload: CreateFolderPayload = {
        code: `F-${Date.now().toString(36).toUpperCase()}`,
        title: newFolderTitle.trim() || folderType.title,
        description: folderType.description || undefined,
        owner_id: selectedUserId,
        foldertype_id: folderType.id,
        foldertype: folderType.id, // Backend controller expects 'foldertype' to map to 'foldertype_id'
        project_id: selectedProjectId,
        zone_id: undefined,
        control_id: undefined,
        technicien_id: undefined,
        dd: ddDate ? ddDate.toISOString() : undefined,
        df: dfDate ? dfDate.toISOString() : undefined,
      };

      await folderService.createFolder(payload, token);

      setSelectedUserId("");
      setSelectedProjectId("");
      setNewFolderTitle("");
      setDdDate(null);
      setDfDate(null);
      onClose();
    } catch (error) {
      console.error("Failed to create folder from type:", error);
      Alert.alert("Erreur", "Échec de la création du dossier.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
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
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="folder-open-outline"
                  size={24}
                  color="#f87b1b"
                />
                <Text
                  style={[styles.sectionTitle, { flexShrink: 1 }]}
                  numberOfLines={2}
                >
                  Créer un contrôle -{" "}
                  {folderType?.title && (
                    <Text style={{ color: "#f87b1b" }}>{folderType.title}</Text>
                  )}
                </Text>
              </View>
            </View>

            {/* New Folder Title Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre du contrôle</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={newFolderTitle}
                  onChangeText={setNewFolderTitle}
                  placeholder={`Par défaut: ${folderType.title}`}
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Date Pickers Row */}
            <View style={{ flexDirection: "row", gap: 16 }}>
              {/* Date Début Picker */}
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Date de début</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, { paddingHorizontal: 12 }]}
                  onPress={() => setDdPickerVisibility(true)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !ddDate && { color: "#9ca3af" },
                      { flexShrink: 1, marginRight: 4 },
                    ]}
                    numberOfLines={1}
                  >
                    {formatDate(ddDate)}
                  </Text>
                  {ddDate ? (
                    <TouchableOpacity onPress={() => setDdDate(null)}>
                      <Ionicons name="close-circle" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#6b7280"
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Date Fin Picker */}
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Date de fin</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, { paddingHorizontal: 12 }]}
                  onPress={() => setDfPickerVisibility(true)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !dfDate && { color: "#9ca3af" },
                      { flexShrink: 1, marginRight: 4 },
                    ]}
                    numberOfLines={1}
                  >
                    {formatDate(dfDate)}
                  </Text>
                  {dfDate ? (
                    <TouchableOpacity onPress={() => setDfDate(null)}>
                      <Ionicons name="close-circle" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#6b7280"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Project Picker */}
            <View style={[styles.pickerContainer, { zIndex: 10 }]}>
              <Text style={styles.label}>Chantier</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowProjectModal(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedProjectId && { color: "#9ca3af" },
                  ]}
                >
                  {getSelectedProjectTitle()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {/* User Picker */}
            <View style={[styles.pickerContainer, { zIndex: 20 }]}>
              <Text style={styles.label}>Assigner à</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowUserModal(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedUserId && { color: "#9ca3af" },
                  ]}
                >
                  {getSelectedUserName()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.footerButtons}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.button, styles.cancelButton]}
                disabled={isCreatingFolder}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (!selectedUserId ||
                    !selectedProjectId ||
                    isCreatingFolder) && {
                    backgroundColor: "#f3f4f6",
                  },
                ]}
                onPress={handleCreateFolder}
                disabled={
                  !selectedUserId || !selectedProjectId || isCreatingFolder
                }
              >
                {isCreatingFolder ? (
                  <ActivityIndicator size="small" color="#f87b1b" />
                ) : (
                  <Text
                    style={[
                      styles.submitButtonText,
                      (!selectedUserId || !selectedProjectId) && {
                        color: "#4b5563",
                      },
                    ]}
                  >
                    Créer le contrôle
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <UserSelectionModal
            visible={showUserModal}
            onClose={() => setShowUserModal(false)}
            users={users}
            onSelect={setSelectedUserId}
            selectedUserId={selectedUserId}
          />

          <ProjectSelectionModal
            visible={showProjectModal}
            onClose={() => setShowProjectModal(false)}
            projects={projects}
            onSelect={setSelectedProjectId}
            selectedProjectId={selectedProjectId}
          />

          <DateTimePickerModal
            isVisible={isDdPickerVisible}
            mode="date"
            onConfirm={(date) => {
              setDdDate(date);
              // if a dfDate exists and is now earlier than the new ddDate, reset it
              if (dfDate && date > dfDate) {
                setDfDate(null);
              }
              setDdPickerVisibility(false);
            }}
            onCancel={() => setDdPickerVisibility(false)}
            confirmTextIOS="Confirmer"
            cancelTextIOS="Annuler"
          />

          <DateTimePickerModal
            isVisible={isDfPickerVisible}
            mode="date"
            minimumDate={ddDate || undefined}
            onConfirm={(date) => {
              setDfDate(date);
              setDfPickerVisibility(false);
            }}
            onCancel={() => setDfPickerVisibility(false)}
            confirmTextIOS="Confirmer"
            cancelTextIOS="Annuler"
          />
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
  content: {
    padding: 20,
    paddingTop: 30,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  formGroup: {
    marginBottom: 24,
  },
  pickerContainer: {
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
    borderColor: "#f87b1b",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 15,
    color: "#111827",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 15,
    color: "#111827",
  },
  footerButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f87b1b",
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
});
