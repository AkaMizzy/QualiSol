import { Ionicons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface PreviewModalProps {
  visible: boolean;
  onClose: () => void;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file' | 'voice';
  title?: string;
  onEdit?: () => void; // Add this line
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PreviewModal({
  visible,
  onClose,
  mediaUrl,
  mediaType,
  title,
  onEdit, // Add this line
}: PreviewModalProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const loadAudio = async () => {
    if (!mediaUrl || mediaType !== 'voice') return;
    
    try {
      setIsLoading(true);
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: mediaUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(audioSound);
    } catch (error) {
      console.error('Error loading audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
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

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Load audio when modal opens for voice type
  useEffect(() => {
    if (visible && mediaType === 'voice') {
      loadAudio();
    }
  }, [visible, mediaUrl, mediaType]);

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
        const browserUrl = mediaUrl.startsWith('http') ? mediaUrl : `https://${mediaUrl}`;
        await Linking.openURL(browserUrl);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert(
        'Cannot Open File',
        'Unable to open this file. You may need to download it first.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderMedia = () => {
    if (mediaType === 'image') {
      return (
        <Image
          source={{ uri: mediaUrl }}
          style={styles.mediaContent}
          contentFit="contain"
          transition={200}
        />
      );
    }

    if (mediaType === 'video') {
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

    if (mediaType === 'file') {
      return (
        <View style={styles.fileContainer}>
          <View style={styles.fileIconContainer}>
            <Ionicons name="document-outline" size={64} color="#007AFF" />
          </View>
          <Text style={styles.fileName}>
            {mediaUrl?.split('/').pop() || 'Document'}
          </Text>
          <Text style={styles.fileInfo}>
            Document file
          </Text>
          <Pressable
            style={styles.downloadButton}
            onPress={handleOpenFile}
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.downloadButtonText}>Open Document</Text>
          </Pressable>
        </View>
      );
    }

    if (mediaType === 'voice') {
      return (
        <View style={styles.voiceContainer}>
          <View style={styles.voiceIconContainer}>
            <Ionicons name="mic-outline" size={64} color="#FF6B6B" />
          </View>
          <Text style={styles.voiceFileName}>
            {mediaUrl?.split('/').pop() || 'Voice Recording'}
          </Text>
          <Text style={styles.voiceFileInfo}>
            Voice message
          </Text>
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
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
                  color="#FFFFFF"
                />
              </Pressable>
              
              {/* Time Display */}
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>
                  {formatTime(position)}
                </Text>
                <Text style={styles.timeText}>
                  {formatTime(duration)}
                </Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
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
          <View style={styles.headerContent}>
            {title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>

          {/* Edit Button for Images */}
          {mediaType === 'image' && onEdit && (
            <Pressable
              style={styles.editButton}
              onPress={onEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit photo"
            >
              <Ionicons name="create-outline" size={24} color="#FFFFFF" />
            </Pressable>
          )}

          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Media Content */}
        <View style={styles.mediaContainer}>
          {renderMedia()}
        </View>

        {/* Backdrop for closing */}
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerContent: {
    flex: 1,
    marginRight: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mediaContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContent: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  fileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fileIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  fileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  fileInfo: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  voiceIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  voiceFileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  voiceFileInfo: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  audioPlayerContainer: {
    width: screenWidth * 0.8,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDisplay: {
    flexDirection: 'row',
    gap: 8,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    position: 'relative',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  progressTouchable: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    bottom: -8,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
});
