import API_CONFIG from "@/app/config/api";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Ged } from "@/services/gedService";
import { compressImage } from "@/utils/imageCompression";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { randomUUID } from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import CaptureModal from "../CaptureModal";
import PreviewModal from "../PreviewModal";
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
    author?: string;
    idauthor?: string;
    iddevice?: string;
    captudedate?: string;
  }) => Promise<void>;
  folderTitle?: string;
  projectTitle?: string;
  folderTypeTitle?: string;
}

export default function AnswerModal({
  visible,
  question,
  initialAnswer,
  onClose,
  onSave,
  folderTitle,
  projectTitle,
  folderTypeTitle,
}: AnswerModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
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
  const [isCaptureModalVisible, setCaptureModalVisible] = useState(false);
  const [isPreviewModalVisible, setPreviewModalVisible] = useState(false);
  const [isDropdownVisible, setDropdownVisible] = useState(false);

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
      // Initialize media from local state or fallback to backend URL
      if (initialAnswer?.image) {
        setImage(initialAnswer.image);
      } else if (question.url) {
        const fullUri = question.url.startsWith("http")
          ? question.url
          : `${API_CONFIG.BASE_URL}${question.url}`;
        setImage({ uri: fullUri, width: 0, height: 0 } as any);
      } else {
        setImage(undefined);
      }

      const audioUrl = question.urlvoice
        ? question.urlvoice.startsWith("http")
          ? question.urlvoice
          : `${API_CONFIG.BASE_URL}${question.urlvoice}`
        : undefined;

      setVoiceNoteUri(initialAnswer?.recordingUri || audioUrl);

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

      let authorName = "Unknown User";

      if (user) {
        if (user.identifier) {
          authorName = user.identifier;
        } else {
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
      }

      // Extract EXIF date if available, otherwise fallback to current time
      let captureDateStr = new Date().toISOString();
      if (image && image.exif) {
        const exifDate = image.exif.DateTimeOriginal || image.exif.DateTime;
        if (exifDate) {
          // EXIF dates are typically "YYYY:MM:DD HH:MM:SS" - parse correctly
          const parts = exifDate.split(" ");
          if (parts.length === 2) {
            const dateParts = parts[0].split(":");
            if (dateParts.length === 3) {
              captureDateStr = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}T${parts[1]}.000Z`;
            }
          }
        }
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
        author: authorName,
        idauthor: user?.id,
        iddevice: randomUUID(),
        captudedate: captureDateStr,
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
        onPress: () => {
          setCaptureModalVisible(true);
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
            quality: 0.8,
            allowsEditing: false, // Ensure no forced cropping
            exif: true,
          });
          if (!result.canceled && result.assets[0]) {
            const compressed = await compressImage(result.assets[0].uri);
            setImage({
              ...result.assets[0],
              uri: compressed.uri,
              width: compressed.width,
              height: compressed.height,
            } as ImagePicker.ImagePickerAsset);
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
          <View>
            <View style={styles.booleanContainer}>
              <TouchableOpacity
                style={[
                  styles.booleanButton,
                  boolValue === true && styles.booleanButtonActiveYes,
                ]}
                onPress={() => setBoolValue(true)}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={boolValue === true ? "#fff" : "#10b981"}
                />
                <Text
                  style={[
                    styles.booleanText,
                    boolValue === true && styles.booleanTextActive,
                  ]}
                >
                  Oui
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.booleanButton,
                  boolValue === false && styles.booleanButtonActiveNo,
                ]}
                onPress={() => setBoolValue(false)}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={boolValue === false ? "#fff" : "#ef4444"}
                />
                <Text
                  style={[
                    styles.booleanText,
                    boolValue === false && styles.booleanTextActive,
                  ]}
                >
                  Non
                </Text>
              </TouchableOpacity>
            </View>
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
      case "list": {
        // Parse options from question.mask (comma-separated: "val1,val2,val3")
        let listOptions: string[] = [];
        if (question.mask) {
          listOptions = question.mask
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        }

        // Fallback: free-text if no options defined
        if (listOptions.length === 0) {
          return (
            <View>
              <Text style={styles.label}>Réponse</Text>
              <TextInput
                style={styles.input}
                value={answer}
                onChangeText={setAnswer}
                placeholder="Votre réponse..."
              />
            </View>
          );
        }

        // ≤ 3 options → inline radio chips
        if (listOptions.length <= 3) {
          return (
            <View>
              <Text style={styles.label}>Sélectionner une valeur</Text>
              <View style={styles.listOptionsContainer}>
                {listOptions.map((option) => {
                  const isSelected = answer === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.listOptionChip,
                        isSelected && styles.listOptionChipSelected,
                      ]}
                      onPress={() => setAnswer(isSelected ? "" : option)}
                      activeOpacity={0.75}
                    >
                      {/* Radio circle */}
                      <View style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text
                        style={[
                          styles.listOptionText,
                          isSelected && styles.listOptionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }

        // > 3 options → dropdown modal picker
        return (
          <View>
            <Text style={styles.label}>Sélectionner une valeur</Text>

            {/* Trigger button */}
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setDropdownVisible(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dropdownTriggerText,
                  !answer && styles.dropdownTriggerPlaceholder,
                ]}
                numberOfLines={1}
              >
                {answer || "Choisir une option..."}
              </Text>
              <Ionicons
                name="chevron-down-outline"
                size={20}
                color="#f87b1b"
              />
            </TouchableOpacity>

            {/* Picker modal */}
            <Modal
              visible={isDropdownVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setDropdownVisible(false)}
            >
              <TouchableOpacity
                style={styles.dropdownOverlay}
                activeOpacity={1}
                onPress={() => setDropdownVisible(false)}
              >
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>
                    {question.title}
                  </Text>
                  <FlatList
                    data={listOptions}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                      const isSelected = answer === item;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.dropdownOption,
                            isSelected && styles.dropdownOptionSelected,
                          ]}
                          onPress={() => {
                            setAnswer(item);
                            setDropdownVisible(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              isSelected && styles.dropdownOptionTextSelected,
                            ]}
                          >
                            {item}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color="#f87b1b"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        );
      }
      default: // text, number, taux
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
      <CaptureModal
        visible={isCaptureModalVisible}
        onClose={() => setCaptureModalVisible(false)}
        onMediaCaptured={(media) => {
          setImage({
            uri: media.uri,
            width: media.width || 0,
            height: media.height || 0,
            type: "image",
            fileName: media.uri.split("/").pop() || "photo.jpg",
            mimeType: "image/jpeg",
            exif: media.exif,
          });
          setCaptureModalVisible(false);
        }}
        exif={true}
      />
      <SafeAreaView
        style={[
          styles.container,
          Platform.OS === "android" && { paddingTop: 0 },
        ]}
      >
        <AppHeader
          user={user || undefined}
          showNotifications={false}
          showProfile={true}
          onLogoPress={onClose}
          onProfilePress={() => {
            onClose();
            router.push("/(tabs)/profile");
          }}
        />

        {/* Context & Question Header */}
        <View style={styles.header}>
          <View style={styles.contextBanner}>
            {folderTypeTitle ? (
              <View style={styles.contextTypeTag}>
                <Ionicons name="folder-outline" size={12} color="#fff" />
                <Text style={styles.contextTypeText} numberOfLines={1}>
                  {folderTypeTitle}
                </Text>
              </View>
            ) : null}
            {folderTitle ? (
              <Text style={styles.contextFolderTitle} numberOfLines={1}>
                {folderTitle}
              </Text>
            ) : null}
            {projectTitle ? (
              <View style={styles.contextProjectRow}>
                <Ionicons name="business-outline" size={12} color="#f87b1b" />
                <Text style={styles.contextProjectText} numberOfLines={1}>
                  {projectTitle}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.headerTitle} numberOfLines={2}>
            {question.title}
          </Text>
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
              {renderInput()}

              {/* Conditional Quantity */}
              {!!question.quantity && (
                <View style={styles.subInputContainer}>
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
              {!!question.price && (
                <View style={styles.subInputContainer}>
                  <Text style={styles.label}>Prix</Text>
                  <TextInput
                    style={styles.input}
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

              <View style={styles.imageContainer}>
                {image ? (
                  <View style={styles.previewWrapper}>
                    <TouchableOpacity
                      onPress={() => setPreviewModalVisible(true)}
                    >
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.imagePreviewFull}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setImage(undefined)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePicker}
                    onPress={handleImagePick}
                  >
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
                  </TouchableOpacity>
                )}
              </View>

              {/* Voice Note */}
              <View style={styles.voiceSection}>
                <VoiceNoteRecorder
                  initialUri={
                    initialAnswer?.recordingUri ||
                    (question.urlvoice
                      ? question.urlvoice.startsWith("http")
                        ? question.urlvoice
                        : `${API_CONFIG.BASE_URL}${question.urlvoice}`
                      : null)
                  }
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
      </SafeAreaView>

      <PreviewModal
        visible={isPreviewModalVisible}
        onClose={() => setPreviewModalVisible(false)}
        mediaUrl={image?.uri}
        mediaType="image"
        title={question.title}
        description={question.description || undefined}
        author={
          user?.firstname ? `${user.firstname} ${user.lastname}` : user?.email
        }
        createdAt={question.created_at || new Date().toISOString()}
        companyTitle={projectTitle}
        chantier={projectTitle}
        type={question.type}
        categorie={question.categorie}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  contextTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f87b1b",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  contextTypeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contextFolderTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#11224e",
  },
  contextProjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  contextProjectText: {
    fontSize: 12,
    color: "#f87b1b",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#11224e",
    lineHeight: 24,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db", // Soft gray
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  subInputContainer: {
    marginTop: 16,
  },
  booleanContainer: {
    flexDirection: "row",
    gap: 12,
  },
  booleanButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    gap: 8,
  },
  booleanButtonActiveYes: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  booleanButtonActiveNo: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  booleanText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  booleanTextActive: {
    color: "#fff",
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },

  voiceSection: {
    marginTop: 8,
  },

  // GPS
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981", // Emerald green for location defined/define
    padding: 14,
    borderRadius: 12,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
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
    padding: 16,
    borderRadius: 12,
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
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f87b1b",
    alignItems: "center",
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
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
    height: 270,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    position: "relative",
  },
  imagePreviewFull: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
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
  // List type answer styles
  listOptionsContainer: {
    gap: 10,
  },
  listOptionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#f87b1b",
    backgroundColor: "#fffaf5",
  },
  listOptionChipSelected: {
    backgroundColor: "#f87b1b",
    borderColor: "#f87b1b",
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  listOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f87b1b",
    flex: 1,
  },
  listOptionTextSelected: {
    color: "#fff",
  },
  // Radio button styles (≤ 3 options)
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#f87b1b",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  radioOuterSelected: {
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  // Dropdown styles (> 3 options)
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#f87b1b",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#fffaf5",
  },
  dropdownTriggerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#11224e",
    flex: 1,
  },
  dropdownTriggerPlaceholder: {
    color: "#f87b1b",
    fontWeight: "400",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    width: "100%",
    maxHeight: 360,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f87b1b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#11224e",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  dropdownOptionSelected: {
    backgroundColor: "#fff7ed",
  },
  dropdownOptionText: {
    fontSize: 15,
    color: "#11224e",
  },
  dropdownOptionTextSelected: {
    color: "#f87b1b",
    fontWeight: "700",
  },
});
