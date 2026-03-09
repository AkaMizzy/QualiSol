import { createCalendarEvent } from "@/services/calendarService";
import { FolderType, getAllFolderTypes } from "@/services/folderTypeService";
import { getAuthToken, getUser } from "@/services/secureStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    LayoutAnimation,
    Linking,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import RenderHTML from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import CalendarComp from "../../components/calander/CalendarComp";
import CreateCalendarEventModal from "../../components/calander/CreateCalendarEventModal";
import DayEventsModal from "../../components/calander/DayEventsModal";

import FolderCard from "@/components/folder/FolderCard";
import FolderQuestionsModal from "@/components/folder/FolderQuestionsModal";
import { ICONS } from "@/constants/Icons";
import folderService, { Folder, Project } from "@/services/folderService";
import { getGedsBySource } from "@/services/gedService";
import { getArchivedStatusId } from "@/services/statusService";
import companyService from "../../services/companyService";
import API_CONFIG from "../config/api";

// System items that are not folder types
const SYSTEM_GRID_ITEMS: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  image?: any;
  disabled?: boolean;
  type: "system";
}[] = [
  {
    title: "Constat",
    image: require("../../assets/icons/camera_p.png"),
    type: "system",
  },
  {
    title: "transfert",
    image: require("../../assets/icons/transfer.png"),
    type: "system",
  },
  {
    title: "Suivi",
    image: require("../../assets/icons/folder.png"),
    type: "system",
  },
];

type GridItem = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  image?: any;
  disabled?: boolean;
  type: "system";
};

