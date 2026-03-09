import { ICONS } from "@/constants/Icons";
import { Folder } from "@/services/folderService";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Helper to format date for folder cards
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
    }).format(new Date(compliantDateStr));
  } catch {
    return "";
  }
}

export type FolderCardProps = {
  item: Folder;
  iconSource?: any;
  projectTitle?: string;
  folderTypeTitle?: string;
  onPress: () => void;
};

export default function FolderCard({
  item,
  iconSource,
  projectTitle,
  folderTypeTitle,
  onPress,
}: FolderCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.folderCard,
        pressed && styles.folderCardPressed,
      ]}
      onPress={onPress}
    >
      {/* Header: icon left, title right */}
      <View style={styles.folderCardHeader}>
        <View style={styles.folderCardIconWrap}>
          <Image
            source={iconSource ?? require("../../assets/icons/folder.png")}
            style={styles.folderCardIcon}
            contentFit="contain"
          />
        </View>
        <Text style={styles.folderCardTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
      {/* Type badge */}
      {folderTypeTitle ? (
        <View style={styles.folderTypeBadge}>
          <Text style={styles.folderTypeBadgeText} numberOfLines={1}>
            {folderTypeTitle}
          </Text>
        </View>
      ) : null}
      {/* Project row */}
      {projectTitle ? (
        <View style={styles.folderCardInfoRow}>
          <Image
            source={ICONS.chantierPng}
            style={{ width: 12, height: 12 }}
            contentFit="contain"
          />
          <Text style={styles.folderCardInfoText} numberOfLines={1}>
            {projectTitle}
          </Text>
        </View>
      ) : null}
      {/* Date row */}
      <View style={styles.folderCardInfoRow}>
        <Ionicons name="calendar-outline" size={12} color="#f87b1b" />
        <Text style={styles.folderCardInfoText}>
          {formatDateForGrid(item.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  folderCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f87b1b",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 6,
  },
  folderCardPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: "#fff8f3",
  },
  folderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  folderCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff4ec",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  folderCardIcon: {
    width: 22,
    height: 22,
  },
  folderCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#11224e",
    flex: 1,
  },
  folderTypeBadge: {
    backgroundColor: "#fff4ec",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: "100%",
  },
  folderTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f87b1b",
    textAlign: "center",
  },
  folderCardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "stretch",
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  folderCardInfoText: {
    fontSize: 11,
    color: "#4b5563",
    flex: 1,
  },
});
