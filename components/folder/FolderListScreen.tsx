import AppHeader from "@/components/AppHeader";
import FolderQuestionsModal from "@/components/folder/FolderQuestionsModal";
import { ICONS } from "@/constants/Icons";
import { useAuth } from "@/contexts/AuthContext";
import folderService, { Folder, Project } from "@/services/folderService";
import { getArchivedStatusId } from "@/services/statusService";
import { CompanyUser } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDateForGrid(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const compliantDateStr = dateStr.includes("T")
      ? dateStr
      : dateStr.replace(" ", "T");
    return new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(compliantDateStr));
  } catch {
    return "";
  }
}

const FolderCard = ({
  item,
  projectTitle,
  onPress,
}: {
  item: Folder;
  projectTitle?: string;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    onPress={onPress}
  >
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.infoRow}>
        <Image source={ICONS.chantierPng} style={{ width: 14, height: 14 }} />
        <Text style={styles.infoText} numberOfLines={1}>
          {projectTitle || "N/A"}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={14} color="#f87b1b" />
        <Text style={styles.infoText}>
          {formatDateForGrid(item.created_at)}
        </Text>
      </View>
    </View>
  </Pressable>
);

interface FolderListScreenProps {
  folderTypeTitle: string;
  folderTypeIcon?: any;
}

export default function FolderListScreen({
  folderTypeTitle,
  folderTypeIcon,
}: FolderListScreenProps) {
  const { token, user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isQuestionsModalVisible, setIsQuestionsModalVisible] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Filter states
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(
    undefined,
  );
  const [selectedUser, setSelectedUser] = useState<string | undefined>(
    undefined,
  );
  const [archivedStatusId, setArchivedStatusId] = useState<string | null>(null);

  const [projectOpen, setProjectOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const filteredFolders = React.useMemo(() => {
    return folders.filter((folder) => {
      // 1. Filter by Project
      const projectMatch =
        !selectedProject || folder.project_id === selectedProject;

      // 2. Filter out Archived
      const isArchived =
        archivedStatusId && folder.status_id === archivedStatusId;

      return projectMatch && !isArchived;
    });
  }, [folders, selectedProject, archivedStatusId]);

  const fetchFolders = useCallback(async () => {
    if (!token || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const fetchedFolders = await folderService.getAllFolders(
        token,
        folderTypeTitle,
      );

      // Filter folders for standard users - access control
      let availableFolders = fetchedFolders;
      if (!["Super Admin", "Admin"].includes(user.role)) {
        availableFolders = fetchedFolders.filter(
          (f) => String(f.owner_id) === String(user.id),
        );
      }

      const sortedFolders = availableFolders.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setFolders(sortedFolders);
      setError(null);
    } catch (err) {
      setError("Impossible de charger les dossiers.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token, folderTypeTitle]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Load archived status ID
  useEffect(() => {
    if (token) {
      getArchivedStatusId(token).then(setArchivedStatusId);
    }
  }, [token]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#11224e" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const handleOpenQuestionsModal = (folderId: string) => {
    setSelectedFolderId(folderId);
    setIsQuestionsModalVisible(true);
  };

  const renderEmptyList = () => {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Aucun dossier pour le moment</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <View style={styles.listContainer}>
        <FlatList
          data={filteredFolders}
          renderItem={({ item }) => {
            return (
              <FolderCard
                item={item}
                onPress={() => handleOpenQuestionsModal(item.id)}
              />
            );
          }}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
        />
      </View>
      <FolderQuestionsModal
        visible={isQuestionsModalVisible}
        onClose={() => setIsQuestionsModalVisible(false)}
        folderId={selectedFolderId}
        onDelete={fetchFolders}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContainer: {
    flex: 1,
    paddingTop: 16,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 16,
    gap: 12,
  },
  dropdownsContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  dropdownWrap: {
    flex: 1,
    position: "relative",
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectBtnDisabled: {
    backgroundColor: "#f3f4f6",
  },
  selectText: {
    fontSize: 14,
    color: "#11224e",
  },
  selectPlaceholder: {
    color: "#6b7280",
  },
  selectMenu: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 200,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  selectItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  selectItemText: {
    fontSize: 14,
    color: "#11224e",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  listContent: {
    paddingVertical: 12,
    gap: 12,
  },
  card: {
    flex: 1,
    maxWidth: "49%",
    marginHorizontal: 4,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f87b1b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: 12,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#f9fafb",
  },
  cardBody: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f87b1b",
    marginBottom: 8,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 12,
    color: "#4b5563",
    flex: 1,
  },
});
