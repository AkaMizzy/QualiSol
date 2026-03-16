import API_CONFIG from "@/app/config/api";
import { ICONS } from "@/constants/Icons";
import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import folderService, {
  CreateFolderPayload,
  Folder,
} from "@/services/folderService";
import { Company } from "@/types/company";
import { compressImage } from "@/utils/imageCompression";
import { createGed } from "@/services/gedService";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
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

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (created: Folder) => void;
  projectId: string;
  projectOwnerId?: string;
  projectName?: string;
  projectOwnerName?: string;
  /** When true, the owner picker is hidden (owner is pre-set via projectOwnerId) */
  hideOwner?: boolean;
};

export default function CreateFolderModal({
  visible,
  onClose,
  onSuccess,
  projectId,
  projectOwnerId,
  projectName,
  projectOwnerName,
  hideOwner = false,
}: Props) {
  const { token, user } = useAuth();

  // Form fields
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [ownerId, setOwnerId] = useState("");
  const [plan, setPlan] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // UI state
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Users data
  const [companyUsers, setCompanyUsers] = useState<
    { id: string; firstname?: string; lastname?: string; email?: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Folder limits
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentFoldersCount, setCurrentFoldersCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  // Get selected user details
  const selectedUser = useMemo(
    () => companyUsers.find((u) => u.id === ownerId),
    [companyUsers, ownerId],
  );

  // Pre-select project owner (falls back to logged-in user)
  useEffect(() => {
    if (visible) {
      setOwnerId(projectOwnerId || user?.id || "");
    }
  }, [visible, projectOwnerId, user]);

  // Load folder limits
  useEffect(() => {
    const fetchLimitInfo = async () => {
      try {
        setLoadingLimits(true);
        if (!token) return;

        const [company, folders] = await Promise.all([
          companyService.getCompany(),
          folderService.getAllFolders(token),
        ]);

        setCompanyInfo(company);
        setCurrentFoldersCount(folders.length);

        const limit = company.nbfolders || 2;
        setIsLimitReached(folders.length >= limit);
      } catch (error) {
        console.error("Error fetching limit info:", error);
      } finally {
        setLoadingLimits(false);
      }
    };

    if (visible) {
      fetchLimitInfo();
    }
  }, [visible, token]);

  // Load company users
  useEffect(() => {
    async function loadUsers() {
      if (!visible || !token) {
        setCompanyUsers([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const baseUrl = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
        const url = `${baseUrl}/api/users`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setCompanyUsers([]);
          return;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setCompanyUsers(data);
        } else {
          setCompanyUsers([]);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
        setCompanyUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, [visible, token]);

  // Check if form is valid
  const isDisabled = useMemo(
    () => !title || !ownerId || !token || submitting || isLimitReached,
    [title, ownerId, token, submitting, isLimitReached],
  );

  const handleSubmit = async () => {
    if (!token) return;

    setError(null);

    // Validation
    if (!title || title.trim().length === 0) {
      setError("Veuillez saisir un titre.");
      return;
    }

    if (!ownerId) {
      setError("Veuillez sélectionner un propriétaire.");
      return;
    }

    if (isLimitReached) {
      setError(
        `Vous avez atteint la limite de ${companyInfo?.nbfolders || 2} dossiers. Veuillez mettre à niveau votre plan pour ajouter plus de dossiers.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateFolderPayload = {
        code: `F-${Date.now().toString(36).toUpperCase()}`,
        title,
        description,
        owner_id: ownerId,
        control_id: undefined,
        technicien_id: undefined,
        project_id: projectId,
        zone_id: undefined,
      };

      const created = await folderService.createFolder(payload, token);
      
      const folderId = created.id;

      // Upload Plan image if selected
      if (plan && folderId) {
        try {
          const gedRes = await createGed(token, {
            idsource: folderId,
            kind: "plan",
            title: "Plan du dossier",
            file: {
              uri: plan.uri,
              type: plan.mimeType || "image/jpeg",
              name: plan.fileName || "plan.jpg",
            },
            author: user?.id || "Unknown",
            idauthor: user?.id,
            answer: null,
            description: "Plan du dossier",
            mode: "upload",
          });

          const gedId = gedRes.data?.id;

          if (gedId) {
            // Update the folder with the GED ID in the 'plan' field
            await folderService.updateFolder(folderId, {
              plan: gedId,
            }, token);
          }
        } catch (uploadError) {
          console.error("Folder plan upload/assignment failed", uploadError);
          Alert.alert(
            "Info",
            "Le dossier a été créé mais le plan n'a pas pu être téléchargé.",
          );
        }
      }

      onSuccess && onSuccess(created);
      handleClose();
    } catch (e: any) {
      // Handle 403 error specifically for limit reached
      if (
        e?.message?.includes("limit") ||
        e?.message?.includes("Folder limit")
      ) {
        setError(
          e?.message ||
            `Vous avez atteint la limite de ${companyInfo?.nbfolders || 2} dossiers.`,
        );
      } else {
        setError(e?.message || "Échec de l'enregistrement");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setOwnerId(projectOwnerId || user?.id || "");
    setPlan(null);
    setShowOwnerPicker(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Nouveau dossier</Text>
              <Image source={ICONS.folder} style={{ width: 24, height: 24 }} />
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Project Context Banner */}
          {projectName && (
            <View style={styles.projectContextBanner}>
              <Ionicons name="briefcase-outline" size={15} color="#f87b1b" />
              <Text style={styles.projectContextName} numberOfLines={1}>
                {projectName}
              </Text>
              {projectOwnerName && (
                <View style={styles.projectOwnerBadge}>
                  <Ionicons name="person-outline" size={11} color="#f87b1b" />
                  <Text style={styles.projectOwnerText} numberOfLines={1}>
                    {projectOwnerName}
                  </Text>
                </View>
              )}
            </View>
          )}

          {error && (
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text style={styles.alertBannerText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Ionicons name="close" size={16} color="#b45309" />
              </TouchableOpacity>
            </View>
          )}

          {/* Limit Info Banner */}
          {!loadingLimits && companyInfo && (
            <View
              style={[
                styles.limitInfoBanner,
                isLimitReached && styles.limitInfoBannerWarning,
              ]}
            >
              <Ionicons
                name={isLimitReached ? "warning" : "folder"}
                size={16}
                color={isLimitReached ? "#b45309" : "#3b82f6"}
              />
              <Text
                style={[
                  styles.limitInfoText,
                  isLimitReached && styles.limitInfoTextWarning,
                ]}
              >
                Dossiers: {currentFoldersCount} / {companyInfo.nbfolders || 2}
                {isLimitReached && " - Nombre des dossiers dépassé"}
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingTop: 16 }}>
              {/* Title Input */}
              <View style={[styles.inputWrap, { marginBottom: 16 }]}>
                <Ionicons name="text-outline" size={16} color="#f87b1b" />
                <TextInput
                  placeholder="Titre"
                  placeholderTextColor="#9ca3af"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                />
              </View>

              {/* Plan Upload */}
              <View style={{ alignItems: "center", marginBottom: 24, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={async () => {
                    const { status } =
                      await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== "granted") {
                      Alert.alert(
                        "Permission refusée",
                        "Nous avons besoin de votre permission pour accéder à la galerie.",
                      );
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      quality: 0.8,
                    });

                    if (!result.canceled && result.assets[0]) {
                      const compressed = await compressImage(
                        result.assets[0].uri,
                      );
                      setPlan({
                        ...result.assets[0],
                        uri: compressed.uri,
                        width: compressed.width,
                        height: compressed.height,
                      } as ImagePicker.ImagePickerAsset);
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 150,
                    borderRadius: 12,
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#f87b1b",
                    borderStyle: "dashed",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                  }}
                >
                  {plan ? (
                    <Image
                      source={{ uri: plan.uri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <Ionicons
                        name="map-outline"
                        size={40}
                        color="#94a3b8"
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#94a3b8",
                          marginTop: 8,
                        }}
                      >
                        Plan du dossier
                      </Text>
                    </View>
                  )}
                  {plan && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        height: 30,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="create" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    marginTop: 8,
                  }}
                >
                  Ajouter un plan (optionnel)
                </Text>
              </View>

              {/* Owner Selection — hidden when owner is pre-set by the caller */}
              {!hideOwner && (
                <View style={{ gap: 8, marginTop: 12 }}>
                  <Text style={{ fontSize: 12, color: "#6b7280", marginLeft: 2 }}>
                    Propriétaire <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.inputWrap,
                      { justifyContent: "space-between" },
                    ]}
                    onPress={() => setShowOwnerPicker(!showOwnerPicker)}
                    disabled={loadingUsers}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={16}
                        color="#f87b1b"
                      />
                      <Text
                        style={[
                          styles.input,
                          { color: ownerId ? "#111827" : "#9ca3af" },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedUser
                          ? `${selectedUser.firstname || ""} ${selectedUser.lastname || ""}`.trim() ||
                            selectedUser.email
                          : loadingUsers
                            ? "Chargement..."
                            : "Sélectionner un propriétaire"}
                      </Text>
                    </View>
                    <Ionicons
                      name={showOwnerPicker ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#f87b1b"
                    />
                  </TouchableOpacity>

                  {/* Owner Dropdown */}
                  {showOwnerPicker && (
                    <View
                      style={{
                        backgroundColor: "#fff",
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 8,
                        maxHeight: 200,
                      }}
                    >
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={true}
                      >
                        {companyUsers.length === 0 && !loadingUsers ? (
                          <View style={{ padding: 16, alignItems: "center" }}>
                            <Text style={{ color: "#9ca3af", fontSize: 13 }}>
                              Aucun utilisateur disponible
                            </Text>
                          </View>
                        ) : (
                          companyUsers.map((user) => (
                            <TouchableOpacity
                              key={user.id}
                              onPress={() => {
                                setOwnerId(user.id);
                                setShowOwnerPicker(false);
                              }}
                              style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: "#f3f4f6",
                                backgroundColor:
                                  user.id === ownerId ? "#fef3f2" : "transparent",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: "#111827",
                                  fontWeight: user.id === ownerId ? "600" : "400",
                                }}
                              >
                                {`${user.firstname || ""} ${user.lastname || ""}`.trim() ||
                                  user.email}
                              </Text>
                              {user.email &&
                                (user.firstname || user.lastname) && (
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      color: "#6b7280",
                                      marginTop: 2,
                                    }}
                                  >
                                    {user.email}
                                  </Text>
                                )}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Description Input */}
              <View
                style={[
                  styles.inputWrap,
                  { alignItems: "flex-start", marginTop: 16 },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color="#f87b1b"
                  style={{ marginTop: 4 }}
                />
                <TextInput
                  placeholder="Description (optionnel)"
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input, { height: 120 }]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isDisabled && styles.submitButtonDisabled,
              ]}
              disabled={isDisabled}
              onPress={handleSubmit}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Enregistrement...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: { padding: 8 },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#f87b1b" },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 16 },
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
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, color: "#111827" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  submitButton: {
    backgroundColor: "#f87b1b",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { backgroundColor: "#d1d5db" },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  limitInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  limitInfoBannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
  },
  limitInfoText: {
    color: "#1e40af",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  limitInfoTextWarning: {
    color: "#b45309",
  },
  projectContextBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff7ed",
    borderColor: "#f87b1b",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
  },
  projectContextLabel: {
    fontSize: 10,
    color: "#f87b1b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  projectContextName: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  projectOwnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  projectOwnerText: {
    fontSize: 11,
    color: "#f87b1b",
    fontWeight: "600",
  },
});
