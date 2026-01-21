import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { deleteUser, updateUser } from "@/services/userService";
import { CompanyUser, UpdateUserData } from "@/types/user";
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
  user: CompanyUser | null;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function WebUserDetail({
  visible,
  user: selectedUser,
  onClose,
  onUpdated,
}: Props) {
  const { token, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<UpdateUserData>({});

  const canEdit = user?.role === "Super Admin" || user?.role === "Admin";
  const canDelete = canEdit && selectedUser?.id !== user?.id; // Can't delete self

  useEffect(() => {
    if (visible && selectedUser) {
      setFormData({
        firstname: selectedUser.firstname,
        lastname: selectedUser.lastname,
        email: selectedUser.email,
        identifier: selectedUser.identifier,
        phone1: selectedUser.phone1 || "",
        phone2: selectedUser.phone2 || "",
        email_second: selectedUser.email_second || "",
        role_id: selectedUser.role_id,
        status_id: selectedUser.status_id,
        interne: selectedUser.interne,
        represent: selectedUser.represent || "",
      });
      setIsEditing(false);
    }
  }, [visible, selectedUser]);

  const handleSave = async () => {
    if (!selectedUser || !token) return;

    try {
      setIsSaving(true);
      await updateUser(selectedUser.id, formData);
      Alert.alert("Succès", "Utilisateur mis à jour avec succès");
      if (onUpdated) onUpdated();
      onClose();
    } catch (error: any) {
      Alert.alert("Erreur", error?.message || "Échec de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedUser || !token) return;

    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.",
      )
    ) {
      setIsDeleting(true);
      deleteUser(selectedUser.id)
        .then(() => {
          Alert.alert("Succès", "Utilisateur supprimé avec succès");
          onClose();
          if (onUpdated) onUpdated();
        })
        .catch((error) => {
          Alert.alert("Erreur", error?.message || "Échec de la suppression");
        })
        .finally(() => {
          setIsDeleting(false);
        });
    }
  };

  if (!selectedUser) return null;

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
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={COLORS.tertiary} />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {selectedUser.firstname} {selectedUser.lastname}
                </Text>
                <Text style={styles.headerSubtitle}>{selectedUser.email}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {canEdit && !isEditing && (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.editButton}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.editButtonText}>Modifier</Text>
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.deleteButton}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <>
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#dc2626"
                      />
                      <Text style={styles.deleteButtonText}>Supprimer</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            <View style={styles.formContainer}>
              {/* Personal Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Informations personnelles
                </Text>
                <View style={styles.formGrid}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Prénom</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.firstname}
                      onChangeText={(text) =>
                        setFormData({ ...formData, firstname: text })
                      }
                      editable={isEditing}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nom</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.lastname}
                      onChangeText={(text) =>
                        setFormData({ ...formData, lastname: text })
                      }
                      editable={isEditing}
                    />
                  </View>
                </View>

                <View style={styles.formGroupFull}>
                  <Text style={styles.label}>Identifiant</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.identifier}
                    onChangeText={(text) =>
                      setFormData({ ...formData, identifier: text })
                    }
                    editable={isEditing}
                  />
                </View>
              </View>

              {/* Contact Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                <View style={styles.formGroupFull}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email: text })
                    }
                    editable={isEditing}
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Téléphone principal</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.phone1}
                      onChangeText={(text) =>
                        setFormData({ ...formData, phone1: text })
                      }
                      editable={isEditing}
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
                      editable={isEditing}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.formGroupFull}>
                  <Text style={styles.label}>Email secondaire</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email_second}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email_second: text })
                    }
                    editable={isEditing}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Role & Status - Read only for now */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rôle et statut</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Rôle</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser.role?.name || selectedUser.role_id}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Statut</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser.status?.name || selectedUser.status_id}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          {isEditing && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
    maxWidth: 900,
    height: "90%",
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 24,
    color: COLORS.tertiary,
  },
  headerSubtitle: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editButtonText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  deleteButtonText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: "#dc2626",
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.tertiary,
    marginBottom: 16,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  } as any,
  formGroup: {
    gap: 8,
  },
  formGroupFull: {
    gap: 8,
    marginTop: 16,
  },
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
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  } as any,
  infoItem: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 8,
  },
  infoLabel: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
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
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    minWidth: 120,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
});
