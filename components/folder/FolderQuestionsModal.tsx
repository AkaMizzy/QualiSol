import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth, User } from '@/contexts/AuthContext';
import * as gedService from '@/services/gedService';
import { CreateGedInput, Ged } from '@/services/gedService';

const SUPPORTED_TYPES = ['long_text', 'text', 'list', 'boolean', 'date', 'number', 'taux'];

interface FolderQuestionsModalProps {
  folderId: string | null;
  visible: boolean;
  onClose: () => void;
}

function QuestionInput({ item, token, user }: { item: Ged; token: string | null; user: User | null }) {
  const [value, setValue] = useState(item.value || '');
  const [boolValue, setBoolValue] = useState(item.value === 'true');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!token || !user || isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    try {
      const answerValue = item.type === 'boolean' ? String(boolValue) : value;
      if (!answerValue) {
        return;
      }

      const answerPayload: CreateGedInput = {
        idsource: item.id,
        title: `Réponse: ${item.title}`,
        kind: 'answer',
        author: user.id,
        description: answerValue,
        type: item.type,
      };

      await gedService.createGed(token, answerPayload);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIconName = (type: Ged['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'text':
        return 'text';
      case 'long_text':
        return 'document-text-outline';
      case 'number':
        return 'calculator-outline';
      case 'taux':
        return 'analytics-outline';
      case 'date':
        return 'calendar-outline';
      case 'list':
        return 'list-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const renderSubmitButton = () => {
    if (isSubmitting) {
      return <ActivityIndicator size="small" color="#f87b1b" style={styles.submitButton} />;
    }
    if (isSubmitted) {
      return <Ionicons name="checkmark-circle" size={24} color="#22c55e" style={styles.submitButton} />;
    }
    return (
      <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting || isSubmitted}>
        <Ionicons name="send-outline" size={24} color="#f87b1b" style={styles.submitButton} />
      </TouchableOpacity>
    );
  };

  if (item.type === 'boolean') {
    return (
      <View style={[styles.inputContainer, styles.switchContainer]}>
        <Switch
          value={boolValue}
          onValueChange={setBoolValue}
          trackColor={{ false: '#767577', true: '#f87b1b' }}
          thumbColor={boolValue ? '#ffffff' : '#f4f3f4'}
          disabled={isSubmitted}
        />
        <View style={styles.submitButtonContainer}>{renderSubmitButton()}</View>
      </View>
    );
  }

  const input = (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={setValue}
      placeholderTextColor="#9ca3af"
      editable={!isSubmitted}
      keyboardType={
        item.type === 'number' ? 'numeric' : item.type === 'taux' ? 'decimal-pad' : 'default'
      }
      multiline={item.type === 'long_text'}
      placeholder={
        item.type === 'date'
          ? 'YYYY-MM-DD'
          : item.type === 'list'
            ? 'Select an option'
            : 'Enter value'
      }
    />
  );

  return (
    <View style={styles.inputContainer}>
      <Ionicons name={getIconName(item.type)} size={22} style={styles.inputIcon} />
      {input}
      {item.type === 'taux' && <Text style={styles.tauxSymbol}>%</Text>}
      {renderSubmitButton()}
    </View>
  );
}

export default function FolderQuestionsModal({ folderId, visible, onClose }: FolderQuestionsModalProps) {
  const { token, user } = useAuth();
  const [geds, setGeds] = useState<Ged[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function fetchGeds() {
      if (!token || !folderId || !visible) {
        setGeds([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const fetchedGeds = await gedService.getGedsBySource(token, folderId, 'question');
        const filteredGeds = fetchedGeds.filter(ged => ged.type && SUPPORTED_TYPES.includes(ged.type));
        setGeds(filteredGeds);
      } catch (err) {
        setError('Impossible de charger les questions.');
        console.error('Failed to fetch geds:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGeds();
  }, [folderId, token, visible]);

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Questions du Dossier</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
            <Ionicons name="close-circle" size={32} color="#f87b1b" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#11224e" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={geds}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.questionContainer}>
                <Text style={styles.questionLabel}>{item.title}</Text>
                <QuestionInput item={item} token={token} user={user} />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text>Aucune question pour ce dossier.</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11224e',
  },
  closeIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -4 }], // Adjust based on icon size and padding
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  questionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87b1b',
    paddingHorizontal: 12,
  },
  inputIcon: {
    color: '#f87b1b',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  switchContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  tauxSymbol: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  submitButton: {
    paddingLeft: 8,
  },
  submitButtonContainer: {
    position: 'absolute',
    right: 0,
    height: '100%',
    justifyContent: 'center',
    paddingRight: 12,
  },
});
