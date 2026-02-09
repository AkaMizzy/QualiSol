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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import * as gedService from "@/services/gedService";
import { Ged } from "@/services/gedService";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import MapSelectionModal from "./MapSelectionModal";

const SUPPORTED_TYPES = [
  "long_text",
  "text",
  "list",
  "boolean",
  "date",
  "number",
  "taux",
  "photo",
  "voice",
  "GPS",
];

interface FolderQuestionsModalProps {
  folderId: string | null;
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

interface AnswerData {
  value?: string;
  answer?: string;
  quantity?: number;
  price?: number;
  latitude?: string;
  longitude?: string;
  image?: ImagePicker.ImagePickerAsset;
  recordingUri?: string;
  boolValue?: boolean;
}

// ... helper functions ...

function QuestionRow({
  item,
  answer,
  onChange,
}: {
  item: Ged;
  answer?: AnswerData;
  onChange: (data: Partial<AnswerData>) => void;
}) {
  // Use 'answer' field if available, fallback to 'value'
  const [localValue, setLocalValue] = useState(
    answer?.answer || answer?.value || "",
  );
  const [localQuantity, setLocalQuantity] = useState(
    answer?.quantity?.toString() || "",
  );
  const [localPrice, setLocalPrice] = useState(answer?.price?.toString() || "");

  // ... state for complex types ...
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [status, setStatus] = useState<
    "idle" | "recording" | "recorded" | "playing"
  >("idle");
  const [isMapVisible, setMapVisible] = useState(false);

  // Sync local state if prop changes (e.g. initial load)
  useEffect(() => {
    const newVal = answer?.answer || answer?.value;
    if (newVal !== undefined && newVal !== localValue) setLocalValue(newVal);

    if (
      answer?.quantity !== undefined &&
      answer.quantity.toString() !== localQuantity
    )
      setLocalQuantity(answer.quantity.toString());
    if (answer?.price !== undefined && answer.price.toString() !== localPrice)
      setLocalPrice(answer.price.toString());
  }, [answer]);

  // ... audio cleanup ...
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const handleTextChange = (text: string) => {
    setLocalValue(text);
    onChange({ answer: text, value: text }); // Update both for compatibility/display
  };

  const handleQuantityChange = (text: string) => {
    setLocalQuantity(text);
    const qty = parseFloat(text);
    onChange({ quantity: isNaN(qty) ? undefined : qty });
  };

  const handlePriceChange = (text: string) => {
    setLocalPrice(text);
    const prc = parseFloat(text);
    onChange({ price: isNaN(prc) ? undefined : prc });
  };

  const handleBooleanChange = (val: boolean) => {
    const strVal = String(val);
    onChange({ boolValue: val, answer: strVal, value: strVal });
  };

  // --- Photo Logic ---
  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission refusée");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      onChange({
        image: result.assets[0],
        answer: "Photo sélectionnée",
        value: "Photo sélectionnée",
      });
    }
  };

  // --- Audio Logic ---
  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(recording);
      setStatus("recording");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setStatus("recorded");
    if (uri)
      onChange({
        recordingUri: uri,
        answer: "Audio enregistré",
        value: "Audio enregistré",
      });
  };

  const playSound = async () => {
    if (!answer?.recordingUri) return;
    const { sound: newSound } = await Audio.Sound.createAsync({
      uri: answer.recordingUri,
    });
    setSound(newSound);
    await newSound.playAsync();
  };

  // --- GPS Logic ---
  const handleLocationSelect = (loc: {
    latitude: number;
    longitude: number;
  }) => {
    const val = `Lat: ${loc.latitude.toFixed(4)}, Lon: ${loc.longitude.toFixed(4)}`;
    onChange({
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      answer: val,
      value: val,
    });
    setMapVisible(false);
  };

  // ... renderAnswerInput ...
  const renderAnswerInput = () => {
    switch (item.type) {
      case "boolean":
        return (
          <Switch
            value={answer?.boolValue || localValue === "true"}
            onValueChange={handleBooleanChange}
            trackColor={{ false: "#767577", true: "#f87b1b" }}
          />
        );
      case "date":
        return (
          <>
            <TouchableOpacity
              onPress={() => setDatePickerVisibility(true)}
              style={styles.dateButton}
            >
              <Text style={styles.dateText}>{localValue || "YYYY-MM-DD"}</Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              onConfirm={(date) => {
                const val = date.toISOString().split("T")[0];
                setLocalValue(val);
                onChange({ answer: val, value: val });
                setDatePickerVisibility(false);
              }}
              onCancel={() => setDatePickerVisibility(false)}
            />
          </>
        );
      case "photo":
        return (
          <TouchableOpacity
            onPress={handleSelectImage}
            style={styles.mediaButton}
          >
            {answer?.image ? (
              <Image
                source={{ uri: answer.image.uri }}
                style={styles.thumbnail}
              />
            ) : localValue && localValue.startsWith("http") ? (
              // Existing image from server
              <Image source={{ uri: localValue }} style={styles.thumbnail} />
            ) : (
              <Ionicons name="camera-outline" size={24} color="#f87b1b" />
            )}
          </TouchableOpacity>
        );
      case "voice":
        return (
          <View style={styles.rowCenter}>
            {status === "recording" ? (
              <TouchableOpacity onPress={stopRecording}>
                <Ionicons name="stop-circle" size={28} color="#ef4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={startRecording}>
                <Ionicons name="mic-outline" size={24} color="#f87b1b" />
              </TouchableOpacity>
            )}
            {(answer?.recordingUri ||
              (localValue && localValue.endsWith(".m4a"))) && (
              <TouchableOpacity onPress={playSound} style={{ marginLeft: 10 }}>
                <Ionicons
                  name="play-circle-outline"
                  size={24}
                  color="#11224e"
                />
              </TouchableOpacity>
            )}
          </View>
        );
      case "GPS":
        return (
          <>
            <TouchableOpacity
              onPress={() => setMapVisible(true)}
              style={styles.rowCenter}
            >
              <Ionicons name="location-outline" size={24} color="#f87b1b" />
              <Text style={styles.smallText}>
                {answer?.latitude ? "Modifier" : "Définir"}
              </Text>
            </TouchableOpacity>
            <MapSelectionModal
              visible={isMapVisible}
              onClose={() => setMapVisible(false)}
              onLocationSelect={handleLocationSelect}
            />
          </>
        );
      case "long_text":
        return (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={localValue}
            onChangeText={handleTextChange}
            placeholder="Saisir..."
            multiline
          />
        );
      default: // text, number, taux, list
        return (
          <TextInput
            style={styles.input}
            value={localValue}
            onChangeText={handleTextChange}
            placeholder="Saisir..."
            keyboardType={
              item.type === "number" || item.type === "taux"
                ? "numeric"
                : "default"
            }
          />
        );
    }
  };

  // ... render ...
  // Determine if we show Quantity/Price inputs
  const showQuantity = !!item.quantity;
  const showPrice = !!item.price;

  return (
    <View style={styles.row}>
      {/* Title & Desc */}
      <View style={styles.colTitle}>
        <View style={styles.titleRow}>
          <Text style={styles.questionTitle}>{item.title}</Text>
          {item.description ? (
            <TouchableOpacity
              onPress={() => Alert.alert("Description", item.description || "")}
              style={styles.helpIcon}
            >
              <Ionicons name="help-circle-outline" size={20} color="#f87b1b" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Quantity (Conditional) */}
      <View style={styles.colQty}>
        {showQuantity ? (
          <TextInput
            style={styles.numberInput}
            value={localQuantity}
            onChangeText={handleQuantityChange}
            placeholder="0"
            keyboardType="numeric"
          />
        ) : null}
      </View>

      {/* Price (Conditional) */}
      <View style={styles.colPrice}>
        {showPrice ? (
          <TextInput
            style={styles.numberInput}
            value={localPrice}
            onChangeText={handlePriceChange}
            placeholder="0.00"
            keyboardType="numeric"
          />
        ) : null}
      </View>

      {/* Answer Input */}
      <View style={styles.colAnswer}>{renderAnswerInput()}</View>
    </View>
  );
}

