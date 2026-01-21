import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getAllProjects, Project } from "@/services/projectService";
import { formatDisplayDate } from "@/utils/dateFormat";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ProjectCreateModal from "./ProjectCreateModal";
import WebProjectDetail from "./WebProjectDetail";

export default function WebProjectsTable() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Project>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const canCreateProject =
    user?.role === "Super Admin" || user?.role === "Admin";

  const refreshProjects = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const allProjects = await getAllProjects(token);
      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const handleSort = (column: keyof Project) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredProjects = projects
    .filter((project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? comparison : -comparison;
    });

  return (
    <>
      <View style={styles.container}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.gray} />
            <TextInput
              placeholder="Rechercher un chantier..."
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          {canCreateProject && (
            <TouchableOpacity
              onPress={() => setCreateVisible(true)}
              style={styles.createButton}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Nouveau chantier</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Table */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Aucun chantier trouvé"
                : "Aucun chantier disponible"}
            </Text>
            {!searchQuery && canCreateProject && (
              <Text style={styles.emptySubtext}>
                Créez votre premier chantier pour commencer
              </Text>
            )}
          </View>
        ) : (
          <ScrollView style={styles.tableContainer}>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <TouchableOpacity
                  style={[styles.headerCell, styles.titleColumn]}
                  onPress={() => handleSort("title")}
                >
                  <Text style={styles.headerText}>Titre</Text>
                  {sortColumn === "title" && (
                    <Ionicons
                      name={
                        sortDirection === "asc" ? "chevron-up" : "chevron-down"
                      }
                      size={16}
                      color={COLORS.tertiary}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.headerCell, styles.companyColumn]}
                  onPress={() => handleSort("company_title")}
                >
                  <Text style={styles.headerText}>Société</Text>
                  {sortColumn === "company_title" && (
                    <Ionicons
                      name={
                        sortDirection === "asc" ? "chevron-up" : "chevron-down"
                      }
                      size={16}
                      color={COLORS.tertiary}
                    />
                  )}
                </TouchableOpacity>

                <View style={[styles.headerCell, styles.dateColumn]}>
                  <Text style={styles.headerText}>Période</Text>
                </View>

                <View style={[styles.headerCell, styles.typeColumn]}>
                  <Text style={styles.headerText}>Type</Text>
                </View>

                <View style={[styles.headerCell, styles.actionsColumn]}>
                  <Text style={styles.headerText}>Actions</Text>
                </View>
              </View>

              {/* Table Body */}
              {filteredProjects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.tableRow}
                  onPress={() => setSelectedProject(project)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.cell, styles.titleColumn]}>
                    <Text style={styles.cellTitleText} numberOfLines={1}>
                      {project.title}
                    </Text>
                    <Text style={styles.cellSubtext} numberOfLines={1}>
                      {project.code}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.companyColumn]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                      {project.company_title || "—"}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.dateColumn]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                      {formatDisplayDate(project.dd)} -{" "}
                      {formatDisplayDate(project.df)}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.typeColumn]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                      {project.project_type_title || "—"}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.actionsColumn]}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setSelectedProject(project)}
                    >
                      <Ionicons
                        name="open-outline"
                        size={18}
                        color={COLORS.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Modals */}
      <ProjectCreateModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={refreshProjects}
      />

      <WebProjectDetail
        visible={selectedProject !== null}
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onUpdated={refreshProjects}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
    outlineStyle: "none",
  } as any,
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.gray,
  },
  emptySubtext: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray2,
  },
  table: {
    minWidth: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gray2,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  headerText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.tertiary,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    cursor: "pointer",
  } as any,
  cell: {
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  cellTitleText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  cellSubtext: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 2,
  },
  cellText: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  titleColumn: {
    flex: 2.5,
  },
  companyColumn: {
    flex: 1.5,
  },
  dateColumn: {
    flex: 2,
  },
  typeColumn: {
    flex: 1.5,
  },
  actionsColumn: {
    flex: 0.5,
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
  },
});
