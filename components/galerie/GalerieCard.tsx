import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { Ged } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import React from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
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
  const formattedTime = new Date(item.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Animation for AI Analysis
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (item.iaanalyse === 1) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [item.iaanalyse, pulseAnim]);

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

        {/* Top Right Badges Container */}
        <View style={styles.topRightContainer}>
          {/* AI Analysis & Powered By Overlay (Top Center) removed from here and placed absolutely */}
        </View>

        {/* AI Analysis & Powered By Overlay (Top Center) */}
        {(item.iaanalyse !== undefined || item.powredby) && (
          <View style={styles.aiOverlayContainer}>
            <View style={styles.aiBadge}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Ionicons
                  name="sparkles"
                  size={14}
                  color={item.iaanalyse === 1 ? "#FFD700" : COLORS.gray} // Gold for active, Gray for inactive
                />
              </Animated.View>
              {item.powredby && (
                <Text style={styles.poweredByText}>
                  {item.powredby}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.topRightContainer}>
          {/* Mode Indicator */}
          {item.mode && (
            <View
              style={[
                styles.badge,
                { backgroundColor: "rgba(0,0,0,0.5)" }, // Consistent dark background
              ]}
            >
              <Ionicons
                name={item.mode === "capture" ? "camera" : "cloud-upload"}
                size={16}
                color={COLORS.primary}
              />
            </View>
          )}

          {/* Sync status indicator */}
          {syncStatus && (
            <View style={styles.badge}>
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
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#ff4444"
                />
              )}
            </View>
          )}
        </View>

        {/* GPS Status Indicator */}
        {(() => {
          const lat = item.latitude;
          const long = item.longitude;
          const accuracy = item.accuracy ? parseFloat(item.accuracy) : null;

          let iconColor = "#FF3B30"; // Default Red (No GPS)

          if (lat && long) {
            if (accuracy === null || isNaN(accuracy)) {
              iconColor = "#007AFF"; // Blue (Position exists, unknown accuracy)
            } else if (accuracy <= 20) {
              iconColor = "#34C759"; // Green (Good accuracy <= 20m)
            } else {
              iconColor = "#FF9500"; // Orange (Poor accuracy > 20m)
            }
          }

          return (
            <View
              style={[
                styles.gpsStatusBadge,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
            >
              <Ionicons name="location-sharp" size={16} color={iconColor} />
            </View>
          );
        })()}

        <View style={styles.overlay}>
          {item.author && (
            <Text style={styles.overlayText} numberOfLines={1}>
              {item.author}
            </Text>
          )}
          {item.chantier && (
            <Text style={styles.overlayText} numberOfLines={1}>
              {item.chantier}
            </Text>
          )}
          <Text style={styles.overlayTime} numberOfLines={1}>
            {formattedTime}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    borderRadius: SIZES.medium,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    borderRadius: SIZES.medium,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 240,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: SIZES.small + 2,
    paddingVertical: SIZES.small,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overlayText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small + 1,
    color: "#f87b1b",
    flex: 1,
  },
  overlayTime: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small + 1,
    color: "#f87b1b",
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
  topRightContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
    zIndex: 10,
  },
  badge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  // syncStatusBadge removed in favor of generic badge in container
  gpsStatusBadge: {
    position: "absolute",
    top: 8,
    left: 8, // Positioned on the left to avoid conflict with sync badge
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  aiOverlayContainer: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 10,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f87b1b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  poweredByText: {
    fontFamily: FONT.regular,
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.9,
  },
});
