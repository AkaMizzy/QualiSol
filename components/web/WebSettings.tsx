import { COLORS, FONT, SIZES } from "@/constants/theme";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import WebProjectsTable from "./WebProjectsTable";
import WebUsersTable from "./WebUsersTable";

import WebCompanyGallery from "./WebCompanyGallery";

type SettingsTab = "projects" | "users" | "roles" | "galerie";

export default function WebSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("projects");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
        <Text style={styles.subtitle}>
          Gérez vos chantiers, utilisateurs, rôles et galerie
        </Text>
      </View>

      {/* Internal Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "projects" && styles.tabActive]}
          onPress={() => setActiveTab("projects")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "projects" && styles.tabTextActive,
            ]}
          >
            Chantiers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "users" && styles.tabActive]}
          onPress={() => setActiveTab("users")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "users" && styles.tabTextActive,
            ]}
          >
            Utilisateurs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "galerie" && styles.tabActive]}
          onPress={() => setActiveTab("galerie")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "galerie" && styles.tabTextActive,
            ]}
          >
            Galerie
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {activeTab === "projects" && <WebProjectsTable />}
        {activeTab === "users" && <WebUsersTable />}
        {activeTab === "galerie" && <WebCompanyGallery />}
        {activeTab === "roles" && <PlaceholderTab title="Rôles" />}
      </View>
    </View>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>
        {title} - Fonctionnalité à venir
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  header: {
    padding: 32,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray2,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 28,
    color: COLORS.tertiary,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginTop: 8,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gray2,
    paddingHorizontal: 32,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  } as any,
  tabText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  tabTextActive: {
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
  tabTextDisabled: {
    color: COLORS.gray,
  },
  comingSoonBadge: {
    backgroundColor: COLORS.gray2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontFamily: FONT.medium,
    fontSize: 10,
    color: COLORS.gray,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
    padding: 32,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.large,
    color: COLORS.gray,
  },
});
