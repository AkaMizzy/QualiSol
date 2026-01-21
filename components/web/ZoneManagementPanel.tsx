import CreateZoneModal from "@/components/zone/CreateZoneModal";
import ZoneDetailModal from "@/components/zone/ZoneDetailModal";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getProjectById } from "@/services/projectService";
import { getAllZones, Zone } from "@/services/zoneService";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  projectId: string;
};

export default function ZoneManagementPanel({ projectId }: Props) {
  const { token, user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canCreateZone = user?.role === "Super Admin" || user?.role === "Admin";

  const loadZones = useCallback(async () => {
    if (!token || !projectId) return;
    setIsLoading(true);
    try {
      const [allZones, projectData] = await Promise.all([
        getAllZones(token),
        getProjectById(token, projectId),
      ]);
      // Filter zones for this project only
      const projectZones = allZones.filter(
        (zone) => zone.project_id === projectId,
      );
      setZones(projectZones);
      setProject(projectData);
    } catch (error) {
      console.error("Error loading zones:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const filteredZones = zones.filter((zone) =>
    zone.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <View style={styles.container}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.gray} />
            <TextInput
              placeholder="Rechercher une zone..."
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          {canCreateZone && (
            <TouchableOpacity
              onPress={() => setCreateVisible(true)}
              style={styles.createButton}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Nouvelle zone</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Zone Table */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredZones.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Aucune zone trouvée"
                : "Aucune zone pour ce chantier"}
            </Text>
            {!searchQuery && canCreateZone && (
              <Text style={styles.emptySubtext}>
                Créez votre première zone pour commencer
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={[styles.headerCell, styles.titleColumn]}>
                <Text style={styles.headerText}>Titre</Text>
              </View>
              <View style={[styles.headerCell, styles.codeColumn]}>
                <Text style={styles.headerText}>Code</Text>
              </View>
              <View style={[styles.headerCell, styles.typeColumn]}>
                <Text style={styles.headerText}>Type</Text>
              </View>
              <View style={[styles.headerCell, styles.actionsColumn]}>
                <Text style={styles.headerText}>Actions</Text>
              </View>
            </View>

            {/* Table Body */}
            {filteredZones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={styles.tableRow}
                onPress={() => setSelectedZone(zone)}
                activeOpacity={0.7}
              >
                <View style={[styles.cell, styles.titleColumn]}>
                  <Text style={styles.cellTitleText} numberOfLines={1}>
                    {zone.title}
                  </Text>
                  {zone.description && (
                    <Text style={styles.cellSubtext} numberOfLines={1}>
                      {zone.description}
                    </Text>
                  )}
                </View>

                <View style={[styles.cell, styles.codeColumn]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {zone.code}
                  </Text>
                </View>

                <View style={[styles.cell, styles.typeColumn]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {zone.zonetype_id || "—"}
                  </Text>
                </View>

                <View style={[styles.cell, styles.actionsColumn]}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setSelectedZone(zone)}
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
        )}
      </View>

      {/* Modals */}
      <CreateZoneModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        projectId={projectId}
        projectTitle={project?.title}
        projectCode={project?.code}
        onCreated={loadZones}
      />

      <ZoneDetailModal
        visible={selectedZone !== null}
        onClose={() => setSelectedZone(null)}
        zoneId={selectedZone?.id || null}
        onUpdated={loadZones}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
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
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
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
  table: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray2,
    overflow: "hidden",
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
    flex: 3,
  },
  codeColumn: {
    flex: 1.5,
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
