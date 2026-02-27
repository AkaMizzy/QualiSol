import API_CONFIG from "@/app/config/api";
import { useAuth } from "@/contexts/AuthContext";
import {
    Anomalie1,
    createAnomalie1,
    deleteAnomalie1,
    getAllAnomalies1,
    updateAnomalie1,
} from "@/services/anomalie1Service";
import {
    Anomalie2,
    createAnomalie2,
    deleteAnomalie2,
    getAllAnomalies2,
    updateAnomalie2,
} from "@/services/anomalie2Service";
import { createGed, Ged, getGedsBySource } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import { any } from "zod";

// ─────────────────────────────────────────────────────────────────
// ANOMALIE 1 TAB
// ─────────────────────────────────────────────────────────────────
function Anomalie1Tab() {
  const { user, token } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomalie1[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnomalie, setEditingAnomalie] = useState<Anomalie1 | null>(
    null,
  );
  const [anomalie, setAnomalie] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [anomalieImages, setAnomalieImages] = useState<Record<string, Ged[]>>(
    {},
  );
  const [modalImages, setModalImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [existingImages, setExistingImages] = useState<Ged[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAllAnomalies1(token);
      setAnomalies(data);
      const imagesMap: Record<string, Ged[]> = {};
      for (const anom of data) {
        try {
          const images = await getGedsBySource(token, anom.id, "anomalie1");
          if (images.length > 0) imagesMap[anom.id] = images;
        } catch {}
      }
      setAnomalieImages(imagesMap);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les anomalies de niveau 1");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnomalies();
  }, [fetchAnomalies]);

  const handleOpenModal = async (item?: Anomalie1) => {
    if (item) {
      setEditingAnomalie(item);
      setAnomalie(item.anomalie || "");
      if (token) {
        try {
          setExistingImages(await getGedsBySource(token, item.id, "anomalie1"));
        } catch {
          setExistingImages([]);
        }
      }
    } else {
      setEditingAnomalie(null);
      setAnomalie("");
      setExistingImages([]);
    }
    setModalImages([]);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingAnomalie(null);
    setAnomalie("");
    setModalImages([]);
    setExistingImages([]);
  };

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Autorisations requises.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0])
      setModalImages((prev) => [...prev, result.assets[0]]);
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Autorisations requises.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0)
      setModalImages((prev) => [...prev, ...result.assets]);
  }, []);

  const showImagePickerOptions = () =>
    Alert.alert("Ajouter une image", "Choisissez une option", [
      { text: "Prendre une photo", onPress: handleTakePhoto },
      { text: "Choisir depuis la galerie", onPress: handlePickFromGallery },
      { text: "Annuler", style: "cancel" },
    ]);

  const removeModalImage = (index: number) =>
    setModalImages((prev) => prev.filter((_, i) => i !== index));

  const uploadImages = async (anomalieId: string) => {
    if (!token || !user || modalImages.length === 0) return;
    const authorName =
      [user.firstname, user.lastname].filter(Boolean).join(" ") ||
      user.email ||
      "Unknown";
    for (const asset of modalImages) {
      try {
        await createGed(token, {
            idsource: anomalieId,
            kind: "anomalie1",
            title: "Image Anomalie 1",
            author: authorName,
            file: {
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                name: asset.fileName || `anomalie1_${Date.now()}.jpg`,
            },
            answer: any
        });
      } catch {}
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      let anomalieId: string;
      if (editingAnomalie) {
        await updateAnomalie1(editingAnomalie.id, { anomalie }, token);
        anomalieId = editingAnomalie.id;
      } else {
        const created = await createAnomalie1({ anomalie }, token);
        anomalieId = created.id;
      }
      if (modalImages.length > 0) {
        setUploadingImages(true);
        await uploadImages(anomalieId);
        setUploadingImages(false);
      }
      handleCloseModal();
      fetchAnomalies();
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer l'anomalie");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    Alert.alert(
      "Confirmation",
      "Voulez-vous vraiment supprimer cette anomalie ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAnomalie1(id, token);
              fetchAnomalies();
            } catch {
              Alert.alert("Erreur", "Impossible de supprimer l'anomalie");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Anomalie1 }) => {
    const images = anomalieImages[item.id] || [];
    return (
      <View style={s1.card}>
        <View style={s1.cardContent}>
          <Text style={s1.cardTitle}>{item.anomalie || "Sans anomalie"}</Text>
          {item.cpmany && <Text style={s1.cardSubtitle}>{item.cpmany}</Text>}
          <Text style={s1.cardDate}>
            {new Date(item.created_at).toLocaleDateString("fr-FR")}
          </Text>
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s1.imagesContainer}
              contentContainerStyle={s1.imagesContent}
            >
              {images.map((img) => (
                <TouchableOpacity
                  key={img.id}
                  onPress={() => {
                    setSelectedImage(`${API_CONFIG.BASE_URL}${img.url}`);
                    setImageModalVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: `${API_CONFIG.BASE_URL}${img.url}` }}
                    style={s1.thumbnail}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        <View style={s1.cardActions}>
          <TouchableOpacity
            onPress={() => handleOpenModal(item)}
            style={s1.iconButton}
          >
            <Ionicons name="pencil" size={20} color="#f87b1b" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={s1.iconButton}
          >
            <Ionicons name="trash" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading)
    return (
      <View style={s1.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={s1.loadingText}>Chargement...</Text>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <View style={s1.tabHeader}>
        <Text style={s1.tabHeaderSubtitle}>{anomalies.length} anomalie(s)</Text>
        <TouchableOpacity
          style={s1.addButton}
          onPress={() => handleOpenModal()}
        >
          <Ionicons name="add-circle" size={32} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={anomalies}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s1.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#f59e0b"]}
          />
        }
        ListEmptyComponent={
          <View style={s1.emptyContainer}>
            <Ionicons name="warning-outline" size={64} color="#d1d5db" />
            <Text style={s1.emptyText}>Aucune anomalie pour le moment</Text>
            <TouchableOpacity
              style={s1.emptyButton}
              onPress={() => handleOpenModal()}
            >
              <Text style={s1.emptyButtonText}>Créer une anomalie</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <SafeAreaView style={s1.modalContainer}>
            <View style={s1.modalHeader}>
              <Text style={s1.modalTitle}>
                {editingAnomalie ? "Modifier" : "Nouvelle"} Anomalie 1
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={s1.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={s1.inputGroup}>
                <Text style={s1.label}>Nom d'anomalie</Text>
                <TextInput
                  style={s1.input}
                  placeholder="Nom d'anomalie"
                  value={anomalie}
                  onChangeText={setAnomalie}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <View style={s1.inputGroup}>
                <Text style={s1.label}>Images</Text>
                {existingImages.length > 0 && (
                  <View style={s1.existingImagesSection}>
                    <Text style={s1.subLabel}>Images existantes</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={s1.imagesRow}
                    >
                      {existingImages.map((img) => (
                        <TouchableOpacity
                          key={img.id}
                          onPress={() => {
                            setSelectedImage(
                              `${API_CONFIG.BASE_URL}${img.url}`,
                            );
                            setImageModalVisible(true);
                          }}
                        >
                          <Image
                            source={{ uri: `${API_CONFIG.BASE_URL}${img.url}` }}
                            style={s1.modalThumbnail}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {modalImages.length > 0 && (
                  <View style={s1.newImagesSection}>
                    <Text style={s1.subLabel}>Nouvelles images</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={s1.imagesRow}
                    >
                      {modalImages.map((asset, index) => (
                        <View key={index} style={s1.newImageContainer}>
                          <Image
                            source={{ uri: asset.uri }}
                            style={s1.modalThumbnail}
                          />
                          <TouchableOpacity
                            style={s1.removeImageButton}
                            onPress={() => removeModalImage(index)}
                          >
                            <Ionicons
                              name="close-circle"
                              size={24}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <TouchableOpacity
                  style={s1.addImageButton}
                  onPress={showImagePickerOptions}
                >
                  <Ionicons name="camera-outline" size={24} color="#f59e0b" />
                  <Text style={s1.addImageButtonText}>Ajouter une image</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={s1.modalFooter}>
              <TouchableOpacity
                style={[
                  s1.submitButton,
                  (submitting || uploadingImages) && s1.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting || uploadingImages}
              >
                {submitting || uploadingImages ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={s1.submitButtonText}>
                      {uploadingImages ? "Upload..." : "Enregistrement..."}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={s1.submitButtonText}>
                      {editingAnomalie ? "Modifier" : "Créer"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={imageModalVisible} animationType="fade" transparent>
        <View style={s1.imageModalContainer}>
          <TouchableOpacity
            style={s1.imageModalBackdrop}
            onPress={() => setImageModalVisible(false)}
          />
          <View style={s1.imageModalContent}>
            {selectedImage && (
              <>
                <Image
                  source={{ uri: selectedImage }}
                  style={s1.fullImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={s1.closeImageButton}
                  onPress={() => setImageModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={36} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// ANOMALIE 2 TAB
// ─────────────────────────────────────────────────────────────────
function Anomalie2Tab() {
  const { user, token } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomalie2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnomalie, setEditingAnomalie] = useState<Anomalie2 | null>(
    null,
  );
  const [anomalie, setAnomalie] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [anomalieImages, setAnomalieImages] = useState<Record<string, Ged[]>>(
    {},
  );
  const [modalImages, setModalImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [existingImages, setExistingImages] = useState<Ged[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAllAnomalies2(token);
      setAnomalies(data);
      const imagesMap: Record<string, Ged[]> = {};
      for (const anom of data) {
        try {
          const images = await getGedsBySource(token, anom.id, "anomalie2");
          if (images.length > 0) imagesMap[anom.id] = images;
        } catch {}
      }
      setAnomalieImages(imagesMap);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les anomalies de niveau 2");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnomalies();
  }, [fetchAnomalies]);

  const handleOpenModal = async (item?: Anomalie2) => {
    if (item) {
      setEditingAnomalie(item);
      setAnomalie(item.anomalie || "");
      if (token) {
        try {
          setExistingImages(await getGedsBySource(token, item.id, "anomalie2"));
        } catch {
          setExistingImages([]);
        }
      }
    } else {
      setEditingAnomalie(null);
      setAnomalie("");
      setExistingImages([]);
    }
    setModalImages([]);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingAnomalie(null);
    setAnomalie("");
    setModalImages([]);
    setExistingImages([]);
  };

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Autorisations requises.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0])
      setModalImages((prev) => [...prev, result.assets[0]]);
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Autorisations requises.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0)
      setModalImages((prev) => [...prev, ...result.assets]);
  }, []);

  const showImagePickerOptions = () =>
    Alert.alert("Ajouter une image", "Choisissez une option", [
      { text: "Prendre une photo", onPress: handleTakePhoto },
      { text: "Choisir depuis la galerie", onPress: handlePickFromGallery },
      { text: "Annuler", style: "cancel" },
    ]);

  const removeModalImage = (index: number) =>
    setModalImages((prev) => prev.filter((_, i) => i !== index));

  const uploadImages = async (anomalieId: string) => {
    if (!token || !user || modalImages.length === 0) return;
    const authorName =
      [user.firstname, user.lastname].filter(Boolean).join(" ") ||
      user.email ||
      "Unknown";
    for (const asset of modalImages) {
      try {
        await createGed(token, {
            idsource: anomalieId,
            kind: "anomalie2",
            title: "Image Anomalie 2",
            author: authorName,
            file: {
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                name: asset.fileName || `anomalie2_${Date.now()}.jpg`,
            },
            answer: any
        });
      } catch {}
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      let anomalieId: string;
      if (editingAnomalie) {
        await updateAnomalie2(editingAnomalie.id, { anomalie }, token);
        anomalieId = editingAnomalie.id;
      } else {
        const created = await createAnomalie2({ anomalie }, token);
        anomalieId = created.id;
      }
      if (modalImages.length > 0) {
        setUploadingImages(true);
        await uploadImages(anomalieId);
        setUploadingImages(false);
      }
      handleCloseModal();
      fetchAnomalies();
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer l'anomalie");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    Alert.alert(
      "Confirmation",
      "Voulez-vous vraiment supprimer cette anomalie ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAnomalie2(id, token);
              fetchAnomalies();
            } catch {
              Alert.alert("Erreur", "Impossible de supprimer l'anomalie");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Anomalie2 }) => {
    const images = anomalieImages[item.id] || [];
    return (
      <View style={s2.card}>
        <View style={s2.cardContent}>
          <Text style={s2.cardTitle}>
            {item.anomalie || "Sans description"}
          </Text>
          {item.cpmany && <Text style={s2.cardSubtitle}>{item.cpmany}</Text>}
          <Text style={s2.cardDate}>
            {new Date(item.created_at).toLocaleDateString("fr-FR")}
          </Text>
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s2.imagesContainer}
              contentContainerStyle={s2.imagesContent}
            >
              {images.map((img) => (
                <TouchableOpacity
                  key={img.id}
                  onPress={() => {
                    setSelectedImage(`${API_CONFIG.BASE_URL}${img.url}`);
                    setImageModalVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: `${API_CONFIG.BASE_URL}${img.url}` }}
                    style={s2.thumbnail}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        <View style={s2.cardActions}>
          <TouchableOpacity
            onPress={() => handleOpenModal(item)}
            style={s2.iconButton}
          >
            <Ionicons name="pencil" size={20} color="#f87b1b" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={s2.iconButton}
          >
            <Ionicons name="trash" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading)
    return (
      <View style={s2.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={s2.loadingText}>Chargement...</Text>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <View style={s2.tabHeader}>
        <Text style={s2.tabHeaderSubtitle}>{anomalies.length} anomalie(s)</Text>
        <TouchableOpacity
          style={s2.addButton}
          onPress={() => handleOpenModal()}
        >
          <Ionicons name="add-circle" size={32} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={anomalies}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s2.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#ef4444"]}
          />
        }
        ListEmptyComponent={
          <View style={s2.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#d1d5db" />
            <Text style={s2.emptyText}>Aucune anomalie pour le moment</Text>
            <TouchableOpacity
              style={s2.emptyButton}
              onPress={() => handleOpenModal()}
            >
              <Text style={s2.emptyButtonText}>Créer une anomalie</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <SafeAreaView style={s2.modalContainer}>
            <View style={s2.modalHeader}>
              <Text style={s2.modalTitle}>
                {editingAnomalie ? "Modifier" : "Nouvelle"} Anomalie 2
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={s2.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={s2.inputGroup}>
                <Text style={s2.label}>Nom d'anomalie</Text>
                <TextInput
                  style={s2.input}
                  placeholder="Nom d'anomalie"
                  value={anomalie}
                  onChangeText={setAnomalie}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <View style={s2.inputGroup}>
                <Text style={s2.label}>Images</Text>
                {existingImages.length > 0 && (
                  <View style={s2.existingImagesSection}>
                    <Text style={s2.subLabel}>Images existantes</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={s2.imagesRow}
                    >
                      {existingImages.map((img) => (
                        <TouchableOpacity
                          key={img.id}
                          onPress={() => {
                            setSelectedImage(
                              `${API_CONFIG.BASE_URL}${img.url}`,
                            );
                            setImageModalVisible(true);
                          }}
                        >
                          <Image
                            source={{ uri: `${API_CONFIG.BASE_URL}${img.url}` }}
                            style={s2.modalThumbnail}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {modalImages.length > 0 && (
                  <View style={s2.newImagesSection}>
                    <Text style={s2.subLabel}>Nouvelles images</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={s2.imagesRow}
                    >
                      {modalImages.map((asset, index) => (
                        <View key={index} style={s2.newImageContainer}>
                          <Image
                            source={{ uri: asset.uri }}
                            style={s2.modalThumbnail}
                          />
                          <TouchableOpacity
                            style={s2.removeImageButton}
                            onPress={() => removeModalImage(index)}
                          >
                            <Ionicons
                              name="close-circle"
                              size={24}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <TouchableOpacity
                  style={s2.addImageButton}
                  onPress={showImagePickerOptions}
                >
                  <Ionicons name="camera-outline" size={24} color="#ef4444" />
                  <Text style={s2.addImageButtonText}>Ajouter une image</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={s2.modalFooter}>
              <TouchableOpacity
                style={[
                  s2.submitButton,
                  (submitting || uploadingImages) && s2.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting || uploadingImages}
              >
                {submitting || uploadingImages ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={s2.submitButtonText}>
                      {uploadingImages ? "Upload..." : "Enregistrement..."}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={s2.submitButtonText}>
                      {editingAnomalie ? "Modifier" : "Créer"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={imageModalVisible} animationType="fade" transparent>
        <View style={s2.imageModalContainer}>
          <TouchableOpacity
            style={s2.imageModalBackdrop}
            onPress={() => setImageModalVisible(false)}
          />
          <View style={s2.imageModalContent}>
            {selectedImage && (
              <>
                <Image
                  source={{ uri: selectedImage }}
                  style={s2.fullImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={s2.closeImageButton}
                  onPress={() => setImageModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={36} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function AnomaliesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<1 | 2>(1);

  React.useEffect(() => {
    if (user && !["Super Admin", "Admin"].includes(user.role)) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || !["Super Admin", "Admin"].includes(user.role)) return null;

  return (
    <SafeAreaView style={ss.container}>
      <AppHeader user={user || undefined} />

      {/* Page header */}
      <View style={ss.pageHeader}>
        <Text style={ss.pageTitle}>Anomalies</Text>
      </View>

      {/* Tab switcher */}
      <View style={ss.tabBar}>
        <Pressable
          style={[ss.tab, activeTab === 1 && ss.tab1Active]}
          onPress={() => setActiveTab(1)}
        >
          <Ionicons
            name="warning-outline"
            size={16}
            color={activeTab === 1 ? "#fff" : "#f59e0b"}
          />
          <Text style={[ss.tabText, activeTab === 1 && ss.tab1ActiveText]}>
            Anomalie 1
          </Text>
        </Pressable>
        <Pressable
          style={[ss.tab, activeTab === 2 && ss.tab2Active]}
          onPress={() => setActiveTab(2)}
        >
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={activeTab === 2 ? "#fff" : "#ef4444"}
          />
          <Text style={[ss.tabText, activeTab === 2 && ss.tab2ActiveText]}>
            Anomalie 2
          </Text>
        </Pressable>
      </View>

      {/* Active tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 1 ? <Anomalie1Tab /> : <Anomalie2Tab />}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHARED TAB BAR STYLES
// ─────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#11224e" },
  tabBar: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  tab1Active: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  tab2Active: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  tab1ActiveText: { color: "#fff" },
  tab2ActiveText: { color: "#fff" },
});

// ─────────────────────────────────────────────────────────────────
// ANOMALIE 1 STYLES
// ─────────────────────────────────────────────────────────────────
const s1 = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6b7280" },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tabHeaderSubtitle: { fontSize: 14, color: "#6b7280" },
  addButton: { padding: 4 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f59e0b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11224e",
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  cardDate: { fontSize: 12, color: "#9ca3af" },
  cardActions: {
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  iconButton: { padding: 8, borderRadius: 8, backgroundColor: "#f3f4f6" },
  imagesContainer: { marginTop: 12 },
  imagesContent: { gap: 8 },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: "#f8fafc" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#11224e" },
  modalContent: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  subLabel: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#11224e",
    minHeight: 100,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  submitButton: {
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonDisabled: { backgroundColor: "#d1d5db" },
  submitButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  existingImagesSection: { marginBottom: 12 },
  newImagesSection: { marginBottom: 12 },
  imagesRow: { flexDirection: "row" },
  modalThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginRight: 8,
  },
  newImageContainer: { position: "relative", marginRight: 8 },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "#f59e0b",
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#fffbeb",
  },
  addImageButtonText: { color: "#f59e0b", fontSize: 16, fontWeight: "600" },
  imageModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalBackdrop: { ...StyleSheet.absoluteFillObject },
  imageModalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "90%", height: "80%" },
  closeImageButton: { position: "absolute", top: 60, right: 20 },
});

// ─────────────────────────────────────────────────────────────────
// ANOMALIE 2 STYLES
// ─────────────────────────────────────────────────────────────────
const s2 = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6b7280" },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tabHeaderSubtitle: { fontSize: 14, color: "#6b7280" },
  addButton: { padding: 4 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ef4444",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11224e",
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  cardDate: { fontSize: 12, color: "#9ca3af" },
  cardActions: {
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  iconButton: { padding: 8, borderRadius: 8, backgroundColor: "#f3f4f6" },
  imagesContainer: { marginTop: 12 },
  imagesContent: { gap: 8 },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: "#f8fafc" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#11224e" },
  modalContent: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  subLabel: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#11224e",
    minHeight: 100,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  submitButton: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonDisabled: { backgroundColor: "#d1d5db" },
  submitButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  existingImagesSection: { marginBottom: 12 },
  newImagesSection: { marginBottom: 12 },
  imagesRow: { flexDirection: "row" },
  modalThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginRight: 8,
  },
  newImageContainer: { position: "relative", marginRight: 8 },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "#ef4444",
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  addImageButtonText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
  imageModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalBackdrop: { ...StyleSheet.absoluteFillObject },
  imageModalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "90%", height: "80%" },
  closeImageButton: { position: "absolute", top: 60, right: 20 },
});
