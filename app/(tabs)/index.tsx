import { createCalendarEvent } from "@/services/calendarService";
import { FolderType, getAllFolderTypes } from "@/services/folderTypeService";
import { getAuthToken, getUser } from "@/services/secureStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
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
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import CalendarComp from "../../components/calander/CalendarComp";
import CreateCalendarEventModal from "../../components/calander/CreateCalendarEventModal";
import DayEventsModal from "../../components/calander/DayEventsModal";

import { ICONS } from "@/constants/Icons";
import companyService from "@/services/companyService";
import { getGedsBySource } from "@/services/gedService";
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
    title: "Suivi",
    image: require("../../assets/icons/folder.png"),
    type: "system",
  },
  {
    title: "To-Do",
    image: require("../../assets/icons/danger.png"),
    type: "system",
  },
  {
    title: "Calendrier",
    image: require("../../assets/icons/calendar.png"),
    type: "system",
  },
];

// const GRID_ITEMS: { title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
//   { title: 'Manifold', icon: 'people-circle-outline' },
//   { title: 'Déclarations', icon: 'briefcase-outline' },
//   { title: 'Projets', icon: 'construct-outline' },
//   { title: 'Rapports', icon: 'document-text-outline' },
//   { title: 'Inventaires', icon: 'file-tray-full-outline' },
//   { title: 'Contrôles', icon: 'shield-checkmark-outline' },
//   { title: 'Fournisseurs', icon: 'business-outline' },
//   { title: 'Employés', icon: 'people-outline' },
//   { title: 'Paramètres', icon: 'settings-outline' },
// ];

