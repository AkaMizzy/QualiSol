import { useAuth } from '@/contexts/AuthContext';
import {
  createQuestionType,
  deleteQuestionType,
  getQuestionTypesByFolder,
  QuestionType,
  updateQuestionType,
} from '@/services/questionTypeService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Form Component
type FormComponentProps = {
  isEditing: boolean;
  isSubmitting: boolean;
  title: string;
  description: string;
  type: QuestionType['type'] | null;
  quantity: boolean;
  price: boolean;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onTypeChange: (type: QuestionType['type'] | null) => void;
  onQuantityChange: (value: boolean) => void;
  onPriceChange: (value: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

const FormComponent = ({
  isEditing,
  isSubmitting,
  title,
  description,
  type,
  quantity,
  price,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onQuantityChange,
  onPriceChange,
  onSubmit,
  onCancel,
}: FormComponentProps) => {
  const [isPickerVisible, setPickerVisible] = useState(false);
  const typeOptions = [
    { label: 'Booléen', value: 'boolean' },
    { label: 'Date', value: 'date' },
    { label: 'Fichier', value: 'file' },
    { label: 'GPS', value: 'GPS' },
    { label: 'Liste', value: 'list' },
    { label: 'Nombre', value: 'number' },
    { label: 'Photo', value: 'photo' },
    { label: 'Taux', value: 'taux' },
    { label: 'Texte', value: 'text' },
    { label: 'Texte long', value: 'long_text' },
    { label: 'Vidéo', value: 'video' },
    { label: 'Voix', value: 'voice' },
  ].sort((a, b) => a.label.localeCompare(b.label));

  const selectedLabel = type ? typeOptions.find((opt) => opt.value === type)?.label : 'Type de question...';

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>{isEditing ? 'Modifier la question' : 'Nouvelle question'}</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="text-outline" size={20} color="#f87b1b" />
        <TextInput
          placeholder="Titre de la question"
          placeholderTextColor="#f87b1b"
          value={title}
          onChangeText={onTitleChange}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>

      <View style={[styles.inputContainer, { height: 100, alignItems: 'flex-start', paddingTop: 15 }]}>
        <Ionicons name="document-text-outline" size={20} color="#f87b1b" />
        <TextInput
          placeholder="Description (optionnel)"
          placeholderTextColor="#f87b1b"
          value={description}
          onChangeText={onDescriptionChange}
          style={[styles.input, { height: '100%' }]}
          multiline
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>

      <TouchableOpacity style={styles.inputContainer} onPress={() => setPickerVisible(true)}>
        <Ionicons name="options-outline" size={20} color="#f87b1b" />
        <Text style={[styles.input, !type && { color: '#f87b1b' }]}>{selectedLabel}</Text>
        <Ionicons name="chevron-down-outline" size={20} color="#f87b1b" />
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <View style={styles.switchTextContainer}>
          <Ionicons name="server-outline" size={20} color="#f87b1b" />
          <Text style={styles.switchLabel}>Activer la quantité</Text>
        </View>
        <Switch
          trackColor={{ false: '#767577', true: '#f87b1b' }}
          thumbColor={quantity ? '#ffffff' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          value={quantity}
          onValueChange={onQuantityChange}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchTextContainer}>
          <Ionicons name="cash-outline" size={20} color="#f87b1b" />
          <Text style={styles.switchLabel}>Activer le prix</Text>
        </View>
        <Switch
          trackColor={{ false: '#767577', true: '#f87b1b' }}
          thumbColor={price ? '#ffffff' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          value={price}
          onValueChange={onPriceChange}
        />
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]}>
          <Text style={[styles.buttonText, styles.cancelButtonText]}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSubmit} style={[styles.button, styles.submitButton]} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{isEditing ? 'Enregistrer' : 'Créer'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal transparent visible={isPickerVisible} animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.pickerModalOverlay} activeOpacity={1} onPressOut={() => setPickerVisible(false)}>
          <View style={styles.pickerModalContainer}>
            <FlatList
              data={typeOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    onTypeChange(item.value as QuestionType['type']);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};


type Props = {
  visible: boolean;
  onClose: () => void;
  folderType: { id: string; title: string };
};

export default function QuestionTypeManagerModal({ visible, onClose, folderType }: Props) {
  const { token } = useAuth();
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<QuestionType | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<QuestionType['type'] | null>(null);
  const [quantity, setQuantity] = useState(false);
  const [price, setPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQuestionTypes = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const types = await getQuestionTypesByFolder(folderType.id, token);
      setQuestionTypes(types);
    } catch (error) {
      console.error('Failed to fetch question types:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, folderType.id]);

  useEffect(() => {
    if (visible) {
      fetchQuestionTypes();
    }
  }, [visible, fetchQuestionTypes]);

  const handleBeginEdit = (item: QuestionType) => {
    setIsEditing(item);
    setIsAdding(true);
    setTitle(item.title);
    setDescription(item.description || '');
    setType(item.type || null);
    setQuantity(!!item.quantity);
    setPrice(!!item.price);
  };

  const handleBeginAdd = () => {
    setIsEditing(null);
    setIsAdding(true);
    setTitle('');
    setDescription('');
    setType(null);
    setQuantity(false);
    setPrice(false);
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
    setTitle('');
    setDescription('');
    setType(null);
    setQuantity(false);
    setPrice(false);
  };

  const handleSubmit = async () => {
    if (!token || !title.trim() || !type) {
      Alert.alert('Champs obligatoires', 'Veuillez renseigner un titre et un type pour la question.');
      return;
    }

    setIsSubmitting(true);
    try {
      const questionData = {
        title,
        description: description.trim() ? description : undefined,
        type,
        quantity: quantity ? 1 : 0,
        price: price ? 1 : 0,
      };

      if (isEditing) {
        const updated = await updateQuestionType(isEditing.id, questionData, token);
        setQuestionTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const newQuestion = await createQuestionType(
          { ...questionData, foldertype_id: folderType.id },
          token
        );
        setQuestionTypes((prev) => [newQuestion, ...prev]);
      }
      handleCancel();
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} question type:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deleteQuestionType(id, token);
      setQuestionTypes((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete question type:', error);
    }
  };

  const renderItem = ({ item }: { item: QuestionType }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
        <Text style={[styles.itemDescription, { fontStyle: 'italic', marginTop: 4 }]}>Type: {item.type}</Text>
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Gérer les Questions pour {folderType.title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.contentContainer} contentContainerStyle={{ paddingBottom: 20 }}>
              {isAdding ? (
                <FormComponent
                  isEditing={!!isEditing}
                  isSubmitting={isSubmitting}
                  title={title}
                  description={description}
                  type={type}
                  quantity={quantity}
                  price={price}
                  onTitleChange={setTitle}
                  onDescriptionChange={setDescription}
                  onTypeChange={setType}
                  onQuantityChange={setQuantity}
                  onPriceChange={setPrice}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              ) : (
                <TouchableOpacity onPress={handleBeginAdd} style={styles.addButton}>
                  <Ionicons name="add" size={22} color="#f87b1b" />
                  <Text style={styles.addButtonText}>Ajouter une question</Text>
                </TouchableOpacity>
              )}

              {isLoading && !isAdding ? (
                <ActivityIndicator style={{ marginTop: 20 }} color="#11224e" size="large" />
              ) : (
                <FlatList
                  data={questionTypes}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  scrollEnabled={false}
                  contentContainerStyle={{ paddingTop: isAdding ? 0 : 16 }}
                  ListEmptyComponent={
                    !isLoading ? (
                      <Text style={styles.emptyText}>Aucune question. Appuyez sur &quot;Ajouter&quot; pour en créer une.</Text>
                    ) : null
                  }
                />
              )}
            </ScrollView>
          </SafeAreaView>
        </TouchableWithoutFeedback>
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
    formContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 15,
      padding: 20,
      marginVertical: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    formTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#11224e',
      marginBottom: 20,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderRadius: 10,
      paddingHorizontal: 15,
      height: 50,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#f87b1b',
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: '#11224e',
      marginLeft: 10,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFF',
      borderRadius: 10,
      paddingHorizontal: 15,
      paddingVertical: 5,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#f87b1b',
    },
    switchTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    switchLabel: {
      fontSize: 16,
      color: '#11224e',
      marginLeft: 10,
    },
    formActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 10,
    },
    button: {
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 25,
      alignItems: 'center',
    },
    submitButton: {
      backgroundColor: '#f87b1b',
    },
    cancelButton: {
      backgroundColor: '#F2F2F7',
      borderWidth: 1,
      borderColor: '#E5E5EA',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: '#1C1C1E',
    },
    pickerModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerModalContainer: {
      backgroundColor: 'white',
      borderRadius: 10,
      width: '80%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: '#f87b1b',
    },
    pickerItem: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#f87b1b',
    },
    pickerItemText: {
      fontSize: 16,
      color: '#11224e',
    },
    itemCard: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      borderLeftWidth: 4,
      borderLeftColor: '#f87b1b',
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
