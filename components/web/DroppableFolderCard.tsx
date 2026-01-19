import { COLORS, FONT, SIZES } from "@/constants/theme";
import { Folder } from "@/services/folderService";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface DroppableFolderCardProps {
  folder: Folder;
  onDrop: (photoId: string, folderId: string) => Promise<void>;
  projectName?: string;
  zoneName?: string;
  isSelected?: boolean;
  onSelect?: (folderId: string, folderTitle: string) => void;
}

export default function DroppableFolderCard({
  folder,
  onDrop,
  projectName,
  zoneName,
  isSelected = false,
  onSelect,
}: DroppableFolderCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const photoId = e.dataTransfer.getData("photoId");
    if (photoId && folder.id) {
      await onDrop(photoId, folder.id);
    }
  };

  const handleClick = () => {
    if (onSelect && folder.id) {
      onSelect(folder.id, folder.title);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        borderColor: isDragOver
          ? COLORS.primary
          : isSelected
            ? COLORS.primary
            : "transparent",
        borderWidth: isDragOver || isSelected ? 3 : 2,
        borderStyle: isDragOver ? "dashed" : isSelected ? "solid" : "dashed",
        cursor: "pointer",
      }}
      className="droppable-folder-card"
    >
      <View
        style={[
          styles.card,
          isDragOver && styles.cardDragOver,
          isSelected && styles.cardSelected,
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.code}>{folder.code}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {folder.title}
        </Text>

        {folder.description && (
          <Text style={styles.description} numberOfLines={3}>
            {folder.description}
          </Text>
        )}

        <View style={styles.metadataContainer}>
          {(projectName || zoneName) && (
            <View style={styles.metadataRow}>
              <Ionicons
                name="folder-open-outline"
                size={14}
                color={COLORS.gray}
              />
              <Text style={styles.metadataText} numberOfLines={1}>
                {[projectName, zoneName].filter(Boolean).join(" • ")}
              </Text>
            </View>
          )}

          <View style={styles.metadataRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
            <Text style={styles.metadataText}>
              {new Date(folder.created_at).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        {isDragOver && (
          <View style={styles.dropHint}>
            <Text style={styles.dropHintText}>Déposer ici</Text>
          </View>
        )}
      </View>
    </div>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 120,
  },
  cardDragOver: {
    backgroundColor: "#E6F4FE",
  },
  cardSelected: {
    backgroundColor: "#FFF4E6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  code: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.primary,
    backgroundColor: COLORS.lightWhite,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginBottom: 8,
  },
  description: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    lineHeight: 18,
    marginBottom: 8,
  },
  metadataContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightWhite,
    gap: 4,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metadataText: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.gray,
    flex: 1,
  },
  dropHint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(79, 172, 254, 0.1)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dropHintText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.primary,
  },
});
