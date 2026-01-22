import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { Ged, updateGed } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface WebGedUpdateModalProps {
  visible: boolean;
  ged: Ged | null;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WebGedUpdateModal({
  visible,
  ged,
  token,
  onClose,
  onSuccess,
}: WebGedUpdateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<string>("");
  const [type, setType] = useState("");
  const [categorie, setCategorie] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form when ged data changes
  useEffect(() => {
    if (ged) {
      setTitle(ged.title || "");
      setDescription(ged.description || "");
      setLevel(ged.level != null ? String(ged.level) : "");
      setType(ged.type || "");
      setCategorie(ged.categorie || "");
    }
  }, [ged]);

  const handleSubmit = async () => {
    if (!ged) return;

    // Validation
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: Partial<Ged> = {
        title: title.trim(),
        description: description.trim() || null,
      };

      // Only include level if it's a valid number
      if (level.trim()) {
        const levelNum = parseInt(level);
        if (!isNaN(levelNum) && levelNum >= 0 && levelNum <= 10) {
          updateData.level = levelNum as any;
        }
      }

      // Include type and categorie if they have values
      if (type.trim()) {
        updateData.type = type.trim();
      }
      if (categorie.trim()) {
        updateData.categorie = categorie.trim();
      }

      await updateGed(token, ged.id, updateData);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to update GED:", err);
      setError(err.message || "Échec de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  if (!ged) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Modifier la photo</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Voice Note Section - if exists */}
            {ged.value && (
              <View style={styles.voiceNoteSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="mic" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Note vocale</Text>
                </View>
                <View style={styles.voiceNotePlayer}>
                  <audio
                    controls
                    style={{ width: "100%", height: 40 }}
                    src={`${API_CONFIG.BASE_URL}${ged.value}`}
                  >
                    Votre navigateur ne supporte pas l'élément audio.
                  </audio>
                  <Text style={styles.voiceNoteHint}>
                    Écoutez la note vocale pour le contexte
                  </Text>
                </View>
              </View>
            )}

            {/* Title Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Titre <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Entrez le titre"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Description Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Entrez une description (optionnel)"
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Level Field */}
            {ged.kind === "qualiphoto" && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Sévérité (0-10)</Text>
                <TextInput
                  style={styles.input}
                  value={level}
                  onChangeText={setLevel}
                  placeholder="0-10"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Type Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Type d'anomalie</Text>
              <TextInput
                style={styles.input}
                value={type}
                onChangeText={setType}
                placeholder="Type (optionnel)"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Categorie Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Catégorie</Text>
              <TextInput
                style={styles.input}
                value={categorie}
                onChangeText={setCategorie}
                placeholder="Catégorie (optionnel)"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Metadata Display */}
            <View style={styles.metadataSection}>
              <Text style={styles.metadataTitle}>Informations</Text>
              <View style={styles.metadataRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={COLORS.gray}
                />
                <Text style={styles.metadataText}>
                  Créé le {new Date(ged.created_at).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <Ionicons name="person-outline" size={16} color={COLORS.gray} />
                <Text style={styles.metadataText}>Auteur: {ged.author}</Text>
              </View>
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
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Enregistrer</Text>
                </>
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.xLarge,
    color: COLORS.tertiary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  } as any,
  errorText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: "#ef4444",
    flex: 1,
  },
  voiceNoteSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  } as any,
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  voiceNotePlayer: {
    gap: 8,
  } as any,
  voiceNoteHint: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    fontStyle: "italic",
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  metadataSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    gap: 8,
  } as any,
  metadataTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as any,
  metadataText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  } as any,
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  cancelButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  } as any,
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
});
