import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Anomalie1, getAllAnomalies1 } from "@/services/anomalie1Service";
import { Anomalie2, getAllAnomalies2 } from "@/services/anomalie2Service";
import companyService from "@/services/companyService";
import { createGed, CreateGedInput } from "@/services/gedService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface WebAddImageModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WebAddImageModal({
  visible,
  onClose,
  onSuccess,
}: WebAddImageModalProps) {
  const { token, user } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [level, setLevel] = useState(5);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(
    null,
  );
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Data loading state
  const [anomalieTypes, setAnomalieTypes] = useState<Anomalie1[]>([]);
  const [anomalieCategories, setAnomalieCategories] = useState<Anomalie2[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);

  // Storage quota state
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentStorageGB, setCurrentStorageGB] = useState(0);
  const [storageQuotaGB, setStorageQuotaGB] = useState(0);
  const [isStorageQuotaReached, setIsStorageQuotaReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  // Load anomalies on mount
  useEffect(() => {
    async function loadAnomalies() {
      if (!token) return;
      setLoadingAnomalies(true);
      try {
        const [types, categories] = await Promise.all([
          getAllAnomalies1(token),
          getAllAnomalies2(token),
        ]);
        setAnomalieTypes(types);
        setAnomalieCategories(categories);
      } catch (e) {
        console.error("Failed to load anomalies", e);
      } finally {
        setLoadingAnomalies(false);
      }
    }
    if (visible) {
      loadAnomalies();
    }
  }, [token, visible]);

  // Load company info and storage limits
  useEffect(() => {
    const fetchLimitInfo = async () => {
      try {
        setLoadingLimits(true);
        if (!token) return;

        const company = await companyService.getCompany();
        setCompanyInfo(company);

        const storageUsedGB = company.nbimagetake || 0;
        const storageQuotaGB = company.sizeimages || 1;

        setCurrentStorageGB(storageUsedGB);
        setStorageQuotaGB(storageQuotaGB);
        setIsStorageQuotaReached(storageUsedGB >= storageQuotaGB);
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

  // Get geolocation on mount
  useEffect(() => {
    if (visible && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.warn("Could not fetch location automatically.", error);
        },
      );
    }
  }, [visible]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setLevel(5);
    setSelectedType(null);
    setSelectedCategorie(null);
    setLatitude(null);
    setLongitude(null);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner un fichier image valide");
      return;
    }

    setImageFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return "#FF3B30";
    if (severity >= 5) return "#FF9500";
    return "#34C759";
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 7) return "Haute";
    if (severity >= 5) return "Moyenne";
    return "Basse";
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      alert("Veuillez fournir une image.");
      return;
    }

    if (isStorageQuotaReached) {
      alert(
        `Quota de stockage dépassé. Vous avez atteint votre quota de ${storageQuotaGB.toFixed(2)}GB. Utilisation actuelle: ${currentStorageGB.toFixed(2)}GB.`,
      );
      return;
    }

    if (!token) {
      alert("Vous devez être connecté pour ajouter des images.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get author name
      let authorName = "Unknown User";
      if (token) {
        try {
          const payload = token.split(".")[1];
          if (payload) {
            let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
            while (base64.length % 4) {
              base64 += "=";
            }
            const decodedString = atob(base64);
            const decodedPayload = JSON.parse(decodedString);
            if (decodedPayload.username) {
              authorName = decodedPayload.username;
            } else if (decodedPayload.email) {
              authorName = decodedPayload.email;
            } else if (decodedPayload.identifier) {
              authorName = decodedPayload.identifier;
            }
          }
        } catch (err) {
          console.error("Error decoding token:", err);
        }
      }

      if (authorName === "Unknown User" && user) {
        const name = [user.firstname, user.lastname]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (name) {
          authorName = name;
        } else if (user.email) {
          authorName = user.email;
        }
      }

      // Create the GED input
      // Note: For qualiphotos, idsource uses the zero UUID as they're not linked to a folder yet
      const gedInput: CreateGedInput = {
        idsource: "00000000-0000-0000-0000-000000000000",
        title: title || "Photo uploadée depuis le web",
        description: description || "",
        kind: "qualiphoto",
        author: authorName,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        level: level,
        type: selectedType || undefined,
        categorie: selectedCategorie || undefined,
        file: {
          uri: imageFile as any, // Send the actual File object for web
          type: imageFile.type,
          name: imageFile.name,
        },
      };

      await createGed(token, gedInput);

      setShowSuccessAlert(true);
    } catch (error: any) {
      console.error("Failed to upload image:", error);
      alert(error.message || "Échec du téléchargement de l'image");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessResponse = (addAnother: boolean) => {
    setShowSuccessAlert(false);
    if (addAnother) {
      resetForm();
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Ajouter une nouvelle image</Text>
            </View>

            {/* Storage Quota Banner */}
            {!loadingLimits && companyInfo && (
              <View
                style={[
                  styles.limitInfoBanner,
                  isStorageQuotaReached && styles.limitInfoBannerWarning,
                ]}
              >
                <Ionicons
                  name={isStorageQuotaReached ? "warning" : "cloud-outline"}
                  size={16}
                  color={isStorageQuotaReached ? "#b45309" : "#f59e0b"}
                />
                <Text
                  style={[
                    styles.limitInfoText,
                    isStorageQuotaReached && styles.limitInfoTextWarning,
                  ]}
                >
                  Stockage: {currentStorageGB.toFixed(2)}GB /{" "}
                  {storageQuotaGB.toFixed(2)}GB
                  {isStorageQuotaReached && " - Quota dépassé"}
                </Text>
              </View>
            )}

            {/* File Upload Area */}
            <div
              style={{
                ...dropZoneStyle,
                borderColor: isDragging ? COLORS.primary : COLORS.gray2,
                backgroundColor: isDragging
                  ? "rgba(248, 123, 27, 0.05)"
                  : COLORS.lightWhite,
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imagePreviewUrl ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreviewUrl(null);
                    }}
                    style={deleteButtonStyle}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={24}
                      color={COLORS.white}
                    />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="file-input"
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={48}
                    color={COLORS.gray}
                  />
                  <Text style={styles.uploadText}>
                    Glissez une image ici ou cliquez pour sélectionner
                  </Text>
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>

            {/* Title Input */}
            <View style={styles.form}>
              <Text style={styles.label}>Titre (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: 'Photo d'inspection du site'"
                placeholderTextColor={COLORS.gray}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Anomaly Type Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Type d&apos;anomalie</Text>
              {loadingAnomalies ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : anomalieTypes.length === 0 ? (
                <Text style={{ color: "#6b7280", fontSize: 12 }}>
                  Aucun type disponible
                </Text>
              ) : (
                <div style={scrollContainerStyle}>
                  {anomalieTypes.map((type) => (
                    <button
                      key={type.id}
                      style={{
                        ...typeButtonStyle,
                        backgroundColor:
                          selectedType === type.anomalie
                            ? COLORS.primary
                            : "#f1f5f9",
                        borderColor:
                          selectedType === type.anomalie
                            ? COLORS.primary
                            : COLORS.gray2,
                        color:
                          selectedType === type.anomalie
                            ? "#FFFFFF"
                            : "#11224e",
                      }}
                      onClick={() => setSelectedType(type.anomalie || null)}
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={20}
                        color={
                          selectedType === type.anomalie ? "#FFFFFF" : "#11224e"
                        }
                      />
                      <span style={{ marginLeft: "8px" }}>
                        {type.anomalie || "Sans nom"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </View>

            {/* Anomaly Category Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Catégorie d&apos;anomalie</Text>
              {loadingAnomalies ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : anomalieCategories.length === 0 ? (
                <Text style={{ color: "#6b7280", fontSize: 12 }}>
                  Aucune catégorie disponible
                </Text>
              ) : (
                <div style={scrollContainerStyle}>
                  {anomalieCategories.map((category) => (
                    <button
                      key={category.id}
                      style={{
                        ...categoryButtonStyle,
                        backgroundColor:
                          selectedCategorie === category.anomalie
                            ? COLORS.primary
                            : "#f1f5f9",
                        borderColor:
                          selectedCategorie === category.anomalie
                            ? COLORS.primary
                            : COLORS.gray2,
                        color:
                          selectedCategorie === category.anomalie
                            ? "#FFFFFF"
                            : "#11224e",
                      }}
                      onClick={() =>
                        setSelectedCategorie(category.anomalie || null)
                      }
                    >
                      {category.anomalie || "Sans nom"}
                    </button>
                  ))}
                </div>
              )}
            </View>

            {/* Severity Slider */}
            <View style={styles.sectionContainer}>
              <Text style={styles.severityTitle}>Niveau de sévérité</Text>
              <View style={styles.severityHeader}>
                <Text
                  style={[
                    styles.severityValue,
                    { color: getSeverityColor(level) },
                  ]}
                >
                  {level}/10
                </Text>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(level) },
                  ]}
                >
                  <Text style={styles.severityBadgeText}>
                    {getSeverityText(level)}
                  </Text>
                </View>
              </View>
              <div style={severitySliderStyle}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    style={{
                      ...severityDotStyle,
                      backgroundColor:
                        level >= value ? getSeverityColor(level) : "#E5E5EA",
                      borderColor:
                        level === value ? getSeverityColor(level) : "#E5E5EA",
                      borderWidth: level === value ? "3px" : "2px",
                    }}
                    onClick={() => setLevel(value)}
                  />
                ))}
              </div>
            </View>

            {/* Description */}
            <View style={[styles.form, { marginTop: 20 }]}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ajoutez une courte description (facultatif)"
                placeholderTextColor={COLORS.gray}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.addButton,
                  (isStorageQuotaReached || isSubmitting) &&
                    styles.addButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isStorageQuotaReached || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Ajouter l&apos;image</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Success Alert */}
      {showSuccessAlert && (
        <Modal visible transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Ionicons name="checkmark-circle" size={48} color="#34C759" />
              <Text style={styles.alertTitle}>Enregistré</Text>
              <Text style={styles.alertMessage}>
                La photo a été enregistrée avec succès. Voulez-vous en ajouter
                une autre ?
              </Text>
              <View style={styles.alertButtons}>
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertButtonSecondary]}
                  onPress={() => handleSuccessResponse(false)}
                >
                  <Text style={styles.alertButtonTextSecondary}>
                    Non, Arrêter
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertButtonPrimary]}
                  onPress={() => handleSuccessResponse(true)}
                >
                  <Text style={styles.alertButtonText}>Oui</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

// Inline styles for web elements
const dropZoneStyle = {
  width: "100%",
  height: "200px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: "2px",
  borderStyle: "dashed",
  borderRadius: "8px",
  marginBottom: "16px",
  transition: "all 0.2s",
};

const deleteButtonStyle = {
  position: "absolute" as const,
  top: "10px",
  right: "10px",
  backgroundColor: "rgba(0,0,0,0.6)",
  padding: "8px",
  borderRadius: "20px",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const scrollContainerStyle = {
  display: "flex",
  flexDirection: "row" as const,
  gap: "10px",
  flexWrap: "wrap" as const,
  paddingHorizontal: "2px",
};

const typeButtonStyle = {
  display: "flex",
  flexDirection: "row" as const,
  alignItems: "center",
  borderRadius: "99px",
  padding: "8px 16px",
  gap: "8px",
  border: "1px solid",
  cursor: "pointer",
  fontFamily: FONT.medium,
  fontSize: "14px",
  transition: "all 0.2s",
};

const categoryButtonStyle = {
  borderRadius: "99px",
  padding: "8px 16px",
  border: "1px solid",
  cursor: "pointer",
  fontFamily: FONT.medium,
  fontSize: "14px",
  transition: "all 0.2s",
};

const severitySliderStyle = {
  display: "flex",
  flexDirection: "row" as const,
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  marginTop: "16px",
};

const severityDotStyle = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  border: "2px solid",
  cursor: "pointer",
  transition: "all 0.2s",
  padding: 0,
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "90%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.xLarge,
    padding: SIZES.large,
    zIndex: 1,
  },
  headerContainer: {
    position: "relative",
    marginBottom: SIZES.large,
  },
  closeButton: {
    position: "absolute",
    left: 0,
    top: 0,
    padding: SIZES.small,
    zIndex: 10,
  },
  headerTitle: {
    textAlign: "center",
    fontFamily: FONT.bold,
    fontSize: SIZES.xLarge,
    color: COLORS.secondary,
  },
  limitInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderRadius: 10,
  },
  limitInfoBannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
  },
  limitInfoText: {
    color: "#ea580c",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  limitInfoTextWarning: {
    color: "#b45309",
  },
  uploadText: {
    fontFamily: FONT.medium,
    color: COLORS.gray,
    marginTop: SIZES.small,
    fontSize: SIZES.medium,
  },
  form: {
    width: "100%",
    marginBottom: SIZES.medium,
  },
  label: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.secondary,
    marginBottom: SIZES.small,
  },
  input: {
    width: "100%",
    padding: SIZES.medium,
    backgroundColor: COLORS.lightWhite,
    borderRadius: SIZES.small,
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 12,
  },
  severityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 12,
  },
  severityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  severityValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: SIZES.large,
    width: "100%",
    gap: SIZES.small,
  },
  button: {
    flex: 1,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  addButtonDisabled: {
    backgroundColor: "#d1d5db",
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  cancelButtonText: {
    color: COLORS.secondary,
  },
  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  alertBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.large,
    padding: SIZES.xLarge,
    alignItems: "center",
    width: "80%",
    maxWidth: 400,
    gap: 16,
  },
  alertTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.secondary,
  },
  alertMessage: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    textAlign: "center",
  },
  alertButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  alertButtonSecondary: {
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  alertButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  alertButtonText: {
    color: COLORS.white,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  alertButtonTextSecondary: {
    color: COLORS.secondary,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
});
