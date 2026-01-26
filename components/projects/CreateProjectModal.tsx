import API_CONFIG from "@/app/config/api";
import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import { createProject, getAllProjects } from "@/services/projectService";
import { getAllProjectTypes } from "@/services/projectTypeService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [projectTypeOpen, setProjectTypeOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<
    { id: string; firstname?: string; lastname?: string; email?: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [ownerOpen, setOwnerOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [technicienOpen, setTechnicienOpen] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
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
  const controlUsers = useMemo(
    () => companyUsers.filter((u) => u.id !== ownerId),
    [companyUsers, ownerId],
  );
  const technicienUsers = useMemo(
    () => companyUsers.filter((u) => u.id !== ownerId && u.id !== controlId),
    [companyUsers, ownerId, controlId],
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
    const roles = [ownerId, controlId, technicienId].filter(Boolean);
    const uniqueRoles = new Set(roles);
    if (roles.length !== uniqueRoles.size) {
      return "Un utilisateur ne peut pas être assigné à plusieurs rôles (Admin, Contrôleur, Technicien).";
    }

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

  useEffect(() => {
    async function loadProjectTypes() {
      if (!token) return;
      setLoadingTypes(true);
      try {
        const data = await getAllProjectTypes(token);
        setProjectTypes(
          data.map((t: any) => ({ id: String(t.id), title: t.title })),
        );
      } catch {
        setProjectTypes([]);
      } finally {
        setLoadingTypes(false);
      }
    }
    if (visible && token) loadProjectTypes();
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
      setTitle("");
      setDescription("");
      setDd("");
      setDf("");
      setOwnerId("");
      setControlId("");
      setTechnicienId("");
      setProjectTypeId("");
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
              {/* SECTION: Informations Générales */}
              <View style={stylesFS.section}>
                <Text style={stylesFS.sectionTitle}>
                  INFORMATIONS GÉNÉRALES
                </Text>

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

                <View
                  style={[
                    stylesFS.inputWrap,
                    {
                      marginBottom: 16,
                      height: 100,
                      alignItems: "flex-start",
                      paddingTop: 12,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#9ca3af"
                  />
                  <TextInput
                    placeholder="Description (optionnel)"
                    placeholderTextColor="#9ca3af"
                    value={description}
                    onChangeText={setDescription}
                    style={[
                      stylesFS.input,
                      { height: "100%", textAlignVertical: "top" },
                    ]}
                    multiline
                  />
                </View>

                {/* Project Type */}
                <View style={{ marginBottom: 8 }}>
                  <Text style={stylesFS.label}>Type de chantier</Text>
                  <TouchableOpacity
                    style={[
                      stylesFS.inputWrap,
                      { justifyContent: "space-between" },
                    ]}
                    onPress={() => setProjectTypeOpen((v) => !v)}
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
                        name="albums-outline"
                        size={20}
                        color="#9ca3af"
                      />
                      <Text
                        style={[
                          stylesFS.input,
                          { color: projectTypeId ? "#111827" : "#9ca3af" },
                        ]}
                        numberOfLines={1}
                      >
                        {projectTypeId
                          ? projectTypes.find(
                              (pt) => String(pt.id) === String(projectTypeId),
                            )?.title || projectTypeId
                          : "Sélectionner un type"}
                      </Text>
                    </View>
                    <Ionicons
                      name={projectTypeOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>

                  {projectTypeOpen && (
                    <View style={stylesFS.dropdownList}>
                      <ScrollView
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 200 }}
                      >
                        {loadingTypes ? (
                          <View style={{ padding: 12 }}>
                            <Text style={stylesFS.placeholderText}>
                              Chargement...
                            </Text>
                          </View>
                        ) : projectTypes.length === 0 ? (
                          <View style={{ padding: 12 }}>
                            <Text style={stylesFS.placeholderText}>
                              Aucun type disponible
                            </Text>
                          </View>
                        ) : (
                          projectTypes.map((pt) => (
                            <TouchableOpacity
                              key={pt.id}
                              onPress={() => {
                                setProjectTypeId(String(pt.id));
                                setProjectTypeOpen(false);
                              }}
                              style={[
                                stylesFS.dropdownItem,
                                String(projectTypeId) === String(pt.id) &&
                                  stylesFS.dropdownItemSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  stylesFS.dropdownItemText,
                                  String(projectTypeId) === String(pt.id) &&
                                    stylesFS.dropdownItemTextSelected,
                                ]}
                              >
                                {pt.title}
                              </Text>
                              {String(projectTypeId) === String(pt.id) && (
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

              {/* SECTION: Période */}
              <View style={stylesFS.section}>
                <Text style={stylesFS.sectionTitle}>PÉRIODE</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
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
              </View>

              {/* SECTION: Équipe */}
              <View style={stylesFS.section}>
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

                {/* Controller */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={stylesFS.label}>Contrôleur</Text>
                  <TouchableOpacity
                    style={[
                      stylesFS.inputWrap,
                      { justifyContent: "space-between" },
                    ]}
                    onPress={() => setControlOpen((v) => !v)}
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
                        name="shield-checkmark-outline"
                        size={20}
                        color="#9ca3af"
                      />
                      <Text
                        style={[
                          stylesFS.input,
                          { color: controlId ? "#111827" : "#9ca3af" },
                        ]}
                        numberOfLines={1}
                      >
                        {controlId
                          ? controlUsers.find(
                              (u) => String(u.id) === String(controlId),
                            )
                            ? `${controlUsers.find((u) => String(u.id) === String(controlId))?.firstname} ${controlUsers.find((u) => String(u.id) === String(controlId))?.lastname || ""}`
                            : controlId
                          : "Assigner un contrôleur"}
                      </Text>
                    </View>
                    <Ionicons
                      name={controlOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>

                  {controlOpen && (
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
                        ) : controlUsers.length === 0 ? (
                          <View style={{ padding: 12 }}>
                            <Text style={stylesFS.placeholderText}>
                              Aucun utilisateur
                            </Text>
                          </View>
                        ) : (
                          controlUsers.map((u) => (
                            <TouchableOpacity
                              key={u.id}
                              onPress={() => {
                                setControlId(String(u.id));
                                setControlOpen(false);
                              }}
                              style={[
                                stylesFS.dropdownItem,
                                String(controlId) === String(u.id) &&
                                  stylesFS.dropdownItemSelected,
                              ]}
                            >
                              <View>
                                <Text
                                  style={[
                                    stylesFS.dropdownItemText,
                                    String(controlId) === String(u.id) &&
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
                              {String(controlId) === String(u.id) && (
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

                {/* Technicien */}
                <View style={{ marginBottom: 0 }}>
                  <Text style={stylesFS.label}>Technicien</Text>
                  <TouchableOpacity
                    style={[
                      stylesFS.inputWrap,
                      { justifyContent: "space-between" },
                    ]}
                    onPress={() => setTechnicienOpen((v) => !v)}
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
                        name="construct-outline"
                        size={20}
                        color="#9ca3af"
                      />
                      <Text
                        style={[
                          stylesFS.input,
                          { color: technicienId ? "#111827" : "#9ca3af" },
                        ]}
                        numberOfLines={1}
                      >
                        {technicienId
                          ? technicienUsers.find(
                              (u) => String(u.id) === String(technicienId),
                            )
                            ? `${technicienUsers.find((u) => String(u.id) === String(technicienId))?.firstname} ${technicienUsers.find((u) => String(u.id) === String(technicienId))?.lastname || ""}`
                            : technicienId
                          : "Assigner un technicien"}
                      </Text>
                    </View>
                    <Ionicons
                      name={technicienOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>

                  {technicienOpen && (
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
                        ) : technicienUsers.length === 0 ? (
                          <View style={{ padding: 12 }}>
                            <Text style={stylesFS.placeholderText}>
                              Aucun utilisateur
                            </Text>
                          </View>
                        ) : (
                          technicienUsers.map((u) => (
                            <TouchableOpacity
                              key={u.id}
                              onPress={() => {
                                setTechnicienId(String(u.id));
                                setTechnicienOpen(false);
                              }}
                              style={[
                                stylesFS.dropdownItem,
                                String(technicienId) === String(u.id) &&
                                  stylesFS.dropdownItemSelected,
                              ]}
                            >
                              <View>
                                <Text
                                  style={[
                                    stylesFS.dropdownItemText,
                                    String(technicienId) === String(u.id) &&
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
                              {String(technicienId) === String(u.id) && (
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

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
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
    borderColor: "#E2E8F0",
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
    borderColor: "#E2E8F0",
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
