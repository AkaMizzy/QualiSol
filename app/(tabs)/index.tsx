import { createCalendarEvent } from "@/services/calendarService";
import { FolderType, getAllFolderTypes } from "@/services/folderTypeService";
import { getAuthToken, getUser } from "@/services/secureStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    LayoutAnimation,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import CalendarComp from "../../components/calander/CalendarComp";
import CreateCalendarEventModal from "../../components/calander/CreateCalendarEventModal";
import DayEventsModal from "../../components/calander/DayEventsModal";
import FolderQuestionsModal from "../../components/folder/FolderQuestionsModal";

import { ICONS } from "@/constants/Icons";
import companyService from "@/services/companyService";
import folderService, { Folder, Project } from "@/services/folderService";
import { getGedsBySource } from "@/services/gedService";
import { getArchivedStatusId } from "@/services/statusService";
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
  type: "system" | "folderType";
  imageUrl?: string;
  folderTypeData?: FolderType & { imageUrl?: string };
};

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

// ─── Inline Folder Card ────────────────────────────────────────────────────
const InlineFolderCard = ({
  item,
  projectTitle,
  folderTypeImageUrl,
  onPress,
}: {
  item: Folder;
  projectTitle?: string;
  folderTypeImageUrl?: string;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      inlineStyles.card,
      pressed && inlineStyles.pressed,
    ]}
    onPress={onPress}
  >
    {/* FolderType icon at the top of the card */}
    <View style={inlineStyles.cardIconRow}>
      {folderTypeImageUrl ? (
        <Image
          source={{ uri: folderTypeImageUrl }}
          style={inlineStyles.cardTypeIcon}
          contentFit="contain"
        />
      ) : (
        <Image
          source={require("../../assets/icons/folder.png")}
          style={inlineStyles.cardTypeIcon}
          contentFit="contain"
        />
      )}
    </View>
    <View style={inlineStyles.cardBody}>
      <Text style={inlineStyles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={inlineStyles.infoRow}>
        <Image source={ICONS.chantierPng} style={{ width: 14, height: 14 }} />
        <Text style={inlineStyles.infoText} numberOfLines={1}>
          {projectTitle || "N/A"}
        </Text>
      </View>
      <View style={inlineStyles.infoRow}>
        <Ionicons name="calendar-outline" size={14} color="#f87b1b" />
        <Text style={inlineStyles.infoText}>
          {formatDateForGrid(item.created_at)}
        </Text>
      </View>
    </View>
  </Pressable>
);

