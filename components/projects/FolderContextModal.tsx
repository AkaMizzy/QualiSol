import API_CONFIG from "@/app/config/api";
import AppHeader from "@/components/AppHeader";
import GalerieCard from "@/components/galerie/GalerieCard";
import PreviewModal from "@/components/PreviewModal";
import UserSelectionModal from "@/components/UserSelectionModal";
import { useAuth } from "@/contexts/AuthContext";
import folderService, { Folder } from "@/services/folderService";
import { deleteGed, Ged, getGedsBySource } from "@/services/gedService";
import { getUsers } from "@/services/userService";
import { CompanyUser } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  folder: Folder | null;
  token: string | null;
  onUpdate?: () => void;
};

export default function FolderContextModal({
  visible,
  onClose,
  folder,
  token,
  onUpdate,
}: Props) {
  const [geds, setGeds] = useState<Ged[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGed, setSelectedGed] = useState<Ged | null>(null);

  // Owner update state
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(folder);
  const { user } = useAuth();

  useEffect(() => {
    setCurrentFolder(folder);
  }, [folder]);

  useEffect(() => {
    if (visible && token) {
      loadUsers();
    }
  }, [visible, token]);

  const loadUsers = async () => {
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);
    } catch (e) {
      console.error("Failed to load users", e);
    }
  };

  const handleUpdateOwner = async (user: CompanyUser) => {
    if (!token || !currentFolder) return;
    try {
      Alert.alert(
        "Confirmer l'assignation",
        `Voulez-vous assigner "${currentFolder.title}" à ${user.firstname} ${user.lastname} ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Assigner",
            onPress: async () => {
              try {
                const updated = await folderService.updateFolder(
                  currentFolder.id,
                  { owner_id: user.id },
                  token,
                );
                setCurrentFolder(updated);
                setIsUserModalVisible(false);
                if (onUpdate) onUpdate();
                Alert.alert("Succès", "Responsable mis à jour");
              } catch (err: any) {
                Alert.alert("Erreur", err.message || "Échec de la mise à jour");
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenReport = (url: string | null | undefined) => {
    if (url) {
      Linking.openURL(url).catch((err) =>
        Alert.alert("Erreur", "Impossible d'ouvrir le lien"),
      );
    } else {
      Alert.alert("Info", "Aucun document disponible.");
    }
  };

  const handleDeleteGed = async () => {
    if (!selectedGed || !token) return;

    Alert.alert(
      "Supprimer",
      "Êtes-vous sûr de vouloir supprimer cet élément ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGed(token, selectedGed.id);
              setGeds((prev) => prev.filter((g) => g.id !== selectedGed.id));
              setSelectedGed(null);
            } catch (error) {
              console.error("Failed to delete GED", error);
              Alert.alert("Erreur", "Impossible de supprimer l'élément");
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (visible && folder && token) {
      loadGeds();
    }
  }, [visible, folder, token]);

  const loadGeds = async () => {
    if (!folder || !token) return;
    setIsLoading(true);
    try {
      // Fetch GEDs where idsource matches the folder ID
      // Assuming 'qualiphoto' is the primary kind we want to show,
      // but we might want to fetch all types or make it configurable.
      // For now, let's fetch 'qualiphoto'.
      const fetchedGeds = await getGedsBySource(token, folder.id, "qualiphoto");
      setGeds(fetchedGeds);
    } catch (error) {
      console.error("Failed to load folder GEDs", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Ged }) => (
    <View style={styles.gridItem}>
      <GalerieCard
        item={item}
        onPress={() => setSelectedGed(item)}
        // Additional props can be passed if needed
        isOffline={false} // Assuming online for now as this is a context modal
        hasVoiceNote={!!item.urlvoice}
        isVideo={
          item.url?.toLowerCase().endsWith(".mp4") ||
          item.url?.toLowerCase().endsWith(".mov")
        }
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <AppHeader
          user={user || undefined}
          showNotifications={false}
          showProfile={true}
          onLogoPress={onClose}
          rightComponent={
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          }
        />

        <View style={styles.headerTitleRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentFolder?.title || "Dossier"}
            </Text>
            <TouchableOpacity
              onPress={() => setIsUserModalVisible(true)}
              style={{ padding: 4 }}
            >
              <Ionicons
                name="person-circle-outline"
                size={20}
                color="#f87b1b"
              />
            </TouchableOpacity>
          </View>
          {currentFolder?.code && (
            <Text style={styles.headerSubtitle}>{currentFolder.code}</Text>
          )}
          {(() => {
            const owner = users.find((u) => u.id === currentFolder?.owner_id);
            if (owner) {
              return (
                <Text style={styles.ownerText}>
                  Resp: {owner.firstname} {owner.lastname}
                </Text>
              );
            }
            return null;
          })()}
        </View>

        {/* PDF Buttons Row */}
        <View style={styles.pdfRow}>
          <TouchableOpacity
            onPress={() => handleOpenReport(currentFolder?.urlreport1)}
            style={styles.ctaButton}
          >
            <Ionicons name="document-text-outline" size={16} color="#f87b1b" />
            <Text style={styles.ctaText}>PDF 1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleOpenReport(currentFolder?.urlreport2)}
            style={styles.ctaButton}
          >
            <Ionicons name="document-text-outline" size={16} color="#f87b1b" />
            <Text style={styles.ctaText}>PDF 2</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleOpenReport(currentFolder?.urlreport3)}
            style={styles.ctaButton}
          >
            <Ionicons name="document-text-outline" size={16} color="#f87b1b" />
            <Text style={styles.ctaText}>PDF 3</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#11224e" />
          </View>
        ) : (
          <FlatList
            data={geds}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>
                  Aucun élément dans ce dossier
                </Text>
              </View>
            }
          />
        )}

        {selectedGed && (
          <PreviewModal
            visible={!!selectedGed}
            onClose={() => setSelectedGed(null)}
            mediaUrl={`${API_CONFIG.BASE_URL}${selectedGed.url}`}
            mediaType={
              selectedGed.url?.toLowerCase().endsWith(".mp4")
                ? "video"
                : "image"
            }
            title={selectedGed.title}
            description={selectedGed.description}
            author={selectedGed.author}
            createdAt={selectedGed.created_at}
            latitude={selectedGed.latitude}
            longitude={selectedGed.longitude}
            voiceNoteUrl={
              selectedGed.urlvoice
                ? `${API_CONFIG.BASE_URL}${selectedGed.urlvoice}`
                : undefined
            }
            audiotxt={selectedGed.audiotxt}
            iatxt={selectedGed.iatxt}
            type={selectedGed.type}
            categorie={selectedGed.categorie}
            chantier={selectedGed.chantier}
            level={selectedGed.level}
            mode={selectedGed.mode}
            onDelete={handleDeleteGed}
          />
        )}

        <UserSelectionModal
          visible={isUserModalVisible}
          onClose={() => setIsUserModalVisible(false)}
          onSelect={handleUpdateOwner}
          users={users}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerTitleRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#11224e",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 8,
  },
  gridItem: {
    flex: 1,
    maxWidth: "50%",
    aspectRatio: 1, // Optional: keep items square-ish
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
  ownerText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  pdfRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f87b1b",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  ctaText: { color: "#f87b1b", fontWeight: "600", fontSize: 12 },
});
