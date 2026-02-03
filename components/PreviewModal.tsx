import { Ionicons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface PreviewModalProps {
  visible: boolean;
  onClose: () => void;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "file" | "voice";
  title?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onAnnotate?: () => void;
  onAutoDescribe?: () => Promise<void>;
  isDescribing?: boolean;
  // Metadata props
  description?: string | null;
  author?: string;
  createdAt?: string;
  type?: string;
  categorie?: string;
  chantier?: string;
  latitude?: string | null;
  longitude?: string | null;
  voiceNoteUrl?: string; // New prop for associated voice note
  companyTitle?: string;
  level?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function PreviewModal({
  visible,
  onClose,
  mediaUrl,
  mediaType,
  title,
  onEdit,
  onDelete,
  onAnnotate,
  onAutoDescribe,
  isDescribing,
  description,
  author,
  createdAt,
  type,
  categorie,
  chantier,
  latitude,
  longitude,
  voiceNoteUrl,
  companyTitle,
  level,
}: PreviewModalProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(status.durationMillis || 0);
        // Optional: Reset to start?
        // sound?.setPositionAsync(0);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleSeek = async (value: number) => {
    if (!sound) return;
    await sound.setPositionAsync(value);
  };

  const handleShare = async () => {
    try {
      if (!mediaUrl) return;
      setIsLoading(true);

      // Build rich metadata message
      const parts = [];
      if (title) parts.push(`📸 ${title}`);
      parts.push("");

      if (level !== undefined && level !== null) {
        parts.push(`⚠️ Sévérité: ${level}`);
      }

      if (description) {
        parts.push(`📝 Description: ${description}`);
      }

      if (companyTitle) {
        parts.push(`🏢 Entreprise: ${companyTitle}`);
      }

      if (chantier) {
        parts.push(`🏗️ Chantier: ${chantier}`);
      }

      if (author) {
        parts.push(`👤 Auteur: ${author}`);
      }

      parts.push("");

      // We don't need to append link if we are sharing the file, but it's good backup in text payload
      parts.push(`🔗 ${mediaUrl}`);

      parts.push("");
      parts.push("━━━━━━━━━━━");
      parts.push("📱 Qualisol | Muntadaacom");

      const message = parts.join("\n");

      // Download file to local cache
      let localUri = mediaUrl;
      if (mediaUrl.startsWith("http") || mediaUrl.startsWith("https")) {
        const filename = mediaUrl.split("/").pop() || "share_image.jpg";

        // Use new Expo FileSystem API (SDK 52+)
        if (FileSystem.Paths && FileSystem.Paths.cache) {
          const cacheDir = FileSystem.Paths.cache;
          const targetFile = new FileSystem.File(cacheDir, filename);
          await FileSystem.File.downloadFileAsync(mediaUrl, targetFile);
          localUri = targetFile.uri;
        } else {
          // Fallback for older versions if somehow running there, though types indicate new version
          // Note: cacheDirectory might not exist on types but might at runtime?
          // But we follow types here.
          throw new Error("FileSystem API not supported");
        }
      }

      if (Platform.OS === "android") {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri, {
            mimeType: "image/jpeg",
            dialogTitle: "Partager l'image",
          });
        } else {
          Alert.alert("Erreur", "Le partage n'est pas disponible.");
        }
      } else {
        // iOS
        await Share.share({
          url: localUri,
          message: message, // iOS often allows message with file
        });
      }
    } catch (error) {
      console.error("Error sharing photo:", error);
      Alert.alert("Erreur", "Impossible de partager l'élément.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? "0" : ""}${seconds}`;
  };

  const handleOpenFile = async () => {
    if (mediaUrl) {
      // For standard file opening (browser or viewer)
      // If it's a specialized file type, maybe use Sharing or specific viewer
      Linking.openURL(mediaUrl).catch((err) =>
        Alert.alert("Erreur", "Impossible d'ouvrir le fichier"),
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {/* Title moved to metadata section at bottom */}
          </View>
          <View style={styles.headerActions}>
            {/* Share Button */}
            <Pressable style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={24} color="#f87b1b" />
            </Pressable>
            {onAnnotate && mediaType === "image" && (
              <Pressable style={styles.actionButton} onPress={onAnnotate}>
                <Ionicons name="pencil" size={24} color="#f87b1b" />
              </Pressable>
            )}
            {onEdit && (
              <Pressable style={styles.actionButton} onPress={onEdit}>
                <Ionicons name="create-outline" size={24} color="#f87b1b" />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: "#FF3B30" }]}
                onPress={() => {
                  Alert.alert(
                    "Supprimer",
                    "Êtes-vous sûr de vouloir supprimer cet élément ?",
                    [
                      { text: "Annuler", style: "cancel" },
                      {
                        text: "Supprimer",
                        style: "destructive",
                        onPress: onDelete,
                      },
                    ],
                  );
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
              </Pressable>
            )}
            <Pressable
              style={[styles.actionButton, { marginLeft: 20 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={28} color="#f87b1b" />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.mediaContainer}
          onPress={() => setShowMetadata(!showMetadata)}
        >
          {mediaType === "video" ? (
            <Video
              style={styles.mediaContent}
              source={{ uri: mediaUrl || "" }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
            />
          ) : mediaType === "image" ? (
            <Image
              style={styles.mediaContent}
              source={{ uri: mediaUrl || "" }}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={styles.fileContainer}>
              <View style={styles.fileIconContainer}>
                <Ionicons name="document-text" size={60} color="#FFFFFF" />
              </View>
              <Text style={styles.fileName}>{title}</Text>
              <Text style={styles.fileInfo}>Fichier {type || categorie}</Text>
              <Pressable style={styles.downloadButton} onPress={handleOpenFile}>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.downloadButtonText}>Ouvrir le fichier</Text>
              </Pressable>
            </View>
          )}
        </Pressable>

        {showMetadata && (
          <View style={styles.metadataOverlay}>
            <View style={styles.metadataCard}>
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="person-circle-outline"
                    size={16}
                    color="#007AFF"
                  />
                  <Text style={styles.metadataSmallValue}>
                    {author || "Inconnu"}
                  </Text>
                </View>
                {createdAt && (
                  <View style={styles.metadataItem}>
                    <Ionicons name="time-outline" size={16} color="#8E8E93" />
                    <Text style={styles.metadataSmallValue}>
                      {new Date(createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {level !== undefined && level !== null && (
                  <View style={styles.metadataItem}>
                    <Ionicons
                      name="warning-outline"
                      size={16}
                      color="#f87b1b"
                    />
                    <Text style={styles.metadataSmallValue}>
                      Sévérité: {level}
                    </Text>
                  </View>
                )}
              </View>
              {voiceNoteUrl && (
                <View style={styles.metadataSection}>
                  <Text style={styles.metadataLabel}>Note Vocale</Text>
                  <View style={styles.miniPlayerContainer}>
                    <Pressable
                      style={styles.miniPlayButton}
                      onPress={handlePlayPause}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={20}
                        color="#FFFFFF"
                      />
                    </Pressable>
                    <View style={styles.miniProgressContainer}>
                      <View style={styles.miniProgressBar}>
                        <View
                          style={[
                            styles.miniProgressFill,
                            {
                              width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                            },
                          ]}
                        />
                      </View>
                      <Pressable
                        style={styles.progressTouchable}
                        onPress={(event) => {
                          const { locationX } = event.nativeEvent;
                          const progressBarWidth = screenWidth * 0.5; // Approximate width (adjust based on layouts)
                          const percentage = locationX / progressBarWidth;
                          const newPosition = percentage * duration;
                          handleSeek(newPosition);
                        }}
                      />
                    </View>
                    <Text style={styles.miniTimeText}>
                      {formatTime(position)} / {formatTime(duration)}
                    </Text>
                  </View>
                </View>
              )}
              {/* Title Section (Moved here as requested) */}
              {title && (
                <View style={styles.metadataSection}>
                  <Text style={styles.metadataValue}>{title}</Text>
                </View>
              )}

              {chantier && (
                <View style={styles.metadataSection}>
                  <Text style={styles.metadataLabel}>Chantier</Text>
                  <Text style={styles.metadataValue}>{chantier}</Text>
                </View>
              )}

              {description && (
                <View style={styles.metadataSection}>
                  <Text style={styles.metadataLabel}>Description</Text>
                  <Pressable
                    onPress={() =>
                      setIsDescriptionExpanded(!isDescriptionExpanded)
                    }
                  >
                    <Text
                      style={styles.metadataValue}
                      numberOfLines={isDescriptionExpanded ? undefined : 2}
                    >
                      {description}
                    </Text>
                    {description.length > 50 && (
                      <Text
                        style={{ color: "#007AFF", fontSize: 12, marginTop: 4 }}
                      >
                        {isDescriptionExpanded ? "Voir moins" : "Voir plus"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

              {(type || categorie) && (
                <View style={styles.metadataRow}>
                  {type && (
                    <View style={styles.badge}>
                      <Ionicons
                        name="pricetag-outline"
                        size={14}
                        color="#007AFF"
                      />
                      <Text style={styles.badgeText}>{type}</Text>
                    </View>
                  )}
                  {categorie && (
                    <View style={styles.badge}>
                      <Ionicons
                        name="folder-outline"
                        size={14}
                        color="#007AFF"
                      />
                      <Text style={styles.badgeText}>{categorie}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Backdrop for closing */}
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  headerContent: {
    flex: 1,
    marginRight: 20,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  mediaContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaContent: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  fileContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  fileIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  fileName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  fileInfo: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  voiceContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  voiceIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  voiceFileName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  voiceFileInfo: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  audioPlayerContainer: {
    width: screenWidth * 0.8,
    height: 120,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    padding: 16,
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  timeDisplay: {
    flexDirection: "row",
    gap: 8,
  },
  timeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  progressContainer: {
    position: "relative",
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF6B6B",
    borderRadius: 2,
  },
  progressTouchable: {
    position: "absolute",
    top: -8,
    left: 0,
    right: 0,
    bottom: -8,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  metadataOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  metadataCard: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    backdropFilter: "blur(10px)",
  },
  metadataSection: {
    gap: 4,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f87b1b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  metadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metadataSmallValue: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.3)",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
  miniPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 8,
    gap: 12,
  },
  miniPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  miniProgressContainer: {
    flex: 1,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
    width: "100%",
  },
  miniProgressFill: {
    height: "100%",
    backgroundColor: "#FF6B6B",
    borderRadius: 2,
  },
  miniTimeText: {
    fontSize: 10,
    color: "#8E8E93",
    fontVariant: ["tabular-nums"],
    width: 65,
    textAlign: "right",
  },
});
