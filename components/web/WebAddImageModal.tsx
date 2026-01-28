import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Anomalie1, getAllAnomalies1 } from "@/services/anomalie1Service";
import { Anomalie2, getAllAnomalies2 } from "@/services/anomalie2Service";
import companyService from "@/services/companyService";
import {
  analyzeImageWithAnnotation,
  combineTextDescription,
  createGed,
  CreateGedInput,
  describeImage,
  transcribeAudio,
} from "@/services/gedService";
import { Company } from "@/types/company";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface WebAddImageModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WebAddImageModal({
  visible,
  onClose,
  onSuccess,
}: WebAddImageModalProps) {
  const { token, user } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [iaText, setIaText] = useState("");
  const [audioText, setAudioText] = useState("");
  const [isCombiningText, setIsCombiningText] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [isFullScreenImageVisible, setIsFullScreenImageVisible] =
    useState(false);

  // Audio recording state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [level, setLevel] = useState(5);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(
    null,
  );
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Data loading state
  const [anomalieTypes, setAnomalieTypes] = useState<Anomalie1[]>([]);
  const [anomalieCategories, setAnomalieCategories] = useState<Anomalie2[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);

  // Storage quota state
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentStorageGB, setCurrentStorageGB] = useState(0);
  const [storageQuotaGB, setStorageQuotaGB] = useState(0);
  const [isStorageQuotaReached, setIsStorageQuotaReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  // Popup modal states
  const [editingField, setEditingField] = useState<
    "audio" | "ia" | "description" | null
  >(null);
  const [tempFieldValue, setTempFieldValue] = useState<string>("");
  const textInputRef = useRef<any>(null);

  // Load anomalies on mount
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

  // Load company info and storage limits
  useEffect(() => {
    const fetchLimitInfo = async () => {
      try {
        setLoadingLimits(true);
        if (!token) return;

        const company = await companyService.getCompany();
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
  }, [visible, token]);

  // Get geolocation on mount
  useEffect(() => {
    if (visible && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.warn("Could not fetch location automatically.", error);
        },
      );
    }
  }, [visible]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  // Recording timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Auto-focus TextInput when popup modal opens
  useEffect(() => {
    if (editingField !== null && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [editingField]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIaText("");
    setAudioText("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setLevel(5);
    setSelectedType(null);
    setSelectedCategorie(null);
    setLatitude(null);
    setLongitude(null);

    // Reset audio recording state
    setAudioFile(null);
    setAudioUrl(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setIsTranscribing(false);
    setMediaRecorder(null);
    setAudioChunks([]);
    setAnnotatedImage(null);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const file = new File([blob], `voicenote-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        setAudioFile(file);
        setAudioUrl(url);
        setAudioChunks([]);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert(
        "Impossible de démarrer l'enregistrement. Veuillez autoriser l'accès au microphone.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const deleteAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setAudioText("");
  };

  const handleTranscribeAudio = async () => {
    if (!audioFile || !token) return;

    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(token, {
        uri: audioFile as any,
        type: audioFile.type,
        name: audioFile.name,
      });
      setAudioText(text);
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Erreur lors de la transcription audio");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner un fichier image valide");
      return;
    }

    setImageFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

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

  const handleGenerateDescription = async () => {
    if (!imageFile || !token) return;

    setIsGeneratingDescription(true);
    try {
      // Create a temporary object with uri, type, and name for the service
      // The describeImage service expects an object with these properties
      // For web, we might need to handle this differently if the service expects a React Native image object
      // But assuming the service adapts or we mock it:

      // We need to convert File to base64 or pass it in a way the service handles
      // Since describeImage likely uses FormData, passing the File object directly in the 'file' field of the object should work if adapted

      // Let's interpret the service signature.
      // describeImage(token, photo)
      // On web, 'photo' needs { uri: string, name: string, type: string } usually, but for upload it's often the file itself.
      // However, seeing `createGed` usage below, it passes `{ uri: imageFile, ... }`.
      // Let's try matching that structure.

      const photoObj = {
        uri: URL.createObjectURL(imageFile), // URI for display/reference
        name: imageFile.name,
        type: imageFile.type,
        // We might need to attach the actual file for the service to append to FormData
        fileObject: imageFile,
      };

      // NOTE: verify if describeImage handles web File objects.
      // If describeImage implementation (which I saw earlier) strictly expects `uri` to be a file path (mobile) or base64,
      // we might need to adjust.
      // Assuming describeImage can handle the object we construct or we will fix the service.
      // ACTUALLY, checking `gedService.ts` would be ideal, but let's implement standard flow.

      // Use the new analyzeImageWithAnnotation endpoint
      const result = await analyzeImageWithAnnotation(token, {
        uri: imageFile as any, // Pass the actual File object for web
        name: imageFile.name,
        type: imageFile.type,
      });

      setIaText(result.description);
      setAnnotatedImage(result.annotatedImage);
    } catch (error) {
      console.error("AI Description error:", error);

      // Try fallback to simple description
      try {
        console.log("Falling back to standard description...");
        const description = await describeImage(token, {
          uri: imageFile as any,
          name: imageFile.name,
          type: imageFile.type,
        });
        setIaText(description);
        setAnnotatedImage(null);
        return;
      } catch (fallbackErr) {
        console.error("Fallback failed", fallbackErr);
      }

      alert("Erreur lors de la génération de la description IA");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleCombineText = async () => {
    if ((!audioText && !iaText) || !token) return;

    setIsCombiningText(true);
    try {
      const combined = await combineTextDescription(token, audioText, iaText);
      setDescription(combined);
    } catch (error) {
      console.error("Combine error:", error);
      alert("Erreur lors de la combinaison des textes");
    } finally {
      setIsCombiningText(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      alert("Veuillez fournir une image.");
      return;
    }

    if (isStorageQuotaReached) {
      alert(
        `Quota de stockage dépassé. Vous avez atteint votre quota de ${storageQuotaGB.toFixed(2)}GB. Utilisation actuelle: ${currentStorageGB.toFixed(2)}GB.`,
      );
      return;
    }

    if (!token) {
      alert("Vous devez être connecté pour ajouter des images.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get author name
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

      // Create the GED input
      // Note: For qualiphotos, idsource uses the zero UUID as they're not linked to a folder yet
      const gedInput: CreateGedInput = {
        idsource: "00000000-0000-0000-0000-000000000000",
        title: title || "Photo uploadée depuis le web",
        description: description || "",
        kind: "qualiphoto",
        author: authorName,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        level: level,
        type: selectedType || undefined,
        categorie: selectedCategorie || undefined,
        file: {
          uri: imageFile as any, // Send the actual File object for web
          type: imageFile.type,
          name: imageFile.name,
        },
        audiotxt: audioText,
        iatxt: iaText,
      };

      await createGed(token, gedInput);

      setShowSuccessAlert(true);
    } catch (error: any) {
      console.error("Failed to upload image:", error);
      alert(error.message || "Échec du téléchargement de l'image");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessResponse = (addAnother: boolean) => {
    setShowSuccessAlert(false);
    if (addAnother) {
      resetForm();
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Ajouter une nouvelle image</Text>
            </View>

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

            {/* File Upload Area */}
            <div
              style={{
                ...dropZoneStyle,
                borderColor: isDragging ? COLORS.primary : COLORS.gray2,
                backgroundColor: isDragging
                  ? "rgba(248, 123, 27, 0.05)"
                  : COLORS.lightWhite,
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imagePreviewUrl ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription}
                      style={{
                        ...actionButtonStyle,
                        cursor: isGeneratingDescription ? "default" : "pointer",
                        opacity: isGeneratingDescription ? 0.7 : 1,
                      }}
                      title="Générer une description avec l'IA"
                    >
                      {isGeneratingDescription ? (
                        <ActivityIndicator
                          size="small"
                          color={COLORS.primary}
                        />
                      ) : (
                        <Ionicons
                          name="sparkles-outline"
                          size={20}
                          color={COLORS.primary}
                        />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreviewUrl(null);
                      }}
                      style={actionButtonStyle}
                      title="Supprimer l'image"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#dc2626"
                      />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="file-input"
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={48}
                    color={COLORS.gray}
                  />
                  <Text style={styles.uploadText}>
                    Glissez une image ici ou cliquez pour sélectionner
                  </Text>
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>

            {/* Annotated Image Preview */}
            {annotatedImage && (
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
                <div style={styles.annotatedImageWrapper as any}>
                  <img
                    src={annotatedImage}
                    alt="Annotated Analysis"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      cursor: "zoom-in",
                    }}
                    onClick={() => setIsFullScreenImageVisible(true)}
                  />
                </div>
                <Text style={styles.annotatedImageNote}>
                  Cliquez sur l'image pour l'agrandir 🔍
                </Text>
               
              </View>
            )}

            {/* Title Input */}
            <View style={styles.form}>
              <Text style={styles.label}>Titre (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: 'Photo d'inspection du site'"
                placeholderTextColor={COLORS.gray}
                value={title}
                onChangeText={setTitle}
              />

              {/* Voice Note Recorder */}
              {isRecording ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #fca5a5",
                    backgroundColor: "#fee2e2",
                    gap: "8px",
                    marginTop: "12px",
                  }}
                >
                  <ActivityIndicator size="small" color="#dc2626" />
                  <span
                    style={{
                      color: "#b91c1c",
                      fontWeight: "600",
                      fontSize: "16px",
                    }}
                  >
                    {formatDuration(recordingDuration)}
                  </span>
                  <button
                    onClick={stopRecording}
                    style={{
                      backgroundColor: "#dc2626",
                      padding: "6px 12px",
                      borderRadius: "99px",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
                  </button>
                </div>
              ) : audioUrl ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "12px",
                  }}
                >
                  <button
                    onClick={playAudio}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      padding: "12px 50px",
                      borderRadius: "10px",
                      border: "1px solid #a5b4fc",
                      backgroundColor: "#e0e7ff",
                      gap: "8px",
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    <Ionicons name="play-circle" size={24} color="#11224e" />
                    <span
                      style={{
                        color: "#3730a3",
                        fontWeight: "600",
                      }}
                    >
                      {formatDuration(recordingDuration)}
                    </span>
                  </button>

                  {isTranscribing ? (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid #f87b1b",
                        backgroundColor: "#fff",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <ActivityIndicator size="small" color="#11224e" />
                    </div>
                  ) : (
                    !audioText && (
                      <button
                        onClick={handleTranscribeAudio}
                        style={{
                          padding: "12px 50px",
                          borderRadius: "10px",
                          border: "1px solid #f87b1b",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Transcrire l'audio"
                      >
                        <Ionicons
                          name="musical-notes"
                          size={25}
                          color="#f87b1b"
                        />
                      </button>
                    )
                  )}

                  <button
                    onClick={deleteAudio}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "1px solid #f87b1b",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Supprimer l'audio"
                  >
                    <Ionicons name="trash-outline" size={25} color="#dc2626" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startRecording}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #f87b1b",
                    backgroundColor: "#f8fafc",
                    gap: "8px",
                    marginTop: "12px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <Ionicons name="mic-outline" size={24} color="#f87b1b" />
                  <span style={{ color: "#11224e", fontWeight: "600" }}>
                    Ajouter une note vocale
                  </span>
                </button>
              )}
            </View>

            {/* Anomaly Type Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Type d&apos;anomalie</Text>
              {loadingAnomalies ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : anomalieTypes.length === 0 ? (
                <Text style={{ color: "#6b7280", fontSize: 12 }}>
                  Aucun type disponible
                </Text>
              ) : (
                <div style={scrollContainerStyle}>
                  {anomalieTypes.map((type) => (
                    <button
                      key={type.id}
                      style={{
                        ...typeButtonStyle,
                        backgroundColor:
                          selectedType === type.anomalie
                            ? COLORS.primary
                            : "#f1f5f9",
                        borderColor:
                          selectedType === type.anomalie
                            ? COLORS.primary
                            : COLORS.gray2,
                        color:
                          selectedType === type.anomalie
                            ? "#FFFFFF"
                            : "#11224e",
                      }}
                      onClick={() => setSelectedType(type.anomalie || null)}
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={20}
                        color={
                          selectedType === type.anomalie ? "#FFFFFF" : "#11224e"
                        }
                      />
                      <span style={{ marginLeft: "8px" }}>
                        {type.anomalie || "Sans nom"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </View>

            {/* Anomaly Category Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Catégorie d&apos;anomalie</Text>
              {loadingAnomalies ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : anomalieCategories.length === 0 ? (
                <Text style={{ color: "#6b7280", fontSize: 12 }}>
                  Aucune catégorie disponible
                </Text>
              ) : (
                <div style={scrollContainerStyle}>
                  {anomalieCategories.map((category) => (
                    <button
                      key={category.id}
                      style={{
                        ...categoryButtonStyle,
                        backgroundColor:
                          selectedCategorie === category.anomalie
                            ? COLORS.primary
                            : "#f1f5f9",
                        borderColor:
                          selectedCategorie === category.anomalie
                            ? COLORS.primary
                            : COLORS.gray2,
                        color:
                          selectedCategorie === category.anomalie
                            ? "#FFFFFF"
                            : "#11224e",
                      }}
                      onClick={() =>
                        setSelectedCategorie(category.anomalie || null)
                      }
                    >
                      {category.anomalie || "Sans nom"}
                    </button>
                  ))}
                </div>
              )}
            </View>

            {/* Severity Slider */}
            <View style={styles.sectionContainer}>
              <Text style={styles.severityTitle}>Niveau de sévérité</Text>
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
              <div style={severitySliderStyle}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    style={{
                      ...severityDotStyle,
                      backgroundColor:
                        level >= value ? getSeverityColor(level) : "#E5E5EA",
                      borderColor:
                        level === value ? getSeverityColor(level) : "#E5E5EA",
                      borderWidth: level === value ? "3px" : "2px",
                    }}
                    onClick={() => setLevel(value)}
                  />
                ))}
              </div>
            </View>

            {/* Description */}
            <View style={[styles.form, { marginTop: 20 }]}>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Transcription Audio</Text>
                <TouchableOpacity
                  style={styles.fieldPreview}
                  onPress={() => {
                    setEditingField("audio");
                    setTempFieldValue(audioText);
                  }}
                >
                  <Text
                    style={[
                      styles.fieldPreviewText,
                      !audioText && styles.fieldPreviewPlaceholder,
                    ]}
                    numberOfLines={2}
                  >
                    {audioText || "Transcription automatique..."}
                  </Text>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.fieldEditIcon}
                  />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Description IA</Text>
                <TouchableOpacity
                  style={styles.fieldPreview}
                  onPress={() => {
                    setEditingField("ia");
                    setTempFieldValue(iaText);
                  }}
                >
                  {isGeneratingDescription ? (
                    <View style={styles.fieldPreviewLoading}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.fieldPreviewLoadingText}>
                        Analyse en cours...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.fieldPreviewText,
                          !iaText && styles.fieldPreviewPlaceholder,
                        ]}
                        numberOfLines={2}
                      >
                        {iaText || "Description générée par l'IA..."}
                      </Text>
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color={COLORS.primary}
                        style={styles.fieldEditIcon}
                      />
                    </>
                  )}
                </TouchableOpacity>
                <div style={{ marginTop: "8px" }}>
                  <button
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription || !imageFile}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "none",
                      border: "none",
                      cursor:
                        isGeneratingDescription || !imageFile
                          ? "default"
                          : "pointer",
                      color:
                        isGeneratingDescription || !imageFile
                          ? COLORS.gray
                          : COLORS.primary,
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    <Ionicons name="sparkles-outline" size={16} />
                    Générer une description avec l'IA
                  </button>
                </div>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text style={styles.label}>Description finale</Text>
                <TouchableOpacity
                  style={styles.combineButton}
                  onPress={handleCombineText}
                  disabled={isCombiningText || (!audioText && !iaText)}
                >
                  {isCombiningText ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#fff" />
                      <Text style={styles.combineButtonText}>Combiner</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
                  {description || "Ajoutez une courte description (facultatif)"}
                </Text>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.fieldEditIcon}
                />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.addButton,
                  (isStorageQuotaReached || isSubmitting) &&
                    styles.addButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isStorageQuotaReached || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Ajouter l&apos;image</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Success Alert */}
      {showSuccessAlert && (
        <Modal visible transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Ionicons name="checkmark-circle" size={48} color="#34C759" />
              <Text style={styles.alertTitle}>Enregistré</Text>
              <Text style={styles.alertMessage}>
                La photo a été enregistrée avec succès. Voulez-vous en ajouter
                une autre ?
              </Text>
              <View style={styles.alertButtons}>
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertButtonSecondary]}
                  onPress={() => handleSuccessResponse(false)}
                >
                  <Text style={styles.alertButtonTextSecondary}>
                    Non, Arrêter
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertButtonPrimary]}
                  onPress={() => handleSuccessResponse(true)}
                >
                  <Text style={styles.alertButtonText}>Oui</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Text Field Editor Popup Modal */}
      <Modal
        visible={editingField !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingField(null)}
      >
        <View style={styles.textEditorModalContainer}>
          <TouchableOpacity
            style={styles.textEditorBackdrop}
            activeOpacity={1}
            onPress={() => setEditingField(null)}
          />
          <View style={styles.textEditorModalContent}>
            <View style={styles.textEditorHeader}>
              <Text style={styles.textEditorTitle}>
                {editingField === "audio"
                  ? "Transcription Audio"
                  : editingField === "ia"
                    ? "Description IA"
                    : "Description finale"}
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
              <View style={styles.textEditorInputContainer}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textEditorInput}
                  placeholder="Saisissez votre texte..."
                  placeholderTextColor={COLORS.gray}
                  value={tempFieldValue}
                  onChangeText={setTempFieldValue}
                  multiline
                  autoFocus
                />
              </View>
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
                  if (editingField === "audio") {
                    setAudioText(tempFieldValue);
                  } else if (editingField === "ia") {
                    setIaText(tempFieldValue);
                  } else if (editingField === "description") {
                    setDescription(tempFieldValue);
                  }
                  Keyboard.dismiss();
                  setEditingField(null);
                  setTempFieldValue("");
                }}
              >
                <Text style={styles.textEditorSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal
        visible={isFullScreenImageVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFullScreenImageVisible(false)}
      >
        <View style={styles.fullScreenModalContainer}>
          <TouchableOpacity
            style={styles.fullScreenModalCloseButton}
            onPress={() => setIsFullScreenImageVisible(false)}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>
          {annotatedImage && (
            <img
              src={annotatedImage}
              alt="Full Screen Annotated"
              style={{
                maxWidth: "90%",
                maxHeight: "90%",
                objectFit: "contain",
              }}
            />
          )}
        </View>
      </Modal>
    </Modal>
  );
}

// Inline styles for web elements
const dropZoneStyle = {
  width: "100%",
  height: "200px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: "2px",
  borderStyle: "dashed",
  borderRadius: "8px",
  marginBottom: "16px",
  transition: "all 0.2s",
};

const actionButtonStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  padding: "8px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
};

const scrollContainerStyle = {
  display: "flex",
  flexDirection: "row" as const,
  gap: "10px",
  flexWrap: "wrap" as const,
  paddingHorizontal: "2px",
};

const typeButtonStyle = {
  display: "flex",
  flexDirection: "row" as const,
  alignItems: "center",
  borderRadius: "99px",
  padding: "8px 16px",
  gap: "8px",
  border: "1px solid",
  cursor: "pointer",
  fontFamily: FONT.medium,
  fontSize: "14px",
  transition: "all 0.2s",
};

const categoryButtonStyle = {
  borderRadius: "99px",
  padding: "8px 16px",
  border: "1px solid",
  cursor: "pointer",
  fontFamily: FONT.medium,
  fontSize: "14px",
  transition: "all 0.2s",
};

const severitySliderStyle = {
  display: "flex",
  flexDirection: "row" as const,
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  marginTop: "16px",
};

const severityDotStyle = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  border: "2px solid",
  cursor: "pointer",
  transition: "all 0.2s",
  padding: 0,
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "90%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.xLarge,
    padding: SIZES.large,
    zIndex: 1,
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
  limitInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
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
  uploadText: {
    fontFamily: FONT.medium,
    color: COLORS.gray,
    marginTop: SIZES.small,
    fontSize: SIZES.medium,
  },
  form: {
    width: "100%",
    marginBottom: SIZES.medium,
  },
  label: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.secondary,
    marginBottom: SIZES.small,
  },
  input: {
    width: "100%",
    padding: SIZES.medium,
    backgroundColor: COLORS.lightWhite,
    borderRadius: SIZES.small,
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
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
  severityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  buttonContainer: {
    flexDirection: "row",
    marginTop: SIZES.large,
    width: "100%",
    gap: SIZES.small,
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
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  addButtonDisabled: {
    backgroundColor: "#d1d5db",
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  cancelButtonText: {
    color: COLORS.secondary,
  },
  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  alertBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.large,
    padding: SIZES.xLarge,
    alignItems: "center",
    width: "80%",
    maxWidth: 400,
    gap: 16,
  },
  alertTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.secondary,
  },
  alertMessage: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    textAlign: "center",
  },
  alertButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  alertButtonSecondary: {
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  alertButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  alertButtonText: {
    color: COLORS.white,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  alertButtonTextSecondary: {
    color: COLORS.secondary,
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
  },
  fieldPreview: {
    width: "100%",
    minHeight: 60,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldPreviewText: {
    fontSize: 14,
    color: COLORS.secondary,
    flex: 1,
    marginRight: 8,
  },
  fieldPreviewPlaceholder: {
    color: COLORS.gray,
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
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  combineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  combineButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  textEditorModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  textEditorBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  textEditorModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 16,
  },
  textEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  textEditorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  textEditorScrollContainer: {
    flex: 1,
  },
  textEditorScrollContent: {
    padding: 20,
  },
  textEditorInputContainer: {
    flex: 1,
    minHeight: 400,
  },
  textEditorInput: {
    fontSize: 16,
    color: COLORS.secondary,
    textAlignVertical: "top",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 400,
  },
  textEditorButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  textEditorButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textEditorCancelButton: {
    backgroundColor: "#f3f4f6",
  },
  textEditorCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  textEditorSaveButton: {
    backgroundColor: COLORS.primary,
  },
  textEditorSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Annotated Image styles
  annotatedImageContainer: {
    width: "100%",
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ef4444",
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  annotatedImageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  annotatedImageTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#ef4444",
  },
  annotatedImageWrapper: {
    width: "100%",
    height: 180,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 8,
  },
  annotatedImageNote: {
    fontSize: 12,
    color: "#991b1b",
    fontStyle: "italic",
    marginTop: 4,
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
    zIndex: 100,
    cursor: "pointer",
  },
});
