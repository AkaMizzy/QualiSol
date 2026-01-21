import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useWebGalerie } from "@/hooks/useWebGalerie";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import WebAssociatedPhotosSection from "./WebAssociatedPhotosSection";
import WebFolderList from "./WebFolderList";
import WebMapView from "./WebMapView";
import WebQualiPhotoSection from "./WebQualiPhotoSection";
import WebSettings from "./WebSettings";

type ViewTab = "galerie" | "map" | "settings";

export default function WebLayout() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ViewTab>("galerie");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderTitle, setSelectedFolderTitle] = useState<string>("");

  // Lift galerie state to parent so it's shared between components
  const galerieState = useWebGalerie();

  const handleLogout = async () => {
    if (confirm("Voulez-vous vraiment vous déconnecter?")) {
      await logout();
    }
  };

  const handleFolderSelect = (folderId: string, folderTitle: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderTitle(folderTitle);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("@/assets/icons/new_icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "galerie" && styles.tabActive]}
              onPress={() => setActiveTab("galerie")}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color={activeTab === "galerie" ? COLORS.primary : COLORS.gray}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "galerie" && styles.tabTextActive,
                ]}
              >
                Galerie & Dossiers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "map" && styles.tabActive]}
              onPress={() => setActiveTab("map")}
            >
              <Ionicons
                name="map-outline"
                size={18}
                color={activeTab === "map" ? COLORS.primary : COLORS.gray}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "map" && styles.tabTextActive,
                ]}
              >
                Carte
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "settings" && styles.tabActive]}
              onPress={() => setActiveTab("settings")}
            >
              <Ionicons
                name="settings-outline"
                size={18}
                color={activeTab === "settings" ? COLORS.primary : COLORS.gray}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "settings" && styles.tabTextActive,
                ]}
              >
                Paramètres
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerRight}>
          {user && (
            <View style={styles.userInfo}>
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.userName}>
                {user.firstname} {user.lastname}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      {activeTab === "galerie" ? (
        // Three-section Split View: Qualiphotos + Folders + Associated Photos
        <div style={styles.mainContent as any}>
          <div style={styles.qualiPhotoSection as any}>
            <WebQualiPhotoSection galerieState={galerieState} />
          </div>

          <div style={styles.folderSection as any}>
            <WebFolderList
              galerieState={galerieState}
              selectedFolderId={selectedFolderId}
              onFolderSelect={handleFolderSelect}
            />
          </div>

          <div style={styles.associatedPhotosSection as any}>
            <WebAssociatedPhotosSection
              selectedFolderId={selectedFolderId}
              folderTitle={selectedFolderTitle}
              onPhotoAssigned={galerieState.refetch}
            />
          </div>
        </div>
      ) : activeTab === "map" ? (
        // Map View
        <div style={styles.mapContent as any}>
          <WebMapView />
        </div>
      ) : (
        // Settings View
        <div style={styles.settingsContent as any}>
          <WebSettings />
        </div>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
    height: "100vh" as any,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 80,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.lightWhite,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontFamily: FONT.bold,
  },
  appTitle: {
    fontFamily: FONT.bold,
    fontSize: 28,
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 20,
  },
  userName: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  logoutText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "450px 350px 1fr",
    height: "calc(100vh - 80px)",
    gap: 0,
  } as any,
  qualiPhotoSection: {
    borderRight: `2px solid ${COLORS.gray2}`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  } as any,
  folderSection: {
    borderRight: `2px solid ${COLORS.gray2}`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  } as any,
  associatedPhotosSection: {
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  } as any,
  mapContent: {
    height: "calc(100vh - 80px)",
    display: "flex",
    flexDirection: "column",
  } as any,
  settingsContent: {
    height: "calc(100vh - 80px)",
    display: "flex",
    flexDirection: "column",
  } as any,
});
