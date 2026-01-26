import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";

type ParameterCard = {
  title: string;
  description: string;
  image: any;
  route: string;
  color: string;
};

const PARAMETER_CARDS: ParameterCard[] = [
  {
    title: "Organisme",
    description: "Gérer les informations de votre organisme",
    image: require("../../assets/icons/company.png"),
    route: "/company",
    color: "#3b82f6",
  },
  {
    title: "Utilisateurs",
    description: "Gérer les utilisateurs et leurs rôles",
    image: require("../../assets/icons/users.png"),
    route: "/users",
    color: "#8b5cf6",
  },
  {
    title: "Chantiers",
    description: "Gérer les chantiers et les zones",
    image: require("../../assets/icons/project.png"),
    route: "/projects",
    color: "#ec4899",
  },
  {
    title: "Anomalie 1",
    description: "Configuration des anomalies de type 1",
    image: require("../../assets/icons/anomalie.png"),
    route: "/anomalie1",
    color: "#f59e0b",
  },
  {
    title: "Anomalie 2",
    description: "Configuration des anomalies de type 2",
    image: require("../../assets/icons/anomalie.png"),
    route: "/anomalie2",
    color: "#ef4444",
  },
];

export default function ParametersScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleCardPress = (route: string) => {
    router.push(route as any);
  };

  React.useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || user.role !== "Super Admin") {
    // Optionally render nothing or a loading spinner while redirecting
    // But since we want to "completely remove access", returning null avoids flash of content
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />

      <View style={styles.header}>
        <Ionicons name="settings" size={32} color="#f87b1b" />
        <Text style={styles.headerTitle}>Paramètres</Text>
        <Text style={styles.headerSubtitle}>
          Gérez les paramètres de votre application
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PARAMETER_CARDS.map((card, index) => (
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 24,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#11224e",
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
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
  cardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#f9fafb",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  icon: {
    width: 32,
    height: 32,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#11224e",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
});
