import { COLORS, FONT, SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface PhotoTypeSelectionModalProps {
  visible: boolean;
  folderTitle: string;
  hasPhotoAvant: boolean; // Whether folder already has a photoAvant
  onSelect: (photoType: 'photoavant' | 'photoapres') => void;
  onCancel: () => void;
}

export default function PhotoTypeSelectionModal({
  visible,
  folderTitle,
  hasPhotoAvant,
  onSelect,
  onCancel,
}: PhotoTypeSelectionModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onCancel();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Choisir le type de photo</Text>
              <Text style={styles.folderName} numberOfLines={1}>
                Dossier: {folderTitle}
              </Text>
            </View>

            {/* Photo Type Cards */}
            <View style={styles.cardsContainer}>
              {/* Photo Avant Card */}
              <Pressable
                style={styles.card}
                onPress={() => onSelect('photoavant')}
              >
                <View style={[styles.cardContent, styles.photoAvantCard]}>
                  <Ionicons name="camera-outline" size={48} color="#4FACFE" />
                  <Text style={styles.cardTitle}>SITUATION AVANT</Text>
                  <Text style={styles.cardDescription}>
                    Photo de la situation initiale/avant travaux
                  </Text>
                  <View style={[styles.selectButton, styles.photoAvantButton]}>
                    <Text style={styles.selectButtonText}>SÉLECTIONNER</Text>
                  </View>
                </View>
              </Pressable>

              {/* Photo Apres Card */}
              <Pressable
                style={[styles.card, !hasPhotoAvant && styles.cardDisabled]}
                onPress={() => hasPhotoAvant && onSelect('photoapres')}
                disabled={!hasPhotoAvant}
              >
                <View style={[styles.cardContent, styles.photoApresCard]}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={48}
                    color={hasPhotoAvant ? '#00C853' : '#CCCCCC'}
                  />
                  <Text
                    style={[
                      styles.cardTitle,
                      !hasPhotoAvant && styles.cardTitleDisabled,
                    ]}
                  >
                    SITUATION APRÈS
                  </Text>
                  <Text
                    style={[
                      styles.cardDescription,
                      !hasPhotoAvant && styles.cardDescriptionDisabled,
                    ]}
                  >
                    Photo de la situation finale/après travaux
                  </Text>
                  <View
                    style={[
                      styles.selectButton,
                      hasPhotoAvant
                        ? styles.photoApresButton
                        : styles.selectButtonDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        !hasPhotoAvant && styles.selectButtonTextDisabled,
                      ]}
                    >
                      {hasPhotoAvant ? 'SÉLECTIONNER' : 'NON DISPONIBLE'}
                    </Text>
                  </View>
                  {!hasPhotoAvant && (
                    <View style={styles.disabledOverlay}>
                      <Ionicons name="lock-closed" size={24} color="#999" />
                    </View>
                  )}
                </View>
              </Pressable>
            </View>

            {/* Warning Message */}
            {!hasPhotoAvant && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={20} color="#FF9800" />
                <Text style={styles.warningText}>
                  Une photo "avant" doit exister avant de pouvoir ajouter une photo "après"
                </Text>
              </View>
            )}

            {/* Cancel Button */}
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>ANNULER</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 700,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 24,
    color: COLORS.tertiary,
    marginBottom: 8,
  },
  folderName: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardContent: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.lightWhite,
    minHeight: 280,
    justifyContent: 'space-between',
    position: 'relative',
  },
  photoAvantCard: {
    borderColor: '#4FACFE',
  },
  photoApresCard: {
    borderColor: '#00C853',
  },
  cardTitle: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: COLORS.tertiary,
    textAlign: 'center',
  },
  cardTitleDisabled: {
    color: '#CCCCCC',
  },
  cardDescription: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardDescriptionDisabled: {
    color: '#CCCCCC',
  },
  selectButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
  },
  photoAvantButton: {
    backgroundColor: '#4FACFE',
  },
  photoApresButton: {
    backgroundColor: '#00C853',
  },
  selectButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  selectButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
    textAlign: 'center',
  },
  selectButtonTextDisabled: {
    color: '#999',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: '#E65100',
    lineHeight: 18,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  cancelButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    textAlign: 'center',
  },
});
