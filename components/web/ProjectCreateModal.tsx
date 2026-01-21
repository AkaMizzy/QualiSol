import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import { createProject, getAllProjects } from "@/services/projectService";
import { getAllProjectTypes } from "@/services/projectTypeService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

export default function ProjectCreateModal({
  visible,
  onClose,
  onCreated,
}: Props) {
  const { token, user } = useAuth();
  const isSuperAdmin = user?.role === "Super Admin";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dd, setDd] = useState("");
  const [df, setDf] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [controlId, setControlId] = useState("");
  const [technicienId, setTechnicienId] = useState("");
  const [projectTypeId, setProjectTypeId] = useState("");
  const [projectTypes, setProjectTypes] = useState<
    { id: string; title: string }[]
  >([]);
  const [companyUsers, setCompanyUsers] = useState<
    { id: string; firstname?: string; lastname?: string; email?: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDdPickerVisible, setDdPickerVisible] = useState(false);
  const [isDfPickerVisible, setDfPickerVisible] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentChantiersCount, setCurrentChantiersCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  useEffect(() => {
    if (visible) {
      resetForm();
      fetchInitialData();
    }
  }, [visible]);

  const fetchInitialData = async () => {
    if (!token) return;
    try {
      setLoadingLimits(true);
      const [company, projects, types, users] = await Promise.all([
        companyService.getCompany(),
        getAllProjects(token),
        getAllProjectTypes(token),
        fetchUsers(),
      ]);

      setCompanyInfo(company);
      const companyProjects = projects.filter(
        (p) => p.company_id === company.id,
      );
      setCurrentChantiersCount(companyProjects.length);
      const limit = company.nbchanitiers || 2;
      setIsLimitReached(companyProjects.length >= limit);

      setProjectTypes(
        types.map((t: any) => ({ id: String(t.id), title: t.title })),
      );
      setCompanyUsers(users);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoadingLimits(false);
    }
  };

  const fetchUsers = async (): Promise<any[]> => {
    if (!token) return [];
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/users`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDd("");
    setDf("");
    setOwnerId("");
    setControlId("");
    setTechnicienId("");
    setProjectTypeId("");
    setError(null);
  };

  const validate = (): string | null => {
    if (!title) return "Le titre est requis";
    if (dd && df) {
      const start = new Date(dd);
      const end = new Date(df);
      if (isNaN(start.getTime()) || isNaN(end.getTime()))
        return "Dates invalides";
      if (start >= end)
        return "La date de fin doit être postérieure à la date de début";
    }

    const roles = [ownerId, controlId, technicienId].filter(Boolean);
    const uniqueRoles = new Set(roles);
    if (roles.length !== uniqueRoles.size) {
      return "Un utilisateur ne peut pas être assigné à plusieurs rôles.";
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!token) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isLimitReached) {
      Alert.alert(
        "Limite atteinte",
        `Vous avez atteint la limite de ${companyInfo?.nbchanitiers || 2} chantiers.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await createProject(token, {
        code: generateProjectCode(),
        title,
        description: description || undefined,
        dd: dd || (undefined as any),
        df: df || (undefined as any),
        owner_id: ownerId || undefined,
        control_id: controlId,
        technicien_id: technicienId,
        projecttype_id: projectTypeId || undefined,
      });
      if (onCreated) await onCreated();
      onClose();
      Alert.alert("Succès", "Chantier créé avec succès");
    } catch (e: any) {
      setError(e?.message || "Création échouée");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateProjectCode = () => {
    const ts = Date.now().toString(36).toUpperCase();
    return `PRJ-${ts}`;
  };

  const formatDate = (date: Date) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Créer un chantier</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Ionicons name="close" size={16} color="#b45309" />
              </TouchableOpacity>
            </View>
          )}

          {/* Limit Info */}
          {!loadingLimits && companyInfo && (
            <View
              style={[
                styles.infoBanner,
                isLimitReached && styles.warningBanner,
              ]}
            >
              <Text style={styles.infoText}>
                Chantiers: {currentChantiersCount} /{" "}
                {companyInfo.nbchanitiers || 2}
                {isLimitReached && " - Limite atteinte"}
              </Text>
            </View>
          )}

          {/* Form */}
          <ScrollView style={styles.content}>
            <View style={styles.formGrid}>
              {/* Title (Full Width) */}
              <View style={styles.formGroupFull}>
                <Text style={styles.label}>Titre *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Titre du chantier"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Dates (Two Column) */}
              {!isSuperAdmin && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Date de début</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setDdPickerVisible(true)}
                    >
                      <Text
                        style={{ color: dd ? COLORS.tertiary : COLORS.gray }}
                      >
                        {dd || "YYYY-MM-DD"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Date de fin</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setDfPickerVisible(true)}
                    >
                      <Text
                        style={{ color: df ? COLORS.tertiary : COLORS.gray }}
                      >
                        {df || "YYYY-MM-DD"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Description (Full Width) */}
              {!isSuperAdmin && (
                <View style={styles.formGroupFull}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description du chantier"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Créer</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={isDdPickerVisible}
        mode="date"
        onConfirm={(date) => {
          setDd(formatDate(date));
          setDdPickerVisible(false);
        }}
        onCancel={() => setDdPickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={isDfPickerVisible}
        mode="date"
        onConfirm={(date) => {
          setDf(formatDate(date));
          setDfPickerVisible(false);
        }}
        onCancel={() => setDfPickerVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    maxWidth: 800,
    maxHeight: "90%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray2,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 20,
    color: COLORS.tertiary,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: "#b45309",
  },
  infoBanner: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 8,
  },
  warningBanner: {
    backgroundColor: "#fffbeb",
  },
  infoText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: "#1e40af",
  },
  content: {
    padding: 24,
  },
  formGrid: {
    gap: 20,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
  } as any,
  formGroup: {
    gap: 8,
  },
  formGroupFull: {
    gap: 8,
    gridColumn: "1 / -1",
  } as any,
  label: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  input: {
    backgroundColor: COLORS.lightWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    outlineStyle: "none",
  } as any,
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray2,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  cancelButtonText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    minWidth: 100,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
});
