import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { getAllRoles } from "../../services/roleService";
import * as userService from "../../services/userService";
import { Role } from "../../types/role";
import { CompanyUser, UpdateUserData } from "../../types/user";

interface UpdateUserCompProps {
  visible: boolean;
  user: CompanyUser | null;
  onClose: () => void;
  onUserUpdated: (updatedUser: CompanyUser) => void;
}

export default function UpdateUserComp({
  visible,
  user,
  onClose,
  onUserUpdated,
}: UpdateUserCompProps) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Role[]>([]);

  // Form state
  const [formData, setFormData] = useState<UpdateUserData>({
    firstname: "",
    lastname: "",
    email: "",
    phone1: "",
    phone2: "",
    email_second: "",
    status_id: "1",
    interne: 1,
    represent: "",
    role_id: "",
  });

  // Initialize form data when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone1: user.phone1 || "",
        phone2: user.phone2 || "",
        email_second: user.email_second || "",
        status_id: user.status_id,
        interne: user.interne ?? 1,
        represent: user.represent || "",
        // Ensure we handle role_id. user might have role_id property.
        // If not directly on user object, we might need to rely on what's passed or defaults.
        // Attempt to check if user has role_id.
        role_id: (user as any).role_id || "",
      });
      setErrors({});
      fetchRoles();
    }
  }, [user]);

  const fetchRoles = async () => {
    try {
      const fetchedRoles = await getAllRoles(token || undefined);
      setRoles(fetchedRoles);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  // Logic to handle role assignment based on User Type
  React.useEffect(() => {
    if (roles.length > 0) {
      const adminRole = roles.find((r) => r.role.toLowerCase() === "admin");

      if (formData.interne === 0) {
        // External User -> Force "Admin"
        if (adminRole && formData.role_id !== adminRole.id) {
          setFormData((prev) => ({ ...prev, role_id: adminRole.id }));
        }
      } else {
        // Internal User -> If no role selected, default to Admin (or keep existing)
        if (!formData.role_id && adminRole) {
          setFormData((prev) => ({ ...prev, role_id: adminRole.id }));
        }
      }
    }
  }, [formData.interne, roles]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstname?.trim()) {
      newErrors.firstname = "Le prénom est requis";
    }

    if (!formData.lastname?.trim()) {
      newErrors.lastname = "Le nom est requis";
    }

    if (!formData.email?.trim()) {
      newErrors.email = "L&apos;email est requis";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Format d&apos;email invalide";
      }
    }

    if (formData.email_second && formData.email_second.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email_second)) {
        newErrors.email_second = "Format d&apos;email secondaire invalide";
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
    if (!user || !token) return;

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare update data
      const updateData: UpdateUserData = {
        firstname: formData.firstname?.trim(),
        lastname: formData.lastname?.trim(),
        email: formData.email?.trim(),
        phone1: formData.phone1?.trim() || undefined,
        phone2: formData.phone2?.trim() || undefined,
        email_second: formData.email_second?.trim() || undefined,
        status_id: formData.status_id,
        interne: formData.interne,
        represent:
          formData.interne === 0 ? formData.represent?.trim() : undefined,
        role_id: formData.role_id,
      };

      // Update user information
      const response = await userService.updateUser(user.id, updateData);

      // Use the updated user data from the backend response
      onUserUpdated(response.user);
      Alert.alert("Succès", "Utilisateur mis à jour avec succès");
      onClose();
    } catch (error: any) {
      console.error("Error updating user:", error);

      // Parse error message for better UX
      let errorMessage = "Impossible de mettre à jour l&apos;utilisateur";

      // Check if the error is from axios response
      if (error.response?.data) {
        const errorData = error.response.data;

        // Check for duplicate email error
        if (
          error.response.status === 500 ||
          error.response.status === 400 ||
          error.response.status === 409
        ) {
          const errorText =
            typeof errorData === "string"
              ? errorData
              : errorData.error || errorData.message || "";

          // Check if error message indicates duplicate email
          if (
            errorText.toLowerCase().includes("duplicate") ||
            errorText.toLowerCase().includes("already exists") ||
            errorText.toLowerCase().includes("unique") ||
            (errorText.toLowerCase().includes("email") &&
              (errorText.toLowerCase().includes("exist") ||
                errorText.toLowerCase().includes("taken") ||
                errorText.toLowerCase().includes("used")))
          ) {
            errorMessage =
              "Cet email est déjà utilisé par un autre utilisateur. Veuillez en choisir un autre.";
          } else if (errorText) {
            errorMessage = errorText;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Erreur", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (user) {
      setFormData({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone1: user.phone1 || "",
        phone2: user.phone2 || "",
        email_second: user.email_second || "",
        status_id: user.status_id,
        interne: user.interne ?? 1,
        represent: user.represent || "",
      });
      setErrors({});
    }
  };

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.modalContainer}
        edges={["top", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#11224e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Modifier l&apos;utilisateur</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Ionicons name="refresh" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Switch */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut</Text>
            <View style={styles.statusSwitchContainer}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.status_id === "1" && styles.statusOptionActive,
                ]}
                onPress={() => setFormData({ ...formData, status_id: "1" })}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.statusIndicator,
                    formData.status_id === "1" && styles.statusIndicatorActive,
                  ]}
                >
                  {formData.status_id === "1" && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text
                  style={[
                    styles.statusText,
                    formData.status_id === "1" && styles.statusTextActive,
                  ]}
                >
                  Actif
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.status_id === "0" && styles.statusOptionActive,
                ]}
                onPress={() => setFormData({ ...formData, status_id: "0" })}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.statusIndicator,
                    formData.status_id === "0" && styles.statusIndicatorActive,
                  ]}
                >
                  {formData.status_id === "0" && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text
                  style={[
                    styles.statusText,
                    formData.status_id === "0" && styles.statusTextActive,
                  ]}
                >
                  Inactif
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>

            <View style={styles.formContainer}>
              {/* Name Row */}
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
                      if (errors.firstname) {
                        setErrors({ ...errors, firstname: "" });
                      }
                    }}
                    placeholder="Prénom"
                    autoCapitalize="words"
                    autoCorrect={false}
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
                    style={[styles.input, errors.lastname && styles.inputError]}
                    value={formData.lastname}
                    onChangeText={(text) => {
                      setFormData({ ...formData, lastname: text });
                      if (errors.lastname) {
                        setErrors({ ...errors, lastname: "" });
                      }
                    }}
                    placeholder="Nom"
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  {errors.lastname && (
                    <Text style={styles.errorText}>{errors.lastname}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de contact</Text>

            <View style={styles.formContainer}>
              {/* Primary Email */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Email principal <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) {
                      setErrors({ ...errors, email: "" });
                    }
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

              {/* Secondary Email */}
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
                    if (errors.email_second) {
                      setErrors({ ...errors, email_second: "" });
                    }
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

              {/* Primary Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone principal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone1}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone1: text })
                  }
                  placeholder="+33 1 23 45 67 89"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              {/* Secondary Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone secondaire</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone2}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone2: text })
                  }
                  placeholder="+33 1 23 45 67 89"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            </View>
          </View>

          {/* User Type Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type d'utilisateur</Text>
            <View style={styles.statusSwitchContainer}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.interne === 1 && styles.statusOptionActive,
                ]}
                onPress={() =>
                  setFormData({ ...formData, interne: 1, represent: "" })
                }
                activeOpacity={0.7}
                disabled={loading}
              >
                <View
                  style={[
                    styles.statusIndicator,
                    formData.interne === 1 && { backgroundColor: "#3b82f6" },
                  ]}
                >
                  <Ionicons
                    name="business"
                    size={14}
                    color={formData.interne === 1 ? "white" : "#6b7280"}
                  />
                </View>
                <Text
                  style={[
                    styles.statusText,
                    formData.interne === 1 && styles.statusTextActive,
                  ]}
                >
                  Interne
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.interne === 0 && styles.statusOptionActive,
                ]}
                onPress={() => setFormData({ ...formData, interne: 0 })}
                activeOpacity={0.7}
                disabled={loading}
              >
                <View
                  style={[
                    styles.statusIndicator,
                    formData.interne === 0 && { backgroundColor: "#f87b1b" },
                  ]}
                >
                  <Ionicons
                    name="globe"
                    size={14}
                    color={formData.interne === 0 ? "white" : "#6b7280"}
                  />
                </View>
                <Text
                  style={[
                    styles.statusText,
                    formData.interne === 0 && styles.statusTextActive,
                  ]}
                >
                  Externe
                </Text>
              </TouchableOpacity>
            </View>

            {/* Role Selection - Only for Internal Users */}
            {formData.interne === 1 && roles.length > 0 && (
              <View style={[styles.formContainer, { marginTop: 12 }]}>
                <View style={styles.formGroupLast}>
                  <Text style={styles.label}>Rôle</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {roles
                      .filter((r) =>
                        ["admin", "super admin"].includes(r.role.toLowerCase()),
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
                              role.role.toLowerCase() === "super admin"
                                ? "shield-checkmark"
                                : "person"
                            }
                            size={18}
                            color={
                              formData.role_id === role.id ? "#fff" : "#6b7280"
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
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View
          style={[
            styles.modalFooter,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.submitButtonText}>Sauvegarder</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = {
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#11224e",
  },
  resetButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#11224e",
    marginBottom: 12,
  },
  statusSwitchContainer: {
    flexDirection: "row" as const,
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
  },
  statusOptionActive: {
    borderColor: "#f87b1b",
    backgroundColor: "#fff7ed",
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  statusIndicatorActive: {
    backgroundColor: "#2ecc71",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#374151",
  },
  statusTextActive: {
    color: "#f87b1b",
    fontWeight: "600" as const,
  },
  formContainer: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  nameRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  nameCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  formGroupLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: "row" as const,
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center" as const,
    backgroundColor: "white",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#6b7280",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#f87b1b",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "white",
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: "white",
    justifyContent: "center" as const,
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
