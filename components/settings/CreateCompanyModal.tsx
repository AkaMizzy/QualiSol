import AppHeader from "@/components/AppHeader";
import CustomAlert from "@/components/CustomAlert";
import { useAuth } from "@/contexts/AuthContext";
import { adminCreateCompany } from "@/services/adminCompanyService";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

interface Country {
  name: string;
  flag: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CreateCompanyModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    pays: "",
    ville: "",
    phone: "",
    email: "",
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isCountryModalVisible, setCountryModalVisible] = useState(false);
  const [isCityModalVisible, setCityModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertState, setAlertState] = useState({
    visible: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  // Fetch country list on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch(
          "https://countriesnow.space/api/v0.1/countries/flag/images",
        );
        const data = await response.json();
        if (!data.error) setCountries(data.data);
      } catch {
        console.error("Failed to fetch countries");
      }
    };
    fetchCountries();
  }, []);

  // Fetch cities whenever country changes
  useEffect(() => {
    if (!formData.pays) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      setIsFetchingCities(true);
      try {
        const response = await fetch(
          "https://countriesnow.space/api/v0.1/countries/cities",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country: formData.pays }),
          },
        );
        const data = await response.json();
        setCities(data.error ? [] : data.data);
      } catch {
        setCities([]);
      } finally {
        setIsFetchingCities(false);
      }
    };
    fetchCities();
  }, [formData.pays]);

  const handleInputChange = (field: string, value: string) => {
    if (field === "pays") {
      setFormData((prev) => ({ ...prev, [field]: value, ville: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const resetForm = () => {
    setFormData({ title: "", pays: "", ville: "", phone: "", email: "" });
    setSearchQuery("");
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  const handleSubmit = async () => {
    if (!isValidEmail(formData.email)) {
      setAlertState({
        visible: true,
        type: "error",
        title: "Erreur",
        message: "Adresse e-mail invalide.",
      });
      return;
    }

    const requiredFields = [
      "title",
      "email",
      "phone",
      "pays",
      "ville",
    ] as const;
    for (const field of requiredFields) {
      if (!formData[field]) {
        setAlertState({
          visible: true,
          type: "error",
          title: "Champs requis",
          message: `Le champ '${field}' est requis.`,
        });
        return;
      }
    }

    setIsLoading(true);
    const result = await adminCreateCompany(formData);
    setIsLoading(false);

    if (result.success) {
      setAlertState({
        visible: true,
        type: "success",
        title: "Succès",
        message:
          "✅ L'organisme a été créé avec succès. Le mot de passe administrateur a été envoyé par e-mail.",
      });
      resetForm();
      setTimeout(() => {
        setAlertState((prev) => ({ ...prev, visible: false }));
        onClose();
      }, 2500);
    } else {
      setAlertState({
        visible: true,
        type: "error",
        title: "Erreur",
        message: `⚠️ ${result.error}`,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={false}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <AppHeader
          user={user || undefined}
          rightComponent={
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#11224e" />
            </TouchableOpacity>
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Page title */}
            <View style={styles.titleBlock}>
              <Ionicons name="gift" size={32} color="#f87b1b" />
              <Text style={styles.titleText}>
                Parrainer un confrère et bénéficier de nombreux avantages
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color="#10b981"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.infoText}>
                Action réservée au super-utilisateur. Un compte administrateur
                sera automatiquement créé et les identifiants envoyés par
                e-mail.
              </Text>
            </View>

            {/* Company name */}
            <View style={styles.inputGroup}>
              <Ionicons name="business-outline" style={styles.inputIcon} />
              <TextInput
                placeholder="Nom de l'entreprise"
                style={styles.input}
                value={formData.title}
                onChangeText={(t) => handleInputChange("title", t)}
                placeholderTextColor="#888"
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" style={styles.inputIcon} />
              <TextInput
                placeholder="Email administrateur"
                style={styles.input}
                value={formData.email}
                onChangeText={(t) => handleInputChange("email", t)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#888"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Ionicons name="call-outline" style={styles.inputIcon} />
              <TextInput
                placeholder="Téléphone"
                style={styles.input}
                value={formData.phone}
                onChangeText={(t) => handleInputChange("phone", t)}
                keyboardType="phone-pad"
                placeholderTextColor="#888"
              />
            </View>

            {/* Country picker */}
            <TouchableOpacity
              style={styles.inputGroup}
              onPress={() => setCountryModalVisible(true)}
            >
              <Ionicons name="globe-outline" style={styles.inputIcon} />
              <Text
                style={[styles.input, !formData.pays && styles.placeholderText]}
              >
                {formData.pays || "Pays"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#888" />
            </TouchableOpacity>

            {/* City picker */}
            <TouchableOpacity
              style={[
                styles.inputGroup,
                !formData.pays && styles.disabledInput,
              ]}
              onPress={() => formData.pays && setCityModalVisible(true)}
              disabled={!formData.pays}
            >
              <Ionicons name="map-outline" style={styles.inputIcon} />
              <Text
                style={[
                  styles.input,
                  !formData.ville && styles.placeholderText,
                ]}
              >
                {formData.ville || "Ville"}
              </Text>
              {isFetchingCities ? (
                <ActivityIndicator size="small" />
              ) : (
                <Ionicons name="chevron-down" size={18} color="#888" />
              )}
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Créer l&apos;organisme
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Country selection modal */}
        <Modal
          visible={isCountryModalVisible}
          animationType="slide"
          onRequestClose={() => setCountryModalVisible(false)}
          statusBarTranslucent={false}
          presentationStyle="fullScreen"
        >
          <SafeAreaView
            style={{ flex: 1, backgroundColor: "#fff" }}
            edges={["top", "bottom"]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un pays</Text>
              <TouchableOpacity
                onPress={() => {
                  setCountryModalVisible(false);
                  setSearchQuery("");
                }}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un pays..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={countries.filter((c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()),
              )}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    handleInputChange("pays", item.name);
                    setCountryModalVisible(false);
                    setSearchQuery("");
                  }}
                >
                  <Image source={{ uri: item.flag }} style={styles.flag} />
                  <Text style={styles.countryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>

        {/* City selection modal */}
        <Modal
          visible={isCityModalVisible}
          animationType="slide"
          onRequestClose={() => setCityModalVisible(false)}
          statusBarTranslucent={false}
          presentationStyle="fullScreen"
        >
          <SafeAreaView
            style={{ flex: 1, backgroundColor: "#fff" }}
            edges={["top", "bottom"]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une ville</Text>
              <TouchableOpacity
                onPress={() => {
                  setCityModalVisible(false);
                  setSearchQuery("");
                }}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une ville..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={cities.filter((c) =>
                c.toLowerCase().includes(searchQuery.toLowerCase()),
              )}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cityItem}
                  onPress={() => {
                    handleInputChange("ville", item);
                    setCityModalVisible(false);
                    setSearchQuery("");
                  }}
                >
                  <Text style={styles.cityName}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>Aucune ville trouvée.</Text>
              }
            />
          </SafeAreaView>
        </Modal>

        <CustomAlert
          visible={alertState.visible}
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          onClose={() => setAlertState((prev) => ({ ...prev, visible: false }))}
          duration={5000}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  titleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  titleText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#f87b1b",
    lineHeight: 24,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#d1fae5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#065f46",
    lineHeight: 18,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 52,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputIcon: {
    fontSize: 20,
    color: "#888",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  placeholderText: {
    color: "#888",
  },
  disabledInput: {
    backgroundColor: "#f3f4f6",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  submitButton: {
    backgroundColor: "#f87b1b",
    borderRadius: 30,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#11224e",
  },
  searchInput: {
    height: 44,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 16,
    fontSize: 15,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  flag: {
    width: 30,
    height: 20,
    marginRight: 14,
    borderRadius: 2,
  },
  countryName: {
    fontSize: 15,
    color: "#333",
  },
  cityItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  cityName: {
    fontSize: 15,
    color: "#333",
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 24,
    color: "#9ca3af",
    fontSize: 14,
  },
});