type GridItem = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  image?: any;
  disabled?: boolean;
  type: "system" | "folderType";
  imageUrl?: string; // For folder types with GED images
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
  const [todayActivities, setTodayActivities] = useState<any[]>([]);
  const [overdueActivities, setOverdueActivities] = useState<any[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overdue",
  );
  const [companyTitle, setCompanyTitle] = useState<string>("");

  // Dynamic folder types
  const [folderTypes, setFolderTypes] = useState<FolderType[]>([]);
  const [gridItems, setGridItems] = useState<GridItem[]>(SYSTEM_GRID_ITEMS);
  const [loadingFolderTypes, setLoadingFolderTypes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  // Fetch folder types and merge with system items
  const loadFolderTypes = useCallback(async () => {
    if (!token) return;
    setLoadingFolderTypes(true);
    try {
      const fetchedFolderTypes = await getAllFolderTypes(token);
      setFolderTypes(fetchedFolderTypes);

      // Fetch GED images for each folder type (same logic as FolderTypeManagerModal)
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

      // Convert folder types to grid items
      const folderTypeItems: GridItem[] = typesWithImages.map((ft) => ({
        title: ft.title,
        // Use imageUrl from GED if available, otherwise use default folder icon
        image: ft.imageUrl
          ? { uri: ft.imageUrl }
          : require("../../assets/icons/folder.png"),
        imageUrl: ft.imageUrl,
        type: "folderType" as const,
      }));

      // Merge system items with folder type items
      // Filter out Paramètres first if user is not Super Admin
      const filteredSystemItems = ["Super Admin", "Admin"].includes(user?.role)
        ? SYSTEM_GRID_ITEMS
        : SYSTEM_GRID_ITEMS.filter((item) => item.title !== "Paramètres");

      setGridItems([...filteredSystemItems, ...folderTypeItems]);
    } catch (error) {
      console.error("Failed to load folder types:", error);
      // On error, still show system items
      // Filter out Paramètres if not Super Admin
      const filteredSystemItems = ["Super Admin", "Admin"].includes(user?.role)
        ? SYSTEM_GRID_ITEMS
        : SYSTEM_GRID_ITEMS.filter((item) => item.title !== "Paramètres");

      setGridItems(filteredSystemItems);
    } finally {
      setLoadingFolderTypes(false);
    }
  }, [token, user]);

  // Auto-refresh folder types when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFolderTypes();
    }, [loadFolderTypes]),
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (!token) return;

      // Reload folder types with their images
      const fetchedFolderTypes = await getAllFolderTypes(token);
      setFolderTypes(fetchedFolderTypes);

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

      // Update grid items
      const filteredSystemItems = ["Super Admin", "Admin"].includes(user?.role)
        ? SYSTEM_GRID_ITEMS
        : SYSTEM_GRID_ITEMS.filter((item) => item.title !== "Paramètres");

      const folderTypeItems: GridItem[] = typesWithImages.map((ft) => ({
        title: ft.title,
        image: ft.imageUrl
          ? { uri: ft.imageUrl }
          : require("../../assets/icons/folder.png"),
        imageUrl: ft.imageUrl,
        type: "folderType" as const,
      }));

      setGridItems([...filteredSystemItems, ...folderTypeItems]);
    } catch (error) {
      console.error("Failed to refresh folder types:", error);
    } finally {
      setRefreshing(false);
    }
  }, [token, user]);

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

        // Fetch today's activities
        const activitiesRes = await fetch(
          `${API_CONFIG.BASE_URL}/today-activities`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const activitiesData = await activitiesRes.json();
        if (activitiesRes.ok) {
          setTodayActivities(activitiesData);
        }

        // Fetch overdue activities
        const overdueRes = await fetch(
          `${API_CONFIG.BASE_URL}/overdue-activities`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const overdueData = await overdueRes.json();
        if (overdueRes.ok) {
          setOverdueActivities(overdueData);
        }

        // Fetch upcoming activities
        const upcomingRes = await fetch(
          `${API_CONFIG.BASE_URL}/upcoming-activities`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const upcomingData = await upcomingRes.json();
        if (upcomingRes.ok) {
          setUpcomingActivities(upcomingData);
        }

        // Fetch company info
        try {
          const companyData = await companyService.getCompany();
          if (companyData && companyData.title) {
            setCompanyTitle(companyData.title);
          }
        } catch (error) {
          console.error("Failed to fetch company info:", error);
        }
      } catch {
        // keep UI functional without stats
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

  // Helper function to format time
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to get status icon and text with activity type
  const getStatusInfo = (
    status: number,
    activityType?: "overdue" | "today" | "upcoming",
  ) => {
    // For overdue activities, always show warning icon
    if (activityType === "overdue") {
      return { icon: "warning", color: "#FF3B30", text: "En retard" };
    }

    // For upcoming activities, show calendar icon
    if (activityType === "upcoming") {
      return { icon: "calendar", color: "#007AFF", text: "À venir" };
    }

    // For today's activities, show pending icon
    if (activityType === "today") {
      return { icon: "time", color: "#FF9500", text: "Aujourd'hui" };
    }

    // Default status-based logic for other cases
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
          width: `${100 / numColumns - 3}%`, // Dynamic width based on numColumns
        },
        item.disabled && styles.gridButtonDisabled,
      ]}
      onPress={() => {
        // Handle folder types dynamically
        if (item.type === "folderType") {
          router.push(`/folders/${item.title}` as any);
        }
        // Handle system items with fixed routes
        else if (item.title === "Suivi") {
          router.push("/qualiphoto");
        } else if (item.title === "To-Do") {
          router.push("/danger");
        } else if (item.title === "Calendrier") {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsCalendarVisible((prevState) => !prevState);
        } else if (item.title === "Constat") {
          router.push("/galerie");
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <AppHeader user={user || undefined} />
      <FlatList
        data={gridItems}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.title}
        numColumns={numColumns}
        key={numColumns} // Re-renders the list when numColumns changes
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

            {/* Recent Activity */}
            <View
              style={[
                styles.section,
                !isCalendarVisible && styles.sectionNoCalendar,
              ]}
            >
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
                          // onPress={() => router.push('/(tabs)/tasks')}
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
                          // onPress={() => router.push('/(tabs)/tasks')}
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
                          // onPress={() => router.push('/(tabs)/tasks')}
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

            {/* Spacer for custom tab bar */}
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
          // Optimistically update indicators on the calendar
          try {
            const key = vals.date; // use the submitted local ISO (YYYY-MM-DD) to avoid TZ shifts
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
    marginBottom: 16,
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
    minHeight: 10, // Ensures LayoutAnimation has a container to animate
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
});
