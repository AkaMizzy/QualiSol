import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Anomalie1, getAllAnomalies1 } from "@/services/anomalie1Service";
import { Anomalie2, getAllAnomalies2 } from "@/services/anomalie2Service";
import companyService from "@/services/companyService";
import { getConnectivity } from "@/services/connectivity";
import { getAllGeds } from "@/services/gedService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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
import VoiceNoteRecorder, { VoiceNoteRecorderRef } from "../VoiceNoteRecorder";

const MAX_IMAGES = 20;

interface BulkAddImageModalProps {
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
  ) => Promise<void>;
  modalTitle?: string;
  buttonText?: string;
}

export default function BulkAddImageModal({
  visible,
  onClose,
  onAdd,
  modalTitle = "Transfert en masse",
  buttonText = "Transférer les images",
}: BulkAddImageModalProps) {
  const { token, user } = useAuth();
  const [selectedImages, setSelectedImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [altitudeAccuracy, setAltitudeAccuracy] = useState<number | null>(null);
  const [level, setLevel] = useState(5);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(
    null,
  );
  const [severitySliderWidth, setSeveritySliderWidth] = useState(0);

  // Voice note state - shared across all images
  const [voiceNote, setVoiceNote] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const voiceNoteRecorderRef = useRef<VoiceNoteRecorderRef>(null);

  // Auto-start recording when images are selected
  useEffect(() => {
    if (selectedImages.length > 0 && !voiceNote) {
      // Small delay to ensure modal/component is fully ready
      const timer = setTimeout(() => {
        voiceNoteRecorderRef.current?.startRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedImages, voiceNote]);

  // Progressive layout state
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [anomalieTypes, setAnomalieTypes] = useState<Anomalie1[]>([]);
  const [anomalieCategories, setAnomalieCategories] = useState<Anomalie2[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentStorageGB, setCurrentStorageGB] = useState(0);
  const [storageQuotaGB, setStorageQuotaGB] = useState(0);
  const [isStorageQuotaReached, setIsStorageQuotaReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">(
    "online",
  );

  const [isUploading, setIsUploading] = useState(false);

  const prevVisibleRef = useRef(visible);

  // Fetch anomalie types and categories
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
    if (visible) {
      loadAnomalies();
    }
  }, [token, visible]);

  // Fetch storage limits
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

        const storageUsedGB = company.nbimagetake || 0;
        const storageQuotaGB = company.sizeimages || 1;

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
  }, [token, visible]);

  // Fetch location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied.");
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          setLatitude(lastKnown.coords.latitude);
          setLongitude(lastKnown.coords.longitude);
          setAltitude(lastKnown.coords.altitude);
          setAccuracy(lastKnown.coords.accuracy);
          setAltitudeAccuracy(lastKnown.coords.altitudeAccuracy);
        }

        const freshLocationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

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
          console.log("Could not fetch fresh location");
        }
      } catch (error) {
        console.warn("Could not fetch location automatically.", error);
      }
    };
    if (visible) {
      fetchLocation();
    }
  }, [visible]);

  // Check network status
  useEffect(() => {
    const checkNetwork = async () => {
      const connectivity = await getConnectivity();
      setNetworkStatus(connectivity.status);
    };
    if (visible) {
      checkNetwork();
    }
  }, [visible]);

  // Auto-open image picker when modal opens, modal stays visible regardless
  useEffect(() => {
    const prevVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (!visible && prevVisible) {
      // Modal just closed - reset form
      resetForm();
    }

    // Auto-open image picker immediately when modal opens
    if (visible && !prevVisible && selectedImages.length === 0) {
      // Open picker immediately - modal stays open regardless of selection result
      handlePickImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Reset image index if it's out of bounds
  useEffect(() => {
    if (
      currentImageIndex >= selectedImages.length &&
      selectedImages.length > 0
    ) {
      setCurrentImageIndex(0);
    }
  }, [selectedImages.length, currentImageIndex]);

  const handlePickImages = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin des autorisations de la galerie pour sélectionner les images.",
      );
      return true; // Return true to indicate cancellation/failure
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: MAX_IMAGES,
    });

    if (!result.canceled) {
      const images = result.assets;

      if (images.length > MAX_IMAGES) {
        Alert.alert(
          "Limite dépassée",
          `Vous ne pouvez sélectionner que ${MAX_IMAGES} images maximum. Les ${MAX_IMAGES} premières ont été sélectionnées.`,
        );
        setSelectedImages(images.slice(0, MAX_IMAGES));
      } else {
        setSelectedImages(images);
      }
      return false; // Return false to indicate images were selected
    }
    return true; // Return true to indicate user cancelled
  }, []);

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    Alert.alert(
      "Confirmer",
      "Voulez-vous vraiment supprimer toutes les images sélectionnées ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer tout",
          style: "destructive",
          onPress: () => setSelectedImages([]),
        },
      ],
    );
  };

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
    if (severity >= 7) return "#FF3B30";
    if (severity >= 5) return "#FF9500";
    return "#34C759";
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 7) return "Haute";
    if (severity >= 5) return "Moyenne";
    return "Basse";
  };

  const handleRecordingComplete = useCallback((uri: string | null) => {
    if (uri) {
      const voiceNoteData = {
        uri,
        type: "audio/m4a",
        name: `voicenote-${Date.now()}.m4a`,
      };
      setVoiceNote(voiceNoteData);
    } else {
      setVoiceNote(null);
    }
  }, []);

  const resetForm = () => {
    setSelectedImages([]);
    setTitle("");
    setDescription("");
    setLevel(5);
    setSelectedType(null);
    setSelectedCategorie(null);
    setVoiceNote(null);
    setIsExpanded(false);
    setCurrentImageIndex(0);
    voiceNoteRecorderRef.current?.forceStopAndCleanup();
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? selectedImages.length - 1 : prev - 1,
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === selectedImages.length - 1 ? 0 : prev + 1,
    );
  };

  const handleBulkUpload = async (shouldClose: boolean) => {
    if (selectedImages.length === 0) {
      Alert.alert("Aucune image", "Veuillez sélectionner au moins une image.");
      return;
    }

    // Check online
    const connectivity = await getConnectivity();
    const isOnline = connectivity.status === "online";

    if (!isOnline) {
      Alert.alert(
        "Connexion requise",
        "Cette fonctionnalité nécessite une connexion Internet. Veuillez vous connecter et réessayer.",
        [{ text: "OK" }],
      );
      return;
    }

    if (isStorageQuotaReached) {
      Alert.alert(
        "Quota de stockage dépassé",
        "Vous avez atteint votre quota de stockage. Veuillez mettre à niveau votre plan.",
      );
      return;
    }

    // Capture voice note if recording is active
    let currentVoiceNote = voiceNote;
    if (voiceNoteRecorderRef.current) {
      const uri = await voiceNoteRecorderRef.current.stopAndReturnRecording();
      if (uri) {
        currentVoiceNote = {
          uri,
          type: "audio/m4a",
          name: `voicenote-${Date.now()}.m4a`,
        };
        setVoiceNote(currentVoiceNote);
      }
    }

    // Get author info
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

    // Start upload
    setIsUploading(true);

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < selectedImages.length; i++) {
      const image = selectedImages[i];

      try {
        const deviceId = randomUUID();
        const isLast = i === selectedImages.length - 1;

        // Call onAdd for each image
        await onAdd(
          {
            title: title || `Transfert ${i + 1}`,
            description: description,
            image: image,
            voiceNote: currentVoiceNote, // Use the captured voice note
            author: authorName,
            idauthor: user?.id,
            iddevice: deviceId,
            chantier: "",
            latitude: latitude,
            longitude: longitude,
            altitude: altitude,
            accuracy: accuracy,
            altitudeAccuracy: altitudeAccuracy,
            level: level,
            type: selectedType,
            categorie: selectedCategorie,
            mode: "upload",
          },
          false, // Don't close modal *per image*
          !isLast, // skipRefresh: true for all except last one
        );

        succeeded++;
      } catch (error: any) {
        console.error(`Failed to upload image ${i + 1}:`, error);
        failed++;
      }
    }

    setIsUploading(false);

    // Navigation logic after bulk upload
    if (shouldClose) {
      // Flow 1: Submit & Exit
      resetForm();
      onClose();
    } else {
      // Flow 2: Submit & Continue
      resetForm();
      // Important: Wait a tick or just call it, but ensure form is reset first
      setTimeout(() => {
        handlePickImages();
      }, 500);
    }
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
              contentContainerStyle={styles.scrollViewContent}
            >
              <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={32} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{modalTitle}</Text>
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

              {/* Image Display - Slider/Carousel */}
              <View style={styles.imageContainer}>
                {selectedImages.length > 0 &&
                selectedImages[currentImageIndex] ? (
                  <View style={styles.imageSliderContainer}>
                    {/* Current image preview with Delete Overlay */}
                    <View style={styles.previewContainer}>
                      <Image
                        source={{ uri: selectedImages[currentImageIndex]?.uri }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        style={styles.deleteButtonOverlay}
                        onPress={() => handleRemoveImage(currentImageIndex)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={24}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Navigation controls */}
                    {selectedImages.length > 1 && (
                      <View style={styles.imageNavigation}>
                        <TouchableOpacity
                          onPress={handlePrevImage}
                          style={styles.navButton}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={24}
                            color={COLORS.primary}
                          />
                        </TouchableOpacity>

                        <Text style={styles.imageCounter}>
                          {currentImageIndex + 1} / {selectedImages.length}
                        </Text>

                        <TouchableOpacity
                          onPress={handleNextImage}
                          style={styles.navButton}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={24}
                            color={COLORS.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Change/Add images button */}
                    <TouchableOpacity
                      style={styles.changeImagesButton}
                      onPress={handlePickImages}
                    >
                      <Ionicons
                        name="images-outline"
                        size={20}
                        color={COLORS.primary}
                      />
                      <Text style={styles.changeImagesText}>
                        Ajouter des images ({selectedImages.length}/{MAX_IMAGES}
                        )
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePickerPlaceholder}
                    onPress={handlePickImages}
                  >
                    <Ionicons
                      name="images-outline"
                      size={48}
                      color={COLORS.gray}
                    />
                    <Text style={styles.imagePickerText}>
                      Sélectionner les images
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Voice Note - Shared for all images */}
              <View style={styles.voiceNoteSection}>
                <VoiceNoteRecorder
                  ref={voiceNoteRecorderRef}
                  onRecordingComplete={handleRecordingComplete}
                />
              </View>

              {/* Primary Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => handleBulkUpload(true)}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>
                    Enregistrer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.addButton,
                    (isStorageQuotaReached ||
                      isUploading ||
                      selectedImages.length === 0) &&
                      styles.addButtonDisabled,
                  ]}
                  onPress={() => handleBulkUpload(false)}
                  disabled={
                    isStorageQuotaReached ||
                    isUploading ||
                    selectedImages.length === 0
                  }
                >
                  <Text style={styles.buttonText}>
                    {isUploading ? "Transfert en cours..." : buttonText}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Expand/Collapse Toggle */}
              <TouchableOpacity
                style={styles.expandToggle}
                onPress={() => setIsExpanded(!isExpanded)}
              >
                <Text style={styles.expandToggleText}>
                  {isExpanded
                    ? "Masquer les d\u00e9tails"
                    : "Voir plus de d\u00e9tails"}
                </Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              {/*Expandable Metadata Section */}
              {isExpanded && (
                <View style={styles.expandableSection}>
                  {/* Metadata Form - Always visible */}
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
                                  {
                                    backgroundColor: getSeverityColor(level),
                                  },
                                ],
                                level === value && [
                                  styles.severityDotSelected,
                                  {
                                    borderColor: getSeverityColor(level),
                                  },
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

                  {/* Type Selection */}
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

                  {/* Category Selection */}
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

                  {/* Title */}
                  <View style={styles.form}>
                    <Text style={styles.label}>Titre (optionnel)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: 'Transfert inspection site'"
                      placeholderTextColor={COLORS.gray}
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>

                  {/* Description */}
                  <View style={styles.form}>
                    <Text style={styles.label}>Description (optionnel)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Description commune à toutes les images"
                      placeholderTextColor={COLORS.gray}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  {/* Secondary Action Buttons (Bottom) */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => handleBulkUpload(true)}
                    >
                      <Text
                        style={[styles.buttonText, styles.cancelButtonText]}
                      >
                        Enregistrer
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.addButton,
                        (isStorageQuotaReached ||
                          isUploading ||
                          selectedImages.length === 0) &&
                          styles.addButtonDisabled,
                      ]}
                      onPress={() => handleBulkUpload(false)}
                      disabled={
                        isStorageQuotaReached ||
                        isUploading ||
                        selectedImages.length === 0
                      }
                    >
                      <Text style={styles.buttonText}>
                        {isUploading ? "Transfert en cours..." : buttonText}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
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
  networkStatusBadge: {
    position: "absolute",
    right: 0,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9500",
    paddingHorizontal: SIZES.small,
    paddingVertical: 4,
    borderRadius: SIZES.small,
    gap: 4,
  },
  networkStatusText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small - 2,
    color: COLORS.white,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.medium,
    gap: SIZES.small,
    marginBottom: SIZES.medium,
  },
  selectButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
  imageGridHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.small,
  },
  imageCount: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.secondary,
  },
  clearAllText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: "#FF3B30",
  },
  imageGrid: {
    marginBottom: SIZES.medium,
  },
  imageGridContent: {
    gap: SIZES.small,
  },
  imageThumbnailContainer: {
    position: "relative",
    marginRight: SIZES.small,
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: SIZES.small,
    backgroundColor: COLORS.gray2,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },

  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  progressModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.large,
  },
  progressModalContent: {
    backgroundColor: COLORS.white,
    padding: SIZES.xLarge,
    borderRadius: SIZES.medium,
    width: "100%",
    maxWidth: 400,
  },
  progressTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SIZES.large,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.gray2,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: SIZES.medium,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.secondary,
    textAlign: "center",
    marginBottom: SIZES.medium,
  },
  progressStats: {
    gap: SIZES.small,
  },
  progressStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.small,
  },
  progressStatText: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  imagePickerPlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.lightWhite,
    borderRadius: SIZES.medium,
    borderWidth: 2,
    borderColor: COLORS.gray2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  imagePickerText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginTop: SIZES.small,
  },
  voiceNoteSection: {
    marginBottom: SIZES.small,
  },
  voiceNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.small,
    marginBottom: SIZES.small,
  },
  voiceNoteTitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
  imageContainer: {
    width: "100%",
    marginBottom: SIZES.large,
  },
  imageSliderContainer: {
    width: "100%",
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: SIZES.medium,
    backgroundColor: COLORS.lightWhite,
  },
  imageNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: SIZES.small,
    paddingHorizontal: SIZES.medium,
  },
  navButton: {
    padding: SIZES.small,
  },
  imageCounter: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  changeImagesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.small,
    marginTop: SIZES.small,
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  changeImagesText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },

  previewContainer: {
    position: "relative",
    width: "100%",
    alignItems: "center",
  },
  deleteButtonOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "#fee2e2", // Red background like AddImageModal
    borderRadius: 20,
    padding: 8,
  },
  sectionContainer: {
    marginBottom: SIZES.medium,
  },
  severityContainer: {
    backgroundColor: COLORS.lightWhite, // Consistent with AddImageModal
    padding: SIZES.medium,
    borderRadius: SIZES.medium,
  },
  // ... severity styles ...
  severityTitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: "#f87b1b",
    marginBottom: SIZES.small,
  },
  severityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  severityValue: {
    fontFamily: FONT.bold,
    fontSize: SIZES.xLarge,
  },
  severityBadge: {
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small - 2,
    borderRadius: SIZES.medium,
  },
  severityBadgeText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  severitySlider: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  severityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.gray2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  severityDotActive: {},
  severityDotSelected: {
    borderWidth: 3,
  },
  sectionTitle: {
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
    backgroundColor: "#f1f5f9", // Pill style gray background
    borderRadius: 99, // Pill shape
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
    backgroundColor: "#f1f5f9", // Pill style gray background
    borderRadius: 99, // Pill shape
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

  form: {
    marginBottom: SIZES.medium,
  },
  label: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: "#f87b1b",
    marginBottom: SIZES.small,
  },
  input: {
    backgroundColor: COLORS.lightWhite,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.gray2,
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.secondary,
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
  expandToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    marginTop: 4,
  },
  expandToggleText: {
    color: COLORS.primary,
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
  },
  expandableSection: {
    marginTop: 0,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: SIZES.large,
    width: "100%",
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
  addButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  cancelButtonText: {
    color: COLORS.secondary,
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
});
