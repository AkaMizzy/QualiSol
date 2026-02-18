import API_CONFIG from "@/app/config/api";
import { useAuth } from "@/contexts/AuthContext";
import folderService from "@/services/folderService";
import { Ged, getGedsBySource } from "@/services/gedService";
import {
  getArchivedStatusId,
  getPendingStatusId,
} from "@/services/statusService";
import { CompanyUser } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  folderId: string | null;
  folderTitle: string;
  users: CompanyUser[];
};

type QuestionWithAnswers = {
  question: Ged;
  answers: Ged[];
};

export default function FolderAnswersSummaryModal({
  visible,
  onClose,
  folderId,
  folderTitle,
  users,
}: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QuestionWithAnswers[]>([]);
  const [statusId, setStatusId] = useState<string | null>(null);
  const [archivedStatusId, setArchivedStatusId] = useState<string | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (visible && folderId && token) {
      loadData();
      loadStatuses();
    }
  }, [visible, folderId, token]);

  const loadStatuses = async () => {
    if (!token) return;
    try {
      const [archivedId, pendingId] = await Promise.all([
        getArchivedStatusId(token),
        getPendingStatusId(token),
      ]);
      setArchivedStatusId(archivedId);
      setPendingStatusId(pendingId);
    } catch (error) {
      console.error("Failed to load statuses:", error);
    }
  };

  const loadData = async () => {
    if (!token || !folderId) return;
    setLoading(true);
    try {
      // 0. Fetch Folder Details to get current status
      const folder = await folderService.getFolderById(folderId, token);
      if (folder) {
        setStatusId(folder.status_id);
      }

      // 1. Fetch Questions
      const questions = await getGedsBySource(token, folderId, "question");

      // Filter out non-question types if necessary, typically 'question' kind is enough
      // But let's sort them by position or creation date if needed.
      // Assuming backend returns them in order or we sort them.

      if (questions.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // 2. Fetch Answers for these questions
      const questionIds = questions.map((q) => q.id);
      const answers = await getGedsBySource(token, questionIds, "answer");

      // 3. Group answers by question
      const grouped: QuestionWithAnswers[] = questions.map((q) => ({
        question: q,
        answers: answers.filter((a) => a.idsource === q.id),
      }));

      setData(grouped);
    } catch (error) {
      console.error("Failed to load Q&A data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return "Utilisateur inconnu";
    return (
      `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
      user.email ||
      "N/A"
    );
  };

  const formatAnswerValue = (answer: Ged, questionType?: string) => {
    // Handle specific types if needed
    if (questionType === "boolean") {
      if (answer.answer === "true") return "Oui";
      if (answer.answer === "false") return "Non";
    }
    return answer.answer || answer.description || answer.value || "";
  };

  const handleToggleStatus = async (value: boolean) => {
    if (!folderId || !token || !archivedStatusId || !pendingStatusId) return;

    const newStatusId = value ? archivedStatusId : pendingStatusId;
    setUpdatingStatus(true);
    try {
      await folderService.updateFolder(
        folderId,
        { status_id: newStatusId },
        token,
      );
      setStatusId(newStatusId);
    } catch (error) {
      console.error("Failed to update status:", error);
      Alert.alert(
        "Erreur",
        "Impossible de mettre à jour le statut du dossier.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isArchived = statusId === archivedStatusId;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{folderTitle}</Text>

          {archivedStatusId && pendingStatusId && (
            <View style={styles.statusToggle}>
              <Text
                style={[
                  styles.statusLabel,
                  isArchived && styles.activeStatusLabel,
                ]}
              >
                {isArchived ? "validé" : "En cours"}
              </Text>
              <Switch
                value={isArchived}
                onValueChange={handleToggleStatus}
                trackColor={{ false: "#767577", true: "#f87b1b" }}
                thumbColor={isArchived ? "white" : "#f4f3f4"}
                disabled={updatingStatus || isArchived}
              />
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#f87b1b" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {data.length === 0 ? (
              <Text style={styles.emptyText}>
                Aucune question trouvée dans ce dossier.
              </Text>
            ) : (
              data.map((item, index) => (
                <View key={item.question.id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionTitle}>
                      {index + 1}. {item.question.title}
                    </Text>
                    <Text style={styles.questionType}>
                      {item.question.type}
                    </Text>
                  </View>

                  {item.answers.length === 0 ? (
                    <Text style={styles.noAnswerText}>Aucune réponse</Text>
                  ) : (
                    <View style={styles.answersList}>
                      {item.answers.map((ans) => (
                        <View key={ans.id} style={styles.answerItem}>
                          <View style={styles.answerMeta}>
                            <Text style={styles.authorName}>
                              {getUserName(ans.author)}
                            </Text>
                            <Text style={styles.dateText}>
                              {new Date(ans.created_at).toLocaleDateString(
                                "fr-FR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </Text>
                          </View>

                          <View style={styles.answerContent}>
                            {/* Text Content */}
                            {formatAnswerValue(ans, item.question.type) ? (
                              <Text style={styles.answerText}>
                                {formatAnswerValue(ans, item.question.type)}
                              </Text>
                            ) : null}

                            {/* Quantity/Price */}
                            {(ans.quantity !== undefined ||
                              ans.price !== undefined) && (
                              <View style={styles.detailsRow}>
                                {ans.quantity !== undefined && (
                                  <Text style={styles.detailTag}>
                                    Qté: {ans.quantity}
                                  </Text>
                                )}
                                {ans.price !== undefined && (
                                  <Text style={styles.detailTag}>
                                    Prix: {ans.price}€
                                  </Text>
                                )}
                              </View>
                            )}

                            {/* Media */}
                            <View style={styles.mediaRow}>
                              {ans.url && (
                                <TouchableOpacity
                                  onPress={() => {
                                    // Handle image view if needed
                                  }}
                                >
                                  <Image
                                    source={{
                                      uri: `${API_CONFIG.BASE_URL}${ans.url}`,
                                    }}
                                    style={styles.mediaThumbnail}
                                  />
                                </TouchableOpacity>
                              )}
                              {ans.urlvoice && (
                                <View style={styles.voiceBadge}>
                                  <Ionicons name="mic" size={14} color="#fff" />
                                  <Text style={styles.voiceText}>Audio</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "white",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  activeStatusLabel: {
    color: "#f87b1b",
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
  },
  questionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11224e",
    flex: 1,
    marginRight: 8,
  },
  questionType: {
    fontSize: 10,
    color: "#9ca3af",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  noAnswerText: {
    fontStyle: "italic",
    color: "#9ca3af",
    fontSize: 14,
  },
  answersList: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 8,
  },
  answerItem: {
    marginTop: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#f87b1b",
    paddingBottom: 4,
  },
  answerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  authorName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  dateText: {
    fontSize: 10,
    color: "#9ca3af",
  },
  answerContent: {
    gap: 4,
  },
  answerText: {
    fontSize: 14,
    color: "#1f2937",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 8,
  },
  detailTag: {
    fontSize: 12,
    color: "#4b5563",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  mediaThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
  },
  voiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f87b1b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: "flex-start",
  },
  voiceText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
});
