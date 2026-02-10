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
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import * as gedService from "@/services/gedService";
import { Ged } from "@/services/gedService";

import * as ImagePicker from "expo-image-picker";
import AnswerModal from "./AnswerModal";

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

function QuestionRow({
  item,
  answer,
  onOpenAnswerModal,
}: {
  item: Ged;
  answer?: AnswerData;
  onOpenAnswerModal: (item: Ged) => void;
}) {
  const rawValue = answer?.answer || answer?.value || "";
  const displayValue =
    item.type === "boolean"
      ? rawValue === "true"
        ? "Oui"
        : rawValue === "false"
          ? "Non"
          : rawValue
      : rawValue;
  const hasImage =
    !!answer?.image ||
    (displayValue.startsWith("http") && item.type === "photo");
  const hasVoice =
    !!answer?.recordingUri || displayValue.endsWith(".m4a") || !!item.urlvoice;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onOpenAnswerModal(item)}
    >
      {/* Title */}
      <View style={styles.colTitle}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.questionTitle,
              item.description && { color: "#f87b1b" },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {!!item.description && (
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#f87b1b"
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>

      {/* Answer Preview */}
      <View style={styles.colAnswer}>
        <View style={styles.answerPreviewContainer}>
          <Text
            style={[
              styles.answerTextPreview,
              !displayValue && styles.placeholderText,
            ]}
            numberOfLines={1}
          >
            {displayValue || "Répondre..."}
          </Text>
          <View style={styles.iconsRow}>
            {hasImage && (
              <Ionicons name="image-outline" size={16} color="#f87b1b" />
            )}
            {hasVoice && (
              <Ionicons name="mic-outline" size={16} color="#f87b1b" />
            )}
            {displayValue ? (
              <Ionicons name="checkmark-circle" size={16} color="green" />
            ) : (
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  // pendingChanges basically acts as "current local state" for updated answers
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, AnswerData>
  >({});

  // Modal State
  const [answerModalVisible, setAnswerModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Ged | null>(null);

  const [isLoading, setIsLoading] = useState(false);
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
            const val = a.answer || a.description || a.value || "";
            initialPending[a.idsource] = {
              answer: val,
              value: val,
              quantity: a.quantity ?? undefined,
              price: a.price ?? undefined,
              latitude: a.latitude || undefined,
              longitude: a.longitude || undefined,
              image: undefined, // We don't verify remote images as local assets immediately
              recordingUri: undefined,
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

  const handleOpenAnswerModal = (question: Ged) => {
    setSelectedQuestion(question);
    setAnswerModalVisible(true);
  };

  const handleAnswerSave = async (data: any) => {
    if (!selectedQuestion || !token || !user) return;

    const question = selectedQuestion;
    const existingAnswer = initialAnswers.get(question.id);

    // Base Payload
    const basePayload: any = {
      idsource: question.id,
      title: `Réponse: ${question.title}`,
      kind: "answer",
      author: user.id,
      type: "answer",
      quantity: data.quantity,
      price: data.price,
      answer: data.answer || data.value,
      latitude: data.latitude,
      longitude: data.longitude,
    };

    try {
      let savedGed: Ged;
      if (existingAnswer) {
        // UPDATE
        const filesToUpload: any = {};
        if (data.image) {
          filesToUpload.file = {
            uri: data.image.uri,
            type: data.image.mimeType || "image/jpeg",
            name: data.image.fileName || "photo.jpg",
          };
        }
        if (data.recordingUri) {
          filesToUpload.audioFile = {
            uri: data.recordingUri,
            type: "audio/m4a",
            name: `voice-${Date.now()}.m4a`,
          };
        }

        if (Object.keys(filesToUpload).length > 0) {
          savedGed = await gedService.uploadGedFiles(
            token,
            existingAnswer.id,
            filesToUpload,
            basePayload,
          );
        } else {
          savedGed = await gedService.updateGed(
            token,
            existingAnswer.id,
            basePayload,
          );
        }
      } else {
        // CREATE
        const createPayload = { ...basePayload };
        if (data.image) {
          createPayload.file = {
            uri: data.image.uri,
            type: data.image.mimeType || "image/jpeg",
            name: data.image.fileName || "photo.jpg",
          };
        }
        if (data.recordingUri) {
          createPayload.audioFile = {
            uri: data.recordingUri,
            type: "audio/m4a",
            name: `voice-${Date.now()}.m4a`,
          };
        }
        const res = await gedService.createGed(token, createPayload);
        savedGed = res.data;
      }

      // Update local state
      setPendingChanges((prev) => ({
        ...prev,
        [question.id]: {
          ...data,
          answer: data.answer || data.value,
        },
      }));

      // Also update initialAnswers so next open has correct ID
      setInitialAnswers((prev) => {
        const newMap = new Map(prev);
        newMap.set(question.id, savedGed);
        return newMap;
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Echec de l'enregistrement de la réponse");
      throw e; // AnswerModal will catch
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Answer Modal */}
      {selectedQuestion && (
        <AnswerModal
          visible={answerModalVisible}
          question={selectedQuestion}
          initialAnswer={pendingChanges[selectedQuestion.id]}
          onClose={() => setAnswerModalVisible(false)}
          onSave={handleAnswerSave}
        />
      )}
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#11224e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Questions</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.colTitle]}>Question</Text>
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
                  onOpenAnswerModal={handleOpenAnswerModal}
                />
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={styles.saveButton} onPress={onClose}>
            <Text style={styles.saveBtnText}>Fermer</Text>
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
  colTitle: { flex: 3, paddingRight: 8 },
  colAnswer: { flex: 1, paddingLeft: 8 },

  listContent: { paddingBottom: 100 },
  row: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
    alignItems: "center",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  questionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    flex: 1,
  },

  answerPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  answerTextPreview: {
    flex: 1,
    fontSize: 14,
    color: "#4b5563",
    marginRight: 4,
  },
  placeholderText: {
    color: "#9ca3af",
    fontStyle: "italic",
  },
  iconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  saveButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#374151", fontWeight: "bold", fontSize: 16 },
});
