import API_CONFIG from '@/app/config/api';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { Ged } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface PhotoTypeSelectionModalProps {
  visible: boolean;
  folderTitle: string;
  photoAvants: Ged[];  // List of available photoAvants in the folder
  onSelectPhotoAvant: () => void;  // User chose to assign as photoAvant
  onSelectPhotoApres: (photoAvantId: string) => void;  // User chose photoApres and its parent
  onCancel: () => void;
}

export default function PhotoTypeSelectionModal({
  visible,
  folderTitle,
  photoAvants,
  onSelectPhotoAvant,
  onSelectPhotoApres,
  onCancel,
}: PhotoTypeSelectionModalProps) {
  const [step, setStep] = useState<1 | 2>(1);  // 1: Choose type, 2: Select photoAvant
  const hasPhotoAvant = photoAvants.length > 0;

  // Reset to step 1 when modal opens
  useEffect(() => {
    if (visible) {
      setStep(1);
    }
  }, [visible]);

  // Handle ESC key to close modal or go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        if (step === 2) {
          setStep(1);  // Go back to step 1
        } else {
          onCancel();  // Close modal
        }
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, step, onCancel]);

  if (!visible) return null;

  const handlePhotoAvantClick = () => {
    onSelectPhotoAvant();
  };

  const handlePhotoApresClick = () => {
    setStep(2);  // Move to step 2 to select photoAvant
  };

  const handlePhotoAvantSelection = (photoAvantId: string) => {
    onSelectPhotoApres(photoAvantId);
  };

  const renderStep1 = () => (
    <>
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
          onPress={handlePhotoAvantClick}
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
          onPress={() => hasPhotoAvant && handlePhotoApresClick()}
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
    </>
  );

  const renderStep2 = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sélectionner la photo "avant" correspondante</Text>
        <Text style={styles.subtitle}>
          Cette photo sera marquée comme "après" de:
        </Text>
      </View>

      {/* PhotoAvant List */}
      <ScrollView style={styles.photoAvantList}>
        {photoAvants.map((photoAvant) => (
          <Pressable
            key={photoAvant.id}
            style={styles.photoAvantItem}
            onPress={() => handlePhotoAvantSelection(photoAvant.id)}
          >
            <View style={styles.photoAvantItemContent}>
              <View style={styles.photoAvantItemLeft}>
                {photoAvant.url && (
                  <Image
                    source={{ uri: `${API_CONFIG.BASE_URL}${photoAvant.url}` }}
                    style={styles.photoAvantThumbnail}
                    contentFit="cover"
                  />
                )}
                <View style={styles.photoAvantInfo}>
                  <Text style={styles.photoAvantTitle} numberOfLines={1}>
                    📸 {photoAvant.title}
                  </Text>
                  <Text style={styles.photoAvantDate}>
                    Créée le: {new Date(photoAvant.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              <View style={styles.chooseButton}>
                <Text style={styles.chooseButtonText}>CHOISIR</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <Pressable style={styles.backButton} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={20} color={COLORS.tertiary} />
          <Text style={styles.backButtonText}>RETOUR</Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>ANNULER</Text>
        </Pressable>
      </View>
    </>
  );

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
            {step === 1 ? renderStep1() : renderStep2()}
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
    maxHeight: '85%',
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
    fontSize: 20,
    color: COLORS.tertiary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    textAlign: 'center',
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
  photoAvantList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  photoAvantItem: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: COLORS.lightWhite,
    borderWidth: 2,
    borderColor: '#4FACFE',
  },
  photoAvantItemContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoAvantItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  photoAvantThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.gray2,
  },
  photoAvantInfo: {
    flex: 1,
  },
  photoAvantTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  photoAvantDate: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  chooseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  chooseButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: 8,
  },
  backButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  cancelButton: {
    flex: 1,
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
