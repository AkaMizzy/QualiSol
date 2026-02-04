import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import {
    createGed,
    CreateGedInput,
    Ged,
    getAllGeds,
} from "@/services/gedService";
import { Company } from "@/types/company";
import { isVideoFile } from "@/utils/mediaUtils";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
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
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CaptureModal from "../CaptureModal";
import PictureAnnotator from "../PictureAnnotator";
import VoiceNoteRecorder from "../VoiceNoteRecorder";
import { COLORS } from "@/constants/theme";

export type QualiPhotoItem = {
  id: string;
  project_title?: string | null;
  id_qualiphoto_parent?: string | null;
  zone_title?: string | null;
  date_taken?: string | null;
  photo?: string | null;
};

type FormProps = {
  onClose: () => void;
  onSuccess: (created: Ged) => void;
  childItem: QualiPhotoItem;
  parentTitle?: string | null;
};

function CreateComplementaireQualiPhotoForm({
  onClose,
  onSuccess,
  childItem,
  parentTitle,
}: FormProps) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState("");
  const [photo, setPhoto] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [isAnnotatorVisible, setAnnotatorVisible] = useState(false);
  const [annotatorBaseUri, setAnnotatorBaseUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [mode, setMode] = useState<"upload" | "capture">("upload");

  // Storage quota state
  const [currentStorageGB, setCurrentStorageGB] = useState(0);
  const [storageQuotaGB, setStorageQuotaGB] = useState(0);
  const [isStorageQuotaReached, setIsStorageQuotaReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const canSave = useMemo(
    () =>
      !!photo &&
      !submitting &&
      !isStorageQuotaReached,
    [photo, submitting, isStorageQuotaReached],
  );

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

    fetchLimitInfo();
  }, [token]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission",
        "L'autorisation d'accéder à la caméra est requise.",
      );
      return;
    }
    launchPicker("camera");
  }, []);

  const handleRecordVideo = useCallback(async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();

    if (cameraStatus !== "granted") {
      Alert.alert(
        "Permissions manquantes",
        "Nous avons besoin de l'accès à la caméra pour enregistrer une vidéo.",
      );
      return;
    }

    launchPicker("video");
  }, []);

  const handlePickPhoto = useCallback(async () => {
    Alert.alert(
      "Choisir un média",
      "Voulez-vous prendre une photo/vidéo ou choisir depuis la galerie ?",
      [
        {
          text: "Caméra (Photo/Vidéo)",
          onPress: () => setCaptureModalVisible(true),
        },
        {
          text: "Galerie",
          onPress: async () => {
            const { status } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "Permission",
                "L'autorisation d'accéder à la galerie est requise.",
              );
              return;
            }
            launchPicker("gallery");
          },
        },
        {
          text: "Annuler",
          style: "cancel",
        },
      ],
    );
  }, []);

  const handleMediaCaptured = (media: {
    uri: string;
    type: "image" | "video";
    width?: number;
    height?: number;
  }) => {
    setMode("capture");

    const fileName =
      media.uri.split("/").pop() ||
      (media.type === "video" ? "video.mp4" : "photo.jpg");
    // Determine mime type roughly
    const mimeType = media.type === "video" ? "video/mp4" : "image/jpeg";

    setPhoto({
      uri: media.uri,
      name: fileName,
      type: mimeType,
    });
  };

  const launchPicker = async (mode: "camera" | "gallery" | "video") => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes:
        mode === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.9,
    };

    if (mode === "camera") {
      result = await ImagePicker.launchCameraAsync({
        ...options,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
    } else if (mode === "video") {
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      // Set mode based on picker mode used
      const pickerMode =
        mode === "camera" || mode === "video" ? "capture" : "upload";
      setMode(pickerMode);

      // Check file size for videos (limit 50MB)
      if (
        (asset.type === "video" || mode === "video") &&
        asset.fileSize &&
        asset.fileSize > 50 * 1024 * 1024
      ) {
        Alert.alert(
          "Fichier trop volumineux",
          "La taille de la vidéo ne doit pas dépasser 50 Mo.",
        );
        return;
      }

      const uri = asset.uri;
      const fileName =
        uri.split("/").pop() ||
        (asset.type === "video" ? "video.mp4" : "photo.jpg");
      const ext = fileName.split(".").pop()?.toLowerCase();

      let mimeType =
        asset.type === "video"
          ? `video/${ext || "mp4"}`
          : `image/${ext || "jpeg"}`;

      // Fallback if type is missing or generic
      if (!asset.type) {
        if (["mp4", "mov", "avi", "mkv"].includes(ext || "")) {
          mimeType = `video/${ext}`;
        } else {
          mimeType = `image/${ext || "jpeg"}`;
        }
      }

      const newPhoto = {
        uri,
        name: fileName,
        type: mimeType,
      };

      setPhoto(newPhoto);
    }
  };

  const openAnnotatorForExisting = () => {
    if (!photo) return;
    setAnnotatorBaseUri(photo.uri);
    setAnnotatorVisible(true);
  };

  const handleSubmit = async () => {
    if (!token || !photo || !user) return;

    if (isStorageQuotaReached) {
      Alert.alert(
        "Quota de stockage dépassé",
        `Vous avez atteint votre quota de stockage de ${storageQuotaGB.toFixed(2)}GB. Utilisation actuelle: ${currentStorageGB.toFixed(2)}GB. Veuillez mettre à niveau votre plan.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createGed(token, {
        idsource: childItem.id,
        title: title || "Situation Après",
        kind: "photoapres",
        author: `${user.firstname} ${user.lastname}`,
        description: comment || undefined,
        latitude: latitude ? String(latitude) : undefined,
        longitude: longitude ? String(longitude) : undefined,
        file: photo,
        mode: mode,
      });

      if (audioUri) {
        try {
          const audioPayload: CreateGedInput = {
            idsource: result.data.id,
            title: `Note vocale pour ${title || "Situation Après"}`,
            kind: "audio",
            author: `${user.firstname} ${user.lastname}`,
            file: {
              uri: audioUri,
              name: `note_${Date.now()}.m4a`,
              type: "audio/m4a",
            },
          };
          await createGed(token, audioPayload);
        } catch (audioErr: any) {
          Alert.alert(
            "Erreur Audio",
            `La photo a été enregistrée, mais l'envoi de la note vocale a échoué : ${audioErr.message}`,
          );
        }
      }

      onSuccess(result.data);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Échec de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

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
    fetchLocation();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handlePickPhoto();
    }, 500);
    return () => clearTimeout(timer);
  }, [handlePickPhoto]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 50 }} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {parentTitle}
            </Text>
            {!!childItem.project_title && !!childItem.zone_title && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {`${childItem.project_title} • ${childItem.zone_title}`}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.headerStopButton}>
            <Ionicons name="close" size={28} color="#11224e" />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color="#b45309" />
            <Text style={styles.alertBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={16} color="#b45309" />
            </TouchableOpacity>
          </View>
        )}

        {/* Limit Info Banner */}
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

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <View style={styles.card}>
            {photo ? (
              <View style={styles.imagePreviewContainer}>
                {isVideoFile(photo.uri) ? (
                  <Video
                    source={{ uri: photo.uri }}
                    style={styles.imagePreview}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted={true}
                  />
                ) : (
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.imagePreview}
                  />
                )}
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={[styles.iconButton, styles.iconButtonSecondary]}
                    onPress={handlePickPhoto}
                  >
                    <Ionicons
                      name="camera-reverse-outline"
                      size={20}
                      color="#11224e"
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.iconButton, styles.iconButtonSecondary]}
                    onPress={openAnnotatorForExisting}
                  >
                    <Ionicons name="create-outline" size={20} color="#11224e" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconButton, styles.iconButtonSecondary]}
                    onPress={() => setPhoto(null)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoPickerButton}
                onPress={handlePickPhoto}
              >
                <Ionicons name="camera-outline" size={24} color="#475569" />
                <Text style={styles.photoPickerText}>
                  Ajouter une Situation après (Photo/Vidéo)
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ marginTop: 16, gap: 12 }}>
              <View style={[styles.inputWrap]}>
                <Ionicons name="text-outline" size={16} color="#6b7280" />
                <TextInput
                  placeholder="Titre"
                  placeholderTextColor="#9ca3af"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                />
              </View>
              <VoiceNoteRecorder
                onRecordingComplete={setAudioUri}
              />
              <View style={[styles.inputWrap, { height: 120, alignItems: 'flex-start', paddingTop: 12 }]}>
                <Ionicons name="document-text-outline" size={16} color="#6b7280" style={{ marginTop: 4 }} />
                <TextInput
                  placeholder="Description"
                  placeholderTextColor="#9ca3af"
                  value={comment}
                  onChangeText={setComment}
                  style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
                  multiline
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !canSave && styles.submitButtonDisabled,
            ]}
            disabled={!canSave}
            onPress={handleSubmit}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Enregistrement...</Text>
              </>
            ) : (
              <>
                <Ionicons name="save" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      {isAnnotatorVisible && annotatorBaseUri && (
        <Modal
          animationType="fade"
          visible={isAnnotatorVisible}
          onRequestClose={() => setAnnotatorVisible(false)}
        >
          <PictureAnnotator
            baseImageUri={annotatorBaseUri}
            onClose={() => setAnnotatorVisible(false)}
            onSaved={(image: { uri: string; name: string; type: string }) => {
              setPhoto(image);
              setAnnotatorVisible(false);
            }}
            title="Annoter la photo complémentaire"
          />
        </Modal>
      )}

      <CaptureModal
        visible={captureModalVisible}
        onClose={() => setCaptureModalVisible(false)}
        onMediaCaptured={handleMediaCaptured}
      />
    </KeyboardAvoidingView>
  );
}

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (created: Ged) => void;
  childItem: QualiPhotoItem;
  parentTitle?: string | null;
};

