import AppHeader from "@/components/AppHeader";
import { ChildQualiPhotoView } from "@/components/reception/ChildQualiPhotoView";
import { ICONS } from "@/constants/Icons";
import { useAuth } from "@/contexts/AuthContext";
import { Folder } from "@/services/folderService";
import { Ged, getAssignedGeds } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDateForGrid(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const compliantDateStr = dateStr.includes("T")
      ? dateStr
      : dateStr.replace(" ", "T");
    return new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(compliantDateStr));
  } catch {
    return "";
  }
}

export default function DangerScreen() {
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [assignedGeds, setAssignedGeds] = useState<Ged[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGed, setSelectedGed] = useState<Ged | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAssignedGeds = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Use the new endpoint to get all assigned GEDs
      const items = await getAssignedGeds(token);

      // Filter for pictures/visual content only
      const visualItems = items.filter(
        (item) =>
          ["qualiphoto", "photoavant", "photoapres"].includes(item.kind) ||
          (item.url &&
            (item.url.endsWith(".jpg") ||
              item.url.endsWith(".jpeg") ||
              item.url.endsWith(".png"))),
      );

      // Sort by creation date, latest first
      const sortedItems = visualItems.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setAssignedGeds(sortedItems);
    } catch (e) {
      console.error("Failed to load assigned GEDs", e);
      setErrorMessage("Échec du chargement. Tirez pour réessayer.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      await fetchAssignedGeds();
    } finally {
      setIsRefreshing(false);
    }
  }, [token, fetchAssignedGeds]);

  useEffect(() => {
    if (token) {
      fetchAssignedGeds();
    }
  }, [token, fetchAssignedGeds]);

  const handleAvantPhotoUpdate = (updatedPhoto: Ged) => {
    // Since it's read-only, we might not strictly need this locally,
    // but ChildQualiPhotoView might call it.
    setSelectedGed(updatedPhoto);
    setAssignedGeds((prev) =>
      prev.map((item) => (item.id === updatedPhoto.id ? updatedPhoto : item)),
    );
  };

  const renderItem = useCallback(({ item }: { item: Ged }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => {
          setSelectedGed(item);
          setDetailVisible(true);
        }}
      >
        {item.url ? (
          <Image
            source={{
              uri: `${require("@/app/config/api").default.BASE_URL}${item.url}`,
            }}
            style={styles.thumbnail}
          />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <Ionicons name="image-outline" size={40} color="#9ca3af" />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="#f87b1b" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.author || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#f87b1b" />
            <Text style={styles.infoText}>
              {formatDateForGrid(item.created_at)}
            </Text>
          </View>
          {item.level !== undefined && item.level !== null && (
            <View style={styles.infoRow}>
              <Ionicons name="warning-outline" size={14} color="#f87b1b" />
              <Text style={styles.infoText}>Niveau: {item.level}/10</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }, []);

  const keyExtractor = useCallback((item: Ged) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={ICONS.danger} style={styles.headerIcon} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Constats assignés</Text>
            <Text style={styles.headerSubtitle}>
              {assignedGeds.length} constat
              {assignedGeds.length !== 1 ? "s" : ""} à traiter
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {isLoading && assignedGeds.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator color="#11224e" size="large" />
          </View>
        ) : (
          <FlatList
            data={assignedGeds}
            keyExtractor={keyExtractor}
            key={isTablet ? "tablet-3" : "phone-2"}
            numColumns={isTablet ? 3 : 2}
            columnWrapperStyle={styles.row}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshing={isRefreshing}
            onRefresh={refresh}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={64}
                  color="#10b981"
                />
                <Text style={styles.emptyTitle}>
                  {errorMessage
                    ? "Impossible de charger"
                    : "Aucune situation assignée"}
                </Text>
                {errorMessage ? (
                  <Text style={styles.emptySubtitle}>{errorMessage}</Text>
                ) : (
                  <Text style={styles.emptySubtitle}>
                    Vous n&apos;avez aucune situation qui vous a été assignée
                    pour le moment.
                  </Text>
                )}
              </View>
            }
            ListFooterComponent={
              <>
                <View style={{ height: 50 }} />
              </>
            }
          />
        )}
      </View>

      <Modal
        visible={detailVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          {selectedGed && (
            <ChildQualiPhotoView
              item={selectedGed}
              parentFolder={{} as Folder}
              onClose={() => {
                setDetailVisible(false);
                setSelectedGed(null);
                // Refresh list when closing detail to reflect any external changes?
                // Or simply keep it as is.
                fetchAssignedGeds();
              }}
              subtitle={`Assigné à vous • ${formatDateForGrid(selectedGed.created_at)}`}
              projectTitle=""
              zoneTitle=""
              onAvantPhotoUpdate={handleAvantPhotoUpdate}
              readOnly={true}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f87b1b",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f87b1b",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  listContent: {
    paddingVertical: 12,
    gap: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 300,
  },
  card: {
    flex: 1,
    maxWidth: "49%",
    marginHorizontal: 4,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f87b1b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#f9fafb",
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#f3f4f6",
  },
  placeholderThumbnail: {
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: {
    padding: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f87b1b",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 11,
    color: "#4b5563",
    flex: 1,
  },
});
