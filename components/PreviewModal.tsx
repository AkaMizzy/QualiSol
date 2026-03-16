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
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    Platform,
} from "react-native";
import RenderHTML from "react-native-render-html";

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
  iatxt?: string;
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
  iatxt,
}: PreviewModalProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isAiTextExpanded, setIsAiTextExpanded] = useState(false);
  const [isAudioTextExpanded, setIsAudioTextExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(wait);
  const { width } = useWindowDimensions();

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
          <View style={styles.audioSection}>
            <View style={styles.audioPlayerCard}>
              <View style={styles.audioControlsRow}>
                <Pressable
                  style={styles.audioPlayButton}
                  onPress={handlePlayPause}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={24}
                    color="#FFFFFF"
                  />
                </Pressable>
                <View style={styles.audioProgressCol}>
                  <View style={styles.audioProgressBarBase}>
                    <View
                      style={[
                        styles.audioProgressFill,
                        { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.audioTimeRow}>
                    <Text style={styles.audioTimeText}>{formatTime(position)}</Text>
                    <Text style={styles.audioTimeText}>{formatTime(duration)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderExpandableText = (
    text: string,
    isExpanded: boolean,
    setIsExpanded: (val: boolean) => void,
    label?: string,
    icon?: any,
    isHtml = false,
  ) => {
    const trimmedText = text?.trim();
    if (!trimmedText || trimmedText === "<p></p>" || trimmedText === "<br>") return null;

    const shouldShowExpand = trimmedText.length > 200 || trimmedText.includes("<br") || trimmedText.includes("<p");

    return (
      <View style={styles.expandableSection}>
        {label && (
          <View style={styles.sectionHeader}>
            {icon && <Ionicons name={icon} size={18} color="#f87b1b" style={{ marginRight: 8 }} />}
            <Text style={styles.metadataLabel}>{label}</Text>
          </View>
        )}
        <Pressable onPress={() => setIsExpanded(!isExpanded)} style={styles.textContainer}>
          {isHtml ? (
            <View style={!isExpanded && styles.collapsedTextContainer}>
              <RenderHTML
                contentWidth={width - 40}
                source={{ html: text }}
                baseStyle={{
                  fontSize: 15,
                  color: "#E0E0E0",
                  lineHeight: 22,
                }}
                tagsStyles={{
                  b: { fontWeight: "bold", color: "#FFFFFF" },
                  strong: { fontWeight: "bold", color: "#f87b1b" },
                  h1: { fontSize: 22, fontWeight: "bold", color: "#FFFFFF", marginBottom: 12, marginTop: 8 },
                  h2: { fontSize: 20, fontWeight: "bold", color: "#f87b1b", marginBottom: 10, marginTop: 6 },
                  h3: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF", marginBottom: 8, marginTop: 4 },
                  h4: { fontSize: 16, fontWeight: "bold", color: "#f87b1b", marginBottom: 6 },
                  p: { marginBottom: 10, lineHeight: 22 },
                  ul: { marginBottom: 10, marginLeft: 10 },
                  ol: { marginBottom: 10, marginLeft: 10 },
                  li: { marginBottom: 6, color: "#E0E0E0" },
                  table: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 15, borderRadius: 8, overflow: 'hidden' },
                  th: { backgroundColor: "rgba(248, 123, 27, 0.1)", padding: 8, fontWeight: 'bold', color: '#f87b1b' },
                  td: { padding: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", color: '#E0E0E0' },
                }}
              />
            </View>
          ) : (
            <Text
              style={[styles.metadataValue, !isExpanded && styles.collapsedText]}
              numberOfLines={isExpanded ? undefined : 3}
            >
              {text}
            </Text>
          )}
          {shouldShowExpand && (
            <View style={styles.expandButton}>
              <Text style={styles.expandButtonText}>
                {isExpanded ? "Voir moins" : "Voir plus"}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#f87b1b"
              />
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header - Fixed at top */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
             <Text style={styles.headerTitle} numberOfLines={1}>{title || ""}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={22} color="#f87b1b" />
            </Pressable>
            
            {mediaType === "image" && onAutoDescribe && (
              <Pressable
                style={styles.actionButton}
                onPress={onAutoDescribe}
                disabled={isDescribing}
              >
                {isDescribing ? (
                  <ActivityIndicator size="small" color="#f87b1b" />
                ) : (
                  <Ionicons name="sparkles-outline" size={22} color="#f87b1b" />
                )}
              </Pressable>
            )}

            {(() => {
              const isTimerActive = isVisibleProp === 0 && timeLeft > 0;
              const isActionRestricted = isTimerActive || ianalyse === 0;

              return (
                <>
                  {mediaType === "image" && onEdit && !isActionRestricted && (
                    <Pressable style={styles.actionButton} onPress={onEdit}>
                      <Ionicons name="create-outline" size={22} color="#f87b1b" />
                    </Pressable>
                  )}

                  {(mediaType === "image" || mediaType === "video") && onAnnotate && !isActionRestricted && (
                    <Pressable style={styles.actionButton} onPress={onAnnotate}>
                      <Ionicons name="brush-outline" size={22} color="#f87b1b" />
                    </Pressable>
                  )}

                  {onDelete && !isActionRestricted && (
                    <Pressable style={styles.actionButton} onPress={onDelete}>
                      <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                    </Pressable>
                  )}
                </>
              );
            })()}

            {onAssign && (
              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  onClose();
                  setTimeout(onAssign, Platform.OS === "ios" ? 400 : 0);
                }}
              >
                <Ionicons name="person-add-outline" size={22} color="#f87b1b" />
              </Pressable>
            )}

            {(isVisibleProp === 1 || isVisibleProp === undefined || forceShowClose) && (
              <Pressable style={styles.actionButton} onPress={onClose}>
                <Ionicons name="close" size={26} color="#f87b1b" />
              </Pressable>
            )}

            {isVisibleProp === 0 && (
              <View style={[styles.actionButton, { backgroundColor: "rgba(255, 68, 68, 0.2)" }]}>
                <Text style={{ color: "#FF4444", fontWeight: "bold" }}>{timeLeft}s</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Media Section */}
          <View style={styles.mainMediaContainer}>
            {renderMedia()}
          </View>

          {/* Audio Section (Voice Note associated with image) */}
          {mediaType === "image" && voiceNoteUrl && (
            <View style={styles.audioSection}>
              <View style={styles.audioPlayerCard}>
                <View style={styles.audioHeader}>
                  <Ionicons name="mic" size={20} color="#f87b1b" />
                  <Text style={styles.audioTitle}>Note Vocale</Text>
                </View>
                <View style={styles.audioControlsRow}>
                  <Pressable
                    style={styles.audioPlayButton}
                    onPress={handlePlayPause}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={24}
                      color="#FFFFFF"
                    />
                  </Pressable>
                  <View style={styles.audioProgressCol}>
                    <View style={styles.audioProgressBarBase}>
                      <View
                        style={[
                          styles.audioProgressFill,
                          { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
                        ]}
                      />
                    </View>
                    <View style={styles.audioTimeRow}>
                      <Text style={styles.audioTimeText}>{formatTime(position)}</Text>
                      <Text style={styles.audioTimeText}>{formatTime(duration)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Metadata Section */}
          <View style={styles.detailsContainer}>
            {/* Quick Info Badges */}
            {(author || createdAt || level !== undefined) && (
              <View style={styles.badgesRow}>
                {author && (
                  <View style={styles.infoBadge}>
                    <Ionicons name="person-outline" size={14} color="#f87b1b" />
                    <Text style={styles.infoBadgeText}>{author}</Text>
                  </View>
                )}
                {createdAt && (
                  <View style={styles.infoBadge}>
                    <Ionicons name="calendar-outline" size={14} color="#f87b1b" />
                    <Text style={styles.infoBadgeText}>{formatDate(createdAt)}</Text>
                  </View>
                )}
                {level !== undefined && (
                  <View style={[styles.infoBadge, { borderColor: level > 7 ? "#FF3B30" : "#f87b1b" }]}>
                    <Ionicons name="alert-circle-outline" size={14} color={level > 7 ? "#FF3B30" : "#f87b1b"} />
                    <Text style={[styles.infoBadgeText, level > 7 && { color: "#FF3B30" }]}>Nv. {level}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Structured Info */}
            {(chantier || zoneTitle || assignedTo) && (
              <View style={styles.infoGrid}>
                {chantier && (
                  <View style={styles.gridItem}>
                    <Ionicons name="business-outline" size={16} color="#f87b1b" />
                    <View>
                      <Text style={styles.gridLabel}>Chantier</Text>
                      <Text style={styles.gridValue}>{chantier}</Text>
                    </View>
                  </View>
                )}
                {zoneTitle && (
                  <View style={styles.gridItem}>
                    <Ionicons name="location-outline" size={16} color="#f87b1b" />
                    <View>
                      <Text style={styles.gridLabel}>Zone</Text>
                      <Text style={styles.gridValue}>{zoneTitle}</Text>
                    </View>
                  </View>
                )}
                {assignedTo && (
                  <View style={styles.gridItem}>
                    <Ionicons name="people-outline" size={16} color="#f87b1b" />
                    <View>
                      <Text style={styles.gridLabel}>Assigné à</Text>
                      <Text style={styles.gridValue}>
                        {typeof assignedTo === "string" ? assignedTo : `${assignedTo.firstname} ${assignedTo.lastname}`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Expandable Descriptions */}
            {renderExpandableText(
              description || "",
              isDescriptionExpanded,
              setIsDescriptionExpanded,
              "Description",
              "document-text-outline",
              true
            )}

            {renderExpandableText(
              iatxt || "",
              isAiTextExpanded,
              setIsAiTextExpanded,
              "Analyse IA",
              "sparkles-outline",
              true
            )}

            {renderExpandableText(
              audiotxt || "",
              isAudioTextExpanded,
              setIsAudioTextExpanded,
              "Transcription Audio",
              "mic-outline",
              true
            )}

            {(type || categorie) && (
              <View style={styles.categoriesRow}>
                {type && (
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{type}</Text>
                  </View>
                )}
                {categorie && (
                  <View style={[styles.categoryTag, { backgroundColor: "rgba(0, 122, 255, 0.1)" }]}>
                    <Text style={[styles.categoryTagText, { color: "#007AFF" }]}>{categorie}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0B", // Deep dark background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120, // Space for fixed header
    paddingBottom: 40,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    backgroundColor: "rgba(10, 10, 11, 0.8)",
    // @ts-ignore
    backdropFilter: "blur(20px)",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(248, 123, 27, 0.1)", // Subtle orange tint
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "rgba(248, 123, 27, 0.2)",
  },
  mainMediaContainer: {
    width: screenWidth,
    height: screenHeight * 0.5, // Properly scaled image at top
    backgroundColor: "#000",
    marginBottom: 20,
    overflow: "hidden",
  },
  mediaContent: {
    width: "100%",
    height: "100%",
  },
  audioSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  audioPlayerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  audioHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  audioTitle: {
    color: "#f87b1b",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  audioControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  audioPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f87b1b",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  audioProgressCol: {
    flex: 1,
    gap: 8,
  },
  audioProgressBarBase: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "#f87b1b",
    borderRadius: 3,
  },
  audioTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  audioTimeText: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "500",
  },
  detailsContainer: {
    paddingHorizontal: 16,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
    justifyContent: "center",
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 6,
  },
  infoBadgeText: {
    color: "#E0E0E0",
    fontSize: 13,
    fontWeight: "500",
  },
  infoGrid: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 20,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  gridItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gridLabel: {
    color: "#8E8E93",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gridValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  expandableSection: {
    marginBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f87b1b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  textContainer: {
    position: "relative",
  },
  collapsedTextContainer: {
    maxHeight: 100,
    overflow: "hidden",
  },
  collapsedText: {
    // Basic fallback if not using numberOfLines
  },
  metadataValue: {
    fontSize: 15,
    color: "#E0E0E0",
    lineHeight: 24,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    gap: 4,
  },
  expandButtonText: {
    color: "#f87b1b",
    fontSize: 14,
    fontWeight: "600",
  },
  categoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(248, 123, 27, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(248, 123, 27, 0.2)",
  },
  categoryTagText: {
    color: "#f87b1b",
    fontSize: 12,
    fontWeight: "700",
  },
  // Voice recording screen specific (if used independently)
  voiceContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  voiceIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(248, 123, 27, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  voiceFileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  voiceFileInfo: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  // File screen specific
  fileContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  fileIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  fileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  fileInfo: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  downloadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
});
