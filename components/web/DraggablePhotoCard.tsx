import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { WebGaleriePhoto } from "@/hooks/useWebGalerie";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface DraggablePhotoCardProps {
  photo: WebGaleriePhoto;
  onDragStart: (photoId: string) => void;
  onDragEnd: () => void;
  onPress?: (photo: WebGaleriePhoto) => void;
}

export default function DraggablePhotoCard({
  photo,
  onDragStart,
  onDragEnd,
  onPress,
}: DraggablePhotoCardProps) {
  const imageUrl = photo.url ? `${API_CONFIG.BASE_URL}${photo.url}` : "";

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("photoId", photo.id);
    onDragStart(photo.id);
  };

  return (
    <div
      draggable={!photo.isAssigned}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onPress?.(photo)}
      style={{
        cursor: photo.isAssigned ? "pointer" : "grab",
        opacity: photo.isAssigned ? 0.7 : 1,
        position: "relative",
      }}
      className="draggable-photo-card"
    >
      <View style={styles.card}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {photo.title}
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
            <Text style={styles.infoText}>
              {new Date(photo.created_at).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* Download Button */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (imageUrl) {
              try {
                // Fetch the image as a blob to bypass CORS restrictions
                const response = await fetch(imageUrl);
                const blob = await response.blob();

                // Create a temporary object URL
                const blobUrl = URL.createObjectURL(blob);

                // Create a temporary link and trigger download
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = photo.title || `photo_${photo.id}.jpg`;
                document.body.appendChild(link);
                link.click();

                // Clean up
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
              } catch (error) {
                console.error("Download failed:", error);
                // Fallback: open in new tab if download fails
                window.open(imageUrl, "_blank");
              }
            }
          }}
          style={{
            position: "absolute",
            bottom: "12px",
            right: "12px",
            backgroundColor: COLORS.primary,
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            transition: "all 0.2s",
          }}
          title="Télécharger la photo"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.backgroundColor = "#e06f17";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.backgroundColor = COLORS.primary;
          }}
        >
          <Ionicons name="download-outline" size={20} color={COLORS.white} />
        </button>

        {photo.isAssigned && (
          <View style={styles.assignedBadge}>
            <Text style={styles.assignedText}>✓ Assigné</Text>
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
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: 200,
  },
  placeholderImage: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.lightWhite,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  infoContainer: {
    padding: 12,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
    marginBottom: 4,
  },
  description: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray2,
  },
  date: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray2,
  },
  assignedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  assignedText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
});
