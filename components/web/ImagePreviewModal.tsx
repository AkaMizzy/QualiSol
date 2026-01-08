import API_CONFIG from '@/app/config/api';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ImagePreviewModalProps {
  visible: boolean;
  photo: any; // Using any for now, ideally should share Photo interface
  onClose: () => void;
}

export default function ImagePreviewModal({ visible, photo, onClose }: ImagePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible || !photo) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.backdrop} onClick={onClose} />
      
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {photo.title || 'Sans titre'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photo.url ? `${API_CONFIG.BASE_URL}${photo.url}` : '' }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.date}>
            {new Date(photo.created_at).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    </div>
  );
}

const styles = Object.assign(StyleSheet.create({
  modalContainer: {
    width: '90%',
    height: '90%',
    maxWidth: 1200,
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10001,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  date: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.white,
    textAlign: 'center',
  },
}), {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  backdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    cursor: 'pointer',
  },
});