export default function DashboardScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [eventsByDate, setEventsByDate] = useState<Record<string, string[]>>(
    {},
  );
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayEvents, setDayEvents] = useState<any[]>([]);
  const [, setStats] = useState<{
    pending: number;
    today: number;
    completed: number;
    retard: number;
    canceled: number;
  } | null>(null);
  const [companyTitle, setCompanyTitle] = useState<string>("");
  const [controleHelp, setControleHelp] = useState<string | null>(null);

  // System grid items only (no folder types in grid)
  const [gridItems] = useState<GridItem[]>(SYSTEM_GRID_ITEMS);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Folder section state ─────────────────────────────────────────────────
  const [folders, setFolders] = useState<Folder[]>([]);
  // Map: foldertype_id → image source (uri string or require())
  const [folderIconMap, setFolderIconMap] = useState<Record<string, any>>({});
  // Map: foldertype_id → title
  const [folderTypeMap, setFolderTypeMap] = useState<Record<string, string>>(
    {},
  );
  // Map: project_id → title
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [archivedStatusId, setArchivedStatusId] = useState<string | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // FolderQuestionsModal state
  const [isQuestionsModalVisible, setIsQuestionsModalVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  const isTablet = width >= 768;
  const numColumns = isTablet ? 6 : 3;

  useEffect(() => {
    async function loadAuthData() {
      const storedToken = await getAuthToken();
      const storedUser = await getUser();
      setToken(storedToken);
      setUser(storedUser);
    }
    loadAuthData();
  }, []);

  // ─── Load company controlehelp ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    companyService
      .getCompany()
      .then((c) => setControleHelp(c?.controlehelp ?? null))
      .catch(() => {});
  }, [token]);

  // ─── Load archived status ─────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      getArchivedStatusId(token).then(setArchivedStatusId);
    }
  }, [token]);

  // ─── Load projects map ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    folderService
      .getAllProjects(token)
      .then((projectList: Project[]) => {
        const map: Record<string, string> = {};
        projectList.forEach((p) => {
          map[p.id] = p.title;
        });
        setProjectMap(map);
      })
      .catch((err: any) => console.error("Failed to load projects:", err));
  }, [token]);

  // ─── Load all folders (grouped by folder type with GED icons) ─────────────
  const loadAllFolders = useCallback(async () => {
    if (!token || !user) return;
    setLoadingFolders(true);
    try {
      // 1. Fetch all folder types + their GED icons
      const fetchedFolderTypes = await getAllFolderTypes(token);

      // 2. Build icon map and type title map
      const iconMap: Record<string, any> = {};
      const typeMap: Record<string, string> = {};

      await Promise.all(
        fetchedFolderTypes.map(async (ft: FolderType) => {
          typeMap[ft.id] = ft.title;
          try {
            const geds = await getGedsBySource(
              token,
              ft.id,
              "folder_type_icon",
            );
            if (geds.length > 0 && geds[0].url) {
              iconMap[ft.id] = { uri: `${API_CONFIG.BASE_URL}${geds[0].url}` };
            } else {
              iconMap[ft.id] = require("../../assets/icons/folder.png");
            }
          } catch {
            iconMap[ft.id] = require("../../assets/icons/folder.png");
          }
        }),
      );

      setFolderIconMap(iconMap);
      setFolderTypeMap(typeMap);

      // 3. Fetch all folders for each folder type (by UUID)
      const allFolderArrays = await Promise.all(
        fetchedFolderTypes.map((ft: FolderType) =>
          folderService.getAllFolders(token, ft.id).catch(() => [] as Folder[]),
        ),
      );

      // 4. Flatten and deduplicate by id
      const seen = new Set<string>();
      const combined: Folder[] = [];
      for (const arr of allFolderArrays) {
        for (const f of arr) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            combined.push(f);
          }
        }
      }

      // 5. Filter by owner — applies to all roles equally
      const available = combined.filter(
        (f) => String(f.owner_id) === String(user.id),
      );

      // 6. Sort by most recent
      const sorted = available.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setFolders(sorted);
    } catch (error) {
      console.error("Failed to load folders:", error);
    } finally {
      setLoadingFolders(false);
    }
  }, [token, user]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAllFolders();
    }, [loadAllFolders]),
  );

  // ─── Apply archived + date-range filter (computed) ────────────────────────
  const visibleFolders = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // compare dates only, ignore time

    return folders.filter((f) => {
      // 1. Exclude archived folders
      if (archivedStatusId && f.status_id === archivedStatusId) return false;

      // 2. Date-range filter: only show folders active today (dd ≤ today ≤ df)
      //    If a bound is missing we treat that side as open (no restriction).
      if (f.dd) {
        const start = new Date(
          f.dd.includes("T") ? f.dd : f.dd.replace(" ", "T"),
        );
        start.setHours(0, 0, 0, 0);
        if (today < start) return false;
      }
      if (f.df) {
        const end = new Date(
          f.df.includes("T") ? f.df : f.df.replace(" ", "T"),
        );
        end.setHours(0, 0, 0, 0);
        if (today > end) return false;
      }

      return true;
    });
  }, [folders, archivedStatusId]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAllFolders();

      if (!token) return;
      // Also refresh project map
      const projectList = await folderService.getAllProjects(token);
      const map: Record<string, string> = {};
      projectList.forEach((p: Project) => {
        map[p.id] = p.title;
      });
      setProjectMap(map);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadAllFolders, token]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        // Fetch stats
        const statsRes = await fetch(`${API_CONFIG.BASE_URL}/actions/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        if (!statsRes.ok)
          throw new Error(statsData.error || "Failed to load stats");
        setStats(statsData);
      } catch {
        setStats({
          pending: 0,
          today: 0,
          completed: 0,
          retard: 0,
          canceled: 0,
        });
      }
    })();
  }, [token]);

  const onMonthChange = useCallback(
    async (startIso: string, endIso: string) => {
      try {
        if (!token) return;
        const res = await fetch(
          `${API_CONFIG.BASE_URL}/calendar?start_date=${startIso}&end_date=${endIso}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await res.json();
        if (!res.ok) return;
        const map: Record<string, string[]> = {};
        (data || []).forEach((ev: any) => {
          const key = ev.date?.slice(0, 10);
          if (!key) return;
          if (!map[key]) map[key] = [];
          map[key].push(ev.context);
        });
        setEventsByDate(map);
      } catch {}
    },
    [token],
  );

  const renderGridItem = ({ item }: { item: GridItem }) => (
    <Pressable
      style={[
        styles.gridButton,
        {
          width: `${100 / numColumns - 3}%`,
        },
        item.disabled && styles.gridButtonDisabled,
      ]}
      onPress={() => {
        if (item.title === "Suivi") {
          router.push("/qualiphoto");
        } else if (item.title === "To-Do") {
          router.push("/danger");
        } else if (item.title === "Calendrier") {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsCalendarVisible((prevState) => !prevState);
        } else if (item.title === "Constat") {
          router.push("/constat");
        } else if (item.title === "transfert") {
          router.push("/transfert");
        } else if (item.title === "Paramètres") {
          router.push("/parameters");
        } else {
          Alert.alert(
            "Bientôt disponible",
            `La fonctionnalité ${item.title} est en cours de développement.`,
          );
        }
      }}
      disabled={item.disabled}
    >
      {item.image ? (
        <Image
          source={item.image}
          style={[styles.gridImage, item.disabled && { opacity: 0.5 }]}
        />
      ) : (
        <Ionicons
          name={item.icon!}
          size={32}
          color={item.disabled ? "#a0a0a0" : "#f87b1b"}
        />
      )}
      <Text
        style={[
          styles.gridButtonText,
          item.disabled && styles.gridButtonTextDisabled,
        ]}
      >
        {item.title}
      </Text>
    </Pressable>
  );

  // ─── Folder grid: render 2 columns ────────────────────────────────────────
  const renderFolderRows = () => {
    if (loadingFolders) {
      return (
        <View style={styles.foldersLoadingWrap}>
          <ActivityIndicator size="small" color="#f87b1b" />
          <Text style={styles.foldersLoadingText}>
            Chargement des dossiers…
          </Text>
        </View>
      );
    }

    if (visibleFolders.length === 0) {
      return (
        <View style={styles.foldersEmptyWrap}>
          <Text style={styles.foldersEmptyText}>Aucun contrôle disponible</Text>
        </View>
      );
    }

    // Build rows of 2
    const rows: Folder[][] = [];
    for (let i = 0; i < visibleFolders.length; i += 2) {
      rows.push(visibleFolders.slice(i, i + 2));
    }

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.folderRow}>
        {row.map((folder) => {
          const iconSource = folder.foldertype_id
            ? folderIconMap[folder.foldertype_id]
            : undefined;
          const ftTitle = folder.foldertype_id
            ? folderTypeMap[folder.foldertype_id]
            : folder.foldertype || undefined;
          const projTitle = folder.project_id
            ? projectMap[folder.project_id]
            : undefined;
          return (
            <FolderCard
              key={folder.id}
              item={folder}
              iconSource={iconSource}
              projectTitle={projTitle}
              folderTypeTitle={ftTitle}
              onPress={() => {
                setSelectedFolder(folder);
                setIsQuestionsModalVisible(true);
              }}
            />
          );
        })}
        {/* Fill empty slot if row has only 1 item */}
        {row.length === 1 && <View style={styles.folderCardPlaceholder} />}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <AppHeader user={user || undefined} />

      {/* User Message Section */}
      {!!user?.message && (
        <View style={styles.userMessageWrapper}>
          <RenderHTML
            contentWidth={width - 32}
            source={{ html: user.message }}
            baseStyle={{
              fontSize: 14,
              color: "#11224e",
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

      <FlatList
        data={gridItems}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.title}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#f87b1b"]}
            tintColor="#f87b1b"
          />
        }
        ListFooterComponent={
          <>
            {/* ── Folders Grid Section ── */}
            <View style={styles.foldersSectionHeader}>
              <View style={styles.folderSectionHeaderSide} />
              <View style={styles.foldersSectionTitleContainer}>
                <Ionicons
                  name="folder-open-outline"
                  size={20}
                  color="#f87b1b"
                />
                <Text style={styles.foldersSectionTitle}>Contrôles</Text>
              </View>
              <View style={styles.folderSectionHeaderSide}>
                <Pressable
                  onPress={() => router.push("/danger")}
                  style={styles.todoHeaderButton}
                >
                  <Image
                    source={require("../../assets/icons/danger.png")}
                    style={{ width: 16, height: 16 }}
                    contentFit="contain"
                  />
                  <Text style={styles.todoHeaderText}>To-Do</Text>
                </Pressable>
              </View>
            </View>
            {/* Contrôle Help Banner */}
            {!!controleHelp && (
              <View style={styles.helpBanner}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#f87b1b"
                  style={{ marginTop: 2 }}
                />
                <RenderHTML
                  contentWidth={width - 64}
                  source={{ html: controleHelp }}
                  baseStyle={{ fontSize: 13, color: "#374151", flex: 1 }}
                  tagsStyles={{
                    b: { fontWeight: "bold", color: "#11224e" },
                    strong: { fontWeight: "bold", color: "#11224e" },
                    i: { fontStyle: "italic" },
                    em: { fontStyle: "italic" },
                  }}
                />
              </View>
            )}
            <View style={[styles.foldersSection, { marginTop: 12 }]}>
              {renderFolderRows()}
            </View>

            {/* Calendar */}
            {isCalendarVisible && (
              <View style={styles.calendarContainer}>
                <CalendarComp
                  eventsByDate={eventsByDate}
                  onMonthChange={onMonthChange}
                  onDayPress={async (dateIso) => {
                    setSelectedDate(dateIso);
                    if (!token) {
                      setDayEvents([]);
                      setDayModalVisible(true);
                      return;
                    }
                    try {
                      const res = await fetch(
                        `${API_CONFIG.BASE_URL}/calendar?start_date=${dateIso}&end_date=${dateIso}`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        },
                      );
                      const data = await res.json();
                      if (!res.ok) throw new Error("Failed");
                      setDayEvents(Array.isArray(data) ? data : []);
                    } catch {
                      setDayEvents([]);
                    } finally {
                      setDayModalVisible(true);
                    }
                  }}
                  onAddEvent={() => setEventModalVisible(true)}
                />
              </View>
            )}

            {/* Spacer for custom tab bar */}
            <View style={{ height: 100 }} />
          </>
        }
      />
      <View style={styles.footer}>
        <Pressable
          onPress={() =>
            Linking.openURL("https://www.muntadaa.com/qualisol/help.html")
          }
          style={{ padding: 8 }}
        >
          <Ionicons name="help-circle-outline" size={24} color="#f87b1b" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          {companyTitle ? (
            <Text
              style={[
                styles.footerText,
                {
                  fontWeight: "bold",
                  marginBottom: 4,
                  fontSize: 14,
                  color: "#000",
                },
              ]}
            >
              {companyTitle}
            </Text>
          ) : null}
          <Text style={styles.footerText}>
            © 2026 Qualisol. Tous droits réservés.
          </Text>
        </View>
        {["Super Admin", "Admin"].includes(user?.role) && (
          <Pressable
            onPress={() => router.push("/parameters")}
            style={{ padding: 8 }}
          >
            <Image
              source={ICONS.settings}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
          </Pressable>
        )}
      </View>
      <CreateCalendarEventModal
        visible={eventModalVisible}
        onClose={() => setEventModalVisible(false)}
        onSubmit={async (vals) => {
          if (!token) return;
          await createCalendarEvent(
            {
              context: vals.context,
              title: vals.title,
              description: vals.description,
              date: vals.date,
              heur_debut: vals.heur_debut,
              heur_fin: vals.heur_fin,
            },
            token,
          );
          Alert.alert("Succès", "Événement créé avec succès");
          // Optimistically update indicators on the calendar
          try {
            const key = vals.date;
            setEventsByDate((prev) => {
              const next = { ...prev };
              const list = next[key] ? [...next[key]] : [];
              list.push(vals.context);
              next[key] = list;
              return next;
            });
          } catch {}
        }}
      />
      <DayEventsModal
        visible={dayModalVisible}
        date={selectedDate}
        events={dayEvents}
        onClose={() => setDayModalVisible(false)}
      />

      {/* Folder Questions Modal */}
      <FolderQuestionsModal
        visible={isQuestionsModalVisible}
        onClose={() => {
          setIsQuestionsModalVisible(false);
          setSelectedFolder(null);
          // Refresh folders after closing modal (in case of deletion)
          loadAllFolders();
        }}
        folderId={selectedFolder?.id ?? null}
        folderTitle={selectedFolder?.title}
        folderTypeTitle={
          selectedFolder?.foldertype_id
            ? folderTypeMap[selectedFolder.foldertype_id]
            : selectedFolder?.foldertype || undefined
        }
        projectTitle={
          selectedFolder?.project_id
            ? projectMap[selectedFolder.project_id]
            : undefined
        }
        onDelete={() => {
          setIsQuestionsModalVisible(false);
          setSelectedFolder(null);
          loadAllFolders();
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
  calendarContainer: {
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  userMessageWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: "center",
    width: "100%",
  },
  gridContainer: {
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  gridButton: {
    margin: "1.5%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f87b1b",
  },
  gridButtonDisabled: {
    backgroundColor: "#f0f0f0",
    borderColor: "#d0d0d0",
  },
  gridImage: {
    width: 32,
    height: 32,
  },
  gridButtonText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#11224e",
    textAlign: "center",
  },
  gridButtonTextDisabled: {
    color: "#a0a0a0",
  },

  // ── Folders section ──────────────────────────────────────────────────────
  foldersSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  folderSectionHeaderSide: {
    flex: 1,
    alignItems: "flex-end",
  },
  foldersSectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  todoHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8f3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f87b1b",
    gap: 6,
  },
  todoHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f87b1b",
  },
  foldersSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f87b1b",
  },
  foldersSection: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  folderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  folderCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f87b1b",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 6,
  },
  folderCardPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: "#fff8f3",
  },
  folderCardPlaceholder: {
    flex: 1,
  },
  folderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  folderCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff4ec",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  folderCardIcon: {
    width: 22,
    height: 22,
  },
  folderCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#11224e",
    flex: 1,
  },
  folderTypeBadge: {
    backgroundColor: "#fff4ec",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: "100%",
  },
  folderTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f87b1b",
    textAlign: "center",
  },
  folderCardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "stretch",
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  folderCardInfoText: {
    fontSize: 11,
    color: "#4b5563",
    flex: 1,
  },
  foldersLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 24,
  },
  foldersLoadingText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  foldersEmptyWrap: {
    alignItems: "center",
    paddingVertical: 24,
  },
  foldersEmptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },

  // ── Stats / Activity ───────────────────────────────────────────────────────
  statsContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  statsFrame: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    overflow: "hidden",
  },
  statRowSingle: {
    flexDirection: "row",
  },
  statGridRow: {
    flexDirection: "row",
  },
  rowTopDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  cellRightDivider: {
    borderRightWidth: 1,
    borderRightColor: "#F2F2F7",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
  section: {
    padding: 20,
  },
  sectionNoCalendar: {
    marginTop: 20,
    paddingTop: 0,
    paddingBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    gap: 12,
  },
  sectionTitleIcon: {
    width: 30,
    height: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f87b1b",
  },
  calendarToggle: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#f87b1b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle1: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 16,
  },
  sectionTitle2: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 16,
  },
  tasksButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#f87b1b",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
    shadowColor: "#f87b1b",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tasksButtonIcon: {
    width: 25,
    height: 25,
  },
  tasksButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f87b1b",
    marginLeft: 6,
  },
  linkButton: {
    color: "#f87b1b",
    fontSize: 14,
    fontWeight: "700",
  },
  quickActionsFrame: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1C1E",
    marginTop: 8,
    textAlign: "center",
  },
  activityContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  activityContainer1: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FF3B30",
    overflow: "hidden",
  },
  activityContainer2: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    overflow: "hidden",
  },
  activityItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  activityIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: "#1C1C1E",
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: "#8E8E93",
  },
  activityTable: {
    marginTop: 16,
  },
  activityRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  activityTabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    marginTop: 16,
  },
  activityTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#f87b1b",
  },
  activityTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activityContentPlaceholder: {
    minHeight: 10,
  },
  kpiContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#f87b1b",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  kpiCard: {
    alignItems: "center",
    flex: 1,
  },
  kpiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  footerText: {
    color: "#f87b1b",
    fontSize: 12,
  },
  helpBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff7ed",
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
  },
});
