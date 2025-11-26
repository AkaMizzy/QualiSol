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

import { useAuth } from '@/contexts/AuthContext';
import * as gedService from '@/services/gedService';
import { Ged } from '@/services/gedService';

const SUPPORTED_TYPES = ['long_text', 'text', 'list', 'boolean', 'date', 'number', 'taux'];

interface FolderQuestionsModalProps {
  folderId: string | null;
  visible: boolean;
  onClose: () => void;
}

function QuestionInput({ item }: { item: Ged }) {
  const [value, setValue] = useState(item.value || '');
  const [boolValue, setBoolValue] = useState(item.value === 'true');

  switch (item.type) {
    case 'text':
      return <TextInput style={styles.input} value={value} onChangeText={setValue} />;
    case 'long_text':
      return <TextInput style={[styles.input, styles.textArea]} multiline value={value} onChangeText={setValue} />;
    case 'number':
      return <TextInput style={styles.input} keyboardType="numeric" value={value} onChangeText={setValue} />;
    case 'taux':
      return <TextInput style={styles.input} keyboardType="decimal-pad" value={value} onChangeText={setValue} />;
    case 'boolean':
      return (
        <View style={styles.switchContainer}>
          <Switch value={boolValue} onValueChange={setBoolValue} trackColor={{ false: '#767577', true: '#f87b1b' }} thumbColor={boolValue ? '#ffffff' : '#f4f3f4'} />
        </View>
      );
    case 'date':
      // NOTE: DateTimePicker would be ideal here, but for simplicity, a text input is used.
      return <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={value} onChangeText={setValue} />;
    case 'list':
      // NOTE: A dropdown/picker would be ideal, but a text input is used for now.
      return <TextInput style={styles.input} placeholder="Select an option" value={value} onChangeText={setValue} />;
    default:
      return null;
  }
}

export default function FolderQuestionsModal({ folderId, visible, onClose }: FolderQuestionsModalProps) {
  const { token } = useAuth();
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
            <Ionicons name="close-circle" size={32} color="#11224e" />
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
                <QuestionInput item={item} />
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
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  switchContainer: {
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
});
