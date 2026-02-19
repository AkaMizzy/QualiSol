import { useAuth } from "@/contexts/AuthContext";
import companySectorService, {
  CompanySector,
} from "@/services/companySectorService";
import companyService from "@/services/companyService";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Company } from "../../types/company";
import AppHeader from "../AppHeader";

interface CompanyEditModalProps {
  visible: boolean;
  onClose: () => void;
  company: Company | null;
  onUpdated: (updatedCompany: Company) => void;
}

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  multiline?: boolean;
  required?: boolean;
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <TextInput
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
  </View>
);

const StatItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label} :</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

export default function CompanyEditModal({
  visible,
  onClose,
  company,
  onUpdated,
}: CompanyEditModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    ice_number: "",
    prompt1: "",
    prompt3: "",
    prompt4: "",
    prompt5: "",
    idsector1: "",
    idsector2: "",
    idsector3: "",
    idsector4: "",
    idsector5: "",
  });

  const [sectors, setSectors] = useState<CompanySector[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    try {
      setSectorsLoading(true);
      const data = await companySectorService.getAllSectors();
      setSectors(data);
    } catch (error) {
      console.error("Failed to fetch sectors", error);
    } finally {
      setSectorsLoading(false);
    }
  };

  useEffect(() => {
    if (company) {
      setFormData({
        title: company.title || "",
        description: company.description || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        city: company.city || "",
        country: company.country || "",
        ice_number: company.ice_number || "",
        prompt1:
          company.prompt1 ||
          "Critiquer et relever les anomalies dans cette image en 100 mots. Soyez critique.",
        prompt3: company.prompt3 || "",
        prompt4: company.prompt4 || "",
        prompt5: company.prompt5 || "",
        idsector1: company.idsector1 || "",
        idsector2: company.idsector2 || "",
        idsector3: company.idsector3 || "",
        idsector4: company.idsector4 || "",
        idsector5: company.idsector5 || "",
      });
    }
  }, [company]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePickLogo = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "Vous devez autoriser l'accès à la galerie pour sélectionner un logo",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Erreur", "Impossible de sélectionner une image");
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert("Erreur", "Le nom de l'organisme est requis");
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert("Erreur", "L'email principal est requis");
      return false;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert("Erreur", "Veuillez entrer un email valide");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !company) return;

    setIsLoading(true);
    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        country: formData.country.trim() || null,
        ice_number: formData.ice_number.trim() || null,
        prompt1: formData.prompt1.trim() || null,
        prompt3: formData.prompt3.trim() || null,
        prompt4: formData.prompt4.trim() || null,
        prompt5: formData.prompt5.trim() || null,
        idsector1: formData.idsector1 || null,
        idsector2: formData.idsector2 || null,
        idsector3: formData.idsector3 || null,
        idsector4: formData.idsector4 || null,
        idsector5: formData.idsector5 || null,
      };

      const updatedCompany = await companyService.updateCompany(
        updateData,
        logoUri,
      );
      onUpdated(updatedCompany);
      onClose();
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <AppHeader
            user={user || undefined}
            onLogoPress={onClose}
            showProfile={false}
            rightComponent={
              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  isLoading && styles.saveButtonDisabled,
                ]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#f87b1b" />
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            }
          />

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Company Information */}
            <View style={styles.section}>
              <InputField
                label="Email principal"
                value={formData.email}
                onChangeText={(text) => handleInputChange("email", text)}
                placeholder="email@exemple.com"
                keyboardType="email-address"
                required
              />
              <InputField
                label="Téléphone"
                value={formData.phone}
                onChangeText={(text) => handleInputChange("phone", text)}
                placeholder="+33 1 23 45 67 89"
                keyboardType="phone-pad"
              />
              <InputField
                label="Adresse"
                value={formData.address}
                onChangeText={(text) => handleInputChange("address", text)}
                placeholder="123 Rue de l'Exemple"
              />

              <InputField
                label="country"
                value={formData.country}
                onChangeText={(text) => handleInputChange("country", text)}
                placeholder="Maroc"
              />
              <InputField
                label="Ville"
                value={formData.city}
                onChangeText={(text) => handleInputChange("city", text)}
                placeholder="Paris"
              />
            </View>

            {/* Sectors Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Secteurs d&apos;activité</Text>
              <Text style={styles.promptDescription}>
                Sélectionnez jusqu&apos;à 5 secteurs d&apos;activité pour votre
                entreprise.
              </Text>

              {[1, 2, 3, 4, 5].map((num) => {
                const key = `idsector${num}` as keyof typeof formData;
                const value = formData[key];

                return (
                  <View key={key} style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Secteur {num}</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => {
                        Alert.alert(
                          `Sélectionner Secteur ${num}`,
                          "Choisissez un secteur",
                          [
                            {
                              text: "Aucun",
                              style: "destructive",
                              onPress: () => handleInputChange(key, ""),
                            },
                            ...sectors.map((s) => ({
                              text: s.sector,
                              onPress: () =>
                                handleInputChange(key, s.id.toString()),
                            })),
                            { text: "Annuler", style: "cancel" },
                          ],
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerText,
                          !value && styles.placeholderText,
                        ]}
                      >
                        {value
                          ? sectors.find((s) => s.id.toString() === value)
                              ?.sector || "Secteur introuvable"
                          : "Sélectionner un secteur"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Prompts Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Prompts pour description d&apos;image
              </Text>
              <Text style={styles.promptDescription}>
                Configurez les prompts utilisés pour décrire les images par
                l&apos;intelligence artificielle.
              </Text>

              <InputField
                label="Prompt 1"
                value={formData.prompt1}
                onChangeText={(text) => handleInputChange("prompt1", text)}
                placeholder="Prompt pour la description d'image"
                multiline
              />
              <InputField
                label="Prompt 2"
                value={formData.prompt3}
                onChangeText={(text) => handleInputChange("prompt3", text)}
                placeholder="Prompt pour la description d'image (optionnel)"
                multiline
              />
              <InputField
                label="Prompt 3"
                value={formData.prompt4}
                onChangeText={(text) => handleInputChange("prompt4", text)}
                placeholder="Prompt pour la description d'image (optionnel)"
                multiline
              />
              <InputField
                label="Prompt 4"
                value={formData.prompt5}
                onChangeText={(text) => handleInputChange("prompt5", text)}
                placeholder="Prompt pour la description d'image (optionnel)"
                multiline
              />
            </View>

            {/* Statistics Section */}
            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Text style={styles.sectionTitle}>Statistiques</Text>
              <View style={styles.statsGrid}>
                <StatItem label="Utilisateurs" value={company?.nbusers || 0} />
                <StatItem
                  label="Chantiers"
                  value={company?.nbchanitiers || 0}
                />
                <StatItem label="Dossiers" value={company?.nbfolders || 0} />
                <StatItem label="Images" value={company?.nbimages || 0} />
                <StatItem
                  label="Taille Images"
                  value={
                    company?.sizeimages
                      ? `${(company.sizeimages / (1024 * 1024)).toFixed(2)} MB`
                      : "0 MB"
                  }
                />
                <StatItem
                  label="Images Prises"
                  value={company?.nbimagetake || 0}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  saveButton: {
    backgroundColor: "#f87b1b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f87b1b",
    marginBottom: 20,
  },
  promptDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#f87b1b",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    color: "#11224e",
    backgroundColor: "white",
  },
  multilineInput: {
    height: 150,
    textAlignVertical: "top",
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
  },
  logoButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#11224e",
    marginLeft: 8,
  },
  logoPreview: {
    marginTop: 12,
    alignItems: "center",
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    width: "48%",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f87b1b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: 13,
    color: "#f87b1b",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#11224e",
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: "white",
  },
  pickerText: {
    fontSize: 16,
    color: "#11224e",
  },
  placeholderText: {
    color: "#9ca3af",
  },
} as const;
