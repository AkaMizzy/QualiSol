import API_CONFIG from "@/app/config/api";
import PreviewModal from "@/components/PreviewModal";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import RenderHTML from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import SettingsModal from "../../components/profile/SettingsModal";
import UpdateIdentifierModal from "../../components/profile/UpdateIdentifierModal";
import companyService from "../../services/companyService";
import { Company } from "../../types/company";

export default function ProfileScreen() {
  const { user, logout, updateUser, token } = useAuth();
  const { width } = useWindowDimensions();
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isIdentifierModalVisible, setIsIdentifierModalVisible] =
    useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch company data
  const fetchCompany = async () => {
    try {
      const companyData = await companyService.getCompany();
      setCompany(companyData);
    } catch (error) {
      console.error("Error fetching company:", error);
    }
  };

  // Fetch company data on mount
  useEffect(() => {
    if (user) {
      fetchCompany();
    }
  }, [user]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCompany();
      // Optionally refresh user data if needed
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Watch for authentication changes and navigate automatically
  useEffect(() => {
    if (!user) {
      console.log("Profile screen detected logout, navigating to login...");
      router.replace("/(auth)/login");
    }
  }, [user]);

  const handlePickImage = async () => {
    // Request permissions
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à la galerie pour changer votre photo de profil.",
      );
      return;
    }

    // Launch image picker
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (pickerResult.canceled) {
      return;
    }

    // Upload the image
    if (pickerResult.assets && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      // Close the preview modal before uploading
      setIsPreviewVisible(false);
      await handleUploadPhoto(asset);
    }
  };

  const handleUploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user || !token) return;
    setIsUploading(true);

    const uriParts = asset.uri.split(".");
    const fileType = uriParts[uriParts.length - 1];

    const formData = new FormData();
    formData.append("photo", {
      uri: asset.uri,
      name: `photo_${user.id}.${fileType}`,
      type: `image/${fileType}`,
    } as any);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${user.id}`, {
        method: "PUT",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Succès", "Votre photo de profil a été mise à jour.");
        if (data.photo) {
          updateUser({ photo: data.photo });
        }
      } else {
        throw new Error(data.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de la mise à jour de votre photo.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    console.log("Logging out...");
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* App Header */}
      <AppHeader user={user || undefined} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f87b1b"
            colors={["#f87b1b"]}
          />
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Ionicons name="person-circle" size={72} color="#f87b1b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.nameText} numberOfLines={1}>
                {user ? `${user.firstname} ${user.lastname}` : "Chargement..."}
              </Text>
              <Text style={styles.emailText} numberOfLines={1}>
                {user?.email || "—"}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role || "user"}</Text>
              </View>
            </View>
          </View>
          {/* User Message */}
          {!!user?.message && (
            <RenderHTML
              contentWidth={width - 32}
              source={{ html: user.message }}
              baseStyle={{
                fontSize: 14,
                color: "#11224e",
                textAlign: "center",
                marginTop: 12,
              }}
              defaultTextProps={{ selectable: true }}
              tagsStyles={{
                b: { fontWeight: "bold", color: "#11224e" },
                strong: { fontWeight: "bold", color: "#11224e" },
                u: { textDecorationLine: "underline" },
                i: { fontStyle: "italic" },
                em: { fontStyle: "italic" },
                h1: {
                  fontSize: 17,
                  fontWeight: "bold",
                  color: "#11224e",
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
                  color: "#6b7280",
                  marginBottom: 2,
                },
              }}
            />
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setIsIdentifierModalVisible(true)}
          >
            <Ionicons name="person-circle-outline" size={20} color="#f87b1b" />
            <Text style={styles.menuText}>Modifier l&apos;identifiant</Text>
            <Ionicons name="chevron-forward" size={20} color="#f87b1b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(tabs)/change-password")}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#f87b1b"
            />
            <Text style={styles.menuText}>Changer de mot de passe</Text>
            <Ionicons name="chevron-forward" size={20} color="#f87b1b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setIsSettingsModalVisible(true)}
          >
            <Ionicons name="settings-outline" size={20} color="#f87b1b" />
            <Text style={styles.menuText}>Paramètres</Text>
            <Ionicons name="chevron-forward" size={20} color="#f87b1b" />
          </TouchableOpacity>
        </View>

        {/* ── Contextual Help Section ── */}
        {(() => {
          const helpEntries = [
            "constahelp",
            "transferhelp",
            "suivihelp",
            "todohelp",
            "controlehelp",
          ].filter((key) => !!company?.[key as keyof typeof company]);

          if (helpEntries.length === 0) return null;

          return (
            <View style={styles.helpCard}>
              {helpEntries.map((key) => (
                <View key={key} style={styles.helpRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#f87b1b"
                    style={styles.helpRowIcon}
                  />
                  <RenderHTML
                    contentWidth={width - 96}
                    source={{
                      html: company![key as keyof typeof company] as string,
                    }}
                    baseStyle={{
                      fontSize: 13,
                      color: "#374151",
                    }}
                    defaultTextProps={{ selectable: true }}
                    tagsStyles={{
                      b: { fontWeight: "bold", color: "#11224e" },
                      strong: { fontWeight: "bold", color: "#11224e" },
                      u: { textDecorationLine: "underline" },
                      i: { fontStyle: "italic" },
                      em: { fontStyle: "italic" },
                      h1: {
                        fontSize: 16,
                        fontWeight: "bold",
                        color: "#11224e",
                        marginBottom: 4,
                      },
                      h2: {
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#f87b1b",
                        marginBottom: 2,
                      },
                      h3: {
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#6b7280",
                        marginBottom: 2,
                      },
                    }}
                  />
                </View>
              ))}
            </View>
          );
        })()}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#f87b1b" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        {/* ── Multilingual Help Links ── */}
        <View style={styles.helpLangRow}>
          {[
            { label: "مساعدة", lang: "ar" },
            { label: "Aide", lang: "fr" },
            { label: "Help", lang: "en" },
          ].map(({ label, lang }) => (
            <TouchableOpacity
              key={lang}
              style={styles.helpLangBtn}
              onPress={() =>
                Linking.openURL("https://www.muntadaa.com/qualisol/help.html")
              }
            >
              <Ionicons name="globe-outline" size={14} color="#f87b1b" />
              <Text style={styles.helpLangText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <PreviewModal
        visible={isPreviewVisible}
        onClose={() => setIsPreviewVisible(false)}
        mediaUrl={
          company?.logo ||
          (user?.photo ? `${API_CONFIG.BASE_URL}${user.photo}` : undefined)
        }
        mediaType="image"
        title={company?.logo ? "Logo de l'organisme" : "Photo de profil"}
        onEdit={handlePickImage}
      />

      <UpdateIdentifierModal
        visible={isIdentifierModalVisible}
        onClose={() => setIsIdentifierModalVisible(false)}
        currentIdentifier={user?.identifier}
        onUpdate={async (newIdentifier) => {
          if (!user) return false;
          try {
            // We use the existing updateUser which now supports identifier thanks to our service change
            const res = await updateUser({ identifier: newIdentifier });
            // updateUser likely handles local state update via context or we rely on re-fetch
            // Assuming updateUser in context returns something useful or we trust it throws if failed
            Alert.alert("Succès", "Identifiant mis à jour.");
            return true;
          } catch (err: any) {
            Alert.alert(
              "Erreur",
              err.message || "Impossible de mettre à jour l'identifiant.",
            );
            return false;
          }
        }}
      />

      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        user={user}
        onUpdate={async (data) => {
          if (!user) return false;
          try {
            await updateUser(data);
            return true;
          } catch (err: any) {
            Alert.alert(
              "Erreur",
              err.message || "Impossible de mettre à jour les paramètres.",
            );
            return false;
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  userMessageWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: "center",
    width: "100%",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f87b1b",
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  nameText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#11224e",
  },
  emailText: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleText: { fontSize: 11, color: "#11224e", fontWeight: "700" },
  menuSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f87b1b",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#11224e",
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  logoutText: {
    fontSize: 16,
    color: "#f87b1b",
    fontWeight: "500",
    marginLeft: 8,
  },
  helpCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f87b1b",
    marginBottom: 12,
    gap: 8,
  },
  helpCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  helpCardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f87b1b",
  },
  helpDivider: {
    alignItems: "center",
    paddingVertical: 6,
  },
  helpRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  helpRowIcon: {
    marginTop: 2,
  },
  helpLangRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 12,
    paddingVertical: 8,
  },
  helpLangBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  helpLangText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f87b1b",
  },
});