export default function FolderQuestionsModal({
  folderId,
  visible,
  onClose,
  onDelete,
}: FolderQuestionsModalProps) {
  const { token, user } = useAuth();
  const [geds, setGeds] = useState<Ged[]>([]);
  const [initialAnswers, setInitialAnswers] = useState<Map<string, Ged>>(
    new Map(),
  );
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, AnswerData>
  >({});

  // ... state ...
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function loadData() {
      if (!token || !folderId || !visible) return;
      setIsLoading(true);
      try {
        const fetchedGeds = await gedService.getGedsBySource(
          token,
          folderId,
          "question",
        );
        const validQuestions = fetchedGeds.filter(
          (g) => g.type && SUPPORTED_TYPES.includes(g.type),
        );

        // Fetch existing answers
        const questionIds = validQuestions.map((q) => q.id);
        const fetchedAnswers =
          questionIds.length > 0
            ? await gedService.getGedsBySource(token, questionIds, "answer")
            : [];

        const answersMap = new Map<string, Ged>();
        const initialPending: Record<string, AnswerData> = {};

        fetchedAnswers.forEach((a) => {
          if (a.idsource) {
            answersMap.set(a.idsource, a);
            // Pre-populate pending changes
            // Prioritize 'answer' field, fallback to 'description'/'value' for backward compatibility
            const val = a.answer || a.description || a.value || "";
            initialPending[a.idsource] = {
              answer: val,
              value: val,
              quantity: a.quantity ?? undefined,
              price: a.price ?? undefined,
              latitude: a.latitude || undefined,
              longitude: a.longitude || undefined,
              // For images/voice, we don't download blob, just keep ref in value/url
              boolValue: val === "true",
            };
          }
        });

        setGeds(validQuestions);
        setInitialAnswers(answersMap);
        setPendingChanges(initialPending);
      } catch (err) {
        console.error(err);
        setError("Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [folderId, token, visible]);

  // ... handleRowChange ...
  const handleRowChange = (questionId: string, data: Partial<AnswerData>) => {
    setPendingChanges((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), ...data },
    }));
  };

  const handleGlobalSubmit = async () => {
    if (!token || !user) return;
    setIsSubmitting(true);
    try {
      const promises = geds.map(async (question) => {
        const changes = pendingChanges[question.id];
        if (!changes) return; // No changes or initial value

        const existingAnswer = initialAnswers.get(question.id);

        // Construct shared payload base
        const basePayload: any = {
          idsource: question.id,
          title: `Réponse: ${question.title}`,
          kind: "answer",
          author: user.id,
          type: "answer",
          quantity: changes.quantity,
          price: changes.price,
        };

        // Handle specific types data
        if (question.type === "GPS" && changes.latitude) {
          basePayload.latitude = changes.latitude;
          basePayload.longitude = changes.longitude;
          // If we have an answer text for GPS (like raw lat/lon string), save it too
          if (changes.answer) basePayload.answer = changes.answer;
        } else if (question.type !== "photo" && question.type !== "voice") {
          // Use 'answer' field instead of description
          basePayload.answer = changes.answer || changes.value;
          // IMPORTANT: User requested to use 'answer' instead of 'description'.
          // We can leave description null or put a summary there if needed.
        }

        if (existingAnswer) {
          // UPDATE
          if (question.type === "photo" && changes.image) {
            await gedService.updateGedFile(
              token,
              existingAnswer.id,
              {
                uri: changes.image.uri,
                type: changes.image.mimeType || "image/jpeg",
                name: changes.image.fileName || "photo.jpg",
              },
              basePayload,
            );
          } else if (question.type === "voice" && changes.recordingUri) {
            await gedService.updateGedFile(
              token,
              existingAnswer.id,
              {
                uri: changes.recordingUri,
                type: "audio/m4a",
                name: `voice-${Date.now()}.m4a`,
              },
              basePayload,
            );
          } else {
            await gedService.updateGed(token, existingAnswer.id, basePayload);
          }
        } else {
          // CREATE
          const createPayload = { ...basePayload };
          if (question.type === "photo" && changes.image) {
            createPayload.file = {
              uri: changes.image.uri,
              type: changes.image.mimeType || "image/jpeg",
              name: changes.image.fileName || "photo.jpg",
            };
          } else if (question.type === "voice" && changes.recordingUri) {
            createPayload.file = {
              uri: changes.recordingUri,
              type: "audio/m4a",
              name: `voice-${Date.now()}.m4a`,
            };
          } else {
            // Logic for 'answer' fallback
            if (!createPayload.answer && !createPayload.latitude) {
              createPayload.answer = changes.answer || changes.value || "";
            }
          }
          await gedService.createGed(token, createPayload);
        }
      });

      await Promise.all(promises);
      Alert.alert("Succès", "Réponses enregistrées");
      onClose();
    } catch (err) {
      Alert.alert("Erreur", "Echec de l'enregistrement");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#11224e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Questions</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.colTitle]}>Question</Text>
          <Text style={[styles.headerCell, styles.colQty]}>Qté</Text>
          <Text style={[styles.headerCell, styles.colPrice]}>Prix</Text>
          <Text style={[styles.headerCell, styles.colAnswer]}>Réponse</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#f87b1b"
            style={{ marginTop: 20 }}
          />
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.listContent}>
              {geds.map((question) => (
                <QuestionRow
                  key={question.id}
                  item={question}
                  answer={pendingChanges[question.id]}
                  onChange={(data) => handleRowChange(question.id, data)}
                />
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && styles.disabledBtn]}
            onPress={handleGlobalSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Enregistrer tout</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#11224e" },

  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerCell: { fontWeight: "600", color: "#6b7280", fontSize: 12 },

  // Columns
  colTitle: { flex: 2, paddingRight: 8 },
  colQty: { width: 50, textAlign: "center" },
  colPrice: { width: 60, textAlign: "center" },
  colAnswer: { flex: 2, paddingLeft: 8 },

  listContent: { paddingBottom: 100 },
  row: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
    alignItems: "center",
  },

  questionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    flex: 1, // Allow title to take available space
  },
  // questionDesc removed

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  helpIcon: {
    marginLeft: 6,
    padding: 2,
  },

  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 6,
    fontSize: 13,
    minHeight: 36,
    backgroundColor: "#fff",
  },
  textArea: { height: 60, textAlignVertical: "top" },
  numberInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 4,
    fontSize: 13,
    textAlign: "center",
    minHeight: 32,
  },

  mediaButton: { justifyContent: "center", alignItems: "center", padding: 4 },
  thumbnail: { width: 40, height: 40, borderRadius: 4 },
  rowCenter: { flexDirection: "row", alignItems: "center" },

  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 6,
    justifyContent: "space-between",
  },
  dateText: { fontSize: 12, color: "#374151" },
  smallText: { fontSize: 11, marginLeft: 4, color: "#4b5563" },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  saveButton: {
    backgroundColor: "#f87b1b",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
