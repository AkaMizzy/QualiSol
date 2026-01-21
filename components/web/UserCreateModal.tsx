import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import { createUser, getUsers } from "@/services/userService";
import { Company } from "@/types/company";
import { CreateUserData } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

export default function UserCreateModal({
  visible,
  onClose,
  onCreated,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentUserCount, setCurrentUserCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

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
    interne: 1,
    represent: "",
  });

  useEffect(() => {
    if (visible) {
      resetForm();
      fetchLimitInfo();
    }
  }, [visible, user]);

  const resetForm = () => {
    setFormData({
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
      interne: 1,
      represent: "",
    });
    setErrors({});
  };

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
        `Vous avez atteint la limite de ${companyInfo?.nbusers || 2} utilisateurs.`,
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
      delete dataToSend.role_id;
      delete dataToSend.status_id;
      delete dataToSend.password;

      await createUser(dataToSend);

      if (onCreated) await onCreated();
      onClose();
      Alert.alert("Succès", "Utilisateur créé avec succès");
    } catch (error: any) {
      console.error("Error creating user:", error);

      if (error.response?.status === 403) {
        const errorData = error.response?.data;
        Alert.alert(
          "Limite atteinte",
          errorData?.error ||
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
            <Text style={styles.headerTitle}>Créer un utilisateur</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {Object.keys(errors).length > 0 && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text style={styles.errorText}>
                Veuillez corriger les erreurs du formulaire
              </Text>
              <TouchableOpacity onPress={() => setErrors({})}>
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
                Utilisateurs: {currentUserCount} / {companyInfo.nbusers || 2}
                {isLimitReached && " - Limite atteinte"}
              </Text>
            </View>
          )}

          {/* Form */}
          <ScrollView style={styles.content}>
            <View style={styles.formGrid}>
              {/* Personal Info */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Prénom <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.firstname && styles.inputError]}
                  value={formData.firstname}
                  onChangeText={(text) => {
                    setFormData({ ...formData, firstname: text });
                    if (errors.firstname) {
                      const { firstname, ...rest } = errors;
                      setErrors(rest);
                    }
                  }}
                  placeholder="Prénom"
                />
                {errors.firstname && (
                  <Text style={styles.fieldError}>{errors.firstname}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Nom <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.lastname && styles.inputError]}
                  value={formData.lastname}
                  onChangeText={(text) => {
                    setFormData({ ...formData, lastname: text });
                    if (errors.lastname) {
                      const { lastname, ...rest } = errors;
                      setErrors(rest);
                    }
                  }}
                  placeholder="Nom"
                />
                {errors.lastname && (
                  <Text style={styles.fieldError}>{errors.lastname}</Text>
                )}
              </View>

              {/* Identifier (Full Width) */}
              <View style={styles.formGroupFull}>
                <Text style={styles.label}>
                  Identifiant <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.identifier && styles.inputError]}
                  value={formData.identifier}
                  onChangeText={(text) => {
                    setFormData({ ...formData, identifier: text });
                    if (errors.identifier) {
                      const { identifier, ...rest } = errors;
                      setErrors(rest);
                    }
                  }}
                  placeholder="Identifiant unique"
                />
                {errors.identifier && (
                  <Text style={styles.fieldError}>{errors.identifier}</Text>
                )}
              </View>

              {/* Email (Full Width) */}
              <View style={styles.formGroupFull}>
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) {
                      const { email, ...rest } = errors;
                      setErrors(rest);
                    }
                  }}
                  placeholder="email@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && (
                  <Text style={styles.fieldError}>{errors.email}</Text>
                )}
              </View>

              {/* Phone Numbers */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone principal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone1}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone1: text })
                  }
                  placeholder="+212 ..."
                  keyboardType="phone-pad"
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
                  placeholder="+212 ..."
                  keyboardType="phone-pad"
                />
              </View>

              {/* Secondary Email (Full Width) */}
              <View style={styles.formGroupFull}>
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
                      const { email_second, ...rest } = errors;
                      setErrors(rest);
                    }
                  }}
                  placeholder="email2@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email_second && (
                  <Text style={styles.fieldError}>{errors.email_second}</Text>
                )}
              </View>

              {/* Internal/External Toggle (Full Width) */}
              <View style={styles.formGroupFull}>
                <Text style={styles.label}>Type d'utilisateur</Text>
                <View style={styles.toggleContainer}>
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
                        formData.interne === 1 && styles.toggleButtonTextActive,
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
                        formData.interne === 0 && styles.toggleButtonTextActive,
                      ]}
                    >
                      Externe
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Represent (External Only) */}
              {formData.interne === 0 && (
                <View style={styles.formGroupFull}>
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
                      if (errors.represent) {
                        const { represent, ...rest } = errors;
                        setErrors(rest);
                      }
                    }}
                    placeholder="Nom de la société"
                  />
                  {errors.represent && (
                    <Text style={styles.fieldError}>{errors.represent}</Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
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
                (loading || isLimitReached) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || isLimitReached}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Créer</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
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
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
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
  required: {
    color: "#ef4444",
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
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  fieldError: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: "#ef4444",
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.gray2,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleButtonText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: "#6b7280",
  },
  toggleButtonTextActive: {
    color: COLORS.white,
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
