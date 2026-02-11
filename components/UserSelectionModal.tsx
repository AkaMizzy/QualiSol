import { COLORS, FONT, SIZES } from "@/constants/theme";
import { CompanyUser } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import API_CONFIG from "../app/config/api";

interface UserSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: CompanyUser) => void;
  users: CompanyUser[];
}

export default function UserSelectionModal({
  visible,
  onClose,
  onSelect,
  users,
}: UserSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstname} ${user.lastname}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const renderItem = ({ item }: { item: CompanyUser }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => onSelect(item)}>
      <Image
        source={
          item.photo
            ? { uri: `${API_CONFIG.BASE_URL}${item.photo}` }
            : require("../assets/icons/users.png")
        }
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.firstname} {item.lastname}
        </Text>
        <Text style={styles.userRole}>{item.role?.role}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Assigner à un utilisateur</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <FlatList
            data={filteredUsers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    padding: SIZES.medium,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  title: {
    fontSize: SIZES.large,
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
  closeButton: {
    padding: SIZES.small,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightWhite,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.small,
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
  listContent: {
    paddingBottom: SIZES.large,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightWhite,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SIZES.medium,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: SIZES.medium,
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
  userRole: {
    fontSize: SIZES.small,
    fontFamily: FONT.regular,
    color: COLORS.gray,
  },
  emptyText: {
    textAlign: "center",
    marginTop: SIZES.large,
    fontFamily: FONT.medium,
    color: COLORS.gray,
  },
});
