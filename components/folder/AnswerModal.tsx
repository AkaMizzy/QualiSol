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
      const qty = quantity ? parseFloat(quantity) : undefined;
      const prc = price ? parseFloat(price) : undefined;

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
        quantity: isNaN(qty as number) ? undefined : qty,
        price: isNaN(prc as number) ? undefined : prc,
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
            {/* Main Answer Input */}
            <View style={styles.section}>{renderInput()}</View>

            {/* Conditional Quantity */}
            {question.quantity && (
              <View style={styles.section}>
                <Text style={styles.label}>Quantité</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            )}

            {/* Conditional Price */}
            {question.price && (
              <View style={styles.section}>
                <Text style={styles.label}>Prix (€)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            )}

            {/* Media Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Multimédia (Optionnel)</Text>

              {/* Image */}
              <View style={styles.mediaRow}>
                <TouchableOpacity
                  onPress={handleImagePick}
                  style={styles.mediaBtn}
                >
                  <Ionicons name="camera" size={24} color="#f87b1b" />
                  <Text style={styles.mediaBtnText}>Photo</Text>
                </TouchableOpacity>

                {image && (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => setImage(undefined)}
                    >
                      <Ionicons name="close-circle" size={20} color="red" />
                    </TouchableOpacity>
                  </View>
                )}
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
    borderColor: "#e5e7eb",
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
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },

  // Media Styling
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffedd5",
    marginRight: 16,
  },
  mediaBtnText: {
    color: "#f87b1b",
    fontWeight: "600",
    marginLeft: 8,
  },
  previewContainer: {
    position: "relative",
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  removeMediaBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 10,
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
});
