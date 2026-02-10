import VoiceNoteRecorder, {
  VoiceNoteRecorderRef,
} from "@/components/VoiceNoteRecorder";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Anomalie1, getAllAnomalies1 } from "@/services/anomalie1Service";
import { Anomalie2, getAllAnomalies2 } from "@/services/anomalie2Service";
import companyService from "@/services/companyService";
import { getConnectivity } from "@/services/connectivity";
import { getAllGeds } from "@/services/gedService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { randomUUID } from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import CaptureModal from "../CaptureModal";
import CustomAlert from "../CustomAlert";
import PictureAnnotator from "../PictureAnnotator";

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
      idauthor?: string;
      iddevice?: string;
      latitude: number | null;
      longitude: number | null;
      altitude: number | null;
      accuracy: number | null;
      altitudeAccuracy: number | null;
      level: number;
      type: string | null;
      categorie: string | null;
      chantier?: string;
      audiotxt?: string;
      iatxt?: string;
      mode?: "upload" | "capture";
    },
    shouldClose: boolean,
    skipRefresh?: boolean,
  ) => void;
  openCameraOnShow?: boolean;
  allowedMode?: "upload" | "capture" | "both";
  placeholderText?: string;
  modalTitle?: string;
  buttonText?: string;
}

export default function AddImageModal({
  visible,
  onClose,
  onAdd,
  openCameraOnShow = false,
  allowedMode = "both",
  placeholderText = "Prendre une photo ou vidéo",
  modalTitle = "Ajouter",
  buttonText = "Ajouter l'image",
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
  const [iaText, setIaText] = useState<string>("");
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [altitudeAccuracy, setAltitudeAccuracy] = useState<number | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [level, setLevel] = useState(5);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(
    null,
  );
  const [mode, setMode] = useState<"upload" | "capture">("upload");
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

  // Popup modal states
  const [editingField, setEditingField] = useState<"ia" | "description" | null>(
    null,
  );
  const [tempFieldValue, setTempFieldValue] = useState<string>("");

  // Two-level layout state
  const [isExpanded, setIsExpanded] = useState(false);

  // Annotator state
  const [isAnnotatorVisible, setAnnotatorVisible] = useState(false);
  const [annotatorBaseUri, setAnnotatorBaseUri] = useState<string | null>(null);

  const [captureModalVisible, setCaptureModalVisible] = useState(false);

  // Ref for voice note recorder cleanup
  const voiceNoteRecorderRef = useRef<VoiceNoteRecorderRef>(null);

  // Auto-start recording when image is selected
  useEffect(() => {
    if (image && !voiceNote) {
      // Small delay to ensure modal/component is fully ready
      const timer = setTimeout(() => {
        voiceNoteRecorderRef.current?.startRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [image, voiceNote]);

  const handleCombineText = async () => {
    if (!iaText) {
      setAlertInfo({
        visible: true,
        title: "Avertissement",
        message: "Une description IA est nécessaire.",
        type: "error",
      });
      return;
    }

    // Directly use IA text as the description
    setDescription(iaText);
    setAlertInfo({
      visible: true,
      title: "Succès",
      message: "Description ajoutée avec succès !",
      type: "success",
    });
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      setMode("capture");
    }
  }, []);

  const handleRecordVideo = useCallback(async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();

    if (cameraStatus !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin de l'accès à la caméra pour enregistrer une vidéo.",
      );
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const selectedAsset = result.assets[0];

      // Check file size for videos (limit 50MB)
      if (selectedAsset.fileSize && selectedAsset.fileSize > 50 * 1024 * 1024) {
        Alert.alert(
          "Fichier trop volumineux",
          "La taille de la vidéo ne doit pas dépasser 50 Mo.",
        );
        return;
      }

      setImage(selectedAsset);
      setMode("capture");
    }
  }, []);

  const handleMediaCaptured = (media: {
    uri: string;
    type: "image" | "video";
    width?: number;
    height?: number;
  }) => {
    setImage({
      // Cast to ImagePickerAsset
      uri: media.uri,
      type: media.type,
      width: media.width || 1920,
      height: media.height || 1080,
      fileName:
        media.uri.split("/").pop() ||
        (media.type === "video" ? "video.mp4" : "photo.jpg"),
    } as any);
    setMode("capture");
  };

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
      setMode("upload");
      if (selectedAsset.type !== "video") {
        // handleGenerateDescription logic if auto-generation is desired for gallery picks too
      }
    }
  }, []);

  const showImagePickerOptions = useCallback(() => {
    if (allowedMode === "upload") {
      handlePickFromGallery();
      return;
    }

    if (allowedMode === "capture") {
      setCaptureModalVisible(true);
      return;
    }

    // Default "both" behavior
    Alert.alert(
      "Choisir un média",
      "Voulez-vous prendre une photo/vidéo ou choisir depuis la galerie ?",
      [
        {
          text: "Caméra (Photo/Vidéo)",
          onPress: () => setCaptureModalVisible(true),
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
  }, [handlePickFromGallery, allowedMode]);

  useEffect(() => {
    const prevVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !prevVisible && openCameraOnShow) {
      // Modal just opened
      // If allowedMode is "upload", do NOT automatically trigger camera check,
      // but show picker options (which will trigger gallery).
      // If "capture", we want to show choices (Photo vs Video).

      const timer = setTimeout(() => {
        showImagePickerOptions();
      }, 400);

      return () => clearTimeout(timer);
    } else if (!visible && prevVisible) {
      // Modal just closed, force cleanup any active recording
      voiceNoteRecorderRef.current?.forceStopAndCleanup();

      // Reset form
      setTitle("");
      setDescription("");
      setImage(null);
      setVoiceNote(null);
      setIaText("");
      setLatitude(null);
      setLongitude(null);
      setAltitude(null);
      setAccuracy(null);
      setAltitudeAccuracy(null);
      setIsGeneratingDescription(false);
      setLevel(5);
      setSelectedType(null);
    }
  }, [visible, showImagePickerOptions, openCameraOnShow, allowedMode]);

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

        // 1. Try to get last known position first for immediate response
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          setLatitude(lastKnown.coords.latitude);
          setLongitude(lastKnown.coords.longitude);
          setAltitude(lastKnown.coords.altitude);
          setAccuracy(lastKnown.coords.accuracy);
          setAltitudeAccuracy(lastKnown.coords.altitudeAccuracy);
        }

        // 2. Try to get fresh high-accuracy location
        // Use a timeout to prevent hanging indefinitely in offline mode
        const freshLocationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Balanced is faster and sufficient
        });

        // Timeout after 5 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Location timeout")), 5000),
        );

        try {
          const freshLocation = (await Promise.race([
            freshLocationPromise,
            timeoutPromise,
          ])) as Location.LocationObject;

          if (freshLocation) {
            setLatitude(freshLocation.coords.latitude);
            setLongitude(freshLocation.coords.longitude);
            setAltitude(freshLocation.coords.altitude);
            setAccuracy(freshLocation.coords.accuracy);
            setAltitudeAccuracy(freshLocation.coords.altitudeAccuracy);
          }
        } catch (e) {
          console.log(
            "Could not fetch fresh location (timeout or error), keeping last known if available.",
          );
        }
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

  const resetForm = async () => {
    // Force cleanup recording first
    await voiceNoteRecorderRef.current?.forceStopAndCleanup();

    setTitle("");
    setDescription("");
    setImage(null);
    setVoiceNote(null);
    setIaText("");
    setAnnotatedImage(null);
    setLevel(5);
    setSelectedType(null);
    setSelectedCategorie(null);
    setAnnotatorVisible(false);
    setAnnotatorBaseUri(null);
    setMode("upload");
  };

  const handleAdd = async (shouldClose: boolean) => {
    // Check if recording is active and stop it gracefully to get the URI
    let currentVoiceNote = voiceNote;
    if (voiceNoteRecorderRef.current) {
      const uri = await voiceNoteRecorderRef.current.stopAndReturnRecording();
      if (uri) {
        currentVoiceNote = {
          uri,
          type: "audio/m4a",
          name: `voicenote-${Date.now()}.m4a`,
        };
        // Update state as well for consistency, though we use local variable for immediate submission
        setVoiceNote(currentVoiceNote);
      }
    }

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

    // Get Device ID
    // Get Device ID
    const getDeviceId = async () => {
      // Generate a random UUID for this specific creation session
      // This ensures anonymity and consistency across related records (image + voice)
      return randomUUID();
    };

    // Submit the data
    getDeviceId().then((deviceId) => {
      onAdd(
        {
          title,
          description,
          image,
          voiceNote: currentVoiceNote, // Use the locally resolved voice note
          author: authorName,
          idauthor: user?.id,
          iddevice: deviceId,
          latitude,
          longitude,
          altitude,
          accuracy,
          altitudeAccuracy,
          level,
          type: selectedType,
          categorie: selectedCategorie,
          iatxt: iaText,
          mode: mode,
        },
        shouldClose,
        false, // skipRefresh = false (always refresh for single add)
      );
    });

    if (shouldClose) {
      // Flow 1: Submit & Exit
      // The parent component (SharedGalerieScreen) handles closing via the `shouldClose` prop passed to `onAdd`
      // But we can also force close here if we want to be sure, though `onAdd` usually handles it.
      // We'll rely on `onAdd` to respect `shouldClose`.
    } else {
      // Flow 2: Submit & Continue
      // Reset the form immediately for the next entry
      resetForm();
      // Show picker options again (or open camera if preferred) to keep the flow going
      showImagePickerOptions();
    }
  };

  // Annotation handlers
  const openAnnotatorForExisting = () => {
    if (!image) return;
    setAnnotatorBaseUri(image.uri);
    setAnnotatorVisible(true);
  };

  const handleAnnotatorSaved = (annotatedImage: {
    uri: string;
    name: string;
    type: string;
  }) => {
    // Replace current image with annotated version
    // ImagePickerAsset requires width/height, use original dimensions or defaults
    setImage({
      uri: annotatedImage.uri,
      width: image?.width || 1920,
      height: image?.height || 1080,
      fileName: annotatedImage.name,
      fileSize: image?.fileSize,
      type: annotatedImage.type as "image" | "video",
      mimeType: annotatedImage.type,
    } as ImagePicker.ImagePickerAsset);
    // Close annotator
    setAnnotatorVisible(false);
    setAnnotatorBaseUri(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={async () => {
              await voiceNoteRecorderRef.current?.forceStopAndCleanup();
              onClose();
            }}
          />
          <View style={styles.modalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollViewContent}
            >
              <View style={styles.headerContainer}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={async () => {
                    await voiceNoteRecorderRef.current?.forceStopAndCleanup();
                    onClose();
                  }}
                >
                  <Ionicons name="close" size={32} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{modalTitle}</Text>
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

              <View style={styles.imageContainer}>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={showImagePickerOptions}
                >
                  {image ? (
                    image.type === "video" ? (
                      <Video
                        source={{ uri: image.uri }}
                        style={styles.imagePreview}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                      />
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
                        {placeholderText}
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

                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={openAnnotatorForExisting}
                    >
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color={COLORS.secondary}
                      />
                    </TouchableOpacity>

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

              {/* Annotated Image Preview */}
              {annotatedImage && image?.type !== "video" && (
                <View style={styles.annotatedImageContainer}>
                  <View style={styles.annotatedImageHeader}>
                    <Ionicons
                      name="analytics-outline"
                      size={20}
                      color="#ef4444"
                    />
                    <Text style={styles.annotatedImageTitle}>
                      Analyse IA - Anomalies Détectées
                    </Text>
                  </View>
                  <View style={styles.annotatedImageWrapper}>
                    <TouchableOpacity
                      onPress={() => setFullScreenImageVisible(true)}
                      activeOpacity={0.9}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <Image
                        source={{ uri: annotatedImage }}
                        style={styles.annotatedImagePreview}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.annotatedImageNote}>
                    Appuyez l'image pour l'agrandir 🔍
                  </Text>
                </View>
              )}

              {/* COMPACT SECTION - Always Visible */}
              <View style={styles.compactSection}>
                <VoiceNoteRecorder
                  ref={voiceNoteRecorderRef}
                  onRecordingComplete={handleRecordingComplete}
                />

                {/* First Button Set - Compact Section */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => handleAdd(true)}
                  >
                    <Text style={[styles.buttonText, styles.cancelButtonText]}>
                      Terminer
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
                    <Text style={styles.buttonText}>{buttonText}</Text>
                  </TouchableOpacity>
                </View>

                {/* Expand/Collapse Button */}
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setIsExpanded(!isExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expandButtonText}>
                    {isExpanded ? "Moins d'options" : "Plus d'options"}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* EXPANDED SECTION - Conditionally Visible */}
              {isExpanded && (
                <View style={styles.expandedSection}>
                  {/* Severity Slider - FIRST */}
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

                  {/* Anomaly Type Selection - SECOND (only if options available) */}
                  {!loadingAnomalies && anomalieTypes.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionTitle}>
                        Type d&apos;anomalie
                      </Text>
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
                            onPress={() =>
                              setSelectedType(type.anomalie || null)
                            }
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
                    </View>
                  )}

                  {/* Anomaly Category Selection - THIRD (only if options available) */}
                  {!loadingAnomalies && anomalieCategories.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionTitle}>
                        Catégorie d&apos;anomalie
                      </Text>
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
                    </View>
                  )}

                  {/* Title Field - FOURTH */}
                  <View style={[styles.form, { marginTop: 15 }]}>
                    <Text style={styles.label}>Titre (optionnel)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: 'Photo d'inspection du site'"
                      placeholderTextColor={COLORS.gray}
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>

                  {/* Description Field - FIFTH (and final) */}
                  <View style={[styles.form, { marginTop: 20 }]}>
                    <Text style={styles.label}>Description (optionnel)</Text>
                    <TouchableOpacity
                      style={styles.fieldPreview}
                      onPress={() => {
                        setEditingField("description");
                        setTempFieldValue(description);
                      }}
                    >
                      <Text
                        style={[
                          styles.fieldPreviewText,
                          !description && styles.fieldPreviewPlaceholder,
                        ]}
                        numberOfLines={2}
                      >
                        {description ||
                          "Ajoutez une courte description (facultatif)"}
                      </Text>
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color={COLORS.primary}
                        style={styles.fieldEditIcon}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => handleAdd(true)}
                    >
                      <Text
                        style={[styles.buttonText, styles.cancelButtonText]}
                      >
                        Terminer
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
                      <Text style={styles.buttonText}>{buttonText}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Text Field Editor Popup Modal */}
      <Modal
        visible={editingField !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingField(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.textEditorModalContainer}
        >
          <TouchableOpacity
            style={styles.textEditorBackdrop}
            activeOpacity={1}
            onPress={() => setEditingField(null)}
          />
          <View style={styles.textEditorModalContent}>
            <View style={styles.textEditorHeader}>
              <Text style={styles.textEditorTitle}>
                {editingField === "ia" ? "Description IA" : "Description"}
              </Text>
              <TouchableOpacity onPress={() => setEditingField(null)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.textEditorScrollContainer}
              contentContainerStyle={styles.textEditorScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.textEditorInputContainer}>
                  <TextInput
                    style={styles.textEditorInput}
                    placeholder="Saisissez votre texte..."
                    placeholderTextColor={COLORS.gray}
                    value={tempFieldValue}
                    onChangeText={setTempFieldValue}
                    multiline
                  />
                </View>
              </TouchableWithoutFeedback>
            </ScrollView>

            <View style={styles.textEditorButtons}>
              <TouchableOpacity
                style={[styles.textEditorButton, styles.textEditorCancelButton]}
                onPress={() => {
                  Keyboard.dismiss();
                  setEditingField(null);
                  setTempFieldValue("");
                }}
              >
                <Text style={styles.textEditorCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.textEditorButton, styles.textEditorSaveButton]}
                onPress={() => {
                  if (editingField === "ia") {
                    setIaText(tempFieldValue);
                  } else if (editingField === "description") {
                    setDescription(tempFieldValue);
                  }
                  Keyboard.dismiss();
                  setEditingField(null);
                  setTempFieldValue("");
                }}
              >
                <Text style={styles.textEditorSaveText}>Terminer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <CustomAlert
        visible={alertInfo.visible}
        title={alertInfo.title}
        message={alertInfo.message}
        type={alertInfo.type}
        onClose={() => setAlertInfo({ ...alertInfo, visible: false })}
        buttons={alertInfo.buttons}
      />

      {/* PictureAnnotator for drawing on images */}
      {isAnnotatorVisible && annotatorBaseUri && (
        <Modal
          visible={isAnnotatorVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            setAnnotatorVisible(false);
            setAnnotatorBaseUri(null);
          }}
        >
          <PictureAnnotator
            baseImageUri={annotatorBaseUri}
            onClose={() => {
              setAnnotatorVisible(false);
              setAnnotatorBaseUri(null);
            }}
            onSaved={handleAnnotatorSaved}
            title="Annoter l'image"
          />
        </Modal>
      )}

      <CaptureModal
        visible={captureModalVisible}
        onClose={() => setCaptureModalVisible(false)}
        onMediaCaptured={handleMediaCaptured}
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
  scrollViewContent: {
    paddingBottom: Platform.OS === "android" ? 80 : 40,
  },
  headerContainer: {
    position: "relative",
    marginBottom: SIZES.large,
  },
  closeButton: {
    position: "absolute",
    left: 0,
    top: 0, // Slight adjustment for larger button
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    // Add shadow/frame
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  headerTitle: {
    textAlign: "center",
    fontFamily: FONT.bold,
    fontSize: SIZES.xLarge,
    color: "#f87b1b",
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
    color: "#f87b1b",
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
  compactSection: {
    marginBottom: SIZES.medium,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    marginTop: 4, // Reduced from SIZES.medium
  },
  expandButtonText: {
    color: COLORS.primary,
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
  },
  expandedSection: {
    marginTop: 0, // Reduced from SIZES.small
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  fieldPreview: {
    width: "100%",
    minHeight: 60,
    padding: SIZES.medium,
    backgroundColor: COLORS.lightWhite,
    borderRadius: SIZES.small,
    marginBottom: SIZES.medium,
    borderWidth: 1,
    borderColor: COLORS.gray2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldPreviewText: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.secondary,
    flex: 1,
    marginRight: SIZES.small,
  },
  fieldPreviewPlaceholder: {
    color: COLORS.gray,
  },
  fieldEditIcon: {
    marginLeft: SIZES.small,
  },
  fieldPreviewLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldPreviewLoadingText: {
    color: COLORS.primary,
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
  },
  combineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    opacity: 1,
  },
  combineButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  textEditorModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.large,
  },
  textEditorBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  textEditorModalContent: {
    width: "100%",
    height: "80%",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.large,
    padding: SIZES.large,
  },
  textEditorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  textEditorTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.primary,
  },
  textEditorScrollContainer: {
    flex: 1,
    width: "100%",
  },
  textEditorScrollContent: {
    flexGrow: 1,
  },
  textEditorInputContainer: {
    flex: 1,
  },
  textEditorInput: {
    width: "100%",
    minHeight: 400,
    padding: SIZES.medium,
    backgroundColor: COLORS.lightWhite,
    borderRadius: SIZES.small,
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    borderWidth: 1,
    borderColor: COLORS.gray2,
    textAlignVertical: "top",
  },
  textEditorButtons: {
    flexDirection: "row",
    gap: SIZES.small,
  },
  textEditorButton: {
    flex: 1,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  textEditorCancelButton: {
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  textEditorSaveButton: {
    backgroundColor: COLORS.primary,
  },
  textEditorCancelText: {
    color: COLORS.secondary,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  textEditorSaveText: {
    color: COLORS.white,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: SIZES.large,
    width: "100%",
    paddingBottom: 0, // Reduced from 40 to eliminate gap
    marginBottom: 0, // Reduced from 20 to eliminate gap
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
    fontSize: SIZES.xmedium,
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
    color: "#f87b1b",
    marginBottom: 12,
  },
  severityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f87b1b",
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
  // Annotated Image Preview Styles
  annotatedImageContainer: {
    width: "100%",
    backgroundColor: "#fef2f2",
    borderRadius: SIZES.medium,
    borderWidth: 2,
    borderColor: "#ef4444",
    padding: SIZES.medium,
    marginTop: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  annotatedImageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SIZES.small,
  },
  annotatedImageTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: "#ef4444",
  },
  annotatedImageWrapper: {
    width: "100%",
    height: 180,
    backgroundColor: "#ffffff",
    borderRadius: SIZES.small,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  annotatedImagePreview: {
    width: "100%",
    height: "100%",
  },
  annotatedImageNote: {
    fontSize: 12,
    color: "#991b1b",
    fontStyle: "italic",
    marginTop: SIZES.small,
    textAlign: "center",
  },
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenModalCloseButton: {
    position: "absolute",
    top: 50,
    right: 30,
    zIndex: 1,
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
});
