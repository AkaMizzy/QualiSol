import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { MapPhoto } from "@/hooks/useMapData";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface ZonePhotosPanelProps {
  photos: MapPhoto[];
  zoneName: string;
  isVisible: boolean;
  onClose: () => void;
  onPhotoClick: (photo: MapPhoto) => void;
}

export default function ZonePhotosPanel({
  photos,
  zoneName,
  isVisible,
  onClose,
  onPhotoClick,
}: ZonePhotosPanelProps) {
  if (!isVisible) return null;

  const getKindColor = (kind: string): string => {
    switch (kind) {
      case "qualiphoto":
        return "#3b82f6"; // Blue
      case "photoavant":
        return "#22c55e"; // Green
      case "photoapres":
        return "#eab308"; // Yellow
      default:
        return "#3b82f6";
    }
  };

  const getKindLabel = (kind: string): string => {
    switch (kind) {
      case "qualiphoto":
        return "QualiPhoto";
      case "photoavant":
        return "Avant";
      case "photoapres":
        return "Après";
      default:
        return kind;
    }
  };

  return (
    <>
      <style>{`
        .zone-photo-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .zone-photo-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }
      `}</style>
      <div style={styles.panel as any}>
        {/* Panel Header */}
        <View style={styles.panelHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="layers" size={20} color={COLORS.primary} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.zoneName} numberOfLines={1}>
                {zoneName}
              </Text>
              <Text style={styles.photoCount}>
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        {/* Photos Grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {photos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="image-outline" size={48} color={COLORS.gray} />
              <Text style={styles.emptyText}>Aucune photo GPS</Text>
              <Text style={styles.emptySubtext}>
                Cette zone ne contient pas de photos avec coordonnées GPS
              </Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  style={styles.photoCard}
                  className="zone-photo-card"
                  onPress={() => onPhotoClick(photo)}
                >
                  <Image
                    source={{
                      uri: photo.url
                        ? `${API_CONFIG.BASE_URL}${photo.url}`
                        : "",
                    }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />

                  {/* Kind Indicator */}
                  <View
                    style={[
                      styles.kindBadge,
                      { backgroundColor: getKindColor(photo.kind) },
                    ]}
                  >
                    <Text style={styles.kindText}>
                      {getKindLabel(photo.kind)}
                    </Text>
                  </View>

                  {/* Photo Title Overlay */}
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoTitle} numberOfLines={2}>
                      {photo.title || "Sans titre"}
                    </Text>
                  </View>

                  {/* Hover Effect */}
                  <View style={styles.hoverOverlay} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </div>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute", // Changed from fixed to absolute
    right: 0,
    top: 0,
    bottom: 0,
    width: 350,
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderLeftColor: "#e5e7eb",
    boxShadow: "-2px 0 8px rgba(0, 0, 0, 0.1)",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
  } as any,
  panelHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    overflow: "hidden",
  },
  headerTextContainer: {
    flex: 1,
    overflow: "hidden",
  },
  zoneName: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  photoCount: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.lightWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoCard: {
    width: "calc(50% - 6px)",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f3f4f6",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  } as any,
  photoImage: {
    width: "100%",
    height: "100%",
  },
  kindBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kindText: {
    fontFamily: FONT.medium,
    fontSize: 10,
    color: COLORS.white,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  photoTitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  hoverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0)",
    transition: "background-color 0.2s ease",
  } as any,
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: "center",
  },
});
