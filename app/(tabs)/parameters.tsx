import FolderTypeManagerModal from "@/components/projects/FolderTypeManagerModal";
import CreateCompanyModal from "@/components/settings/CreateCompanyModal";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";

/** Email of the single platform super-user allowed to create new companies */
const SUPER_USER_EMAIL = "muntadaacom@gmail.com";

type ParameterCard = {
  title: string;
  description: string;
  image: any;
  route: string;
  color: string;
};

const PARAMETER_CARDS: ParameterCard[] = [
  {
    title: "Constats",
    description: "Visualiser tous les constats de l'entreprise",
    image: require("../../assets/icons/camera_p.png"),
    route: "/constats",
    color: "#0ea5e9",
  },
  {
    title: "contrôles",
    description: "Configurer les types de dossiers de contrôles",
    image: require("../../assets/icons/approved.png"),
    route: "action:folderTypes",
    color: "#10b981",
  },
  {
    title: "Chantiers",
    description: "Gérer les chantiers et les zones",
    image: require("../../assets/icons/project.png"),
    route: "/projects",
    color: "#ec4899",
  },
  {
    title: "Anomalie niveau 1",
    description: "Configuration des anomalies de niveau 1",
    image: require("../../assets/icons/anomalie.png"),
    route: "/anomalie1",
    color: "#f59e0b",
  },
  {
    title: "Anomalie niveau 2",
    description: "Configuration des anomalies de niveau 2",
    image: require("../../assets/icons/anomalie.png"),
    route: "/anomalie2",
    color: "#ef4444",
  },
  {
    title: "Utilisateurs",
    description: "Gérer les utilisateurs et leurs rôles",
    image: require("../../assets/icons/users.png"),
    route: "/users",
    color: "#8b5cf6",
  },
  {
    title: "Organisme",
    description: "Gérer les informations de votre organisme",
    image: require("../../assets/icons/company.png"),
    route: "/company",
    color: "#3b82f6",
  },
];

/** Card shown ONLY to the super-user account */
const CREATE_COMPANY_CARD: ParameterCard = {
  title: "Créer un organisme",
  description: "Créer une nouvelle entreprise et son compte administrateur",
  image: require("../../assets/icons/company.png"),
  route: "action:createCompany",
  color: "#6366f1",
};

export default function ParametersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [folderTypeManagerVisible, setFolderTypeManagerVisible] =
    useState(false);
  const [createCompanyVisible, setCreateCompanyVisible] = useState(false);

  const isSuperUser = user?.email === SUPER_USER_EMAIL;

  // Build the card list: super-user gets an extra card at the bottom
  const visibleCards: ParameterCard[] = isSuperUser
    ? [...PARAMETER_CARDS, CREATE_COMPANY_CARD]
    : PARAMETER_CARDS;

  const handleCardPress = (route: string) => {
    if (route === "action:folderTypes") {
      setFolderTypeManagerVisible(true);
    } else if (route === "action:createCompany") {
      setCreateCompanyVisible(true);
    } else {
      router.push(route as any);
    }
  };

  React.useEffect(() => {
    if (user && !["Super Admin", "Admin"].includes(user.role)) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || !["Super Admin", "Admin"].includes(user.role)) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleCards.map((card) => (
          <Pressable
            key={card.title}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
              card.route === "action:createCompany" && styles.superUserCard,
            ]}
            onPress={() => handleCardPress(card.route)}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${card.color}15` },
              ]}
            >
              <Image source={card.image} style={styles.icon} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
          </Pressable>
        ))}
      </ScrollView>

      <FolderTypeManagerModal
        visible={folderTypeManagerVisible}
        onClose={() => setFolderTypeManagerVisible(false)}
      />

      <CreateCompanyModal
        visible={createCompanyVisible}
        onClose={() => setCreateCompanyVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#11224e",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  superUserCard: {
    borderColor: "#c7d2fe",
    backgroundColor: "#eef2ff",
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#f9fafb",
  },
  iconContainer: {
    width: 44,
    height: 45,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  icon: {
    width: 24,
    height: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11224e",
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 20,
  },
});
