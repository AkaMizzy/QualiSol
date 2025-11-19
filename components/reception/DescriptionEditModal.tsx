import { useAuth } from '@/contexts/AuthContext';
import { enhanceText, Ged, updateGed } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DescriptionEditModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (updatedDescription: string) => void;
  initialDescription: string;
  gedItem: Ged;
  title: string;
};

export default function DescriptionEditModal({
  visible,
  onClose,
  onSave,
  initialDescription,
  gedItem,
  title,
}: DescriptionEditModalProps) {
  const { token } = useAuth();
  const [description, setDescription] = useState(initialDescription);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset description when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setDescription(initialDescription);
    }
  }, [visible, initialDescription]);

  const handleEnhance = async () => {
    if (!description.trim() || !token) {
      Alert.alert('Information', 'Veuillez entrer du texte à améliorer.');
      return;
    }

    setIsEnhancing(true);
    try {
      const result = await enhanceText(description, token);
      setDescription(result.enhancedText);
    } catch (error: any) {
      console.error('Error enhancing text:', error);
      Alert.alert('Erreur', error?.message || 'Impossible d\'améliorer le texte.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Confirmer',
      'Voulez-vous vraiment effacer la description ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => setDescription(''),
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Erreur', 'Vous devez être connecté pour enregistrer.');
      return;
    }

    setIsSaving(true);
    try {
      await updateGed(token, gedItem.id, { description: description.trim() || null });
      onSave(description.trim() || '');
      onClose();
    } catch (error: any) {
      console.error('Error saving description:', error);
      Alert.alert('Erreur', error?.message || 'Impossible d\'enregistrer la description.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (description !== initialDescription) {
      Alert.alert(
        'Modifications non enregistrées',
        'Voulez-vous vraiment fermer sans enregistrer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Fermer', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>Modifier la description</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.headerCloseButton}>
              <Ionicons name="close" size={28} color="#11224e" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Entrez la description..."
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  style={styles.textInput}
                  multiline
                  textAlignVertical="top"
                  editable={!isEnhancing && !isSaving}
                />
                {description ? (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClear}
                    accessibilityLabel="Effacer la description"
                  >
                    <Ionicons name="trash-outline" size={20} color="#EE4B2B" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.enhanceButton]}
                  onPress={handleEnhance}
                  disabled={isEnhancing || isSaving || !description.trim()}
                >
                  {isEnhancing ? (
                    <ActivityIndicator size="small" color="#f87b1b" />
                  ) : (
                    <Ionicons name="sparkles-outline" size={20} color="#f87b1b" />
                  )}
                  <Text style={styles.enhanceButtonText}>
                    {isEnhancing ? 'Amélioration...' : 'Améliorer avec IA'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, (isSaving || isEnhancing) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving || isEnhancing}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Enregistrement...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save" size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    width: 50,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f87b1b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  headerCloseButton: {
    padding: 8,
    minWidth: 50,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputContainer: {
    gap: 16,
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f87b1b',
    padding: 12,
    minHeight: 200,
    position: 'relative',
  },
  textInput: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 180,
    paddingRight: 30, // Prevent text from overlapping with the clear button
  },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  enhanceButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  enhanceButtonText: {
    color: '#f87b1b',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#f87b1b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 48,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

