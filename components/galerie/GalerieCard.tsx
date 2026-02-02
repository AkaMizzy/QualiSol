import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { Ged } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface GalerieCardProps {
  item: Ged;
  onPress: () => void;
  hasVoiceNote?: boolean;
  isOffline?: boolean;
  localImagePath?: string;
  syncStatus?: "pending" | "syncing" | "failed";
  isVideo?: boolean;
}

export default function GalerieCard({
  item,
  onPress,
  hasVoiceNote,
  isOffline,
  localImagePath,
  syncStatus,
  isVideo,
}: GalerieCardProps) {
  const GofG = API_CONFIG.BASE_URL;
  const formattedDate = new Date(item.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Use local image path for offline records, otherwise use backend URL
  const imageSource =
    isOffline && localImagePath
      ? { uri: localImagePath }
      : { uri: `${GofG}${item.url}` };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        {isVideo ? (
          <Video
            source={imageSource}
            style={styles.image}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted={true}
          />
        ) : (
          <Image source={imageSource} style={styles.image} />
        )}

        {/* Play icon overlay for videos */}
        {isVideo && (
          <View style={styles.playIconOverlay}>
            <Ionicons
              name="play-circle"
              size={40}
              color="rgba(255, 255, 255, 0.9)"
            />
          </View>
        )}

        {/* Sync status indicator */}
        {syncStatus && (
          <View style={styles.syncStatusBadge}>
            {syncStatus === "syncing" && (
              <ActivityIndicator size="small" color={COLORS.white} />
            )}
            {syncStatus === "pending" && (
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color={COLORS.white}
              />
            )}
            {syncStatus === "failed" && (
              <Ionicons name="alert-circle-outline" size={20} color="#ff4444" />
            )}
          </View>
        )}
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={1}>
            {item.author}
          </Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </View>
      {item.author && (
        <View style={styles.content}>
          <View style={styles.detailsContainer}>
            {item.chantier && (
              <Text style={styles.detailText} numberOfLines={1}>
                {item.chantier}
              </Text>
            )}
            {item.title && (
              <Text style={styles.author} numberOfLines={1}>
                {item.title}
              </Text>
            )}
            {item.type && (
              <Text style={styles.detailText} numberOfLines={1}>
                {item.type}
              </Text>
            )}
            {item.categorie && (
              <Text style={styles.detailText} numberOfLines={1}>
                {item.categorie}
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    borderTopLeftRadius: SIZES.medium,
    borderTopRightRadius: SIZES.medium,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 150,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    padding: SIZES.medium,
  },
  detailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
    flex: 1,
    marginRight: SIZES.small,
  },
  date: {
    fontWeight: "600",
    fontSize: SIZES.small,
    color: "#f87b1b",
  },
  author: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginRight: SIZES.small,
  },
  detailText: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.primary,
    marginRight: SIZES.small,
    backgroundColor: COLORS.lightWhite,
    paddingHorizontal: SIZES.small / 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  voiceNoteIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 15,
    padding: 4,
  },
  playIconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  syncStatusBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
  },
});
