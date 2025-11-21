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
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FormComponentProps = {
  isEditing: boolean;
  isSubmitting: boolean;
  title: string;
  description: string;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

const FormComponent = ({
  isEditing,
  isSubmitting,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}: FormComponentProps) => (
  <View style={styles.formCard}>
    <Text style={styles.formTitle}>{isEditing ? 'Modifier le type' : 'Nouveau type de chantier'}</Text>
    <View style={styles.inputWrap}>
      <Ionicons name="text-outline" size={16} color="#6b7280" />
      <TextInput
        placeholder="Titre"
        placeholderTextColor="#9ca3af"
        value={title}
        onChangeText={onTitleChange}
        style={styles.input}
      />
    </View>
    <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
      <Ionicons name="document-text-outline" size={16} color="#6b7280" />
      <TextInput
        placeholder="Description (optionnel)"
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={onDescriptionChange}
        style={[styles.input, { height: '100%' }]}
        multiline
      />
    </View>
    <View style={styles.formActions}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSubmit} style={styles.submitButton} disabled={isSubmitting}>
        <Text style={styles.submitButtonText}>{isEditing ? 'Enregistrer' : 'Créer'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProjectTypeManagerModal({ visible, onClose }: Props) {
  const { token } = useAuth();
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<ProjectType | null>(null);
  const [isAdding, setIsAdding] = useState(false);
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
      console.error('Failed to fetch project types:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (visible) {
      fetchProjectTypes();
    }
  }, [visible, fetchProjectTypes]);

  const handleBeginEdit = (type: ProjectType) => {
    setIsEditing(type);
    setIsAdding(false);
    setTitle(type.title);
    setDescription(type.description || '');
  };

  const handleBeginAdd = () => {
    setIsEditing(null);
    setIsAdding(true);
    setTitle('');
    setDescription('');
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
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
        const updatedType = await updateProjectType(
          isEditing.id,
          { title, description: description || undefined },
          token
        );
        setProjectTypes((prev) => prev.map((t) => (t.id === updatedType.id ? updatedType : t)));
      } else {
        const newType = await createProjectType({ title, description: description || undefined }, token);
        setProjectTypes((prev) => [newType, ...prev]);
      }
      handleCancel();
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} project type:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deleteProjectType(id, token);
      setProjectTypes((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete project type:', error);
    }
  };

  const renderItem = ({ item }: { item: ProjectType }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => handleBeginEdit(item)} style={styles.iconButton}>
          <Ionicons name="pencil" size={20} color="#11224e" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
          <Ionicons name="trash" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Gérer les types de chantier</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            {isAdding || isEditing ? (
              <FormComponent
                isEditing={!!isEditing}
                isSubmitting={isSubmitting}
                title={title}
                description={description}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            ) : (
              <TouchableOpacity onPress={handleBeginAdd} style={styles.addButton}>
                <Ionicons name="add" size={22} color="#f87b1b" />
                <Text style={styles.addButtonText}>Ajouter un type</Text>
              </TouchableOpacity>
            )}

            {isLoading && !isAdding && !isEditing ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#11224e" size="large" />
            ) : (
              <FlatList
                data={projectTypes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: isAdding || isEditing ? 0 : 16 }}
                ListEmptyComponent={
                  !isLoading ? <Text style={styles.emptyText}>Aucun type de projet. Appuyez sur &quot;Ajouter&quot; pour en créer un.</Text> : null
                }
              />
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f87b1b',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: '#f87b1b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f87b1b',
  },
  // Form Styles
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11224e',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, color: '#111827', fontSize: 16 },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#f87b1b',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  submitButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButtonText: { color: '#1f2937', fontWeight: '600', fontSize: 16 },
  // List Item Styles
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  itemTextContainer: { flex: 1, marginRight: 16 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#11224e' },
  itemDescription: { color: '#6b7280', marginTop: 4, fontSize: 14 },
  itemActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  emptyText: { textAlign: 'center', marginTop: 48, color: '#6b7280', fontSize: 16, paddingHorizontal: 20 },
});
