import { useAuth } from "@/contexts/AuthContext";
import { createGed, Ged } from "@/services/gedService";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert } from "react-native";
import AddImageModal from "../galerie/AddImageModal";

interface CreateLinkedGedModalProps {
  visible: boolean;
  onClose: () => void;
  sourceGedId: string;
  onSuccess?: (newGed: Ged) => void;
}

export default function CreateLinkedGedModal({
  visible,
  onClose,
  sourceGedId,
  onSuccess,
}: CreateLinkedGedModalProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (
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
  ) => {
    if (!token || !data.image) {
      Alert.alert(
        "Erreur",
        "Informations manquantes pour créer l'enregistrement.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the file object for the image
      const imageFile = {
        uri: data.image.uri,
        type: data.image.type === "video" ? "video/mp4" : "image/jpeg",
        name: data.image.fileName || `image-${Date.now()}.jpg`,
      };

      // Prepare the audio file if present
      const audioFile = data.voiceNote
        ? {
            uri: data.voiceNote.uri,
            type: data.voiceNote.type,
            name: data.voiceNote.name,
          }
        : undefined;

      // Create the GED record with idsource set to the source GED ID
      const response = await createGed(token, {
        answer: null, // Required field for CreateGedInput
        idsource: sourceGedId, // THIS IS THE KEY: link to the original picture
        title: data.title || "Enregistrement lié",
        description: data.description,
        kind: "complementaire", // Use a specific kind for linked records
        author: data.author,
        idauthor: data.idauthor,
        iddevice: data.iddevice,
        latitude: data.latitude?.toString(),
        longitude: data.longitude?.toString(),
        altitude: data.altitude?.toString(),
        accuracy: data.accuracy?.toString(),
        altitudeAccuracy: data.altitudeAccuracy?.toString(),
        level: data.level,
        type: data.type || undefined,
        categorie: data.categorie || undefined,
        audiotxt: data.audiotxt,
        iatxt: data.iatxt,
        mode: data.mode,
        file: imageFile,
        audioFile: audioFile,
      });

      Alert.alert("Succès", "L'enregistrement lié a été créé avec succès.", [
        {
          text: "OK",
          onPress: () => {
            if (shouldClose) {
              onClose();
            }
            if (onSuccess) {
              onSuccess(response.data);
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error("Failed to create linked GED:", error);
      Alert.alert(
        "Erreur",
        error.message || "Échec de la création de l'enregistrement lié.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AddImageModal
      visible={visible}
      onClose={onClose}
      onAdd={handleAdd}
      modalTitle="Créer un enregistrement lié"
      buttonText="Créer l'enregistrement"
      placeholderText="Prendre une photo ou vidéo"
    />
  );
}
