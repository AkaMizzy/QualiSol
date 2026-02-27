import { useAuth } from "@/contexts/AuthContext";
import { Folder } from "@/services/folderService";
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

type Props = {
  visible: boolean;
  onClose: () => void;
  folders: Folder[];
  onSelect: (folderId: string) => void;
  users: CompanyUser[];
  projects: { id: string; title: string }[];
  selectedFolderId?: string;
};

export default function FolderSelectionModal({
  visible,
  onClose,
  folders,
  onSelect,
  users,
  projects,
  selectedFolderId,
}: Props) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedStatusId, setArchivedStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      getArchivedStatusId(token).then((id) => setArchivedStatusId(id));
    }
  }, [token]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const lowerQuery = searchQuery.toLowerCase();
    return folders.filter((f) => {
      const owner = users.find((u) => u.id === f.owner_id);
      const ownerName = owner
        ? `${owner.firstname || ""} ${owner.lastname || ""}`
        : "";
      const project = projects.find((p) => p.id === f.project_id);
      const projectTitle = project?.title || "";

      return (
        f.title.toLowerCase().includes(lowerQuery) ||
        f.code.toLowerCase().includes(lowerQuery) ||
        ownerName.toLowerCase().includes(lowerQuery) ||
        projectTitle.toLowerCase().includes(lowerQuery)
      );
    });
  }, [folders, searchQuery, users, projects]);

  const renderItem = ({ item }: { item: Folder }) => {
    const owner = users.find((u) => u.id === item.owner_id);
    const ownerName = owner
      ? `${owner.firstname || ""} ${owner.lastname || ""}`.trim() || owner.email
      : "Propriétaire inconnu";
    const project = projects.find((p) => p.id === item.project_id);
    const isSelected = item.id === selectedFolderId;

    return (
      <TouchableOpacity
        style={[styles.itemContainer, isSelected && styles.itemSelected]}
        onPress={() => {
          onSelect(item.id);
          onClose();
        }}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemTitleRow}>
            <Text style={[styles.itemTitle, isSelected && styles.textSelected]}>
              {item.title}
            </Text>
            {project && (
              <View
                style={[
                  styles.projectBadge,
                  isSelected && styles.projectBadgeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.projectBadgeText,
                    isSelected && styles.projectBadgeTextSelected,
                  ]}
                >
                  {project.title}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.itemSubtitle, isSelected && styles.textSelected]}
          >
            {ownerName}
          </Text>
        </View>

        <View style={styles.itemRightActions}>
          {item.status_id === archivedStatusId && (
            <View style={styles.archivedBadge}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={styles.archivedText}>Validé</Text>
            </View>
          )}
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color="#f87b1b" />
          )}
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
            <Text style={styles.headerTitle}>Sélectionner un dossier</Text>
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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun dossier trouvé</Text>
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
    borderColor: "#f87b1b",
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
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f87b1b",
    backgroundColor: "#ffffff",
  },
  itemSelected: {
    backgroundColor: "#fff7ed",
    borderColor: "#f87b1b",
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
  projectBadgeSelected: {
    backgroundColor: "#f87b1b",
    borderColor: "#f87b1b",
  },
  projectBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f87b1b",
  },
  projectBadgeTextSelected: {
    color: "#fff",
  },
  itemSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  textSelected: {
    color: "#c2410c",
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
});
