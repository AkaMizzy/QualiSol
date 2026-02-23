import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { User } from "../../contexts/AuthContext";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (data: { timebetween?: number }) => Promise<boolean>;
}

export default function SettingsModal({
  visible,
  onClose,
  user,
  onUpdate,
}: SettingsModalProps) {
  const [timebetweenStr, setTimebetweenStr] = useState("5");
  const [limitpageStr, setLimitpageStr] = useState("10"); // Placeholder
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user) {
      setTimebetweenStr(
        user.timebetween !== undefined ? user.timebetween.toString() : "5",
      );
      setError(null);
    }
  }, [visible, user]);

  const handleSubmit = async () => {
    const timeNum = parseInt(timebetweenStr, 10);

    if (isNaN(timeNum) || timeNum < 0) {
      setError("Le délai auto-capture doit être un nombre positif ou nul.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const success = await onUpdate({ timebetween: timeNum });
      if (success) {
        onClose();
      } else {
        setError("Erreur lors de la mise à jour des paramètres.");
      }
    } catch (err: any) {
      setError("Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Paramètres</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Délai auto-capture (secondes)</Text>
            <TextInput
              style={styles.input}
              value={timebetweenStr}
              onChangeText={setTimebetweenStr}
              placeholder="ex: 5"
              keyboardType="number-pad"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>
              Limite de page (Bientôt disponible)
            </Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={limitpageStr}
              editable={false}
              onChangeText={setLimitpageStr}
              placeholder="ex: 10"
              keyboardType="number-pad"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#11224e",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#11224e",
  },
  inputDisabled: {
    backgroundColor: "#E5E7EB",
    color: "#6B7280",
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: "#EF4444",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#F9FAFB",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#f87b1b",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
