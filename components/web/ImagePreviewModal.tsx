import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ImagePreviewModalProps {
  visible: boolean;
  photo: any; // Using any for now, ideally should share Photo interface
  onClose: () => void;
}

export default function ImagePreviewModal({
  visible,
  photo,
  onClose,
}: ImagePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (visible) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible || !photo) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.backdrop} onClick={onClose} />

      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {photo.title || "Sans titre"}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: photo.url ? `${API_CONFIG.BASE_URL}${photo.url}` : "",
            }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.metadataGrid}>
            {/* Left Column */}
            <View style={styles.metadataColumn}>
              <View style={styles.metadataRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.metadataLabel}>Date:</Text>
                <Text style={styles.metadataValue}>
                  {new Date(photo.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              {photo.kind && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Type:</Text>
                  <Text style={styles.metadataValue}>
                    {photo.kind === "qualiphoto"
                      ? "Photo libre"
                      : photo.kind === "photoavant"
                        ? "Situation Avant"
                        : photo.kind === "photoapres"
                          ? "Situation Après"
                          : photo.kind}
                  </Text>
                </View>
              )}

              {photo.level && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="layers-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Sévérité:</Text>
                  <Text style={styles.metadataValue}>{photo.level}</Text>
                </View>
              )}
            </View>

            {/* Right Column */}
            <View style={styles.metadataColumn}>
              {photo.author && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Auteur:</Text>
                  <Text style={styles.metadataValue}>{photo.author}</Text>
                </View>
              )}

              {photo.type && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="warning-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Type anomalie:</Text>
                  <Text style={styles.metadataValue}>{photo.type}</Text>
                </View>
              )}

              {photo.categorie && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="list-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Catégorie:</Text>
                  <Text style={styles.metadataValue}>{photo.categorie}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description at the bottom if available */}
          {photo.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={COLORS.primary}
                />{" "}
                Description:
              </Text>
              <Text style={styles.descriptionText}>{photo.description}</Text>
            </View>
          )}
        </View>
      </View>
    </div>
  );
}

const styles = Object.assign(
  StyleSheet.create({
    modalContainer: {
      width: "90%",
      height: "90%",
      maxWidth: 1200,
      backgroundColor: "transparent",
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      zIndex: 10001,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    title: {
      fontFamily: FONT.bold,
      fontSize: SIZES.large,
      color: COLORS.white,
      flex: 1,
      marginRight: 16,
    },
    closeButton: {
      padding: 8,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 20,
    },
    imageContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    image: {
      width: "100%",
      height: "100%",
    },
    footer: {
      padding: 20,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: "40%",
      overflowY: "auto",
    } as any,
    metadataGrid: {
      flexDirection: "row",
      gap: 20,
      marginBottom: 12,
    } as any,
    metadataColumn: {
      flex: 1,
      gap: 10,
    } as any,
    metadataRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    } as any,
    metadataLabel: {
      fontFamily: FONT.bold,
      fontSize: SIZES.small,
      color: "rgba(255, 255, 255, 0.7)",
      minWidth: 80,
    },
    metadataValue: {
      fontFamily: FONT.medium,
      fontSize: SIZES.small,
      color: COLORS.white,
      flex: 1,
    },
    descriptionContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.2)",
      gap: 6,
    } as any,
    descriptionLabel: {
      fontFamily: FONT.bold,
      fontSize: SIZES.small,
      color: "rgba(255, 255, 255, 0.7)",
    },
    descriptionText: {
      fontFamily: FONT.medium,
      fontSize: SIZES.small,
      color: COLORS.white,
      lineHeight: 20,
    },
  }),
  {
    overlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10000,
    },
    backdrop: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      cursor: "pointer",
    },
  },
);
