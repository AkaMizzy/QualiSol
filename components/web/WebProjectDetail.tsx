import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
    deleteProject,
    getProjectById,
    Project,
} from "@/services/projectService";
import { formatDisplayDate } from "@/utils/dateFormat";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ZoneManagementPanel from "./ZoneManagementPanel";

type Props = {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onUpdated?: () => void;
};

type DetailTab = "overview" | "zones" | "settings";

export default function WebProjectDetail({
  visible,
  project,
  onClose,
  onUpdated,
}: Props) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (visible && project && token) {
      loadProjectDetails();
    } else {
      setProjectData(null);
      setActiveTab("overview");
    }
  }, [visible, project?.id, token]);

  const loadProjectDetails = async () => {
    if (!project || !token) return;
    setIsLoading(true);
    try {
      const data = await getProjectById(token, project.id);
      setProjectData(data);
    } catch (error) {
      console.error("Error loading project details:", error);
      setProjectData(project);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!project || !token) return;

    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer ce chantier ? Cette action est irréversible.",
      )
    ) {
      setIsDeleting(true);
      deleteProject(token, project.id)
        .then(() => {
          Alert.alert("Succès", "Chantier supprimé avec succès");
          onClose();
          if (onUpdated) onUpdated();
        })
        .catch((error) => {
          Alert.alert("Erreur", error?.message || "Échec de la suppression");
        })
        .finally(() => {
          setIsDeleting(false);
        });
    }
  };

  if (!project) return null;

  const displayProject = projectData || project;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={COLORS.tertiary} />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {displayProject.title}
                </Text>
                <Text style={styles.headerSubtitle}>{displayProject.code}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  <Text style={styles.deleteButtonText}>Supprimer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "overview" && styles.tabActive]}
              onPress={() => setActiveTab("overview")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "overview" && styles.tabTextActive,
                ]}
              >
                Vue d'ensemble
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "zones" && styles.tabActive]}
              onPress={() => setActiveTab("zones")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "zones" && styles.tabTextActive,
                ]}
              >
                Zones
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "settings" && styles.tabActive]}
              onPress={() => setActiveTab("settings")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "settings" && styles.tabTextActive,
                ]}
              >
                Paramètres
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <>
                {activeTab === "overview" && (
                  <OverviewTab project={displayProject} />
                )}
                {activeTab === "zones" && (
                  <ZoneManagementPanel projectId={displayProject.id} />
                )}
                {activeTab === "settings" && (
                  <SettingsTab project={displayProject} />
                )}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OverviewTab({ project }: { project: Project }) {
  return (
    <View style={styles.overviewContainer}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Informations générales</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="Titre" value={project.title} />
          <InfoRow label="Code" value={project.code} />
          <InfoRow label="Société" value={project.company_title || "—"} />
          <InfoRow label="Type" value={project.project_type_title || "—"} />
          <InfoRow
            label="Date de début"
            value={formatDisplayDate(project.dd)}
          />
          <InfoRow label="Date de fin" value={formatDisplayDate(project.df)} />
        </View>
        {project.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{project.description}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SettingsTab({ project }: { project: Project }) {
  return (
    <View style={styles.settingsContainer}>
      <Text style={styles.placeholderText}>
        Paramètres du chantier - À venir
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    maxWidth: 1200,
    height: "90%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 24,
    color: COLORS.tertiary,
  },
  headerSubtitle: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  deleteButtonText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: "#dc2626",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray2,
    paddingHorizontal: 24,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  tabTextActive: {
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewContainer: {
    padding: 24,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray2,
    padding: 24,
  },
  cardTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.tertiary,
    marginBottom: 20,
  },
  infoGrid: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray2,
  },
  infoLabel: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  infoValue: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  descriptionSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray2,
  },
  descriptionLabel: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginBottom: 8,
  },
  descriptionText: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    lineHeight: 22,
  },
  settingsContainer: {
    padding: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.large,
    color: COLORS.gray,
  },
});
