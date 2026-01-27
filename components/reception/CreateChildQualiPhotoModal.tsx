import API_CONFIG from "@/app/config/api";
import PictureAnnotator from "@/components/PictureAnnotator";
import { useAuth } from "@/contexts/AuthContext";
import { Anomalie1, getAllAnomalies1 } from "@/services/anomalie1Service";
import { Anomalie2, getAllAnomalies2 } from "@/services/anomalie2Service";
import companyService from "@/services/companyService";
import { Folder } from "@/services/folderService";
import {
    CreateGedInput,
    Ged,
    combineTextDescription,
    createGed,
    describeImage,
    getAllGeds,
} from "@/services/gedService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
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
    GestureHandlerRootView,
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomAlert from "../CustomAlert";
import VoiceNoteRecorder from "../VoiceNoteRecorder";

type FormProps = {
  onClose: () => void;
  onSuccess: (created: Ged) => void;
  parentItem: Folder;
  projectTitle: string;
  zoneTitle: string;
};

export function CreateChildQualiPhotoForm({
  onClose,
  onSuccess,
  parentItem,
  projectTitle,
  zoneTitle,
}: FormProps) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [iaText, setIaText] = useState<string>("");
  const [audioText, setAudioText] = useState<string>("");
  const [isCombiningText, setIsCombiningText] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [, setLocationStatus] = useState<
    "idle" | "fetching" | "success" | "error"
  >("idle");
  const [creationCount, setCreationCount] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [level, setLevel] = useState(5);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(
    null,
  );
  const [severitySliderWidth, setSeveritySliderWidth] = useState(0);
  const [assigned, setAssigned] = useState("");
  const [assignedOpen, setAssignedOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<
    { id: string; firstname?: string; lastname?: string; email?: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [anomalieTypes, setAnomalieTypes] = useState<Anomalie1[]>([]);
  const [anomalieCategories, setAnomalieCategories] = useState<Anomalie2[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);

  const [isAnnotatorVisible, setAnnotatorVisible] = useState(false);
  const [annotatorBaseUri, setAnnotatorBaseUri] = useState<string | null>(null);
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

  const scrollViewRef = useRef<ScrollView>(null);

  const canSave = useMemo(
    () =>
      !!photo &&
      !submitting &&
      !isGeneratingDescription &&
      !isUploadingAudio &&
      !isStorageQuotaReached,
    [
      photo,
      submitting,
      isGeneratingDescription,
      isUploadingAudio,
      isStorageQuotaReached,
    ],
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

  useEffect(() => {
    async function loadUsers() {
      if (!token) {
        setCompanyUsers([]);
        return;
      }
      setLoadingUsers(true);
      try {
        const baseUrl = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
        const url = `${baseUrl}/api/users`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          setCompanyUsers([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) setCompanyUsers(data);
        else setCompanyUsers([]);
      } catch {
        setCompanyUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, [token]);

  useEffect(() => {
    async function loadAuthorName() {
      if (!token || !user) {
        setAuthorName("Utilisateur inconnu");
        return;
      }

      // Set a fallback name immediately from context if available
      if (user.firstname) {
        setAuthorName(`${user.firstname} ${user.lastname || ""}`.trim());
      } else {
        setAuthorName("Chargement...");
      }

      try {
        const baseUrl = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
        const url = `${baseUrl}/api/users`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const users = await res.json();
          if (Array.isArray(users)) {
            const currentUser = users.find((u) => u.id === user.id);
            if (currentUser && currentUser.firstname) {
              setAuthorName(
                `${currentUser.firstname} ${currentUser.lastname || ""}`.trim(),
              );
              return; // Found user, exit
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch user list for author name", e);
      }

      // If fetch fails or user not found, stick with context or default
      if (user.firstname) {
        setAuthorName(`${user.firstname} ${user.lastname || ""}`.trim());
      } else {
        setAuthorName(user.email || "Utilisateur inconnu");
      }
    }
    loadAuthorName();
  }, [token, user]);

  const handleGenerateDescription = useCallback(async () => {
    if (!photo || !token) {
      return;
    }
    setIsGeneratingDescription(true);
    setError(null);
    try {
      const description = await describeImage(token, photo);
      setIaText(description);
    } catch (e: any) {
      console.error("AI Description Error:", e);

      // Check if it's an AI refusal
      const errorData = e?.response?.data;
      if (errorData?.refusal) {
        setError(
          `IA: ${errorData.error || "L'IA ne peut pas analyser cette image."}`,
        );
      } else if (errorData?.error) {
        // Use the backend's specific error message
        setError(errorData.error);
      } else {
        // Fallback error message
        setError(
          e?.message ||
            "Échec de la génération de description. Réessayez ou décrivez manuellement.",
        );
      }
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [token, photo]);

  const handleCombineText = async () => {
    if (!audioText && !iaText) {
      setError("Au moins une source de texte (Audio ou IA) est nécessaire.");
      return;
    }

    if (!token) return;

    setIsCombiningText(true);
    setError(null);
    try {
      const combinedDescription = await combineTextDescription(
        token,
        audioText,
        iaText,
      );
      setComment(combinedDescription);
    } catch (error: any) {
      console.error("Combine text error:", error);
      setError(
        error.message ||
          "Impossible de combiner les textes. Veuillez réessayer.",
      );
    } finally {
      setIsCombiningText(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setComment("");
    setPhoto(null);
    setLatitude(null);
    setLongitude(null);
    setAudioUri(null);
    setLocationStatus("idle");
    setError(null);
    setLevel(5);
    setSelectedType(null);
    setSelectedCategorie(null);
    setAssigned("");
    setAudioText("");
    setIaText("");
    scrollViewRef.current?.scrollTo({ y: 0, animated: true }); // Scroll to top
  };

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission",
        "L'autorisation d'accéder à la caméra est requise.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = uri.split("/").pop() || "photo.jpg";
      const fileType = fileName.split(".").pop() || "jpeg";

      const newPhoto = {
        uri,
        name: fileName,
        type: `image/${fileType}`,
      };

      setPhoto(newPhoto);
    }
  }, []);

  useEffect(() => {
    handlePickPhoto();
  }, [handlePickPhoto]);

  const openAnnotatorForExisting = () => {
    if (!photo) return;
    setAnnotatorBaseUri(photo.uri);
    setAnnotatorVisible(true);
  };

  const handleSubmit = async () => {
    if (!token || !photo || !user) {
      setError(
        "Impossible de soumettre : informations utilisateur ou photo manquantes.",
      );
      return;
    }

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
      const payload: CreateGedInput = {
        idsource: parentItem.id,
        title: title || "Situation Avant",
        kind: "photoavant",
        description: comment,
        author: authorName,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        level: level,
        type: selectedType || undefined,
        categorie: selectedCategorie || undefined,
        assigned: assigned || undefined,
        file: photo,
        audiotxt: audioText,
        iatxt: iaText,
      };

      const result = await createGed(token, payload);

      if (audioUri) {
        setIsUploadingAudio(true);
        try {
          const audioPayload: CreateGedInput = {
            idsource: result.data.id,
            title: `Note vocale pour ${title || "Situation Avant"}`,
            kind: "audio",
            author: authorName,
            level: level,
            type: selectedType || undefined,
            categorie: selectedCategorie || undefined,
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
        } finally {
          setIsUploadingAudio(false);
        }
      }

      onSuccess(result.data);
      setCreationCount((prev) => prev + 1);

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
              handlePickPhoto();
            },
            style: "primary",
          },
        ],
      });
    } catch (e: any) {
      setError(e?.message || 'Échec de l\'enregistrement de la photo "avant".');
      Alert.alert(
        "Erreur",
        e?.message || "Une erreur est survenue lors de l'enregistrement.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchLocation = async () => {
      setLocationStatus("fetching");
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied.");
          setLocationStatus("error");
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
        setLocationStatus("success");
      } catch (error) {
        console.warn("Could not fetch location automatically.", error);
        setLocationStatus("error");
      }
    };
    fetchLocation();
  }, []);

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
  }, [token]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerStopButton}>
              <Text style={styles.stopButtonText}></Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {parentItem.title || `Titre de la dossier`}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {`${projectTitle} • ${zoneTitle}`}
              </Text>
            </View>
            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>{creationCount}</Text>
              <Ionicons name="images-outline" size={20} color="#11224e" />
            </View>
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
          >
            <View style={styles.card}>
              {photo ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.imagePreview}
                  />
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
                      onPress={handleGenerateDescription}
                      disabled={isGeneratingDescription}
                    >
                      {isGeneratingDescription ? (
                        <ActivityIndicator size="small" color="#11224e" />
                      ) : (
                        <Ionicons
                          name="sparkles-outline"
                          size={20}
                          color="#11224e"
                        />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, styles.iconButtonSecondary]}
                      onPress={openAnnotatorForExisting}
                    >
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color="#11224e"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, styles.iconButtonSecondary]}
                      onPress={() => setPhoto(null)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#dc2626"
                      />
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
                    Ajouter une Situation avant
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ marginTop: 16, gap: 12 }}>
                <View style={[styles.inputWrap]}>
                  <Ionicons name="text-outline" size={16} color="#6b7280" />
                  <TextInput
                    placeholder="Titre "
                    placeholderTextColor="#9ca3af"
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                  />
                </View>

                {/* Assigned User Select */}
                <View style={{ gap: 8, marginTop: 12 }}>
                  <Text
                    style={{ fontSize: 12, color: "#6b7280", marginLeft: 2 }}
                  >
                    Assigné à
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.inputWrap,
                      { justifyContent: "space-between" },
                    ]}
                    onPress={() => setAssignedOpen((v) => !v)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      <Ionicons
                        name="person-add-outline"
                        size={16}
                        color="#f87b1b"
                      />
                      <Text
                        style={[
                          styles.input,
                          { color: assigned ? "#111827" : "#9ca3af" },
                        ]}
                        numberOfLines={1}
                      >
                        {assigned
                          ? companyUsers.find(
                              (u) => String(u.id) === String(assigned),
                            )?.firstname
                            ? `${companyUsers.find((u) => String(assigned) === String(u.id))?.firstname} ${companyUsers.find((u) => String(assigned) === String(u.id))?.lastname || ""}`
                            : assigned
                          : "Choisir un utilisateur"}
                      </Text>
                    </View>
                    <Ionicons
                      name={assignedOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#f87b1b"
                    />
                  </TouchableOpacity>
                  {assignedOpen && (
                    <View
                      style={{
                        maxHeight: 200,
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {loadingUsers ? (
                          <View style={{ padding: 12 }}>
                            <Text style={{ color: "#6b7280" }}>
                              Chargement...
                            </Text>
                          </View>
                        ) : companyUsers.length === 0 ? (
                          <View style={{ padding: 12 }}>
                            <Text style={{ color: "#6b7280" }}>
                              Aucun utilisateur
                            </Text>
                          </View>
                        ) : (
                          companyUsers.map((u) => (
                            <TouchableOpacity
                              key={u.id}
                              onPress={() => {
                                setAssigned(String(u.id));
                                setAssignedOpen(false);
                              }}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                backgroundColor:
                                  String(assigned) === String(u.id)
                                    ? "#f1f5f9"
                                    : "#FFFFFF",
                                borderBottomWidth: 1,
                                borderBottomColor: "#f3f4f6",
                              }}
                            >
                              <Text style={{ color: "#11224e" }}>
                                {u.firstname || ""} {u.lastname || ""}
                              </Text>
                              {u.email ? (
                                <Text
                                  style={{ color: "#6b7280", fontSize: 12 }}
                                >
                                  {u.email}
                                </Text>
                              ) : null}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <VoiceNoteRecorder
                  key={creationCount}
                  onRecordingComplete={setAudioUri}
                  onTranscriptionComplete={setAudioText}
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

              <View style={{ marginTop: 16, gap: 12 }}>
                <Text style={styles.label}>Transcription Audio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Transcription automatique..."
                  placeholderTextColor="#9ca3af"
                  value={audioText}
                  onChangeText={setAudioText}
                  multiline
                />

                <Text style={styles.label}>Description IA</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description générée par l'IA..."
                    placeholderTextColor="#9ca3af"
                    value={iaText}
                    onChangeText={setIaText}
                    multiline
                  />
                  {isGeneratingDescription && (
                    <View style={styles.descriptionLoadingOverlay}>
                      <ActivityIndicator size="small" color="#11224e" />
                      <Text style={styles.descriptionLoadingText}>
                        Analyse en cours...
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.label}>Description finale</Text>
                <View
                  style={[
                    styles.inputWrap,
                    { alignItems: "flex-start", position: "relative" },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color="#6b7280"
                    style={{ marginTop: 4 }}
                  />
                  <TextInput
                    placeholder="Description finale..."
                    placeholderTextColor="#9ca3af"
                    value={comment}
                    onChangeText={setComment}
                    style={[styles.input, { height: 150 }]}
                    multiline
                    textAlignVertical="top"
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                    editable={!isGeneratingDescription}
                  />
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      right: 10,
                      bottom: 10,
                      backgroundColor: "#11224e",
                      padding: 8,
                      borderRadius: 20,
                      opacity: !audioText && !iaText ? 0.5 : 1,
                    }}
                    onPress={handleCombineText}
                    disabled={isCombiningText || (!audioText && !iaText)}
                  >
                    {isCombiningText ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="sparkles" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerStopButton} onPress={onClose}>
              <Ionicons name="close-circle-outline" size={20} color="#dc2626" />
              <Text style={styles.footerStopButtonText}>Arrêter</Text>
            </TouchableOpacity>
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
                  <Ionicons name="hourglass" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Enregistrement...</Text>
                </>
              ) : isGeneratingDescription ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Génération IA...</Text>
                </>
              ) : isUploadingAudio ? (
                <>
                  <Ionicons name="mic-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Note vocale...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
      {isAnnotatorVisible && annotatorBaseUri && (
        <Modal
          animationType="fade"
          visible={isAnnotatorVisible}
          onRequestClose={() => setAnnotatorVisible(false)}
        >
          <PictureAnnotator
            baseImageUri={annotatorBaseUri}
            onClose={() => setAnnotatorVisible(false)}
            onSaved={(image) => {
              setPhoto(image);
              setAnnotatorVisible(false);
            }}
            title="Annoter la photo"
          />
        </Modal>
      )}
      <CustomAlert
        visible={alertInfo.visible}
        title={alertInfo.title}
        message={alertInfo.message}
        type={alertInfo.type}
        onClose={() => setAlertInfo({ ...alertInfo, visible: false })}
        buttons={alertInfo.buttons}
      />
    </GestureHandlerRootView>
  );
}

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (created: Ged) => void;
  parentItem: Folder;
  projectTitle: string;
  zoneTitle: string;
};

export default function CreateChildQualiPhotoModal({
  visible,
  onClose,
  onSuccess,
  parentItem,
  projectTitle,
  zoneTitle,
}: ModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <CreateChildQualiPhotoForm
        onClose={onClose}
        onSuccess={onSuccess}
        parentItem={parentItem}
        projectTitle={projectTitle}
        zoneTitle={zoneTitle}
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
  headerStopButton: { padding: 8 },
  stopButtonText: { color: "#f87b1b", fontWeight: "600", fontSize: 16 },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#11224e" },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  counterContainer: {
    minWidth: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  counterText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#11224e",
  },
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  parentPhotoContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  parentPhoto: {
    width: "100%",
    aspectRatio: 2 / 1,
    backgroundColor: "#e5e7eb",
  },
  parentInfoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  contextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  parentInfoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

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
  photoPickerText: {
    color: "#475569",
    fontWeight: "600",
  },

  imagePreviewContainer: {
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 8,
    fontWeight: "600",
  },
  imagePreview: {
    width: "100%",
    aspectRatio: 2 / 1,
    borderRadius: 12,
  },
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
  descriptionLoadingText: {
    color: "#11224e",
    fontWeight: "600",
    fontSize: 12,
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
    borderColor: "#f87b1b",
  },
  typeButtonSelected: {
    backgroundColor: "#f87b1b",
    borderColor: "#f87b1b",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11224e",
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
    borderColor: "#f87b1b",
  },
  categoryButtonSelected: {
    backgroundColor: "#f87b1b",
    borderColor: "#f87b1b",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11224e",
  },
  categoryButtonTextSelected: {
    color: "#FFFFFF",
  },

  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  slider: {
    width: "100%",
    height: 40,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
  },

  stopButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    height: 48,
    flex: 1,
    borderWidth: 1,
    borderColor: "#f87b1b",
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
    gap: 12,
  },

  footerStopButton: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    flex: 1,
    borderWidth: 2,
    borderColor: "#dc2626",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  footerStopButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
    letterSpacing: 0.3,
  },

  submitButton: {
    backgroundColor: "#f87b1b",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    flex: 1.2,
    borderWidth: 2,
    borderColor: "#f87b1b",
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  submitButtonDisabled: {
    backgroundColor: "#d1d5db",
    borderColor: "#d1d5db",
    shadowOpacity: 0,
    elevation: 0,
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
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
});
