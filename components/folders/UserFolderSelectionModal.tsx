import { Folder, Project } from "@/services/folderService";
import { getArchivedStatusId } from "@/services/statusService";
import { CompanyUser } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  user: CompanyUser | null;
  folders: Folder[];
  projects: Project[];
  onSelectFolder: (folderId: string) => void;
  onCreateNewFolder: () => void;
};

export default function UserFolderSelectionModal({
  visible,
  onClose,
  user,
  folders,
  projects,
  onSelectFolder,
  onCreateNewFolder,
}: Props) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedStatusId, setArchivedStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      getArchivedStatusId(token).then((id) => setArchivedStatusId(id));
    }
  }, [token]);

  // Filter folders by the selected user, without a foldertype_id, and search query
  const filteredFolders = useMemo(() => {
    if (!user) return [];
    
    // First, get folders owned by the selected user that do not have a foldertype_id
    const userFolders = folders.filter((f) => f.owner_id === user.id && !f.foldertype_id);
    
    // Then apply search query if exists
    if (!searchQuery.trim()) return userFolders;
    
    const lowerQuery = searchQuery.toLowerCase();
    return userFolders.filter((f) => {
      const project = projects.find((p) => p.id === f.project_id);
      const projectTitle = project?.title || "";

      return (
        f.title.toLowerCase().includes(lowerQuery) ||
        f.code.toLowerCase().includes(lowerQuery) ||
        projectTitle.toLowerCase().includes(lowerQuery)
      );
    });
  }, [folders, user, searchQuery, projects]);

  const renderItem = ({ item }: { item: Folder }) => {
    const project = projects.find((p) => p.id === item.project_id);

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => {
          onSelectFolder(item.id);
        }}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle}>
              {item.title}
            </Text>
            {project && (
              <View style={styles.projectBadge}>
                <Text style={styles.projectBadgeText}>
                  {project.title}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.itemSubtitle}>
            Code: {item.code}
          </Text>
        </View>

        <View style={styles.itemRightActions}>
          {item.status_id === archivedStatusId && (
            <View style={styles.archivedBadge}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={styles.archivedText}>Validé</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Dossiers de l'utilisateur</Text>
              {user && (
                <Text style={styles.headerSubtitle}>
                  {user.firstname || user.lastname ? `${user.firstname || ""} ${user.lastname || ""}`.trim() : user.email}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#9ca3af"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un dossier..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredFolders}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.createFolderButton}
                onPress={() => {
                  onCreateNewFolder();
                }}
              >
                <View style={styles.createFolderIconContainer}>
                  <Ionicons name="add" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.createFolderTitle}>Créer un nouveau dossier</Text>
                  <Text style={styles.createFolderSubtitle}>Pour cet utilisateur</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#f87b1b" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun dossier trouvé pour cet utilisateur</Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#f87b1b",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  createFolderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#f87b1b",
    backgroundColor: "#fff7ed",
  },
  createFolderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f87b1b",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  createFolderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f87b1b",
  },
  createFolderSubtitle: {
    fontSize: 12,
    color: "#c2410c",
    marginTop: 2,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  projectBadge: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  projectBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f87b1b",
  },
  itemSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  itemRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  archivedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  archivedText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
  },
});
