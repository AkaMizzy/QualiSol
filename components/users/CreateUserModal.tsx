import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
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
      const adminRole = roles.find((r) => r.role.toLowerCase() === "admin");

      if (formData.interne === 0) {
        // External User -> Force "Admin"
        if (adminRole && formData.role_id !== adminRole.id) {
          setFormData((prev) => ({ ...prev, role_id: adminRole.id }));
        }
      } else {
        // Internal User -> Default to "Admin" if no role selected (or keep current if valid)
        // We want to force a selection or default to Admin.
        if (!formData.role_id && adminRole) {
          setFormData((prev) => ({ ...prev, role_id: adminRole.id }));
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

    // role_id and status_id will be set by backend defaults

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

      // Omit company_id if not available (backend will read from token)
      // Omit company_id if not available (backend will read from token)
      if (!dataToSend.company_id) delete dataToSend.company_id;

      // Omit status_id - backend will set defaults
      delete dataToSend.status_id;
      // Password is generated by backend automatically
      delete dataToSend.password;

      // Ensure role_id is set
      if (!dataToSend.role_id) {
        // Fallback if role missing (should not happen with logic)
        const adminRole = roles.find((r) => r.role.toLowerCase() === "admin");
        if (adminRole) dataToSend.role_id = adminRole.id;
      }

      await createUser(dataToSend);

      onUserCreated();
      onClose();
    } catch (error: any) {
      console.error("Error creating user:", error);

      // Handle 403 (Limit) and 409 (Conflict) specifically, or general errors
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
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleClose} disabled={loading}>
                <Ionicons name="close" size={24} color="#11224e" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Créer un utilisateur</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContainer}>
                {/* Limit Info Banner */}
                {!loadingLimits && companyInfo && (
                  <View
                    style={[
                      styles.limitInfoCard,
                      isLimitReached && styles.limitInfoCardWarning,
                    ]}
                  >
                    <View style={styles.limitInfoHeader}>
                      <Ionicons
                        name={isLimitReached ? "warning" : "people"}
                        size={20}
                        color={isLimitReached ? "#dc2626" : "#3b82f6"}
                      />
                      <Text
                        style={[
                          styles.limitInfoTitle,
                          isLimitReached && styles.limitInfoTitleWarning,
                        ]}
                      >
                        Utilisateurs: {currentUserCount} /{" "}
                        {companyInfo.nbusers || 2}
                      </Text>
                    </View>
                    {isLimitReached && (
                      <Text style={styles.limitWarningText}>
                        ⚠️ Nombre d'utilisateurs dépassé. Veuillez mettre à
                        niveau votre plan pour ajouter plus d'utilisateurs.
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.nameRow}>
                  <View style={styles.nameCol}>
                    <Text style={styles.label}>
                      Prénom <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.firstname && styles.inputError,
                      ]}
                      value={formData.firstname}
                      onChangeText={(text) => {
                        setFormData({ ...formData, firstname: text });
                        if (errors.firstname)
                          setErrors({ ...errors, firstname: "" });
                      }}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                    {errors.firstname && (
                      <Text style={styles.errorText}>{errors.firstname}</Text>
                    )}
                  </View>

                  <View style={styles.nameCol}>
                    <Text style={styles.label}>
                      Nom <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.lastname && styles.inputError,
                      ]}
                      value={formData.lastname}
                      onChangeText={(text) => {
                        setFormData({ ...formData, lastname: text });
                        if (errors.lastname)
                          setErrors({ ...errors, lastname: "" });
                      }}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                    {errors.lastname && (
                      <Text style={styles.errorText}>{errors.lastname}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Identifiant <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.identifier && styles.inputError,
                    ]}
                    value={formData.identifier}
                    onChangeText={(text) => {
                      setFormData({ ...formData, identifier: text });
                      if (errors.identifier)
                        setErrors({ ...errors, identifier: "" });
                    }}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  {errors.identifier && (
                    <Text style={styles.errorText}>{errors.identifier}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Email <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email: text });
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    placeholder="email@exemple.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Téléphone principal</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone1}
                    onChangeText={(text) =>
                      setFormData({ ...formData, phone1: text })
                    }
                    placeholder="+212 1 23 45 67 89"
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Téléphone secondaire</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone2}
                    onChangeText={(text) =>
                      setFormData({ ...formData, phone2: text })
                    }
                    placeholder="+212 1 23 45 67 89"
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email secondaire</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.email_second && styles.inputError,
                    ]}
                    value={formData.email_second}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email_second: text });
                      if (errors.email_second)
                        setErrors({ ...errors, email_second: "" });
                    }}
                    placeholder="email2@exemple.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  {errors.email_second && (
                    <Text style={styles.errorText}>{errors.email_second}</Text>
                  )}
                </View>

                {/* Internal/External User Toggle */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Type d'utilisateur</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        formData.interne === 1 && styles.toggleButtonActive,
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
                          styles.toggleButtonText,
                          formData.interne === 1 &&
                            styles.toggleButtonTextActive,
                        ]}
                      >
                        Interne
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        formData.interne === 0 && styles.toggleButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, interne: 0 })}
                      disabled={loading}
                    >
                      <Ionicons
                        name="globe"
                        size={18}
                        color={formData.interne === 0 ? "#fff" : "#6b7280"}
                      />
                      <Text
                        style={[
                          styles.toggleButtonText,
                          formData.interne === 0 &&
                            styles.toggleButtonTextActive,
                        ]}
                      >
                        Externe
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Role Selection - Only for Internal Users */}
                {formData.interne === 1 && roles.length > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Rôle</Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {roles
                        .filter((r) =>
                          ["admin", "user"].includes(r.role.toLowerCase()),
                        )
                        .map((role) => (
                          <TouchableOpacity
                            key={role.id}
                            style={[
                              styles.toggleButton,
                              formData.role_id === role.id &&
                                styles.toggleButtonActive,
                              { flex: 1 },
                            ]}
                            onPress={() =>
                              setFormData({ ...formData, role_id: role.id })
                            }
                            disabled={loading}
                          >
                            <Ionicons
                              name={
                                role.role.toLowerCase() === "admin"
                                  ? "shield-checkmark"
                                  : "person"
                              }
                              size={18}
                              color={
                                formData.role_id === role.id
                                  ? "#fff"
                                  : "#6b7280"
                              }
                            />
                            <Text
                              style={[
                                styles.toggleButtonText,
                                formData.role_id === role.id &&
                                  styles.toggleButtonTextActive,
                              ]}
                            >
                              {role.role}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                )}

                {/* Represent field - only shown for external users */}
                {formData.interne === 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Société représentée <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.represent && styles.inputError,
                      ]}
                      value={formData.represent}
                      onChangeText={(text) => {
                        setFormData({ ...formData, represent: text });
                        if (errors.represent)
                          setErrors({ ...errors, represent: "" });
                      }}
                      placeholder="Nom de la société représentée"
                      editable={!loading}
                    />
                    {errors.represent && (
                      <Text style={styles.errorText}>{errors.represent}</Text>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (loading || isLimitReached) && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading || isLimitReached}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color="white" />
                    <Text style={styles.submitButtonText}>
                      Créer l&apos;utilisateur
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#11224e",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "white",
  },
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  nameCol: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 6,
    fontWeight: "500" as const,
  },
  infoCard: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1e40af",
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: "row" as const,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center" as const,
    backgroundColor: "white",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#6b7280",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#f87b1b",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: "#f87b1b",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "white",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  limitInfoCard: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  limitInfoCardWarning: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  limitInfoHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  limitInfoTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1e40af",
    marginLeft: 8,
  },
  limitInfoTitleWarning: {
    color: "#dc2626",
  },
  limitWarningText: {
    fontSize: 14,
    color: "#dc2626",
    marginTop: 8,
    lineHeight: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "white",
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#f87b1b",
    borderColor: "#f87b1b",
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6b7280",
  },
  toggleButtonTextActive: {
    color: "white",
  },
} as const;
