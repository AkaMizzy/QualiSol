import { Ged } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VoiceNoteRecorder from "../VoiceNoteRecorder";
import MapSelectionModal from "./MapSelectionModal";

interface AnswerModalProps {
  visible: boolean;
  question: Ged;
  initialAnswer?: {
    value?: string;
    answer?: string;
    quantity?: number;
    price?: number;
    latitude?: string;
    longitude?: string;
    image?: ImagePicker.ImagePickerAsset;
    recordingUri?: string;
    boolValue?: boolean;
  };
  onClose: () => void;
  onSave: (data: {
    answer: string;
    value: string; // Keep for compatibility
    quantity?: number;
    price?: number;
    latitude?: string;
    longitude?: string;
    image?: ImagePicker.ImagePickerAsset;
    recordingUri?: string;
    boolValue?: boolean;
  }) => Promise<void>;
}

export default function AnswerModal({
  visible,
  question,
  initialAnswer,
  onClose,
  onSave,
}: AnswerModalProps) {
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [answer, setAnswer] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [boolValue, setBoolValue] = useState(false);
  const [latitude, setLatitude] = useState<string | undefined>(undefined);
  const [longitude, setLongitude] = useState<string | undefined>(undefined);

  // Media State
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | undefined>(
    undefined,
  );
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | undefined>(
    undefined,
  );

  // UI State
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isMapVisible, setMapVisible] = useState(false);

  // Audio Playback
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible) {
      // Initialize state from initialAnswer
      const val = initialAnswer?.answer || initialAnswer?.value || "";
      setAnswer(val);
      setQuantity(initialAnswer?.quantity?.toString() || "");
      setPrice(initialAnswer?.price?.toString() || "");
      setBoolValue(initialAnswer?.boolValue ?? val === "true");
      setLatitude(initialAnswer?.latitude);
      setLongitude(initialAnswer?.longitude);
      setImage(initialAnswer?.image);
      setVoiceNoteUri(initialAnswer?.recordingUri);

      // Special handling for GPS text if needed
      if (question.type === "GPS" && !initialAnswer?.latitude && val) {
        // Try parse? Or just leave it. Usually GPS needs structured data.
      }
    }
  }, [visible, initialAnswer, question]);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const handleSave = async () => {
    // Validation
    if (
      (question.type === "image" || question.type === "photo") &&
      !image &&
      !answer
    ) {
      // photo type might allow text fallback? usually requires photo.
      // But let's be loose unless strict validation required.
    }

    setIsSubmitting(true);
    try {
      let qty: number | undefined;
      let prc: number | undefined;

      if (quantity !== "") {
        const parsedQty = parseFloat(quantity.replace(",", "."));
        if (!isNaN(parsedQty)) {
          qty = parsedQty;
        }
      }

      if (price !== "") {
        const parsedPrc = parseFloat(price.replace(",", "."));
        if (!isNaN(parsedPrc)) {
          prc = parsedPrc;
        }
      }

      // Construct final answer string based on type if needed
      let finalAnswer = answer;
      if (question.type === "boolean") {
        finalAnswer = String(boolValue);
      } else if (question.type === "GPS" && latitude && longitude) {
        finalAnswer = `Lat: ${parseFloat(latitude).toFixed(4)}, Lon: ${parseFloat(longitude).toFixed(4)}`;
      }

      await onSave({
        answer: finalAnswer,
        value: finalAnswer,
        quantity: qty,
        price: prc,
        latitude,
        longitude,
        image,
        recordingUri: voiceNoteUri,
        boolValue,
      });
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de l'enregistrement.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagePick = async () => {
    Alert.alert("Ajouter une image", "Choisir la source", [
      {
        text: "Caméra",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            alert("Permission refusée");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            allowsEditing: true, // Optional: allow cropping
          });
          if (!result.canceled) {
            setImage(result.assets[0]);
          }
        },
      },
      {
        text: "Galerie",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            alert("Permission refusée");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
          });
          if (!result.canceled) {
            setImage(result.assets[0]);
          }
        },
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const renderInput = () => {
    switch (question.type) {
      case "boolean":
        return (
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Réponse (Oui/Non)</Text>
            <Switch
              value={boolValue}
              onValueChange={setBoolValue}
              trackColor={{ false: "#767577", true: "#f87b1b" }}
            />
          </View>
        );
      case "date":
        return (
          <View>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              onPress={() => setDatePickerVisibility(true)}
              style={styles.dateInput}
            >
              <Text>{answer || "Sélectionner une date"}</Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              onConfirm={(date) => {
                setAnswer(date.toISOString().split("T")[0]);
                setDatePickerVisibility(false);
              }}
              onCancel={() => setDatePickerVisibility(false)}
            />
          </View>
        );
      case "long_text":
        return (
          <View>
            <Text style={styles.label}>Réponse détaillée</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={answer}
              onChangeText={setAnswer}
              multiline
              placeholder="Votre réponse..."
            />
          </View>
        );
      case "photo":
        // Photo is handled in media section mainly, but if they want to add text caption:
        return (
          <View>
            <Text style={styles.label}>Légende (Optionnel)</Text>
            <TextInput
              style={styles.input}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Légende..."
            />
          </View>
        );
      case "GPS":
        return (
          <View>
            <Text style={styles.label}>Position</Text>
            <TouchableOpacity
              onPress={() => setMapVisible(true)}
              style={styles.gpsButton}
            >
              <Ionicons name="map-outline" size={20} color="#fff" />
              <Text style={styles.gpsButtonText}>
                {latitude && longitude
                  ? "Position définie (Modifier)"
                  : "Définir la position"}
              </Text>
            </TouchableOpacity>
            {latitude && longitude && (
              <Text style={styles.gpsText}>
                Lat: {latitude}, Lon: {longitude}
              </Text>
            )}
            <MapSelectionModal
              visible={isMapVisible}
              onClose={() => setMapVisible(false)}
              onLocationSelect={(loc) => {
                setLatitude(String(loc.latitude));
                setLongitude(String(loc.longitude));
              }}
            />
          </View>
        );
      default: // text, number, taux, list (treated as text for now unless list items provided)
        const isNumeric =
          question.type === "number" || question.type === "taux";
        return (
          <View>
            <Text style={styles.label}>Réponse</Text>
            <TextInput
              style={styles.input}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Votre réponse..."
              keyboardType={isNumeric ? "numeric" : "default"}
            />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          Platform.OS === "android" && { paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {question.title}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {/* Description */}
            {!!question.description && (
              <View style={styles.descriptionContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#f87b1b"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.descriptionText}>
                  {question.description}
                </Text>
              </View>
            )}

            {/* Response Section (Grouped) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Votre Réponse</Text>

              {renderInput()}

              {/* Conditional Quantity */}
              {!!question.quantity && (
                <View style={styles.subInputContainer}>
                  <Text style={styles.label}>Quantité</Text>
                  <TextInput
                    style={[styles.input, { borderColor: "#f87b1b" }]}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              )}

              {/* Conditional Price */}
              {!!question.price && (
                <View style={styles.subInputContainer}>
                  <Text style={styles.label}>Prix</Text>
                  <TextInput
                    style={[styles.input, { borderColor: "#f87b1b" }]}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              )}
            </View>

            {/* Media Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Multimédia (Optionnel)</Text>

              {/* Image Picker */}
              <View style={styles.imageContainer}>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={handleImagePick}
                >
                  {image ? (
                    <View style={styles.previewWrapper}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.imagePreviewFull}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setImage(undefined)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons
                        name="camera-outline"
                        size={48}
                        color="#9ca3af" // COLORS.gray
                      />
                      <Text style={styles.imagePickerText}>
                        Ajouter une photo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Voice Note */}
              <View style={styles.voiceSection}>
                <VoiceNoteRecorder
                  onRecordingComplete={(uri) =>
                    setVoiceNoteUri(uri || undefined)
                  }
                />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && styles.disabledBtn]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#11224e",
    flex: 1,
    marginRight: 10,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#f87b1b", // Orange border
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#fff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  subInputContainer: {
    marginTop: 16,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },

  voiceSection: {
    marginTop: 8,
  },

  // GPS
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f87b1b",
    padding: 12,
    borderRadius: 8,
  },
  gpsButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  gpsText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  // Footer
  footer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#4b5563",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButton: {
    flex: 2,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f87b1b",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.7,
  },

  // Description
  descriptionContainer: {
    flexDirection: "row",
    backgroundColor: "#fff7ed",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ffedd5",
    alignItems: "flex-start",
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: "#c2410c", // Dark orange
    lineHeight: 20,
  },

  // New Image Picker Styles (Matched to AddImageModal)
  imageContainer: {
    alignItems: "center",
  },
  imagePicker: {
    width: "100%",
    height: 150,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  imagePickerPlaceholder: {
    alignItems: "center",
  },
  imagePickerText: {
    marginTop: 10,
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  previewWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  imagePreviewFull: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 0,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
