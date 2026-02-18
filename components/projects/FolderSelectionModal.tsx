import { Folder } from "@/services/folderService";
import { CompanyUser } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
  selectedFolderId?: string;
};

export default function FolderSelectionModal({
  visible,
  onClose,
  folders,
  onSelect,
  users,
  selectedFolderId,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const lowerQuery = searchQuery.toLowerCase();
    return folders.filter((f) => {
      const owner = users.find((u) => u.id === f.owner_id);
      const ownerName = owner
        ? `${owner.firstname || ""} ${owner.lastname || ""}`
        : "";

      return (
        f.title.toLowerCase().includes(lowerQuery) ||
        f.code.toLowerCase().includes(lowerQuery) ||
        ownerName.toLowerCase().includes(lowerQuery)
      );
    });
  }, [folders, searchQuery, users]);

  const renderItem = ({ item }: { item: Folder }) => {
    const owner = users.find((u) => u.id === item.owner_id);
    const ownerName = owner
      ? `${owner.firstname || ""} ${owner.lastname || ""}`.trim() || owner.email
      : "Propriétaire inconnu";
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
          <Text style={[styles.itemTitle, isSelected && styles.textSelected]}>
            {item.title}
          </Text>
          <Text
            style={[styles.itemSubtitle, isSelected && styles.textSelected]}
          >
            {ownerName}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#f87b1b" />
        )}
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
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    borderRadius: 8,
  },
  itemSelected: {
    backgroundColor: "#fff7ed",
    borderColor: "#f87b1b",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
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
});
