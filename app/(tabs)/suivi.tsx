import AppHeader from "@/components/AppHeader";
import FolderContextModal from "@/components/projects/FolderContextModal";
import { useAuth } from "@/contexts/AuthContext";
import folderService, { Folder } from "@/services/folderService";
import { getUsers } from "@/services/userService";
import { CompanyUser } from "@/types/user";
import { formatDisplayDate } from "@/utils/dateFormat";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SuiviScreen() {
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const { width } = useWindowDimensions();
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const router = useRouter();

  const refreshFolders = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const refreshed = await folderService.getAllFolders(token);
      if (user?.company_id) {
        // Only show folders matching the user's company_id
        // and exclude typed folders (those belonging to a folder type)
        const filtered = refreshed.filter(
          (f) =>
            String(f.company_id) === String(user.company_id) &&
            !f.foldertype_id,
        );
        setFolders(filtered);
      } else {
        // If user has no company assigned, show no folders
        setFolders([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.company_id]);

  useEffect(() => {
    refreshFolders();
  }, [token, refreshFolders]);

  useEffect(() => {
    if (token) {
      getUsers().then(setUsers).catch(console.error);
    }
  }, [token]);

  const columnCount = width >= 900 ? 3 : 2;
  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth =
    (width - horizontalPadding * 2 - gap * (columnCount - 1)) / columnCount;

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <AppHeader user={user || undefined} />
        <View style={styles.headerContainer}>
          <View style={styles.pageHeader}>
            <View
              style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
            >
              <View>
                <Text
                  style={{ fontSize: 22, fontWeight: "700", color: "#11224e" }}
                >
                  Suivi
                </Text>
                <Text style={{ marginTop: 4, color: "#6b7280" }}>
                  Visualiser les dossiers et toutes leurs images associées
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: horizontalPadding,
            marginTop: 16,
          }}
        >
          {isLoading && folders.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator color="#11224e" />
            </View>
          ) : (
            <FlatList
              contentContainerStyle={{ paddingBottom: 100 }}
              data={folders}
              numColumns={columnCount}
              columnWrapperStyle={{ gap }}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View style={{ height: gap }} />}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedFolder(item);
                      setDetailVisible(true);
                    }}
                    style={[
                      styles.card,
                      {
                        width: cardWidth,
                        borderColor: "#e5e7eb",
                        shadowColor: "#000",
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title || item.code}
                      </Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <Text style={styles.cardSub}>
                        Du {formatDisplayDate(item.dd)} au{" "}
                        {formatDisplayDate(item.df)}
                      </Text>
                      {item.foldertype ? (
                        <Text style={styles.cardMeta}>
                          Type · {item.foldertype}
                        </Text>
                      ) : null}
                      {(() => {
                        const owner = users.find((u) => u.id === item.owner_id);
                        if (owner) {
                          return (
                            <Text style={styles.cardMeta}>
                              Resp: {owner.firstname} {owner.lastname}
                            </Text>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                !isLoading ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: "#6b7280" }}>
                      Aucun dossier trouvé pour cette entreprise.
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </SafeAreaView>

      <FolderContextModal
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedFolder(null);
        }}
        folder={selectedFolder}
        token={token}
        onUpdate={refreshFolders}
        fetchAllGeds={
          true
        } /* Feature extension to get all GEDs matching idsource */
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "white",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f87b1b",
  },
  cardSub: {
    marginTop: 4,
    color: "#374151",
    fontSize: 13,
  },
  cardMeta: {
    marginTop: 4,
    color: "#f87b1b",
    fontSize: 12,
  },
});
