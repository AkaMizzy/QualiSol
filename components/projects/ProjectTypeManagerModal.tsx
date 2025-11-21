import { useAuth } from '@/contexts/AuthContext';
import {
    createProjectType,
    deleteProjectType,
    getAllProjectTypes,
    ProjectType,
    updateProjectType,
} from '@/services/projectTypeService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProjectTypeManagerModal({ visible, onClose }: Props) {
  const { token } = useAuth();
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<ProjectType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjectTypes = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const types = await getAllProjectTypes(token);
      setProjectTypes(types);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les types de projet.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (visible) {
      fetchProjectTypes();
    }
  }, [visible, fetchProjectTypes]);

  const handleEdit = (type: ProjectType) => {
    setIsEditing(type);
    setTitle(type.title);
    setDescription(type.description || '');
  };

  const handleClearForm = () => {
    setIsEditing(null);
    setTitle('');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!token || !title.trim()) {
      Alert.alert('Validation', 'Le titre est requis.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateProjectType(
          isEditing.id,
          { title, description: description || undefined },
          token
        );
      } else {
        await createProjectType({ title, description: description || undefined }, token);
      }
      handleClearForm();
      fetchProjectTypes(); // Refresh list
    } catch (error) {
      Alert.alert('Erreur', `Échec de la ${isEditing ? 'mise à jour' : 'création'}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!token) return;
    Alert.alert('Confirmer', 'Voulez-vous vraiment supprimer ce type ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProjectType(id, token);
            fetchProjectTypes(); // Refresh list
          } catch (error) {
            Alert.alert('Erreur', 'Échec de la suppression.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ProjectType }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => handleEdit(item)}>
          <Ionicons name="pencil" size={20} color="#11224e" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Gérer les types de chantier</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            placeholder="Titre du type"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />
          <TextInput
            placeholder="Description (optionnel)"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, { height: 60 }]}
            multiline
          />
          <View style={styles.formActions}>
            <TouchableOpacity onPress={handleSubmit} style={styles.submitButton} disabled={isSubmitting}>
              <Text style={styles.submitButtonText}>{isEditing ? 'Mettre à jour' : 'Ajouter'}</Text>
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity onPress={handleClearForm} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color="#11224e" />
        ) : (
          <FlatList
            data={projectTypes}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun type de projet trouvé.</Text>}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: 'white' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  formContainer: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: 'white' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  submitButton: { backgroundColor: '#11224e', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  submitButtonText: { color: 'white', fontWeight: '600' },
  cancelButton: { backgroundColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  cancelButtonText: { color: '#1f2937', fontWeight: '600' },
  itemContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: 'white' },
  itemTextContainer: { flex: 1, marginRight: 16 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  itemDescription: { color: '#6b7280', marginTop: 4 },
  itemActions: { flexDirection: 'row', gap: 20 },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#6b7280' },
});
