import API_CONFIG from "@/app/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { getPdfReports } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PdfReport = {
  id: string;
  title: string;
  url: string | null;
  size: number | null;
  created_at: string;
  folder?: {
    id: string;
    title: string;
    code?: string;
    project?: {
      id: string;
      title: string;
      code?: string;
    };
    zone?: {
      id: string;
      title: string;
      code?: string;
    };
  };
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ReportsModal({ visible, onClose }: Props) {
  const { token } = useAuth();
  const [reports, setReports] = useState<PdfReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<PdfReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadReports();
    }
  }, [visible, token]);

  useEffect(() => {
    // Filter reports based on search query
    if (!searchQuery.trim()) {
      setFilteredReports(reports);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = reports.filter((report) => {
        const folderTitle = report.folder?.title?.toLowerCase() || "";
        const projectTitle = report.folder?.project?.title?.toLowerCase() || "";
        const zoneTitle = report.folder?.zone?.title?.toLowerCase() || "";
        const reportTitle = report.title?.toLowerCase() || "";

        return (
          folderTitle.includes(query) ||
          projectTitle.includes(query) ||
          zoneTitle.includes(query) ||
          reportTitle.includes(query)
        );
      });
      setFilteredReports(filtered);
    }
  }, [searchQuery, reports]);

  async function loadReports() {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getPdfReports(token);
      setReports(data);
      setFilteredReports(data);
    } catch (error: any) {
      Alert.alert("Erreur", "Échec du chargement des rapports PDF");
      console.error("Failed to load PDF reports:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatFileSize(bytes?: number | null): string {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  }

  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }

  async function downloadPdf(report: PdfReport) {
    if (!report.url) {
      Alert.alert("Erreur", "URL du PDF introuvable");
      return;
    }

    try {
      setDownloadingIds((prev) => new Set(prev).add(report.id));

      // Construct full URL
      const fullUrl = report.url.startsWith("http")
        ? report.url
        : `${API_CONFIG.BASE_URL}${report.url}`;

      // Open PDF in browser/external app
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert("Erreur", "Impossible d'ouvrir le PDF");
      }
    } catch (error: any) {
      console.error("Failed to download PDF:", error);
      Alert.alert("Erreur", "Échec du téléchargement du PDF");
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(report.id);
        return next;
      });
    }
  }

  function handleClose() {
    setSearchQuery("");
    onClose();
  }

  function renderReportCard({ item }: { item: PdfReport }) {
    const isDownloading = downloadingIds.has(item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle} numberOfLines={2}>
              {item.title || "Rapport PDF"}
            </Text>
            {item.folder?.title && (
              <View style={styles.metaRow}>
                <Ionicons name="folder-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.folder.title}
                </Text>
              </View>
            )}
            {item.folder?.project?.title && (
              <View style={styles.metaRow}>
                <Ionicons name="briefcase-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.folder.project.title}
                </Text>
              </View>
            )}
            {item.folder?.zone?.title && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.folder.zone.title}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => downloadPdf(item)}
            disabled={isDownloading}
            style={[styles.downloadButton, isDownloading && { opacity: 0.5 }]}
            android_ripple={{ color: "#fde7d4" }}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#f87b1b" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#f87b1b" />
            )}
          </Pressable>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
            <Text style={styles.footerText}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="document-outline" size={12} color="#9ca3af" />
            <Text style={styles.footerText}>{formatFileSize(item.size)}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            android_ripple={{ color: "#f3f4f6" }}
          >
            <Ionicons name="close" size={24} color="#11224e" />
          </Pressable>
          <Text style={styles.headerTitle}>Rapports PDF</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#9ca3af"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un rapport, dossier, projet..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#f87b1b" />
            <Text style={styles.loadingText}>Chargement des rapports...</Text>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? "Aucun résultat" : "Aucun rapport PDF"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Essayez un autre terme de recherche"
                : "Les rapports PDF générés apparaîtront ici"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            keyExtractor={(item) => item.id}
            renderItem={renderReportCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#11224e",
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  downloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fef3e7",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
