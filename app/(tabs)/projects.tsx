import API_CONFIG from "@/app/config/api";
import AppHeader from "@/components/AppHeader";
import CreateProjectModal from "@/components/projects/CreateProjectModal";
import ProjectDetailModal from "@/components/projects/ProjectDetailModal";
import ProjectTypeManagerModal from "@/components/projects/ProjectTypeManagerModal";
import { useAuth } from "@/contexts/AuthContext";
import { getGedsBySource } from "@/services/gedService";
import { getAllProjects, Project } from "@/services/projectService";
import { getUsers } from "@/services/userService";
import { CompanyUser } from "@/types/user";
import { formatDisplayDate } from "@/utils/dateFormat";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProjectsScreen() {
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const { width } = useWindowDimensions();
  const [createVisible, setCreateVisible] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTypeManagerVisible, setProjectTypeManagerVisible] =
    useState<boolean>(false);
  const [projectPlans, setProjectPlans] = useState<Record<string, string>>({});

  const refreshProjects = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const refreshed = await getAllProjects(token);
      if (user?.company_id) {
        // Strict filtering: only show projects matching the user's company_id
        const filtered = refreshed.filter(
          (p) => String(p.company_id) === String(user.company_id),
        );
        setProjects(filtered);

        // Update selectedProject if it exists to reflect newest data in detail modal
        if (selectedProject) {
          const updated = filtered.find((p) => p.id === selectedProject.id);
          if (updated) setSelectedProject(updated);
        }

        // Fetch plan images for these projects
        const projectIds = filtered.map((p) => p.id);
        if (projectIds.length > 0) {
          try {
            const planGeds = await getGedsBySource(token, projectIds, "plan");
            const planMap: Record<string, string> = {};
            // getGedsBySource returns newest first (desc). 
            // We only want to keep the first (newest) one for each project.
            planGeds.forEach((ged) => {
              if (ged.url && !planMap[ged.idsource]) {
                planMap[ged.idsource] = ged.url;
              }
            });
            setProjectPlans(planMap);
          } catch (e) {
            console.error("Failed to fetch project plan images", e);
          }
        }
      } else {
        // If user has no company assigned, show no projects
        setProjects([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.company_id]);

  useEffect(() => {
    refreshProjects();
  }, [token, refreshProjects]);

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
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 22, fontWeight: "700", color: "#11224e" }}
              >
                Chantiers
              </Text>
              <Text style={{ marginTop: 4, color: "#6b7280" }}>
                Gérez et consultez vos chantiers en cours
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setCreateVisible(true)}
              style={[styles.button]}
            >
              <Ionicons name="add-circle" size={20} color="#f87b1b" />
              <Text style={styles.ButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: horizontalPadding,
            marginTop: 16,
          }}
        >
          {isLoading && projects.length === 0 ? (
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
              data={projects}
              numColumns={columnCount}
              columnWrapperStyle={{ gap }}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View style={{ height: gap }} />}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedProject(item);
                      setDetailVisible(true);
                    }}
                    style={[
                      styles.card,
                      {
                        width: cardWidth,
                        borderColor: "#e5e7eb",
                        shadowColor: "#000",
                        padding: 0, // Reset padding for child layouts
                        overflow: "hidden", // Clip background image
                      },
                    ]}
                  >
                    {projectPlans[item.id] ? (
                      <ImageBackground
                        source={{ uri: `${API_CONFIG.BASE_URL}${projectPlans[item.id]}` }}
                        style={styles.cardImageBackground}
                        resizeMode="cover"
                      >
                        <LinearGradient
                          colors={[
                            "rgba(0,0,0,0.1)",
                            "rgba(0,0,0,0.4)",
                            "rgba(0,0,0,0.7)",
                          ]}
                          style={styles.cardOverlay}
                        >
                          <View style={styles.cardContent}>
                            <Text
                              style={[styles.cardTitle, { color: "white" }]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <View style={{ marginTop: 6 }}>
                              <Text
                                style={[styles.cardSub, { color: "#e5e7eb" }]}
                              >
                                Du {formatDisplayDate(item.dd)} au{" "}
                                {formatDisplayDate(item.df)}
                              </Text>
                              {item.project_type_title ? (
                                <Text
                                  style={[
                                    styles.cardMeta,
                                    { color: "#f87b1b" },
                                  ]}
                                >
                                  Type · {item.project_type_title}
                                </Text>
                              ) : null}
                              {(() => {
                                const owner = users.find(
                                  (u) => u.id === item.owner_id,
                                );
                                if (owner) {
                                  return (
                                    <Text
                                      style={[
                                        styles.cardMeta,
                                        { color: "#f87b1b" },
                                      ]}
                                    >
                                      {owner.firstname} {owner.lastname}
                                    </Text>
                                  );
                                }
                                return null;
                              })()}
                            </View>
                          </View>
                        </LinearGradient>
                      </ImageBackground>
                    ) : (
                      <View style={[styles.cardContent, { padding: 12 }]}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                        </View>
                        <View style={{ marginTop: 6 }}>
                          <Text style={styles.cardSub}>
                            Du {formatDisplayDate(item.dd)} au{" "}
                            {formatDisplayDate(item.df)}
                          </Text>
                          {item.project_type_title ? (
                            <Text style={styles.cardMeta}>
                              Type · {item.project_type_title}
                            </Text>
                          ) : null}
                          {(() => {
                            const owner = users.find(
                              (u) => u.id === item.owner_id,
                            );
                            if (owner) {
                              return (
                                <Text style={styles.cardMeta}>
                                  {owner.firstname} {owner.lastname}
                                </Text>
                              );
                            }
                            return null;
                          })()}
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </SafeAreaView>

      <CreateProjectModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={refreshProjects}
      />
      <ProjectDetailModal
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        onUpdated={refreshProjects}
      />
      <ProjectTypeManagerModal
        visible={projectTypeManagerVisible}
        onClose={() => setProjectTypeManagerVisible(false)}
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
  typesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f87b1b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f87b1b",
  },
  button: {
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
  ButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f87b1b",
    marginLeft: 6,
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
  },
  cardImageBackground: {
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: "flex-end",
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardMeta: {
    marginTop: 4,
    color: "#f87b1b",
  },
});