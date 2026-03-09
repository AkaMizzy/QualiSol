import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import API_CONFIG from "@/app/config/api";
import { useAuth } from "@/contexts/AuthContext";
import * as gedService from "@/services/gedService";
import { Ged, generateFolderQaPdf } from "@/services/gedService";

import AppHeader from "@/components/AppHeader";
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
  folderTitle?: string;
  projectTitle?: string;
  folderTypeTitle?: string;
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
  author?: string;
  idauthor?: string;
  iddevice?: string;
  captudedate?: string;
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
    !!item.url ||
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
  folderTitle,
  projectTitle,
  folderTypeTitle,
}: FolderQuestionsModalProps) {
  const { token, user } = useAuth();
  const [geds, setGeds] = useState<Ged[]>([]);
  // pendingChanges basically acts as "current local state" for updated answers
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, AnswerData>
  >({});

  // Modal State
  const [answerModalVisible, setAnswerModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Ged | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

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

        const initialPending: Record<string, AnswerData> = {};

        validQuestions.forEach((q) => {
          const val = q.answer || q.value || "";
          if (
            val ||
            q.url ||
            q.urlvoice ||
            q.quantity !== undefined ||
            q.price !== undefined ||
            q.latitude
          ) {
            initialPending[q.id] = {
              answer: val,
              value: val,
              quantity: q.quantity ?? undefined,
              price: q.price ?? undefined,
              latitude: q.latitude || undefined,
              longitude: q.longitude || undefined,
              image: undefined, // We don't verify remote images as local assets immediately
              recordingUri: undefined,
              boolValue: val === "true",
            };
          }
        });

        setGeds(validQuestions);
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

    // Base Payload - only update answer-related fields along with new metadata
    const basePayload: any = {
      quantity: data.quantity,
      price: data.price,
      answer: data.answer || data.value,
      latitude: data.latitude,
      longitude: data.longitude,
      author: data.author,
      idauthor: data.idauthor,
      iddevice: data.iddevice,
      captudedate: data.captudedate,
    };

    try {
      let savedGed: Ged;
      // UPDATE directly on the question record
      const filesToUpload: any = {};
      if (data.image && !data.image.uri.startsWith("http")) {
        filesToUpload.file = {
          uri: data.image.uri,
          type: data.image.mimeType || "image/jpeg",
          name: data.image.fileName || "photo.jpg",
        };
      }
      if (data.recordingUri && !data.recordingUri.startsWith("http")) {
        filesToUpload.audioFile = {
          uri: data.recordingUri,
          type: "audio/m4a",
          name: `voice-${Date.now()}.m4a`,
        };
      }

      if (Object.keys(filesToUpload).length > 0) {
        savedGed = await gedService.uploadGedFiles(
          token,
          question.id,
          filesToUpload,
          basePayload,
        );
      } else {
        savedGed = await gedService.updateGed(token, question.id, basePayload);
      }

      // Update local state
      setPendingChanges((prev) => ({
        ...prev,
        [question.id]: {
          ...data,
          answer: data.answer || data.value,
          image: undefined,
          recordingUri: undefined,
        },
      }));

      // Update geds array so the photo displays correctly immediately
      setGeds((prev) => prev.map((g) => (g.id === question.id ? savedGed : g)));
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Echec de l'enregistrement de la réponse");
      throw e; // AnswerModal will catch
    }
  };

  const handleGeneratePdf = async () => {
    if (!folderId || !token) return;
    setIsPdfLoading(true);
    try {
      const result = await generateFolderQaPdf(token, folderId);
      const pdfUrl = `${API_CONFIG.BASE_URL}${result.data.url}`;
      await Linking.openURL(pdfUrl);
    } catch (err) {
      console.error("Failed to generate Q&A PDF:", err);
      Alert.alert("Erreur", "Impossible de générer le PDF.");
    } finally {
      setIsPdfLoading(false);
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
          folderTitle={folderTitle}
          projectTitle={projectTitle}
          folderTypeTitle={folderTypeTitle}
        />
      )}
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <AppHeader
          user={user || undefined}
          showNotifications={false}
          showProfile={true}
          onLogoPress={onClose}
        />
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
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={handleGeneratePdf}
            disabled={isPdfLoading || isLoading}
          >
            {isPdfLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="document-text-outline" size={18} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={onClose}>
            <Text style={styles.saveBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
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
  colAnswer: { flex: 2, paddingLeft: 8 },

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
    flexDirection: "row",
    gap: 10,
  },
  pdfButton: {
    backgroundColor: "#f87b1b",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#374151", fontWeight: "bold", fontSize: 16 },
});
