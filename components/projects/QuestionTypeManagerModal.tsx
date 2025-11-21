import { useAuth } from '@/contexts/AuthContext';
import {
    createQuestionType,
    deleteQuestionType,
    getQuestionTypesByFolder,
    QuestionType,
    updateQuestionType,
} from '@/services/questionTypeService';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Form Component
type FormComponentProps = {
  isEditing: boolean;
  isSubmitting: boolean;
  title: string;
  type: QuestionType['type'] | null;
  quantity: boolean;
  price: boolean;
  onTitleChange: (text: string) => void;
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
  type,
  quantity,
  price,
  onTitleChange,
  onTypeChange,
  onQuantityChange,
  onPriceChange,
  onSubmit,
  onCancel,
}: FormComponentProps) => (
  <View style={styles.formContainer}>
    <Text style={styles.formTitle}>{isEditing ? 'Modifier la question' : 'Nouvelle question'}</Text>

    <View style={styles.inputContainer}>
      <Ionicons name="text-outline" size={22} color="#8E8E93" />
      <TextInput
        placeholder="Titre de la question"
        placeholderTextColor="#8E8E93"
        value={title}
        onChangeText={onTitleChange}
        style={styles.input}
      />
    </View>

    <View style={styles.inputContainer}>
      <Ionicons name="options-outline" size={22} color="#8E8E93" />
      <Picker
        selectedValue={type}
        onValueChange={(itemValue) => onTypeChange(itemValue)}
        style={styles.picker}
        dropdownIconColor="#11224e"
      >
        <Picker.Item label="Type de question..." value={null} enabled={false} style={{ color: '#8E8E93' }} />
        <Picker.Item label="Texte" value="text" />
        <Picker.Item label="Nombre" value="number" />
        <Picker.Item label="Date" value="date" />
        <Picker.Item label="Booléen" value="boolean" />
        <Picker.Item label="Fichier" value="file" />
      </Picker>
    </View>

    <View style={styles.switchRow}>
      <View style={styles.switchTextContainer}>
        <Ionicons name="server-outline" size={22} color="#8E8E93" />
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
        <Ionicons name="cash-outline" size={22} color="#8E8E93" />
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
  </View>
);


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
    setType(item.type || null);
    setQuantity(!!item.quantity);
    setPrice(!!item.price);
  };

  const handleBeginAdd = () => {
    setIsEditing(null);
    setIsAdding(true);
    setTitle('');
    setType(null);
    setQuantity(false);
    setPrice(false);
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
    setTitle('');
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
      if (isEditing) {
        const updated = await updateQuestionType(
          isEditing.id,
          { title, type, quantity: quantity ? 1 : 0, price: price ? 1 : 0 },
          token
        );
        setQuestionTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const newQuestion = await createQuestionType(
          { foldertype_id: folderType.id, title, type, quantity: quantity ? 1 : 0, price: price ? 1 : 0 },
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
        <Text style={styles.itemDescription}>Type: {item.type}</Text>
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
            <Text style={styles.headerTitle}>Gérer les Questions pour {folderType.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.contentContainer}>
            {isAdding ? (
              <FormComponent
                isEditing={!!isEditing}
                isSubmitting={isSubmitting}
                title={title}
                type={type}
                quantity={quantity}
                price={price}
                onTitleChange={setTitle}
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
                contentContainerStyle={{ paddingBottom: 20, paddingTop: isAdding ? 0 : 16 }}
                ListEmptyComponent={
                  !isLoading ? <Text style={styles.emptyText}>Aucune question. Appuyez sur &quot;Ajouter&quot; pour en créer une.</Text> : null
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
      backgroundColor: '#F2F2F7',
      borderRadius: 10,
      paddingHorizontal: 15,
      height: 55,
      marginBottom: 15,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: '#1C1C1E',
      marginLeft: 10,
    },
    picker: {
      flex: 1,
      color: '#1C1C1E',
      marginLeft: 10,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F2F2F7',
      borderRadius: 10,
      paddingHorizontal: 15,
      paddingVertical: 10,
      marginBottom: 15,
    },
    switchTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    switchLabel: {
      fontSize: 16,
      color: '#1C1C1E',
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
