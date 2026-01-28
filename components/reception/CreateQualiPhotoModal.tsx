import API_CONFIG from "@/app/config/api";
import { ICONS } from "@/constants/Icons";
import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import folderService, {
    CreateFolderPayload,
    Folder,
} from "@/services/folderService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
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
import VoiceNoteRecorder from "../VoiceNoteRecorder";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (created: Folder) => void;
  projectId?: string;
  zoneId?: string;
  assignedOwnerId?: string;
};

export default function CreateQualiPhotoModal({
  visible,
  onClose,
  onSuccess,
  projectId,
  zoneId,
  assignedOwnerId,
}: Props) {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const isController =
    user?.role === "Controller" || user?.role === "Contrôleur";
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyUsers, setCompanyUsers] = useState<
    { id: string; firstname?: string; lastname?: string; email?: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [ownerId, setOwnerId] = useState("");

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentFoldersCount, setCurrentFoldersCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const adminUser = useMemo(
    () => companyUsers.find((u) => u.id === ownerId),
    [companyUsers, ownerId],
  );

  useEffect(() => {
    if (visible) {
      // Use assigned owner if provided, otherwise default to current user
      if (assignedOwnerId) {
        setOwnerId(assignedOwnerId);
      } else if (user?.id) {
        setOwnerId(user.id);
      }
    }
  }, [visible, user, assignedOwnerId]);

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

  useEffect(() => {
    async function loadUsers() {
      if (!visible) return;
      if (!token) {
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
        if (Array.isArray(data)) setCompanyUsers(data);
        else setCompanyUsers([]);
      } catch {
        setCompanyUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, [visible, token]);

  const isDisabled = useMemo(
    () => !title || !token || submitting || isLimitReached,
    [title, token, submitting, isLimitReached],
  );

  const handleSubmit = async () => {
    if (!token) return;
    setError(null);
    if (!title || title.trim().length === 0) {
      setError("Veuillez saisir un titre.");
      return;
    }

    if (isLimitReached) {
      setError(
        `Vous avez atteint la limite de ${companyInfo?.nbfolders || 2} dossiers. Veuillez mettre à niveau votre plan pour ajouter plus de dossiers.`,
      );
      return;
    }

    const roles = [ownerId].filter(Boolean);
    const uniqueRoles = new Set(roles);

    setSubmitting(true);
    try {
      const payload: CreateFolderPayload = {
        code: `F-${Date.now().toString(36).toUpperCase()}`,
        title,
        description,
        owner_id: ownerId || undefined,
        // Removed control_id and technicien_id as requested
        control_id: undefined,
        technicien_id: undefined,
        project_id: projectId,
        zone_id: zoneId,
      };
      const created = await folderService.createFolder(payload, token);
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
    // Do not reset ownerId here to keep it stable if needed, or reset to defaults in useEffect
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

              <View style={{ gap: 8, marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: "#6b7280", marginLeft: 2 }}>
                  Propriétaire
                </Text>
                <TouchableOpacity
                  style={[
                    styles.inputWrap,
                    { justifyContent: "space-between" },
                    styles.disabledInput,
                  ]}
                  disabled
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
                      {adminUser
                        ? `${adminUser.firstname || ""} ${adminUser.lastname || ""}`.trim() ||
                          adminUser.email
                        : loadingUsers
                          ? "Chargement..."
                          : assignedOwnerId
                            ? "Utilisateur sélectionné"
                            : user?.email || "Admin non défini"}
                    </Text>
                  </View>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 16 }}>
                <VoiceNoteRecorder
                  onRecordingComplete={() => {
                    // Not saving audio file here, just using for transcription
                  }}
                  onTranscriptionComplete={(text) => {
                    setDescription((prev) =>
                      prev ? `${prev}\n${text}` : text,
                    );
                  }}
                />
              </View>

              <View style={[styles.inputWrap, { alignItems: "flex-start" }]}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color="#f87b1b"
                  style={{ marginTop: 4 }}
                />
                <TextInput
                  placeholder="Introduction"
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input, { height: 250 }]}
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
                  <Ionicons name="hourglass" size={20} color="#FFFFFF" />
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
  disabledInput: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
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
});
