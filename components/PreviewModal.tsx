import { Ionicons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
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
  mode?: "upload" | "capture";
  zoneTitle?: string;
  onAssign?: () => void;
  assignedTo?: string | { firstname: string; lastname: string };
  audiotxt?: string;
  gedVisible?: number;
  wait?: number;
  ianalyse?: number;
  onTimerEnd?: () => void;
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
  mode,
  zoneTitle,
  onAssign,
  assignedTo,
  audiotxt,
  gedVisible: isVisibleProp = 1, // Default to visible (1)
  wait = 0, // Default wait time 0
  ianalyse,
  onTimerEnd,
}: PreviewModalProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(mediaType === "image");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(wait);

  const [forceShowClose, setForceShowClose] = useState(false);

  useEffect(() => {
    if (visible && isVisibleProp === 0 && wait > 0) {
      setTimeLeft(wait);
      setForceShowClose(false); // Reset on open
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setForceShowClose(true); // Show close button
            if (onTimerEnd) onTimerEnd(); // Trigger refresh callback
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setForceShowClose(false);
    }
  }, [visible, isVisibleProp, wait, onTimerEnd]);

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

  const getSeverityEmoji = (level: number) => {
    if (level < 3) return "🟢"; // Low (0-2)
    if (level < 6) return "🔵"; // Normal (3-5)
    if (level < 8) return "🟠"; // Medium (6-7)
    return "🔴"; // High (8-10)
  };

  const handleShare = async () => {
    try {
      // Build rich metadata message
      const parts = [];
      parts.push(`📝 ${title}`);
      parts.push("");

      if (chantier) {
        parts.push(`🏗️ Chantier: ${chantier}`);
      }
      if (zoneTitle) {
        parts.push(`📍 Zone: ${zoneTitle}`);
      }

      // Date, Auteur
      const dateStr = createdAt
        ? new Date(createdAt).toLocaleDateString("fr-FR")
        : "";
      parts.push(`Date: ${dateStr} | 👤 Auteur: ${author || "N/A"}`);

      // Titre (already in header but format requires it explicitly?)
      // User format: Header, Chantier, Zone, Date/Author, Title...
      // Let's stick to the requested structure:
      // Chantier
      // Date, auteur
      // Titre
      // Severite
      // Description
      // Photo

      // I'll assume header "📸 ..." is good, then:
      // (Lines already added above for Chantier/Zone/Date/Author)

      if (level !== undefined && level !== null) {
        parts.push(`Severite: ${getSeverityEmoji(level)} (Niveau ${level})`);
      }

      if (description) {
        parts.push(`Description: ${description}`);
      }

      parts.push("");

      if (mediaUrl) {
        parts.push(`📷 Photo:`);
        parts.push(mediaUrl);
      }

      parts.push("");
      parts.push("━━━━━━━━━━━");
      parts.push("📱 Qualisol | Muntadaacom");

      const message = parts.join("\n");

      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error("Error sharing photo:", error);
      Alert.alert("Erreur", "Impossible de partager l'élément.");
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "numeric",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasMetadata =
    description ||
    author ||
    createdAt ||
    type ||
    categorie ||
    chantier ||
    (latitude && longitude);

  // Load audio when modal opens for voice type OR if there is a voiceNoteUrl for an image
  useEffect(() => {
    if (visible) {
      if (mediaType === "voice" && mediaUrl) {
        loadAudio(mediaUrl);
      } else if (mediaType === "image" && voiceNoteUrl) {
        loadAudio(voiceNoteUrl);
      }
    }
  }, [visible, mediaUrl, mediaType, voiceNoteUrl]);

  const loadAudio = async (uri: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      setIsLoading(true);
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate,
      );
      setSound(audioSound);
    } catch (error) {
      console.error("Error loading audio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mediaUrl || !mediaType) {
    return null;
  }

  const handleOpenFile = async () => {
    if (!mediaUrl) return;

    try {
      // Check if the URL can be opened
      const canOpen = await Linking.canOpenURL(mediaUrl);

      if (canOpen) {
        await Linking.openURL(mediaUrl);
      } else {
        // If direct opening fails, try to open in browser
        const browserUrl = mediaUrl.startsWith("http")
          ? mediaUrl
          : `https://${mediaUrl}`;
        await Linking.openURL(browserUrl);
      }
    } catch (error) {
      console.error("Error opening file:", error);
      Alert.alert(
        "Cannot Open File",
        "Unable to open this file. You may need to download it first.",
        [{ text: "OK" }],
      );
    }
  };

  const renderMedia = () => {
    if (mediaType === "image") {
      return (
        <Image
          source={{ uri: mediaUrl }}
          style={styles.mediaContent}
          contentFit="contain"
          transition={200}
        />
      );
    }

    if (mediaType === "video") {
      return (
        <Video
          source={{ uri: mediaUrl }}
          style={styles.mediaContent}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
        />
      );
    }

    if (mediaType === "file") {
      return (
        <View style={styles.fileContainer}>
          <View style={styles.fileIconContainer}>
            <Ionicons name="document-outline" size={64} color="#007AFF" />
          </View>
          <Text style={styles.fileName}>
            {mediaUrl?.split("/").pop() || "Document"}
          </Text>
          <Text style={styles.fileInfo}>Document file</Text>
          <Pressable style={styles.downloadButton} onPress={handleOpenFile}>
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.downloadButtonText}>Open Document</Text>
          </Pressable>
        </View>
      );
    }

    if (mediaType === "voice") {
      return (
        <View style={styles.voiceContainer}>
          <View style={styles.voiceIconContainer}>
            <Ionicons name="mic-outline" size={64} color="#FF6B6B" />
          </View>
          <Text style={styles.voiceFileName}>
            {mediaUrl?.split("/").pop() || "Voice Recording"}
          </Text>
          <Text style={styles.voiceFileInfo}>Voice message</Text>
          <View style={styles.audioPlayerContainer}>
            {/* Custom Audio Player */}
            <View style={styles.audioControls}>
              {/* Play/Pause Button */}
              <Pressable
                style={styles.playButton}
                onPress={handlePlayPause}
                disabled={isLoading}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="#FFFFFF"
                />
              </Pressable>

              {/* Time Display */}
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
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
                  const progressBarWidth = screenWidth * 0.6; // Approximate width
                  const percentage = locationX / progressBarWidth;
                  const newPosition = percentage * duration;
                  handleSeek(newPosition);
                }}
              />
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}></View>

          <View style={styles.headerActions}>
            {/* Share Button moved here or beside others */}
            <Pressable
              style={styles.actionButton}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Partager"
            >
              <Ionicons name="share-social-outline" size={24} color="#f87b1b" />
            </Pressable>

            {(mediaType === "image" || mediaType === "video") &&
              hasMetadata && (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => setShowMetadata(!showMetadata)}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle metadata"
                >
                  <Ionicons
                    name={showMetadata ? "information" : "information-outline"}
                    size={24}
                    color="#FFFFFF"
                  />
                </Pressable>
              )}
            {mediaType === "image" && onAutoDescribe && (
              <Pressable
                style={styles.actionButton}
                onPress={onAutoDescribe}
                disabled={isDescribing}
                accessibilityRole="button"
                accessibilityLabel="Generate AI description"
              >
                {isDescribing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
                )}
              </Pressable>
            )}

            {/* Conditional rendering for Edit and Delete buttons */}
            {(() => {
              // Check if action should be restricted
              // Restricted if:
              // 1. Timer is active (visible=0 and timeLeft > 0)
              // 2. ianalyse is 0
              const isTimerActive = isVisibleProp === 0 && timeLeft > 0;
              const isActionRestricted = isTimerActive || ianalyse === 0;

              return (
                <>
                  {mediaType === "image" && onEdit && !isActionRestricted && (
                    <Pressable
                      style={styles.actionButton}
                      onPress={onEdit}
                      accessibilityRole="button"
                      accessibilityLabel="Edit photo"
                    >
                      <Ionicons
                        name="create-outline"
                        size={24}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  )}

                  {(mediaType === "image" || mediaType === "video") &&
                    onAnnotate &&
                    !isActionRestricted && (
                      <Pressable
                        style={styles.actionButton}
                        onPress={onAnnotate}
                        accessibilityRole="button"
                        accessibilityLabel="Annoter"
                      >
                        <Ionicons
                          name="brush-outline"
                          size={24}
                          color="#f87b1b"
                        />
                      </Pressable>
                    )}

                  {onDelete && !isActionRestricted && (
                    <Pressable
                      style={styles.actionButton}
                      onPress={onDelete}
                      accessibilityRole="button"
                      accessibilityLabel="Delete"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={24}
                        color="#FF3B30"
                      />
                    </Pressable>
                  )}
                </>
              );
            })()}

            {onAssign && (
              <Pressable
                style={styles.actionButton}
                onPress={onAssign}
                accessibilityRole="button"
                accessibilityLabel="Assigner"
              >
                <Ionicons name="person-add-outline" size={24} color="#f87b1b" />
              </Pressable>
            )}

            {/* Only show close button if visible is 1 (default) OR forced (timer ended) */}
            {(isVisibleProp === 1 ||
              isVisibleProp === undefined ||
              forceShowClose) && (
              <Pressable
                style={styles.actionButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close preview"
              >
                <Ionicons name="close" size={28} color="#f87b1b" />
              </Pressable>
            )}

            {/* Show timer if auto-closing */}
            {isVisibleProp === 0 && (
              <View
                style={[
                  styles.actionButton,
                  { backgroundColor: "rgba(255, 68, 68, 0.8)" },
                ]}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  {timeLeft}s
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Media Content */}
        <View style={styles.mediaContainer}>{renderMedia()}</View>

        {/* Metadata Overlay */}
        {(mediaType === "image" || mediaType === "video") &&
          showMetadata &&
          hasMetadata && (
            <View style={styles.metadataOverlay}>
              <View style={styles.metadataCard}>
                <View style={styles.metadataRow}>
                  {author && (
                    <View style={styles.metadataItem}>
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#f87b1b"
                      />
                      <Text style={styles.metadataSmallValue}>{author}</Text>
                    </View>
                  )}
                  {createdAt && (
                    <View style={styles.metadataItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#f87b1b"
                      />
                      <Text style={styles.metadataSmallValue}>
                        {formatDate(createdAt)}
                      </Text>
                    </View>
                  )}
                  {level !== undefined && (
                    <View style={styles.metadataItem}>
                      <Ionicons
                        name="warning-outline"
                        size={16}
                        color="#f87b1b"
                      />
                      <Text style={styles.metadataSmallValue}>{level}</Text>
                    </View>
                  )}
                  {mode && (
                    <View style={styles.metadataItem}>
                      <Ionicons
                        name={
                          mode === "capture"
                            ? "camera-outline"
                            : "cloud-upload-outline"
                        }
                        size={16}
                        color="#f87b1b"
                      />
                      <Text style={styles.metadataSmallValue}>
                        {mode === "capture" ? "Capturé" : "Importé"}
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

                {/* Audio Text Display */}
                {audiotxt && (
                  <View style={styles.metadataSection}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Ionicons name="mic-outline" size={16} color="#f87b1b" />
                    </View>
                    <Text style={styles.metadataValue}>{audiotxt}</Text>
                  </View>
                )}

                {/* Title Section (Moved here as requested) */}
                {title && (
                  <View style={styles.metadataSection}>
                    <Text style={styles.metadataValue}>{title}</Text>
                  </View>
                )}

                {/* Assigned User Display */}
                {assignedTo && (
                  <View style={styles.metadataSection}>
                    <Text style={styles.metadataLabel}>Assigné à</Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={20}
                        color="#f87b1b"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.metadataValue}>
                        {typeof assignedTo === "string"
                          ? assignedTo
                          : `${assignedTo.firstname} ${assignedTo.lastname}`}
                      </Text>
                    </View>
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
                          style={{
                            color: "#007AFF",
                            fontSize: 12,
                            marginTop: 4,
                          }}
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
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
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
