import VoiceNoteRecorder from "@/components/VoiceNoteRecorder";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Anomalie1, getAllAnomalies1 } from "@/services/anomalie1Service";
import { Anomalie2, getAllAnomalies2 } from "@/services/anomalie2Service";
import companyService from "@/services/companyService";
import { getConnectivity } from "@/services/connectivity";
import {
  combineTextDescription,
  describeImage,
  getAllGeds,
} from "@/services/gedService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import CustomAlert from "../CustomAlert";

interface AddImageModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (
    data: {
      title: string;
      description: string;
      image: ImagePicker.ImagePickerAsset | null;
      voiceNote: { uri: string; type: string; name: string } | null;
      author: string;
      latitude: number | null;
      longitude: number | null;
      level: number;
      type: string | null;
      categorie: string | null;
      audiotxt?: string;
      iatxt?: string;
    },
    shouldClose: boolean,
  ) => void;
  openCameraOnShow?: boolean;
}

export default function AddImageModal({
  visible,
  onClose,
  onAdd,
  openCameraOnShow = false,
}: AddImageModalProps) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [voiceNote, setVoiceNote] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [audioText, setAudioText] = useState<string>("");
  const [iaText, setIaText] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [level, setLevel] = useState(5);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(
    null,
  );
  const [severitySliderWidth, setSeveritySliderWidth] = useState(0);
  const prevVisibleRef = useRef(visible);
  const [alertInfo, setAlertInfo] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
    buttons?: any[];
  }>({ visible: false, title: "", message: "", type: "success" });

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);

  // Storage quota state
  const [currentStorageGB, setCurrentStorageGB] = useState(0);
  const [storageQuotaGB, setStorageQuotaGB] = useState(0);
  const [isStorageQuotaReached, setIsStorageQuotaReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">(
    "online",
  );

  const [isCombiningText, setIsCombiningText] = useState(false);

  const handleCombineText = async () => {
    if (!audioText && !iaText) {
      setAlertInfo({
        visible: true,
        title: "Avertissement",
        message: "Au moins une source de texte (Audio ou IA) est nécessaire.",
        type: "error",
      });
      return;
    }

    if (!token) return;

    setIsCombiningText(true);
    try {
      const combinedDescription = await combineTextDescription(
        token,
        audioText,
        iaText,
      );
      setDescription(combinedDescription);
      setAlertInfo({
        visible: true,
        title: "Succès",
        message: "Description combinée générée avec succès !",
        type: "success",
      });
    } catch (error: any) {
      console.error("Combine text error:", error);
      setAlertInfo({
        visible: true,
        title: "Erreur",
        message:
          error.message ||
          "Impossible de combiner les textes. Veuillez réessayer.",
        type: "error",
      });
    } finally {
      setIsCombiningText(false);
    }
  };
  const [anomalieTypes, setAnomalieTypes] = useState<Anomalie1[]>([]);
  const [anomalieCategories, setAnomalieCategories] = useState<Anomalie2[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);

  // Fetch anomalie types and categories dynamically
  useEffect(() => {
    async function loadAnomalies() {
      if (!token) return;
      setLoadingAnomalies(true);
      try {
        const [types, categories] = await Promise.all([
          getAllAnomalies1(token),
          getAllAnomalies2(token),
        ]);
        setAnomalieTypes(types);
        setAnomalieCategories(categories);
      } catch (e) {
        console.error("Failed to load anomalies", e);
      } finally {
        setLoadingAnomalies(false);
      }
    }
    loadAnomalies();
  }, [token, visible]);
  const handleGenerateDescription = useCallback(
    async (photoToDescribe: ImagePicker.ImagePickerAsset) => {
      if (!photoToDescribe || !token) {
        return;
      }
      setIsGeneratingDescription(true);
      try {
        const photoFile = {
          uri: photoToDescribe.uri,
          name:
            photoToDescribe.fileName ||
            photoToDescribe.uri.split("/").pop() ||
            "photo.jpg",
          type: photoToDescribe.type || "image/jpeg",
        };
        const description = await describeImage(token, photoFile);
        // Store AI description in separate field
        setIaText(description);
        // Optionnaly append to description if you want user to see it, but user requested to separate it.
        // So checking user request: "output shouldnt again be in description but in the aitext"
        // So we do NOT append to description.
      } catch (e: any) {
        console.error("Failed to generate description:", e);
      } finally {
        setIsGeneratingDescription(false);
      }
    },
    [token],
  );

  const handleRecordingComplete = useCallback((uri: string | null) => {
    if (uri) {
      const voiceNoteData = {
        uri,
        type: "audio/m4a",
        name: `voicenote-${Date.now()}.m4a`,
      };
      setVoiceNote(voiceNoteData);
      // Automatically transcribe the audio
      // handleTranscribeAudio(uri, 'audio/m4a');
    } else {
      setVoiceNote(null);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Désolé, nous avons besoin des autorisations de l'appareil photo pour que cela fonctionne !",
      );
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedAsset = result.assets[0];

      // Check file size for videos (limit 50MB)
      if (
        selectedAsset.type === "video" &&
        selectedAsset.fileSize &&
        selectedAsset.fileSize > 50 * 1024 * 1024
      ) {
        Alert.alert(
          "Fichier trop volumineux",
          "La taille de la vidéo ne doit pas dépasser 50 Mo.",
        );
        return;
      }

      setImage(selectedAsset);
      if (selectedAsset.type !== "video") {
        handleGenerateDescription(selectedAsset);
      }
    }
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Désolé, nous avons besoin des autorisations de la galerie pour que cela fonctionne !",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedAsset = result.assets[0];

      // Check file size for videos (limit 50MB)
      if (
        selectedAsset.type === "video" &&
        selectedAsset.fileSize &&
        selectedAsset.fileSize > 50 * 1024 * 1024
      ) {
        Alert.alert(
          "Fichier trop volumineux",
          "La taille de la vidéo ne doit pas dépasser 50 Mo.",
        );
        return;
      }

      setImage(selectedAsset);
      if (selectedAsset.type !== "video") {
        // handleGenerateDescription logic if auto-generation is desired for gallery picks too
      }
    }
  }, []);

  const showImagePickerOptions = useCallback(() => {
    Alert.alert(
      "Choisir une image",
      "Voulez-vous prendre une nouvelle photo ou en choisir une depuis votre galerie ?",
      [
        {
          text: "Prendre une photo",
          onPress: handleTakePhoto,
        },
        {
          text: "Choisir depuis la galerie",
          onPress: handlePickFromGallery,
        },
        {
          text: "Annuler",
          style: "cancel",
        },
      ],
    );
  }, [handleTakePhoto, handlePickFromGallery]);

  useEffect(() => {
    const prevVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !prevVisible && openCameraOnShow) {
      // Modal just opened, trigger camera with a delay
      const timer = setTimeout(() => {
        showImagePickerOptions();
      }, 400);

      return () => clearTimeout(timer);
    } else if (!visible && prevVisible) {
      // Modal just closed, reset form
      setTitle("");
      setDescription("");
      setImage(null);
      setVoiceNote(null);
      setAudioText("");
      setIaText("");
      setLatitude(null);
      setLongitude(null);
      setIsGeneratingDescription(false);
      setLevel(5);
      setSelectedType(null);
    }
  }, [visible, showImagePickerOptions, openCameraOnShow]);

  useEffect(() => {
    const fetchLimitInfo = async () => {
      try {
        setLoadingLimits(true);
        if (!token) return;

        const [company, geds] = await Promise.all([
          companyService.getCompany(),
          getAllGeds(token),
        ]);

        setCompanyInfo(company);

        // Calculate storage quota
        const storageUsedGB = company.nbimagetake || 0;
        const storageQuotaGB = company.sizeimages || 1; // Quota in GB

        setCurrentStorageGB(storageUsedGB);
        setStorageQuotaGB(storageQuotaGB);
        setIsStorageQuotaReached(storageUsedGB >= storageQuotaGB);
      } catch (error) {
        console.error("Error fetching limit info:", error);
      } finally {
        setLoadingLimits(false);
      }
    };

    if (visible) {
      fetchLimitInfo();
    }
  }, [visible, token]);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied.");
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
      } catch (error) {
        console.warn("Could not fetch location automatically.", error);
      }
    };
    if (visible) {
      fetchLocation();
    }
  }, [visible]);

  // Check network status when modal opens
  useEffect(() => {
    const checkNetwork = async () => {
      const connectivity = await getConnectivity();
      setNetworkStatus(connectivity.status);
    };
    if (visible) {
      checkNetwork();
      // Recheck periodically while modal is open
      const interval = setInterval(checkNetwork, 10000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  const onSeverityPan = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (severitySliderWidth <= 0) return;
      const x = event.nativeEvent.x;
      const newLevel = Math.max(
        0,
        Math.min(10, Math.round((x / severitySliderWidth) * 10)),
      );
      setLevel((prevLevel) => {
        if (newLevel !== prevLevel) {
          return newLevel;
        }
        return prevLevel;
      });
    },
    [severitySliderWidth],
  );

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return "#FF3B30"; // High - Red
    if (severity >= 5) return "#FF9500"; // Medium - Orange
    return "#34C759"; // Low - Green
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 7) return "Haute";
    if (severity >= 5) return "Moyenne";
    return "Basse";
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImage(null);
    setImage(null);
    setVoiceNote(null);
    setAudioText("");
    setLevel(5);
    setSelectedType(null);
    setSelectedCategorie(null);
  };

  const handleAdd = (shouldClose: boolean) => {
    if (!image) {
      Alert.alert("Informations manquantes", "Veuillez fournir une image.");
      return;
    }

    if (isStorageQuotaReached) {
      Alert.alert(
        "Quota de stockage dépassé",
        `Vous avez atteint votre quota de stockage de ${storageQuotaGB.toFixed(2)}GB. Utilisation actuelle: ${currentStorageGB.toFixed(2)}GB. Veuillez mettre à niveau votre plan.`,
      );
      return;
    }

    let authorName = "Unknown User";

    if (token) {
      try {
        const payload = token.split(".")[1];
        if (payload) {
          let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
          while (base64.length % 4) {
            base64 += "=";
          }
          const decodedString = atob(base64);
          const decodedPayload = JSON.parse(decodedString);
          if (decodedPayload.username) {
            authorName = decodedPayload.username;
          } else if (decodedPayload.email) {
            authorName = decodedPayload.email;
          } else if (decodedPayload.identifier) {
            authorName = decodedPayload.identifier;
          }
        }
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }

    if (authorName === "Unknown User" && user) {
      const name = [user.firstname, user.lastname]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (name) {
        authorName = name;
      } else if (user.email) {
        authorName = user.email;
      }
    }

    onAdd(
      {
        title,
        description,
        image,
        voiceNote,
        author: authorName,
        latitude,
        longitude,
        level,
        type: selectedType,
        categorie: selectedCategorie,
        audiotxt: audioText,
        iatxt: iaText,
      },
      shouldClose,
    );

    // Show success alert asking if user wants to continue
    setAlertInfo({
      visible: true,
      title: "Enregistré",
      message:
        "La photo a été enregistrée avec succès. Voulez-vous en ajouter une autre ?",
      type: "success",
      buttons: [
        {
          text: "Non, Arrêter",
          onPress: onClose,
          style: "destructive",
        },
        {
          text: "Oui",
          onPress: () => {
            resetForm();
            showImagePickerOptions();
          },
          style: "primary",
        },
      ],
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
          <View style={styles.modalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color={COLORS.secondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                  Ajouter une nouvelle image
                </Text>
                {/* Network Status Indicator - only show when offline */}
                {networkStatus === "offline" && (
                  <View style={styles.networkStatusBadge}>
                    <Ionicons
                      name="wifi-outline"
                      size={12}
                      color={COLORS.white}
                    />
                    <Text style={styles.networkStatusText}>Hors ligne</Text>
                  </View>
                )}
              </View>

              {/* Network Info Message */}
              {networkStatus === "offline" && (
                <View style={styles.offlineInfoBanner}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#0369a1"
                  />
                  <Text style={styles.offlineInfoText}>
                    Mode hors ligne : votre photo sera synchronisée
                    automatiquement lors de la reconnexion.
                  </Text>
                </View>
              )}

              {/* Storage Quota Banner */}
              {!loadingLimits && companyInfo && (
                <View
                  style={[
                    styles.limitInfoBanner,
                    isStorageQuotaReached && styles.limitInfoBannerWarning,
                  ]}
                >
                  <Ionicons
                    name={isStorageQuotaReached ? "warning" : "cloud-outline"}
                    size={16}
                    color={isStorageQuotaReached ? "#b45309" : "#f59e0b"}
                  />
                  <Text
                    style={[
                      styles.limitInfoText,
                      isStorageQuotaReached && styles.limitInfoTextWarning,
                    ]}
                  >
                    Stockage: {currentStorageGB.toFixed(2)}GB /{" "}
                    {storageQuotaGB.toFixed(2)}GB
                    {isStorageQuotaReached && " - Quota dépassé"}
                  </Text>
                </View>
              )}

              <View style={styles.imageContainer}>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={showImagePickerOptions}
                >
                  {image ? (
                    image.type === "video" ? (
                      <View
                        style={[
                          styles.imagePreview,
                          {
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "#000",
                          },
                        ]}
                      >
                        <Ionicons
                          name="play-circle-outline"
                          size={64}
                          color="#fff"
                        />
                        <Text style={{ color: "#fff", marginTop: 10 }}>
                          Vidéo sélectionnée
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.imagePreview}
                      />
                    )
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons
                        name="camera-outline"
                        size={48}
                        color={COLORS.gray}
                      />
                      <Text style={styles.imagePickerText}>
                        Prendre une photo ou vidéo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {image && (
                  <View style={styles.imageActionsOverlay}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={showImagePickerOptions}
                    >
                      <Ionicons
                        name="camera-reverse-outline"
                        size={20}
                        color={COLORS.secondary}
                      />
                    </TouchableOpacity>

                    {image.type !== "video" && (
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleGenerateDescription(image)}
                        disabled={isGeneratingDescription}
                      >
                        {isGeneratingDescription ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.secondary}
                          />
                        ) : (
                          <Ionicons
                            name="sparkles-outline"
                            size={20}
                            color={COLORS.secondary}
                          />
                        )}
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        { backgroundColor: "#fee2e2" },
                      ]} // Red bg for delete
                      onPress={() => setImage(null)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={COLORS.deleteColor}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Titre (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ex: 'Photo d'inspection du site'"
                  placeholderTextColor={COLORS.gray}
                  value={title}
                  onChangeText={setTitle}
                />

                <VoiceNoteRecorder
                  onRecordingComplete={handleRecordingComplete}
                  onTranscriptionComplete={(text) => {
                    // Save transcription to separate field instead of description
                    setAudioText(text);
                  }}
                />
              </View>

              {/* Anomaly Type Selection (from anomalie1) */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Type d&apos;anomalie</Text>
                {loadingAnomalies ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : anomalieTypes.length === 0 ? (
                  <Text style={{ color: "#6b7280", fontSize: 12 }}>
                    Aucun type disponible
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.typeScrollView}
                  >
                    {anomalieTypes.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.typeButton,
                          selectedType === type.anomalie &&
                            styles.typeButtonSelected,
                        ]}
                        onPress={() => setSelectedType(type.anomalie || null)}
                      >
                        <Ionicons
                          name="alert-circle-outline"
                          size={20}
                          color={
                            selectedType === type.anomalie
                              ? "#FFFFFF"
                              : "#11224e"
                          }
                        />
                        <Text
                          style={[
                            styles.typeButtonText,
                            selectedType === type.anomalie &&
                              styles.typeButtonTextSelected,
                          ]}
                        >
                          {type.anomalie || "Sans nom"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Anomaly Category Selection (from anomalie2) */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                  Catégorie d&apos;anomalie
                </Text>
                {loadingAnomalies ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : anomalieCategories.length === 0 ? (
                  <Text style={{ color: "#6b7280", fontSize: 12 }}>
                    Aucune catégorie disponible
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScrollView}
                  >
                    {anomalieCategories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryButton,
                          selectedCategorie === category.anomalie &&
                            styles.categoryButtonSelected,
                        ]}
                        onPress={() =>
                          setSelectedCategorie(category.anomalie || null)
                        }
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            selectedCategorie === category.anomalie &&
                              styles.categoryButtonTextSelected,
                          ]}
                        >
                          {category.anomalie || "Sans nom"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Severity Slider */}
              <View style={styles.sectionContainer}>
                <Text style={styles.severityTitle}>Niveau de sévérité</Text>
                <PanGestureHandler onGestureEvent={onSeverityPan}>
                  <View
                    style={styles.severityContainer}
                    onLayout={(event) =>
                      setSeveritySliderWidth(event.nativeEvent.layout.width)
                    }
                  >
                    <View style={styles.severityHeader}>
                      <Text
                        style={[
                          styles.severityValue,
                          { color: getSeverityColor(level) },
                        ]}
                      >
                        {level}/10
                      </Text>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: getSeverityColor(level) },
                        ]}
                      >
                        <Text style={styles.severityBadgeText}>
                          {getSeverityText(level)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.severitySlider}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.severityDot,
                            level >= value && [
                              styles.severityDotActive,
                              { backgroundColor: getSeverityColor(level) },
                            ],
                            level === value && [
                              styles.severityDotSelected,
                              { borderColor: getSeverityColor(level) },
                            ],
                          ]}
                          onPress={() => setLevel(value)}
                          activeOpacity={0.7}
                        />
                      ))}
                    </View>
                  </View>
                </PanGestureHandler>
              </View>

              <View style={[styles.form, { marginTop: 20 }]}>
                <Text style={styles.label}>Transcription Audio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Transcription automatique..."
                  placeholderTextColor={COLORS.gray}
                  value={audioText}
                  onChangeText={setAudioText}
                  multiline
                />

                <Text style={styles.label}>Description IA</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description générée par l'IA..."
                  placeholderTextColor={COLORS.gray}
                  value={iaText}
                  onChangeText={setIaText}
                  multiline
                />

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: COLORS.secondary, marginBottom: 15 },
                  ]}
                  onPress={handleCombineText}
                  disabled={isCombiningText || (!audioText && !iaText)}
                >
                  {isCombiningText ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name="git-merge-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={[styles.buttonText, { color: "#fff" }]}>
                        Combiner & Générer Description
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.label}>Description finale</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ajoutez une courte description (facultatif)"
                    placeholderTextColor={COLORS.gray}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    editable={!isGeneratingDescription}
                  />
                  {isGeneratingDescription && (
                    <View style={styles.descriptionLoadingOverlay}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.descriptionLoadingText}>
                        Analyse en cours...
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>
                    Arrêt
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.addButton,
                    isStorageQuotaReached && styles.addButtonDisabled,
                  ]}
                  onPress={() => handleAdd(false)}
                  disabled={isStorageQuotaReached}
                >
                  <Text style={styles.buttonText}>Ajouter l&apos;image</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alertInfo.visible}
        title={alertInfo.title}
        message={alertInfo.message}
        type={alertInfo.type}
        onClose={() => setAlertInfo({ ...alertInfo, visible: false })}
        buttons={alertInfo.buttons}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    maxHeight: "90%",
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.xLarge,
    borderTopRightRadius: SIZES.xLarge,
    padding: SIZES.large,
  },
  headerContainer: {
    position: "relative",
    marginBottom: SIZES.large,
  },
  closeButton: {
    position: "absolute",
    left: 0,
    top: 0,
    padding: SIZES.small,
    zIndex: 10,
  },
  headerTitle: {
    textAlign: "center",
    fontFamily: FONT.bold,
    fontSize: SIZES.xLarge,
    color: COLORS.secondary,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  sparkleButton: {
    padding: SIZES.small,
  },
  imageContainer: {
    width: "100%",
    marginBottom: SIZES.large,
  },
  imagePicker: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.lightWhite,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: SIZES.medium,
    borderWidth: 2,
    borderColor: COLORS.gray2,
    borderStyle: "dashed",
  },
  imagePickerPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickerText: {
    fontFamily: FONT.medium,
    color: COLORS.gray,
    marginTop: SIZES.small,
    fontSize: SIZES.medium,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: SIZES.medium,
  },
  deleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
  },
  form: {
    width: "100%",
  },
  voiceNoteContainer: {
    marginBottom: SIZES.medium,
  },
  label: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.secondary,
    marginBottom: SIZES.small,
    alignSelf: "flex-start",
  },
  input: {
    width: "100%",
    padding: SIZES.medium,
    backgroundColor: COLORS.lightWhite,
    borderRadius: SIZES.small,
    marginBottom: SIZES.medium,
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: SIZES.large,
    width: "100%",
    paddingBottom: 40,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.lightWhite,
    marginRight: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    marginLeft: SIZES.small,
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  cancelButtonText: {
    color: COLORS.secondary,
  },
  descriptionLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: SIZES.small,
    gap: 8,
  },
  descriptionLoadingText: {
    color: COLORS.primary,
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 12,
  },
  severityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 12,
  },
  typeScrollView: {
    gap: 10,
    paddingHorizontal: 2,
  },
  typeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  typeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  typeButtonTextSelected: {
    color: "#FFFFFF",
  },
  categoryScrollView: {
    gap: 10,
    paddingHorizontal: 2,
  },
  categoryButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  categoryButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  categoryButtonTextSelected: {
    color: "#FFFFFF",
  },
  severityContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  severityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  severityValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  severitySlider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  severityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E5EA",
    borderWidth: 2,
    borderColor: "#E5E5EA",
  },
  severityDotActive: {
    borderColor: "#E5E5EA",
  },
  severityDotSelected: {
    transform: [{ scale: 1.2 }],
    borderWidth: 2,
  },
  imageActionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  sparkleButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 8,
  },
  generationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },
  imageActionsOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  limitInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
  },
  limitInfoBannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
  },
  limitInfoText: {
    color: "#ea580c",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  limitInfoTextWarning: {
    color: "#b45309",
  },
  addButtonDisabled: {
    backgroundColor: "#d1d5db",
    opacity: 0.6,
  },
  networkStatusBadge: {
    position: "absolute",
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    backgroundColor: "#ef4444",
  },
  networkStatusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "600",
  },
  offlineInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e0f2fe",
    borderColor: "#7dd3fc",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
  },
  offlineInfoText: {
    color: "#0369a1",
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
});
