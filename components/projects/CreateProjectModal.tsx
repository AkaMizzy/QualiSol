import API_CONFIG from "@/app/config/api";
import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import { createGed } from "@/services/gedService";
import { createProject, getAllProjects } from "@/services/projectService";

import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

export default function CreateProjectModal({
  visible,
  onClose,
  onCreated,
}: Props) {
  const { token, user } = useAuth();
  // const isSuperAdmin = user?.role === "Super Admin"; // No longer needed

  const [title, setTitle] = useState("");
  const [logo, setLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [dd, setDd] = useState("");
  const [df, setDf] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const [companyUsers, setCompanyUsers] = useState<
    { id: string; firstname?: string; lastname?: string; email?: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [ownerOpen, setOwnerOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDdPickerVisible, setDdPickerVisible] = useState(false);
  const [isDfPickerVisible, setDfPickerVisible] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentChantiersCount, setCurrentChantiersCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const adminUser = useMemo(
    () => companyUsers.find((u) => u.id === ownerId),
    [companyUsers, ownerId],
  );

  const isDisabled = useMemo(() => !title || !token, [title, token]);

  function validate(): string | null {
    if (!title) return "Le titre est requis";
    // dd/df are optional; if both provided, ensure ordering
    if (dd && df) {
      const start = new Date(dd);
      const end = new Date(df);
      if (isNaN(start.getTime()) || isNaN(end.getTime()))
        return "Dates invalides";
      if (start >= end)
        return "La date de fin doit être postérieure à la date de début";
    }

    // Check for duplicate role assignments
    // const roles = [ownerId].filter(Boolean);
    // const uniqueRoles = new Set(roles);
    // if (roles.length !== uniqueRoles.size) {
    //   return "Un utilisateur ne peut pas être assigné à plusieurs rôles (Admin, Contrôleur, Technicien).";
    // }

    return null;
  }

  useEffect(() => {
    if (visible) {
      fetchLimitInfo();
    }
  }, [visible]);

  const fetchLimitInfo = async () => {
    try {
      setLoadingLimits(true);
      if (!token) return;

      const [company, projects] = await Promise.all([
        companyService.getCompany(),
        getAllProjects(token),
      ]);

      setCompanyInfo(company);

      // Filter projects by user's company_id to get accurate count
      // This ensures Super Admin only counts their own company's projects
      const companyProjects = projects.filter(
        (p) => p.company_id === company.id,
      );
      setCurrentChantiersCount(companyProjects.length);

      const limit = company.nbchanitiers || 2;
      setIsLimitReached(companyProjects.length >= limit);
    } catch (error) {
      console.error("Error fetching limit info:", error);
    } finally {
      setLoadingLimits(false);
    }
  };

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

        if (Array.isArray(data)) {
          setCompanyUsers(data);
        } else {
          setCompanyUsers([]);
        }
      } catch {
        setCompanyUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, [visible, token]);

  function generateProjectCode() {
    const ts = Date.now().toString(36).toUpperCase();
    return `PRJ-${ts}`;
  }

  async function onSubmit() {
    if (!token) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isLimitReached) {
      Alert.alert(
        "Limite atteinte",
        `Vous avez atteint la limite de ${companyInfo?.nbchanitiers || 2} chantiers. Veuillez mettre à niveau votre plan pour ajouter plus de chantiers.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createProject(token, {
        code: generateProjectCode(),
        title,
        dd: dd || (undefined as any),
        df: df || (undefined as any),
        owner_id: ownerId || undefined,
        // @ts-ignore - Fields removed from UI but might be required by type
        control_id: undefined,
        // @ts-ignore - Fields removed from UI but might be required by type
        technicien_id: undefined,
      });

      // Upload Logo if selected
      if (logo && res.data?.id) {
        try {
          await createGed(token, {
            idsource: res.data.id,
            kind: "chantier_logo",
            title: "Logo du chantier",
            file: {
              uri: logo.uri,
              type: logo.mimeType || "image/jpeg",
              name: logo.fileName || "logo.jpg",
            },
            author: user?.id || "Unknown",
            idauthor: user?.id,
            answer: null, // compliant with type
            description: "Logo du chantier",
            mode: "upload",
          });
        } catch (uploadError) {
          console.error("Logo upload failed", uploadError);
          Alert.alert(
            "Info",
            "Le chantier a été créé mais le logo n'a pas pu être téléchargé.",
          );
        }
      }

      setTitle("");
      setLogo(null);
      setDd("");
      setDf("");
      setOwnerId("");

      setError(null);
      if (onCreated) await onCreated();
      onClose();
      Alert.alert("Succès", "Chantier créé avec succès");
    } catch (e: any) {
      // Handle 403 error specifically for limit reached
      if (
        e?.message?.includes("limit") ||
        e?.message?.includes("Chantier limit")
      ) {
        Alert.alert(
          "Limite atteinte",
          e?.message ||
            `Vous avez atteint la limite de ${companyInfo?.nbchanitiers || 2} chantiers.`,
        );
      } else {
        setError(e?.message || "Création échouée");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatDate(date: Date) {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return `${y}-${m}-${d}`;
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <SafeAreaView style={stylesFS.container}>
            {/* Header */}
            <View style={stylesFS.header}>
              <TouchableOpacity onPress={onClose} style={stylesFS.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <View style={stylesFS.headerCenter}>
                <Text style={stylesFS.headerTitle}>Créer un chantier</Text>
              </View>
              <View style={stylesFS.placeholder} />
            </View>

            {/* Error Banner */}
            {error && (
              <View style={stylesFS.alertBanner}>
                <Ionicons name="warning" size={16} color="#b45309" />
                <Text style={stylesFS.alertBannerText}>{error}</Text>
                <TouchableOpacity onPress={() => setError(null)}>
                  <Ionicons name="close" size={16} color="#b45309" />
                </TouchableOpacity>
              </View>
            )}

            {/* Limit Info Banner */}
            {!loadingLimits && companyInfo && (
              <View
                style={[
                  stylesFS.limitInfoBanner,
                  isLimitReached && stylesFS.limitInfoBannerWarning,
                ]}
              >
                <Ionicons
                  name={isLimitReached ? "warning" : "business"}
                  size={16}
                  color={isLimitReached ? "#b45309" : "#3b82f6"}
                />
                <Text
                  style={[
                    stylesFS.limitInfoText,
                    isLimitReached && stylesFS.limitInfoTextWarning,
                  ]}
                >
                  Chantiers: {currentChantiersCount} /{" "}
                  {companyInfo.nbchanitiers || 2}
                  {isLimitReached && " - Limite atteinte"}
                </Text>
              </View>
            )}

            {/* Content */}
            <ScrollView
              style={stylesFS.content}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={stylesFS.card}>
                <Text style={stylesFS.sectionTitle}>
                  INFORMATIONS GÉNÉRALES
                </Text>

                {/* Logo Upload */}
                <View style={{ alignItems: "center", marginBottom: 24 }}>
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
                        allowsEditing: true, // Allow cropping for better logos
                        aspect: [1, 1], // Square aspect ratio for logos usually better
                        quality: 0.8,
                      });

                      if (!result.canceled) {
                        setLogo(result.assets[0]);
                      }
                    }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      backgroundColor: "#F1F5F9",
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                      borderStyle: "dashed",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    {logo ? (
                      <Image
                        source={{ uri: logo.uri }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <View style={{ alignItems: "center" }}>
                        <Ionicons
                          name="camera-outline"
                          size={32}
                          color="#94a3b8"
                        />
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            marginTop: 4,
                          }}
                        >
                          Logo
                        </Text>
                      </View>
                    )}
                    {logo && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: "rgba(0,0,0,0.4)",
                          height: 24,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="create" size={14} color="#FFF" />
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
                    Ajouter un logo (optionnel)
                  </Text>
                </View>

                <View style={[stylesFS.inputWrap, { marginBottom: 16 }]}>
                  <Ionicons name="text-outline" size={20} color="#9ca3af" />
                  <TextInput
                    placeholder="Titre du chantier *"
                    placeholderTextColor="#9ca3af"
                    value={title}
                    onChangeText={setTitle}
                    style={stylesFS.input}
                  />
                </View>

                <Text style={stylesFS.sectionTitle}>PÉRIODE</Text>

                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}
                >
                  <TouchableOpacity
                    style={[stylesFS.inputWrap, { flex: 1 }]}
                    onPress={() => setDdPickerVisible(true)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#9ca3af"
                    />
                    <View>
                      <Text style={stylesFS.labelSmall}>Début</Text>
                      <Text
                        style={[stylesFS.dateText, !dd && { color: "#9ca3af" }]}
                      >
                        {dd || "--/--/----"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[stylesFS.inputWrap, { flex: 1 }]}
                    onPress={() => setDfPickerVisible(true)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#9ca3af"
                    />
                    <View>
                      <Text style={stylesFS.labelSmall}>Fin</Text>
                      <Text
                        style={[stylesFS.dateText, !df && { color: "#9ca3af" }]}
                      >
                        {df || "--/--/----"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={stylesFS.sectionTitle}>ÉQUIPE</Text>

                {/* Admin */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={stylesFS.label}>
                    Administrateur (Chef de projet)
                  </Text>
                  <TouchableOpacity
                    style={[
                      stylesFS.inputWrap,
                      { justifyContent: "space-between" },
                    ]}
                    onPress={() => setOwnerOpen((v) => !v)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        flex: 1,
                      }}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={20}
                        color="#9ca3af"
                      />
                      <Text
                        style={[
                          stylesFS.input,
                          { color: ownerId ? "#111827" : "#9ca3af" },
                        ]}
                        numberOfLines={1}
                      >
                        {ownerId
                          ? companyUsers.find(
                              (u) => String(u.id) === String(ownerId),
                            )
                            ? `${companyUsers.find((u) => String(u.id) === String(ownerId))?.firstname} ${companyUsers.find((u) => String(u.id) === String(ownerId))?.lastname || ""}`
                            : ownerId
                          : "Assigner un administrateur"}
                      </Text>
                    </View>
                    <Ionicons
                      name={ownerOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>

                  {ownerOpen && (
                    <View style={stylesFS.dropdownList}>
                      <ScrollView
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 200 }}
                      >
                        {loadingUsers ? (
                          <View style={{ padding: 12 }}>
                            <Text style={stylesFS.placeholderText}>
                              Chargement...
                            </Text>
                          </View>
                        ) : companyUsers.length === 0 ? (
                          <View style={{ padding: 12 }}>
                            <Text style={stylesFS.placeholderText}>
                              Aucun utilisateur
                            </Text>
                          </View>
                        ) : (
                          companyUsers.map((u) => (
                            <TouchableOpacity
                              key={u.id}
                              onPress={() => {
                                setOwnerId(String(u.id));
                                setOwnerOpen(false);
                              }}
                              style={[
                                stylesFS.dropdownItem,
                                String(ownerId) === String(u.id) &&
                                  stylesFS.dropdownItemSelected,
                              ]}
                            >
                              <View>
                                <Text
                                  style={[
                                    stylesFS.dropdownItemText,
                                    String(ownerId) === String(u.id) &&
                                      stylesFS.dropdownItemTextSelected,
                                  ]}
                                >
                                  {u.firstname} {u.lastname}
                                </Text>
                                {u.email && (
                                  <Text
                                    style={{ fontSize: 11, color: "#9ca3af" }}
                                  >
                                    {u.email}
                                  </Text>
                                )}
                              </View>
                              {String(ownerId) === String(u.id) && (
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color="#f87b1b"
                                />
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={stylesFS.footer}>
              <TouchableOpacity
                style={[
                  stylesFS.submitButton,
                  (!token || isSubmitting || isDisabled || isLimitReached) &&
                    stylesFS.submitButtonDisabled,
                ]}
                disabled={
                  !token || isSubmitting || isDisabled || isLimitReached
                }
                onPress={onSubmit}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={stylesFS.submitButtonText}>
                      Enregistrement...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#FFFFFF" />
                    <Text style={stylesFS.submitButtonText}>
                      Créer le chantier
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Date Pickers */}
            <DateTimePickerModal
              key="dd-picker"
              isVisible={isDdPickerVisible}
              mode="date"
              onConfirm={(date) => {
                setDd(formatDate(date));
                setDdPickerVisible(false);
              }}
              onCancel={() => setDdPickerVisible(false)}
            />
            <DateTimePickerModal
              key="df-picker"
              isVisible={isDfPickerVisible}
              mode="date"
              onConfirm={(date) => {
                setDf(formatDate(date));
                setDfPickerVisible(false);
              }}
              onCancel={() => setDfPickerVisible(false)}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const stylesFS = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  closeButton: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  placeholder: { width: 44 },

  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  alertBannerText: {
    color: "#991B1B",
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 16,
    letterSpacing: 0.5,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: { flex: 1, color: "#0F172A", fontSize: 15 },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 6,
    marginLeft: 2,
  },
  labelSmall: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
  },

  dropdownList: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemSelected: {
    backgroundColor: "#FFF7ED",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#334155",
  },
  dropdownItemTextSelected: {
    color: "#C2410C",
    fontWeight: "600",
  },
  placeholderText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 0 : 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  submitButton: {
    backgroundColor: "#F97316",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: { backgroundColor: "#CBD5E1", shadowOpacity: 0 },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  limitInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  limitInfoBannerWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  limitInfoText: {
    color: "#1E40AF",
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  limitInfoTextWarning: {
    color: "#B45309",
  },
});