export default function CreateComplementaireQualiPhotoModal({
  visible,
  onClose,
  onSuccess,
  childItem,
  parentTitle,
}: ModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <CreateComplementaireQualiPhotoForm
        onClose={onClose}
        onSuccess={onSuccess}
        childItem={childItem}
        parentTitle={parentTitle}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerStopButton: { padding: 8, minWidth: 50, alignItems: "flex-end" },
  stopButtonText: { color: "#f87b1b", fontWeight: "600", fontSize: 16 },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#f87b1b" },
  headerSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16 },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  alertBannerText: { color: "#b45309", flex: 1, fontSize: 12 },
  card: {
    backgroundColor: "#F8FAFC",
    paddingTop: 16,
  },
  separator: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 16 },
  photoPickerButton: {
    borderWidth: 2,
    borderColor: "#f87b1b",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    gap: 8,
  },
  photoPickerText: { color: "#475569", fontWeight: "600" },
  imagePreviewContainer: { position: "relative" },
  imagePreview: { width: "100%", aspectRatio: 2 / 1, borderRadius: 12 },
  imageActions: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 99,
  },
  iconButtonSecondary: {
    backgroundColor: "#f1f5f9",
    borderRadius: 99,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "relative",
  },
  input: { flex: 1, color: "#111827", fontSize: 16 },
  descriptionLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    gap: 8,
  },
  descriptionLoadingText: { color: "#11224e", fontWeight: "600", fontSize: 12 },
  clearButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  submitButton: {
    backgroundColor: "#f87b1b",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    flex: 1,
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f87b1b",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitButtonDisabled: { backgroundColor: "#d1d5db" },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  limitInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
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
  fieldPreview: {
    width: "100%",
    minHeight: 60,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldPreviewText: {
    fontSize: 14,
    color: "#11224e",
    flex: 1,
    marginRight: 8,
  },
  fieldPreviewPlaceholder: {
    color: "#9ca3af",
  },
  fieldEditIcon: {
    marginLeft: 8,
  },
  fieldPreviewLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldPreviewLoadingText: {
    color: "#11224e",
    fontSize: 12,
  },
  combineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#11224e",
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
