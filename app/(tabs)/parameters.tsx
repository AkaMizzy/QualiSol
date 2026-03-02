import FolderTypeManagerModal from "@/components/projects/FolderTypeManagerModal";
import CreateCompanyModal from "@/components/settings/CreateCompanyModal";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import RenderHTML from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import companyService from "../../services/companyService";
import { Company } from "../../types/company";

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
    title: "Anomalies",
    description: "Configuration des anomalies niveaux 1 et 2",
    image: require("../../assets/icons/anomalie.png"),
    route: "/anomalies",
    color: "#f59e0b",
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

export default function ParametersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [folderTypeManagerVisible, setFolderTypeManagerVisible] =
    useState(false);
  const [createCompanyVisible, setCreateCompanyVisible] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    companyService
      .getCompany()
      .then(setCompany)
      .catch(() => {});
  }, []);

  const isAdmin = user?.role === "Admin" || user?.role === "Super Admin";

  const handleCardPress = (route: string) => {
    if (route === "action:folderTypes") {
      setFolderTypeManagerVisible(true);
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
        {!!company?.message && (
          <View style={styles.messageWrapper}>
            <RenderHTML
              contentWidth={width - 32}
              source={{ html: company.message }}
              baseStyle={{
                fontSize: 13,
                color: "#6b7280",
                textAlign: "center",
              }}
              defaultTextProps={{ selectable: true }}
              tagsStyles={{
                b: { fontWeight: "bold", color: "#FFFFFF" },
                strong: { fontWeight: "bold", color: "#FFFFFF" },
                u: { textDecorationLine: "underline" },
                i: { fontStyle: "italic" },
                em: { fontStyle: "italic" },
                h1: {
                  fontSize: 17,
                  fontWeight: "bold",
                  color: "#FFFFFF",
                  marginBottom: 4,
                },
                h2: {
                  fontSize: 15,
                  fontWeight: "bold",
                  color: "#f87b1b",
                  marginBottom: 2,
                },
                h3: {
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#CCCCCC",
                  marginBottom: 2,
                },
              }}
            />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PARAMETER_CARDS.map((card) => (
          <Pressable
            key={card.title}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
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

        {/* Parrainer card — visible only to Admin users and when partener is not 0 */}
        {isAdmin && company?.partener !== 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setCreateCompanyVisible(true)}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: "#f87b1b20" }]}
            >
              <Ionicons name="people" size={24} color="#f87b1b" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Parrainer</Text>
              <Text style={styles.cardDescription}>
                Profitez et bénéficiez de nos offres de parrainage
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
          </Pressable>
        )}
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f87b1b",
    textAlign: "center",
  },
  messageWrapper: {
    marginTop: 4,
    width: "100%",
    alignItems: "center",
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
    borderColor: "#f87b1b",
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  superUserIconBtn: {
    padding: 4,
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
    color: "#f87b1b",
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 20,
  },
});