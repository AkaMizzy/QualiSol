import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  bulkImportQuestionTypes,
  createQuestionType,
  deleteQuestionType,
  getQuestionTypesByFolder,
  QuestionType,
  updateQuestionType,
  updateQuestionTypesOrder,
} from "@/services/questionTypeService";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
// Removed react-native-safe-area-context import as we use native SafeAreaView// Form Component
type FormComponentProps = {
  visible: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  title: string;
  description: string;
  type: QuestionType["type"] | null;
  quantity: boolean;
  price: boolean;
  listItems: string[];
  listPendingValue: string;
  bloc: string;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onBlocChange: (text: string) => void;
  onTypeChange: (type: QuestionType["type"] | null) => void;
  onQuantityChange: (value: boolean) => void;
  onPriceChange: (value: boolean) => void;
  onListItemsChange: (items: string[]) => void;
  onListPendingValueChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

const FormComponent = ({
  visible,
  isEditing,
  isSubmitting,
  title,
  description,
  type,
  quantity,
  price,
  listItems,
  listPendingValue,
  bloc,
  onTitleChange,
  onDescriptionChange,
  onBlocChange,
  onTypeChange,
  onQuantityChange,
  onPriceChange,
  onListItemsChange,
  onListPendingValueChange,
  onSubmit,
  onCancel,
}: FormComponentProps) => {
  const [isPickerVisible, setPickerVisible] = useState(false);
  // newListValue is now controlled by the parent via listPendingValue / onListPendingValueChange
  const typeOptions = [
    { label: "Oui / Non", value: "boolean" },
    { label: "Date", value: "date" },
    { label: "Fichier", value: "file" },
    { label: "GPS", value: "GPS" },
    { label: "Liste", value: "list" },
    { label: "Nombre", value: "number" },
    { label: "Photo", value: "photo" },
    { label: "Taux", value: "taux" },
    { label: "Texte", value: "text" },
    { label: "Texte long", value: "long_text" },
    { label: "Vidéo", value: "  " },
    { label: "Voix", value: "voice" },
  ].sort((a, b) => a.label.localeCompare(b.label));

  const selectedLabel = type
    ? typeOptions.find((opt) => opt.value === type)?.label
    : "Type de question...";

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {isEditing ? "Modifier la question" : "Nouvelle question"}
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons name="folder-open-outline" size={20} color="#f87b1b" />
                <TextInput
                  placeholder="Titre du bloc (optionnel)"
                  placeholderTextColor="#f87b1b"
                  value={bloc}
                  onChangeText={onBlocChange}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="text-outline" size={20} color="#f87b1b" />
                <TextInput
                  placeholder="la question"
                  placeholderTextColor="#f87b1b"
                  value={title}
                  onChangeText={onTitleChange}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              

              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setPickerVisible(true)}
              >
                <Ionicons name="options-outline" size={20} color="#f87b1b" />
                <Text style={[styles.input, !type && { color: "#f87b1b" }]}>
                  {selectedLabel}
                </Text>
                <Ionicons
                  name="chevron-down-outline"
                  size={20}
                  color="#f87b1b"
                />
              </TouchableOpacity>

               {/* List Values Editor — only shown when type is "list" */}
              {type === "list" && (
                <View style={styles.listEditorContainer}>
                  <View style={styles.listEditorHeader}>
                    <Ionicons name="list-outline" size={18} color="#f87b1b" />
                    <Text style={styles.listEditorTitle}>Valeurs de la liste</Text>
                  </View>

                  {listItems.map((item, index) => (
                    <View key={index} style={styles.listEditorRow}>
                      <TextInput
                        style={styles.listEditorInput}
                        value={item}
                        onChangeText={(text) => {
                          const updated = [...listItems];
                          updated[index] = text;
                          onListItemsChange(updated);
                        }}
                        placeholder={`Option ${index + 1}`}
                        placeholderTextColor="#aaa"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          onListItemsChange(listItems.filter((_, i) => i !== index))
                        }
                        style={styles.listEditorDeleteBtn}
                      >
                        <Ionicons name="close-circle" size={22} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={styles.listEditorAddRow}>
                    <TextInput
                      style={styles.listEditorInput}
                      value={listPendingValue}
                      onChangeText={onListPendingValueChange}
                      placeholder="Nouvelle valeur..."
                      placeholderTextColor="#aaa"
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        const v = listPendingValue.trim();
                        if (v) {
                          onListItemsChange([...listItems, v]);
                          onListPendingValueChange("");
                        }
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const v = listPendingValue.trim();
                        if (v) {
                          onListItemsChange([...listItems, v]);
                          onListPendingValueChange("");
                          Keyboard.dismiss();
                        }
                      }}
                      style={styles.listEditorAddBtn}
                    >
                      <Ionicons name="add-circle" size={22} color="#f87b1b" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Ionicons name="server-outline" size={20} color="#f87b1b" />
                  <Text style={styles.switchLabel}>Activer la quantité</Text>
                </View>
                <Switch
                  trackColor={{ false: "#767577", true: "#f87b1b" }}
                  thumbColor={quantity ? "#ffffff" : "#f4f3f4"}
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
                  trackColor={{ false: "#767577", true: "#f87b1b" }}
                  thumbColor={price ? "#ffffff" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                  value={price}
                  onValueChange={onPriceChange}
                />
              </View>

              <View
                style={[
                  styles.inputContainer,
                  { height: 100, alignItems: "flex-start", paddingTop: 15 },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#f87b1b"
                />
                <TextInput
                  placeholder="Description (optionnel)"
                  placeholderTextColor="#f87b1b"
                  value={description}
                  onChangeText={onDescriptionChange}
                  style={[styles.input, { height: "100%" }]}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  onPress={onCancel}
                  style={[styles.button, styles.cancelButton]}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSubmit}
                  style={[styles.button, styles.submitButton]}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isEditing ? "Enregistrer" : "Créer"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {visible && isPickerVisible && (
        <Modal
          transparent
          visible={isPickerVisible}
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.pickerModalOverlay}
            activeOpacity={1}
            onPressOut={() => setPickerVisible(false)}
          >
            <View style={styles.pickerModalContainer}>
              <FlatList
                data={typeOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      onTypeChange(item.value as QuestionType["type"]);
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
      )}
    </>
  );
};

// Helper: Sort group elements by their bloc, then by order, then by creation date (oldest first)
const sortQuestions = (questions: QuestionType[]) => {
  return [...questions].sort((a, b) => {
    const blocA = (a.bloc || "").trim().toLowerCase();
    const blocB = (b.bloc || "").trim().toLowerCase();
    
    // Group by bloc, pushing empty ones to the bottom
    if (!blocA && blocB) return 1;
    if (blocA && !blocB) return -1;
    if (blocA !== blocB) return blocA.localeCompare(blocB);

    // Then prioritize custom user ordering if defined
    const hasOrderA = a.order != null;
    const hasOrderB = b.order != null;

    if (hasOrderA && !hasOrderB) return -1; // A has order, B doesn't -> A top
    if (!hasOrderA && hasOrderB) return 1;  // B has order, A doesn't -> B top
    
    // If both have order and they differ, use order
    if (hasOrderA && hasOrderB && a.order !== b.order) {
      return a.order! - b.order!;
    }

    // Otherwise strictly chronological (first created is top)
    const dateA = a.created_at || "";
    const dateB = b.created_at || "";
    return dateA.localeCompare(dateB);
  });
};

type Props = {
  visible: boolean;
  onClose: () => void;
  folderType: { id: string; title: string };
};

export default function QuestionTypeManagerModal({
  visible,
  onClose,
  folderType,
}: Props) {
  const { token, user } = useAuth();
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<QuestionType | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bloc, setBloc] = useState("");
  const [type, setType] = useState<QuestionType["type"] | null>("boolean");
  const [quantity, setQuantity] = useState(false);
  const [price, setPrice] = useState(false);
  const [listItems, setListItems] = useState<string[]>([]);
  const [listPendingValue, setListPendingValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const fetchQuestionTypes = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const types = await getQuestionTypesByFolder(folderType.id, token);
      setQuestionTypes(sortQuestions(types));
    } catch (error) {
      console.error("Failed to fetch question types:", error);
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
    setDescription(item.description || "");
    setBloc(item.bloc || "");
    setType(item.type || null);
    setQuantity(!!item.quantity);
    setPrice(!!item.price);
    // Parse list items from mask (comma-separated) if type is list
    if (item.type === "list" && item.mask) {
      const parsed = item.mask
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      setListItems(parsed);
    } else {
      setListItems([]);
    }
  };

  const handleBeginAdd = () => {
    setIsEditing(null);
    setIsAdding(true);
    setTitle("");
    setDescription("");
    setType("boolean");
    setQuantity(false);
    setPrice(false);
    setListItems([]);
    setListPendingValue("");
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
    setTitle("");
    setDescription("");
    setType("boolean");
    setQuantity(false);
    setPrice(false);
    setListItems([]);
    setListPendingValue("");
  };

  const handleSubmit = async () => {
    if (!token || !title.trim() || !type) {
      Alert.alert(
        "Champs obligatoires",
        "Veuillez renseigner un titre et un type pour la question.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
        // Build final list — include any unsaved pending text input
        const pendingTrimmed = listPendingValue.trim();
        const finalListItems =
          pendingTrimmed && !listItems.includes(pendingTrimmed)
            ? [...listItems, pendingTrimmed]
            : listItems;

        const questionData = {
          title,
          description: description.trim() ? description : undefined,
          bloc: bloc.trim() ? bloc : undefined,
          type,
          quantity: quantity ? 1 : 0,
          price: price ? 1 : 0,
          mask:
            type === "list" && finalListItems.length > 0
              ? finalListItems.join(",")
              : undefined,
        };

      if (isEditing) {
        const updated = await updateQuestionType(
          isEditing.id,
          questionData,
          token,
        );
        setQuestionTypes((prev) =>
          sortQuestions(prev.map((t) => (t.id === updated.id ? updated : t))),
        );
      } else {
        const newQuestion = await createQuestionType(
          { ...questionData, foldertype_id: folderType.id },
          token,
        );
        // Append at the bottom and resort logically
        setQuestionTypes((prev) => sortQuestions([...prev, newQuestion]));
      }
      handleCancel();
    } catch (error) {
      console.error(
        `Failed to ${isEditing ? "update" : "create"} question type:`,
        error,
      );
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
      console.error("Failed to delete question type:", error);
    }
  };

  const handleDragEnd = async ({ data }: { data: QuestionType[] }) => {
    // 1. Optimistic update
    setQuestionTypes(data);

    if (!token) return;

    // 2. Map new order to payload
    const updates = data.map((item, index) => ({
      id: item.id,
      order: index,
    }));

    setIsReordering(true);
    try {
      await updateQuestionTypesOrder(token, updates);
      // Optional: you could re-fetch here to ensure absolute sync, but optimistic should be fine
    } catch (error) {
      console.error("Failed to update question types order:", error);
      Alert.alert(
        "Erreur",
        "Impossible de sauvegarder le nouvel ordre des questions.",
      );
      // Revert if needed by refetching
      fetchQuestionTypes();
    } finally {
      setIsReordering(false);
    }
  };

  const handleImport = async () => {
    if (!token) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          "application/vnd.ms-excel", // .xls
          "text/csv", // .csv
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setIsImporting(true);
      const file = result.assets[0];

      const response = await bulkImportQuestionTypes(
        folderType.id,
        file,
        token,
      );

      Alert.alert("Succès", response.message || "Importation réussie");

      // Refresh list
      fetchQuestionTypes();
    } catch (error: any) {
      console.error("Import failed:", error);
      Alert.alert(
        "Erreur",
        error.response?.data?.error ||
          "Échec de l'importation. Vérifiez le fichier.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const renderItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<QuestionType>) => {
    const index = getIndex() || 0;
    const isFirstOfBloc = index === 0 || questionTypes[index - 1]?.bloc !== item.bloc;

    return (
      <>
        {isFirstOfBloc && (
          <View style={styles.blocGroupHeader}>
            <Text style={styles.blocGroupHeaderText}>
              {item.bloc ? item.bloc.toUpperCase() : "SANS BLOC"}
            </Text>
          </View>
        )}
        <ScaleDecorator>
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={drag}
            disabled={isActive}
            style={[
              styles.itemCard,
              isActive && {
                backgroundColor: "#f3f4f6",
                elevation: 5,
                shadowOpacity: 0.2,
              },
            ]}
          >
        <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
          <Ionicons name="reorder-two" size={24} color="#9ca3af" />
        </TouchableOpacity>
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text
            style={[
              styles.itemDescription,
              { fontStyle: "italic", marginTop: 4 },
            ]}
          >
            Type: {item.type} {item.bloc ? ` • Bloc: ${item.bloc}` : ""}
          </Text>
        </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              onPress={() => handleBeginEdit(item)}
              style={styles.iconButton}
            >
              <Ionicons name="pencil" size={20} color="#11224e" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.iconButton}
            >
              <Ionicons name="trash" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    </>
  );
};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#f8fafc" }} // Add background color to cover status bar area
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={styles.container}>
          <AppHeader
            user={user || undefined}
            showNotifications={false}
            showProfile={true}
            onLogoPress={onClose}
          />
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>
              Gérer les Questions pour {folderType.title}
            </Text>
          </View>
          <View style={styles.contentContainer}>
            <FormComponent
              visible={isAdding}
              isEditing={!!isEditing}
              isSubmitting={isSubmitting}
              title={title}
              description={description}
              type={type}
              quantity={quantity}
              price={price}
              listItems={listItems}
              listPendingValue={listPendingValue}
              bloc={bloc}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onBlocChange={setBloc}
              onTypeChange={setType}
              onQuantityChange={setQuantity}
              onPriceChange={setPrice}
              onListItemsChange={setListItems}
              onListPendingValueChange={setListPendingValue}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={handleBeginAdd}
                style={[styles.addButton, { flex: 1, marginTop: 0 }]}
              >
                <Ionicons name="add" size={22} color="#f87b1b" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleImport}
                style={[
                  styles.addButton,
                  { flex: 1, marginTop: 0, borderColor: "#11224e" },
                ]}
                disabled={isImporting}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color="#11224e" />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={22}
                      color="#11224e"
                    />
                    {/* <Text style={[styles.addButtonText, { color: "#11224e" }]}>
                      Importer Excel
                    </Text> */}
                  </>
                )}
              </TouchableOpacity>
            </View>

            {isLoading && !isAdding ? (
              <ActivityIndicator
                style={{ marginTop: 20 }}
                color="#11224e"
                size="large"
              />
            ) : (
              <View style={{ flex: 1, minHeight: 200 }}>
                {isReordering && (
                  <ActivityIndicator
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      zIndex: 10,
                    }}
                    color="#f87b1b"
                    size="small"
                  />
                )}
                <DraggableFlatList
                  data={questionTypes}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  onDragEnd={handleDragEnd}
                  contentContainerStyle={{
                    paddingTop: isAdding ? 0 : 16,
                    paddingBottom: 100,
                  }}
                  ListEmptyComponent={
                    !isLoading ? (
                      <Text style={styles.emptyText}>
                        Aucune question. Appuyez sur &quot;Ajouter&quot; pour en
                        créer une.
                      </Text>
                    ) : null
                  }
                />
              </View>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerTitleRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#11224e",
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f87b1b",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#11224e",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#11224e",
    marginLeft: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  switchTextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 16,
    color: "#11224e",
    marginLeft: 10,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#f87b1b",
  },
  cancelButton: {
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#1C1C1E",
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModalContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    width: "80%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  pickerItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f87b1b",
  },
  pickerItemText: {
    fontSize: 16,
    color: "#11224e",
  },
  itemCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: "#f87b1b",
  },
  dragHandle: {
    paddingRight: 12,
    justifyContent: "center",
  },
  itemTextContainer: { flex: 1, marginRight: 16 },
  itemTitle: { fontSize: 16, fontWeight: "600", color: "#11224e" },
  itemDescription: { color: "#6b7280", marginTop: 4, fontSize: 14 },
  itemActions: { flexDirection: "row", gap: 8 },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 48,
    color: "#6b7280",
    fontSize: 16,
    paddingHorizontal: 20,
  },
  // List editor styles
  listEditorContainer: {
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#fffaf5",
  },
  listEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  listEditorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f87b1b",
  },
  listEditorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  listEditorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#11224e",
    backgroundColor: "#fff",
  },
  listEditorDeleteBtn: {
    padding: 2,
  },
  listEditorAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
  },
  listEditorAddBtn: {
    padding: 2,
  },
  blocGroupHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f87b1b",
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  blocGroupHeaderText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
});
