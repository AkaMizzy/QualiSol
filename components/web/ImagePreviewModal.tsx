import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getGedById } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import WebGedUpdateModal from "./WebGedUpdateModal";

interface ImagePreviewModalProps {
  visible: boolean;
  photo: any; // Using any for now, ideally should share Photo interface
  onClose: () => void;
  onUpdate?: () => void; // Callback after successful update
}

export default function ImagePreviewModal({
  visible,
  photo,
  onClose,
  onUpdate,
}: ImagePreviewModalProps) {
  const { token } = useAuth();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [displayedPhoto, setDisplayedPhoto] = useState(photo);

  // Update displayed photo when photo prop changes
  useEffect(() => {
    setDisplayedPhoto(photo);
  }, [photo]);
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

  const handleUpdateSuccess = async () => {
    // Fetch fresh data to update the preview
    if (token && photo?.id) {
      try {
        const updatedPhoto = await getGedById(token, photo.id);
        setDisplayedPhoto(updatedPhoto);
        onUpdate?.();
      } catch (error) {
        console.error("Failed to refresh photo data:", error);
        // Still call onUpdate even if refresh fails
        onUpdate?.();
      }
    }
  };

  if (!visible || !photo || !displayedPhoto) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.backdrop} onClick={onClose} />

      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {displayedPhoto.title || "Sans titre"}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowUpdateModal(true)}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.white} />
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: displayedPhoto.url
                ? `${API_CONFIG.BASE_URL}${displayedPhoto.url}`
                : "",
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
                  {new Date(displayedPhoto.created_at).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </Text>
              </View>

              {displayedPhoto.kind && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Type:</Text>
                  <Text style={styles.metadataValue}>
                    {displayedPhoto.kind === "qualiphoto"
                      ? "Photo libre"
                      : displayedPhoto.kind === "photoavant"
                        ? "Situation Avant"
                        : displayedPhoto.kind === "photoapres"
                          ? "Situation Après"
                          : displayedPhoto.kind}
                  </Text>
                </View>
              )}

              {displayedPhoto.level && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="layers-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Sévérité:</Text>
                  <Text style={styles.metadataValue}>
                    {displayedPhoto.level}
                  </Text>
                </View>
              )}
            </View>

            {/* Right Column */}
            <View style={styles.metadataColumn}>
              {displayedPhoto.author && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Auteur:</Text>
                  <Text style={styles.metadataValue}>
                    {displayedPhoto.author}
                  </Text>
                </View>
              )}

              {displayedPhoto.type && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="warning-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Type anomalie:</Text>
                  <Text style={styles.metadataValue}>
                    {displayedPhoto.type}
                  </Text>
                </View>
              )}

              {displayedPhoto.categorie && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="list-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metadataLabel}>Catégorie:</Text>
                  <Text style={styles.metadataValue}>
                    {displayedPhoto.categorie}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description at the bottom if available */}
          {displayedPhoto.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={COLORS.primary}
                />{" "}
                Description:
              </Text>
              <Text style={styles.descriptionText}>
                {displayedPhoto.description}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Update Modal */}
      {token && (
        <WebGedUpdateModal
          visible={showUpdateModal}
          ged={displayedPhoto}
          token={token}
          onClose={() => setShowUpdateModal(false)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
}

const styles = Object.assign(
  StyleSheet.create({
    modalContainer: {
      width: "95%",
      height: "95%",
      maxWidth: 1400,
      backgroundColor: "transparent",
      borderRadius: 0,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      zIndex: 10001,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      backgroundColor: "#1a1a1a",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    } as any,
    title: {
      fontFamily: FONT.bold,
      fontSize: SIZES.xLarge,
      color: COLORS.white,
      flex: 1,
      marginRight: 16,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    } as any,
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: 10,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 8,
      transition: "all 0.2s",
    } as any,
    editButtonText: {
      fontFamily: FONT.bold,
      fontSize: SIZES.small,
      color: COLORS.white,
    },
    closeButton: {
      padding: 12,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: 8,
      transition: "all 0.2s",
    } as any,
    imageContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#0a0a0a",
      padding: 80,
    } as any,
    image: {
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      objectFit: "contain",
    } as any,
    footer: {
      padding: 24,
      backgroundColor: "#1a1a1a",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: "35%",
      overflowY: "auto",
    } as any,
    metadataGrid: {
      flexDirection: "row",
      gap: 32,
      marginBottom: 12,
    } as any,
    metadataColumn: {
      flex: 1,
      gap: 12,
    } as any,
    metadataRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    } as any,
    metadataLabel: {
      fontFamily: FONT.bold,
      fontSize: SIZES.medium,
      color: "rgba(255, 255, 255, 0.6)",
      minWidth: 110,
    },
    metadataValue: {
      fontFamily: FONT.medium,
      fontSize: SIZES.medium,
      color: COLORS.white,
      flex: 1,
    },
    descriptionContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.15)",
      gap: 8,
    } as any,
    descriptionLabel: {
      fontFamily: FONT.bold,
      fontSize: SIZES.medium,
      color: "rgba(255, 255, 255, 0.6)",
    },
    descriptionText: {
      fontFamily: FONT.medium,
      fontSize: SIZES.medium,
      color: COLORS.white,
      lineHeight: 22,
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
      backgroundColor: "#000000",
    },
    backdrop: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#000000",
      cursor: "pointer",
    },
  },
);
