import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import companyService from "../../services/companyService";
import { getAllRoles } from "../../services/roleService";
import { createUser, getUsers } from "../../services/userService";
import { Company } from "../../types/company";
import { Role } from "../../types/role";
import { CreateUserData } from "../../types/user";

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

// Helper component for input field with icon
const InputField = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = "default",
  autoCapitalize = "none",
  required = false,
  fieldKey,
  loading,
  focusedInput,
  setFocusedInput,
}: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View
      style={[
        styles.inputWrapper,
        focusedInput === fieldKey && styles.inputWrapperFocused,
        error && styles.inputWrapperError,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          error ? "#ef4444" : focusedInput === fieldKey ? "#f87b1b" : "#9ca3af"
        }
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!loading}
        onFocus={() => setFocusedInput(fieldKey)}
        onBlur={() => setFocusedInput(null)}
      />
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

export default function CreateUserModal({
  visible,
  onClose,
  onUserCreated,
}: CreateUserModalProps) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentUserCount, setCurrentUserCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  // Focus states for inputs
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateUserData>({
    firstname: "",
    lastname: "",
    email: "",
    identifier: "",
    phone1: "",
    phone2: "",
    email_second: "",
    role_id: "",
    status_id: "",
    company_id: user?.company_id || "",
    interne: 1, // Default to internal
    represent: "",
  });

  useEffect(() => {
    if (visible) {
      setFormData({
        firstname: "",
        lastname: "",
        email: "",
        identifier: "",
        phone1: "",
        phone2: "",
        email_second: "",
        role_id: "",
        status_id: "", // Backend will set default to "pending"
        company_id: user?.company_id || "",
        interne: 1, // Default to internal
        represent: "",
      });
      setErrors({});
      fetchLimitInfo();
      fetchRoles();
    }
  }, [visible, user]);

  const fetchRoles = async () => {
    try {
      const fetchedRoles = await getAllRoles(token || undefined);
      setRoles(fetchedRoles);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  // Logic to handle role assignment based on User Type (Interne vs Externe)
  useEffect(() => {
    if (roles.length > 0) {
      const userRole = roles.find((r) => r.role.toLowerCase() === "user");

      if (formData.interne === 0) {
        // External User -> Force "User"
        if (userRole && formData.role_id !== userRole.id) {
          setFormData((prev) => ({ ...prev, role_id: userRole.id }));
        }
      } else {
        // Internal User -> Default to "User" if no role selected
        if (!formData.role_id && userRole) {
          setFormData((prev) => ({ ...prev, role_id: userRole.id }));
        }
      }
    }
  }, [formData.interne, roles]);

  const fetchLimitInfo = async () => {
    try {
      setLoadingLimits(true);
      const [company, users] = await Promise.all([
        companyService.getCompany(),
        getUsers(),
      ]);

      setCompanyInfo(company);
      setCurrentUserCount(users.length);

      const limit = company.nbusers || 2;
      setIsLimitReached(users.length >= limit);
    } catch (error) {
      console.error("Error fetching limit info:", error);
    } finally {
      setLoadingLimits(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstname.trim())
      newErrors.firstname = "Le prénom est obligatoire";
    if (!formData.lastname.trim())
      newErrors.lastname = "Le nom est obligatoire";
    if (!formData.identifier.trim())
      newErrors.identifier = "L'identifiant est obligatoire";

    if (!formData.email.trim()) {
      newErrors.email = "L'email est obligatoire";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Format d'email invalide";
      }
    }

    if (formData.email_second && formData.email_second.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email_second)) {
        newErrors.email_second = "Format d'email secondaire invalide";
      }
    }

    // Validate represent field for external users
    if (formData.interne === 0 && !formData.represent?.trim()) {
      newErrors.represent =
        "La société représentée est obligatoire pour les utilisateurs externes";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (isLimitReached) {
      Alert.alert(
        "Limite atteinte",
        `Vous avez atteint la limite de ${companyInfo?.nbusers || 2} utilisateurs. Veuillez mettre à niveau votre plan pour ajouter plus d'utilisateurs.`,
      );
      return;
    }

    try {
      setLoading(true);

      const dataToSend: any = {
        ...formData,
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        identifier: formData.identifier.trim(),
        email: formData.email.trim().toLowerCase(),
        phone1: formData.phone1?.trim() || undefined,
        phone2: formData.phone2?.trim() || undefined,
        email_second: formData.email_second?.trim().toLowerCase() || undefined,
        interne: formData.interne,
        represent:
          formData.interne === 0 ? formData.represent?.trim() : undefined,
      };

      if (!dataToSend.company_id) delete dataToSend.company_id;
      delete dataToSend.status_id;
      delete dataToSend.password;

      // Ensure role_id is set
      if (!dataToSend.role_id) {
        const userRole = roles.find((r) => r.role.toLowerCase() === "user");
        if (userRole) dataToSend.role_id = userRole.id;
      }

      await createUser(dataToSend);

      onUserCreated();
      onClose();
    } catch (error: any) {
      console.error("Error creating user:", error);

      if (error.response?.data?.error) {
        Alert.alert("Erreur", error.response.data.error);
      } else if (error.response?.status === 403) {
        Alert.alert(
          "Limite atteinte",
          `Vous avez atteint la limite de ${companyInfo?.nbusers || 2} utilisateurs.`,
        );
      } else {
        Alert.alert(
          "Erreur",
          error instanceof Error
            ? error.message
            : "Impossible de créer l'utilisateur",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <View style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nouvel Utilisateur</Text>
            <View style={{ width: 40 }} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
          >
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Limit Banner */}
              {!loadingLimits && companyInfo && (
                <View
                  style={[
                    styles.banner,
                    isLimitReached ? styles.bannerError : styles.bannerInfo,
                  ]}
                >
                  <Ionicons
                    name={isLimitReached ? "warning" : "information-circle"}
                    size={20}
                    color={isLimitReached ? "#ef4444" : "#f87b1b"}
                  />
                  <Text
                    style={[
                      styles.bannerText,
                      isLimitReached && styles.bannerTextError,
                    ]}
                  >
                    Utilisateurs: {currentUserCount} /{" "}
                    {companyInfo.nbusers || 2}
                  </Text>
                </View>
              )}

              {/* Section: Type d'utilisateur */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Type de compte</Text>
                <View style={styles.segmentContainer}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      formData.interne === 1 && styles.segmentButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, interne: 1, represent: "" })
                    }
                    disabled={loading}
                  >
                    <Ionicons
                      name="business"
                      size={18}
                      color={formData.interne === 1 ? "#fff" : "#6b7280"}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        formData.interne === 1 && styles.segmentTextActive,
                      ]}
                    >
                      Interne
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      formData.interne === 0 && styles.segmentButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, interne: 0 })}
                    disabled={loading}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={formData.interne === 0 ? "#fff" : "#6b7280"}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        formData.interne === 0 && styles.segmentTextActive,
                      ]}
                    >
                      Externe
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Section: Informations Personnelles */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Informations Personnelles
                </Text>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Prénom"
                      icon="person-outline"
                      value={formData.firstname}
                      onChangeText={(text: string) => {
                        setFormData({ ...formData, firstname: text });
                        if (errors.firstname)
                          setErrors({ ...errors, firstname: "" });
                      }}
                      placeholder="Prénom"
                      required
                      error={errors.firstname}
                      fieldKey="firstname"
                      autoCapitalize="words"
                      loading={loading}
                      focusedInput={focusedInput}
                      setFocusedInput={setFocusedInput}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Nom"
                      icon="person-outline"
                      value={formData.lastname}
                      onChangeText={(text: string) => {
                        setFormData({ ...formData, lastname: text });
                        if (errors.lastname)
                          setErrors({ ...errors, lastname: "" });
                      }}
                      placeholder="Nom"
                      required
                      error={errors.lastname}
                      fieldKey="lastname"
                      autoCapitalize="words"
                      loading={loading}
                      focusedInput={focusedInput}
                      setFocusedInput={setFocusedInput}
                    />
                  </View>
                </View>

                {formData.interne === 0 && (
                  <InputField
                    label="Société représentée"
                    icon="business-outline"
                    value={formData.represent}
                    onChangeText={(text: string) => {
                      setFormData({ ...formData, represent: text });
                      if (errors.represent)
                        setErrors({ ...errors, represent: "" });
                    }}
                    placeholder="Nom de la société"
                    required
                    error={errors.represent}
                    fieldKey="represent"
                    autoCapitalize="words"
                    loading={loading}
                    focusedInput={focusedInput}
                    setFocusedInput={setFocusedInput}
                  />
                )}
              </View>

              {/* Section: Connexion & Contact */}
              <View style={styles.section}>
                <InputField
                  label="Identifiant"
                  icon="finger-print-outline"
                  value={formData.identifier}
                  onChangeText={(text: string) => {
                    setFormData({ ...formData, identifier: text });
                    if (errors.identifier)
                      setErrors({ ...errors, identifier: "" });
                  }}
                  placeholder="Identifiant unique"
                  required
                  error={errors.identifier}
                  fieldKey="identifier"
                  loading={loading}
                  focusedInput={focusedInput}
                  setFocusedInput={setFocusedInput}
                />

                <InputField
                  label="Email"
                  icon="mail-outline"
                  value={formData.email}
                  onChangeText={(text: string) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  placeholder="exemple@email.com"
                  required
                  error={errors.email}
                  fieldKey="email"
                  keyboardType="email-address"
                  loading={loading}
                  focusedInput={focusedInput}
                  setFocusedInput={setFocusedInput}
                />

                <InputField
                  label="Téléphone"
                  icon="call-outline"
                  value={formData.phone1}
                  onChangeText={(text: string) =>
                    setFormData({ ...formData, phone1: text })
                  }
                  placeholder="+33 6 12 34 56 78"
                  fieldKey="phone1"
                  keyboardType="phone-pad"
                  loading={loading}
                  focusedInput={focusedInput}
                  setFocusedInput={setFocusedInput}
                />
              </View>

              {/* Section: Rôle (Only for Internal) */}
              {formData.interne === 1 && roles.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Rôle</Text>
                  <View style={styles.rolesContainer}>
                    {roles
                      .filter((r) =>
                        ["admin", "user"].includes(r.role.toLowerCase()),
                      )
                      .map((role) => {
                        const isSelected = formData.role_id === role.id;
                        const isAdmin = role.role.toLowerCase() === "admin";
                        return (
                          <TouchableOpacity
                            key={role.id}
                            style={[
                              styles.roleCard,
                              isSelected && styles.roleCardActive,
                            ]}
                            onPress={() =>
                              setFormData({ ...formData, role_id: role.id })
                            }
                            disabled={loading}
                          >
                            <View
                              style={[
                                styles.roleIconWrapper,
                                isSelected && styles.roleIconWrapperActive,
                              ]}
                            >
                              <Ionicons
                                name={isAdmin ? "shield-checkmark" : "person"}
                                size={24}
                                color={isSelected ? "#fff" : "#6b7280"}
                              />
                            </View>
                            <Text
                              style={[
                                styles.roleTitle,
                                isSelected && styles.roleTitleActive,
                              ]}
                            >
                              {role.role}
                            </Text>
                            <View
                              style={[
                                styles.radioCircle,
                                isSelected && styles.radioCircleSelected,
                              ]}
                            >
                              {isSelected && (
                                <View style={styles.radioInnerCircle} />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              )}

              {/* Advanced Options Toggle (Optional - collapsing secondary fields) */}
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { opacity: 0.5, fontSize: 13, marginBottom: 10 },
                  ]}
                >
                  OPTIONNEL
                </Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Email Secondaire"
                      icon="mail-open-outline"
                      value={formData.email_second}
                      onChangeText={(text: string) => {
                        setFormData({ ...formData, email_second: text });
                        if (errors.email_second)
                          setErrors({ ...errors, email_second: "" });
                      }}
                      placeholder="Autre email"
                      fieldKey="email_second"
                      keyboardType="email-address"
                      error={errors.email_second}
                      loading={loading}
                      focusedInput={focusedInput}
                      setFocusedInput={setFocusedInput}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Tél. Secondaire"
                      icon="call-outline"
                      value={formData.phone2}
                      onChangeText={(text: string) =>
                        setFormData({ ...formData, phone2: text })
                      }
                      placeholder="Autre tél"
                      fieldKey="phone2"
                      keyboardType="phone-pad"
                      loading={loading}
                      focusedInput={focusedInput}
                      setFocusedInput={setFocusedInput}
                    />
                  </View>
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading || isLimitReached) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || isLimitReached}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    Créer l'utilisateur
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f9fafb", // Light gray background for the modal
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  bannerInfo: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  bannerError: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#f87b1b",
    flex: 1,
  },
  bannerTextError: {
    color: "#ef4444",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
  },
  // Inputs
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#f87b1b",
    fontWeight: "700",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: "#f87b1b",
    borderWidth: 1.5,
  },
  inputWrapperError: {
    borderColor: "#ef4444",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    height: "100%",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    marginLeft: 4,
  },
  // Segment Control
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  segmentButtonActive: {
    backgroundColor: "#f87b1b",
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  segmentTextActive: {
    color: "white",
  },
  // Role Cards
  rolesContainer: {
    flexDirection: "row",
    gap: 12,
  },
  roleCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roleCardActive: {
    borderColor: "#f87b1b",
    backgroundColor: "#fff7ed",
  },
  roleIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  roleIconWrapperActive: {
    backgroundColor: "#f87b1b",
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  roleTitleActive: {
    color: "#111827",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#f87b1b",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f87b1b",
  },
  // Footer
  footer: {
    padding: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    flexDirection: "row",
    gap: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 24, // Extra padding for iPhone home indicator
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#f87b1b",
    gap: 8,
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    backgroundColor: "#fdba74",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