// ─── Inline Folder Section (rendered below the grid in index.tsx) ──────────
function InlineFolderSection({
  folderType,
  token,
  user,
  onClose,
}: {
  folderType: FolderType & { imageUrl?: string };
  token: string;
  user: any;
  onClose: () => void;
}) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [archivedStatusId, setArchivedStatusId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isQuestionsModalVisible, setIsQuestionsModalVisible] = useState(false);

  const fetchFolders = useCallback(async () => {
    if (!token || !user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedFolders = await folderService.getAllFolders(
        token,
        folderType.title,
      );

      // Filter by access control
      let available = fetchedFolders;
      if (!["Super Admin", "Admin"].includes(user?.role)) {
        available = fetchedFolders.filter(
          (f) => String(f.owner_id) === String(user.id),
        );
      }

      // Filter out archived
      const filtered = available.filter(
        (f) => !archivedStatusId || f.status_id !== archivedStatusId,
      );

      const sorted = filtered.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
      setFolders(sorted);
    } catch (err) {
      console.error("Failed to load folders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token, user, folderType.title, archivedStatusId]);

  // Load archived status
  useEffect(() => {
    if (token) {
      getArchivedStatusId(token).then(setArchivedStatusId);
    }
  }, [token]);

  // Load projects for title lookup
  useEffect(() => {
    if (!token) return;
    folderService
      .getAllProjects(token)
      .then((list: Project[]) => {
        const map: Record<string, string> = {};
        list.forEach((p) => {
          map[p.id] = p.title;
        });
        setProjectMap(map);
      })
      .catch(console.error);
  }, [token]);

  // Fetch folders when visible or archivedStatusId changes
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleOpenQuestions = (folder: Folder) => {
    setSelectedFolderId(folder.id);
    setSelectedFolder(folder);
    setIsQuestionsModalVisible(true);
  };

  return (
    <View style={inlineStyles.section}>
      {/* Section header */}
      <View style={inlineStyles.sectionHeader}>
        <View style={inlineStyles.sectionHeaderLeft}>
          {folderType.imageUrl ? (
            <Image
              source={{ uri: folderType.imageUrl }}
              style={inlineStyles.sectionHeaderIcon}
              contentFit="contain"
            />
          ) : (
            <Image
              source={require("../../assets/icons/folder.png")}
              style={inlineStyles.sectionHeaderIcon}
              contentFit="contain"
            />
          )}
          <Text style={inlineStyles.sectionTitle} numberOfLines={1}>
            {folderType.title}
          </Text>
        </View>
        <Pressable onPress={onClose} style={inlineStyles.closeBtn} hitSlop={8}>
          <Ionicons name="close-circle" size={26} color="#f87b1b" />
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color="#f87b1b"
          style={{ marginVertical: 24 }}
        />
      ) : folders.length === 0 ? (
        <View style={inlineStyles.emptyWrap}>
          <Text style={inlineStyles.emptyText}>
            Aucun dossier pour le moment
          </Text>
        </View>
      ) : (
        <View style={inlineStyles.folderGrid}>
          {folders.map((folder) => {
            const projectTitle = folder.project_id
              ? projectMap[folder.project_id]
              : undefined;
            return (
              <InlineFolderCard
                key={folder.id}
                item={folder}
                projectTitle={projectTitle}
                folderTypeImageUrl={folderType.imageUrl}
                onPress={() => handleOpenQuestions(folder)}
              />
            );
          })}
        </View>
      )}

      {/* Folder Questions Modal */}
      <FolderQuestionsModal
        visible={isQuestionsModalVisible}
        onClose={() => setIsQuestionsModalVisible(false)}
        folderId={selectedFolderId}
        onDelete={fetchFolders}
        folderTitle={selectedFolder?.title}
        folderTypeTitle={selectedFolder?.foldertype || folderType.title}
        projectTitle={
          selectedFolder?.project_id
            ? projectMap[selectedFolder.project_id]
            : undefined
        }
      />
    </View>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { width } = useWindowDimensions();
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
  const [todayActivities, setTodayActivities] = useState<any[]>([]);
  const [overdueActivities, setOverdueActivities] = useState<any[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overdue",
  );
  const [companyTitle, setCompanyTitle] = useState<string>("");

  // Dynamic folder types
  const [folderTypes, setFolderTypes] = useState<
    (FolderType & { imageUrl?: string })[]
  >([]);
  const [gridItems, setGridItems] = useState<GridItem[]>(SYSTEM_GRID_ITEMS);
  const [loadingFolderTypes, setLoadingFolderTypes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Inline folder display
  const [selectedFolderType, setSelectedFolderType] = useState<
    (FolderType & { imageUrl?: string }) | null
  >(null);
  const folderSectionRef = useRef<ScrollView>(null);

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

  // Fetch folder types and resolve GED icons
  const loadFolderTypes = useCallback(async () => {
    if (!token) return;
    setLoadingFolderTypes(true);
    try {
      const fetchedFolderTypes = await getAllFolderTypes(token);

      // Fetch GED images for each folder type
      const typesWithImages = await Promise.all(
        fetchedFolderTypes.map(async (type) => {
          try {
            const geds = await getGedsBySource(
              token,
              type.id,
              "folder_type_icon",
            );
            if (geds.length > 0 && geds[0].url) {
              return {
                ...type,
                imageUrl: `${API_CONFIG.BASE_URL}${geds[0].url}`,
                imageGedId: geds[0].id,
              };
            }
          } catch (error) {
            console.error(
              `Failed to fetch GED image for folder type ${type.title}:`,
              error,
            );
          }
          return type;
        }),
      );

      setFolderTypes(typesWithImages);

      // Convert to grid items
      const folderTypeItems: GridItem[] = typesWithImages.map((ft) => ({
        title: ft.title,
        image: ft.imageUrl
          ? { uri: ft.imageUrl }
          : require("../../assets/icons/folder.png"),
        imageUrl: ft.imageUrl,
        type: "folderType" as const,
        folderTypeData: ft,
      }));

      const filteredSystemItems = ["Super Admin", "Admin"].includes(user?.role)
        ? SYSTEM_GRID_ITEMS
        : SYSTEM_GRID_ITEMS.filter((item) => item.title !== "Paramètres");

      setGridItems([...filteredSystemItems, ...folderTypeItems]);
    } catch (error) {
      console.error("Failed to load folder types:", error);
      const filteredSystemItems = ["Super Admin", "Admin"].includes(user?.role)
        ? SYSTEM_GRID_ITEMS
        : SYSTEM_GRID_ITEMS.filter((item) => item.title !== "Paramètres");
      setGridItems(filteredSystemItems);
    } finally {
      setLoadingFolderTypes(false);
    }
  }, [token, user]);

  // Auto-refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadFolderTypes();
    }, [loadFolderTypes]),
  );

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFolderTypes();
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadFolderTypes]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const statsRes = await fetch(`${API_CONFIG.BASE_URL}/actions/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        if (!statsRes.ok)
          throw new Error(statsData.error || "Failed to load stats");
        setStats(statsData);

        const activitiesRes = await fetch(
          `${API_CONFIG.BASE_URL}/today-activities`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const activitiesData = await activitiesRes.json();
        if (activitiesRes.ok) setTodayActivities(activitiesData);

        const overdueRes = await fetch(
          `${API_CONFIG.BASE_URL}/overdue-activities`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const overdueData = await overdueRes.json();
        if (overdueRes.ok) setOverdueActivities(overdueData);

        const upcomingRes = await fetch(
          `${API_CONFIG.BASE_URL}/upcoming-activities`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const upcomingData = await upcomingRes.json();
        if (upcomingRes.ok) setUpcomingActivities(upcomingData);

        try {
          const companyData = await companyService.getCompany();
          if (companyData && companyData.title) {
            setCompanyTitle(companyData.title);
          }
        } catch (error) {
          console.error("Failed to fetch company info:", error);
        }
      } catch {
        setStats({
          pending: 0,
          today: 0,
          completed: 0,
          retard: 0,
          canceled: 0,
        });
        setTodayActivities([]);
        setOverdueActivities([]);
        setUpcomingActivities([]);
      }
    })();
  }, [token]);

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusInfo = (
    status: number,
    activityType?: "overdue" | "today" | "upcoming",
  ) => {
    if (activityType === "overdue")
      return { icon: "warning", color: "#FF3B30", text: "En retard" };
    if (activityType === "upcoming")
      return { icon: "calendar", color: "#007AFF", text: "À venir" };
    if (activityType === "today")
      return { icon: "time", color: "#FF9500", text: "Aujourd'hui" };
    switch (status) {
      case 0:
        return { icon: "time", color: "#FF9500", text: "En attente" };
      case 1:
        return { icon: "checkmark-circle", color: "#34C759", text: "Terminé" };
      case 2:
        return { icon: "close-circle", color: "#FF3B30", text: "Annulé" };
      default:
        return { icon: "help-circle", color: "#8E8E93", text: "Inconnu" };
    }
  };

  const onMonthChange = useCallback(
    async (startIso: string, endIso: string) => {
      try {
        if (!token) return;
        const res = await fetch(
          `${API_CONFIG.BASE_URL}/calendar?start_date=${startIso}&end_date=${endIso}`,
          { headers: { Authorization: `Bearer ${token}` } },
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

  const handleFolderTypeTap = (item: GridItem) => {
    if (item.type !== "folderType" || !item.folderTypeData) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Toggle: if already selected, close
    if (selectedFolderType?.id === item.folderTypeData.id) {
      setSelectedFolderType(null);
    } else {
      setSelectedFolderType(item.folderTypeData);
    }
  };

  const renderGridItem = ({ item }: { item: GridItem }) => {
    const isActive =
      item.type === "folderType" && selectedFolderType?.title === item.title;

    return (
      <Pressable
        style={[
          styles.gridButton,
          { width: `${100 / numColumns - 3}%` },
          item.disabled && styles.gridButtonDisabled,
          isActive && styles.gridButtonActive,
        ]}
        onPress={() => {
          if (item.type === "folderType") {
            handleFolderTypeTap(item);
          } else if (item.title === "Suivi") {
            router.push("/qualiphoto");
          } else if (item.title === "To-Do") {
            router.push("/danger");
          } else if (item.title === "Calendrier") {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setIsCalendarVisible((prev) => !prev);
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
            isActive && styles.gridButtonTextActive,
          ]}
        >
          {item.title}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <AppHeader user={user || undefined} />
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
            {/* ── Inline Folder Section ─────────────────────────────── */}
            {selectedFolderType && token && user && (
              <InlineFolderSection
                key={selectedFolderType.id}
                folderType={selectedFolderType}
                token={token}
                user={user}
                onClose={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setSelectedFolderType(null);
                }}
              />
            )}

            {/* ── Calendar ─────────────────────────────────────────── */}
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
                        { headers: { Authorization: `Bearer ${token}` } },
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

            {/* ── Recent Activity ───────────────────────────────────── */}
            <View
              style={[
                styles.section,
                !isCalendarVisible && styles.sectionNoCalendar,
              ]}
            >
              <View style={styles.sectionHeader}>
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut,
                    );
                    setIsCalendarVisible(!isCalendarVisible);
                  }}
                  style={styles.calendarToggle}
                >
                  <Image
                    source={require("../../assets/icons/calendar.png")}
                    style={{ width: 24, height: 24 }}
                  />
                </Pressable>

                <Text style={styles.sectionTitle}>Activités Récentes</Text>

                <Pressable
                  onPress={() => router.push("/danger")}
                  style={styles.calendarToggle}
                >
                  <Image
                    source={require("../../assets/icons/danger.png")}
                    style={{ width: 24, height: 24 }}
                  />
                </Pressable>
              </View>

              {/* Activity Tabs */}
              <View style={styles.activityTabsContainer}>
                <Pressable
                  onPress={() => toggleSection("overdue")}
                  style={[
                    styles.activityTab,
                    expandedSection === "overdue" && styles.activeTab,
                  ]}
                >
                  <Text style={[styles.activityTabText, { color: "#FF3B30" }]}>
                    En Retard ({overdueActivities.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSection("today")}
                  style={[
                    styles.activityTab,
                    expandedSection === "today" && styles.activeTab,
                  ]}
                >
                  <Text style={[styles.activityTabText, { color: "#f87b1b" }]}>
                    Aujourd&apos;hui ({todayActivities.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSection("upcoming")}
                  style={[
                    styles.activityTab,
                    expandedSection === "upcoming" && styles.activeTab,
                  ]}
                >
                  <Text style={[styles.activityTabText, { color: "#007AFF" }]}>
                    À Venir ({upcomingActivities.length})
                  </Text>
                </Pressable>
              </View>

              {/* Expanded Content */}
              <View style={styles.activityContentPlaceholder}>
                {expandedSection === "overdue" && (
                  <View style={styles.activityContainer}>
                    {overdueActivities.length > 0 ? (
                      overdueActivities.map((activity) => (
                        <Pressable
                          key={activity.id}
                          style={styles.activityItem}
                        >
                          <View style={styles.activityIcon}>
                            <Ionicons
                              name="warning"
                              size={16}
                              color="#FF3B30"
                            />
                          </View>
                          <View style={styles.activityContent}>
                            <Text
                              style={[
                                styles.activityText,
                                { color: "#FF3B30" },
                              ]}
                            >
                              {activity.title || "Activité sans titre"}
                            </Text>
                            <Text
                              style={[
                                styles.activityTime,
                                { color: "#FF3B30" },
                              ]}
                            >
                              {formatTime(activity.date_planification)} • En
                              retard
                              {activity.declaration_title &&
                                ` • ${activity.declaration_title}`}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    ) : (
                      <View style={styles.activityItem}>
                        <Text
                          style={[styles.activityText, { color: "#FF3B30" }]}
                        >
                          Aucune activité en retard
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {expandedSection === "today" && (
                  <View style={styles.activityContainer}>
                    {todayActivities.length > 0 ? (
                      todayActivities.map((activity) => (
                        <Pressable
                          key={activity.id}
                          style={styles.activityItem}
                        >
                          <View style={styles.activityIcon}>
                            <Ionicons name="time" size={16} color="#f87b1b" />
                          </View>
                          <View style={styles.activityContent}>
                            <Text
                              style={[
                                styles.activityText,
                                { color: "#f87b1b" },
                              ]}
                            >
                              {activity.title || "Activité sans titre"}
                            </Text>
                            <Text
                              style={[
                                styles.activityTime,
                                { color: "#f87b1b" },
                              ]}
                            >
                              {formatTime(activity.date_planification)} •
                              Aujourd&apos;hui
                              {activity.declaration_title &&
                                ` • ${activity.declaration_title}`}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    ) : (
                      <View style={styles.activityItem}>
                        <Text
                          style={[styles.activityText, { color: "#f87b1b" }]}
                        >
                          Aucune activité prévue aujourd&apos;hui
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {expandedSection === "upcoming" && (
                  <View style={styles.activityContainer}>
                    {upcomingActivities.length > 0 ? (
                      upcomingActivities.map((activity) => (
                        <Pressable
                          key={activity.id}
                          style={styles.activityItem}
                        >
                          <View style={styles.activityIcon}>
                            <Ionicons
                              name="calendar"
                              size={16}
                              color="#007AFF"
                            />
                          </View>
                          <View style={styles.activityContent}>
                            <Text
                              style={[
                                styles.activityText,
                                { color: "#007AFF" },
                              ]}
                            >
                              {activity.title || "Activité sans titre"}
                            </Text>
                            <Text
                              style={[
                                styles.activityTime,
                                { color: "#007AFF" },
                              ]}
                            >
                              {formatTime(activity.date_planification)} • À
                              venir
                              {activity.declaration_title &&
                                ` • ${activity.declaration_title}`}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    ) : (
                      <View style={styles.activityItem}>
                        <Text
                          style={[styles.activityText, { color: "#007AFF" }]}
                        >
                          Aucune activité à venir
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Spacer for tab bar */}
            <View style={{ height: 100 }} />
          </>
        }
      />
      <View style={styles.footer}>
        <Pressable
          onPress={() =>
            Linking.openURL("https://www.muntadaa.com/qualisol/help")
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
            © 2025 Qualisol. Tous droits réservés.
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
    </SafeAreaView>
  );
}

// ─── Inline folder section styles ─────────────────────────────────────────
const inlineStyles = StyleSheet.create({
  section: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#f87b1b",
    overflow: "hidden",
    shadowColor: "#f87b1b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff8f3",
    borderBottomWidth: 1,
    borderBottomColor: "#ffe5cc",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sectionHeaderIcon: {
    width: 28,
    height: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f87b1b",
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  folderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    gap: 10,
  },
  card: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f87b1b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: 10,
    alignItems: "center",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: "#fff8f3",
  },
  cardIconRow: {
    marginBottom: 6,
    alignItems: "center",
  },
  cardTypeIcon: {
    width: 36,
    height: 36,
  },
  cardBody: {
    width: "100%",
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f87b1b",
    textAlign: "center",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  infoText: {
    fontSize: 11,
    color: "#4b5563",
    flex: 1,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "500",
  },
});

// ─── Main dashboard styles ─────────────────────────────────────────────────
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
  gridButtonActive: {
    backgroundColor: "#fff3e8",
    borderColor: "#e06a0b",
    borderWidth: 2,
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
  gridButtonTextActive: {
    color: "#f87b1b",
  },
  statsContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
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
  activityContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
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
});
