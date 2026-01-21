import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getUsers } from "@/services/userService";
import { CompanyUser } from "@/types/user";
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
import UserCreateModal from "./UserCreateModal";
import WebUserDetail from "./WebUserDetail";

export default function WebUsersTable() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof CompanyUser>("firstname");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const canManageUsers = user?.role === "Super Admin" || user?.role === "Admin";

  const refreshUsers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const handleSort = (column: keyof CompanyUser) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getRoleName = (
    roleId: string,
    roleObj?: { id: string; role: string },
  ) => {
    // API returns role object with 'role' field, not 'name'
    if (roleObj?.role) return roleObj.role;
    // Fallback
    return `Role ${roleId}`;
  };

  const getStatusName = (
    statusId: string,
    statusObj?: { id: string; status: string },
  ) => {
    // API returns status object with 'status' field, not 'name'
    if (statusObj?.status) return statusObj.status;
    // Fallback
    return `Status ${statusId}`;
  };

  const getRoleBadgeColor = (roleId: string, roleName?: string) => {
    // Color based on role name for accuracy
    if (roleName) {
      const roleUpper = roleName.toUpperCase();
      if (roleUpper.includes("SUPER")) return "#9333ea"; // Super Admin - Purple
      if (roleUpper.includes("ADMIN")) return "#3b82f6"; // Admin - Blue
      if (roleUpper.includes("USER")) return "#10b981"; // User - Green
    }
    return "#6b7280"; // Default gray
  };

  const getStatusBadgeColor = (statusId: string, statusName?: string) => {
    // Color based on status name for accuracy
    if (statusName) {
      const statusUpper = statusName.toUpperCase();
      if (statusUpper.includes("ACTIV")) return "#10b981"; // Active - Green
      if (statusUpper.includes("INACTIV")) return "#ef4444"; // Inactive - Red
      if (statusUpper.includes("PEND")) return "#f59e0b"; // Pending - Orange
    }
    return "#6b7280"; // Default gray
  };

  const filteredUsers = users
    .filter((u) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        u.firstname.toLowerCase().includes(searchLower) ||
        u.lastname.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    })
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
              placeholder="Rechercher un utilisateur..."
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          {canManageUsers && (
            <TouchableOpacity
              onPress={() => setCreateVisible(true)}
              style={styles.createButton}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Nouvel utilisateur</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Table */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Aucun utilisateur trouvé"
                : "Aucun utilisateur disponible"}
            </Text>
            {!searchQuery && canManageUsers && (
              <Text style={styles.emptySubtext}>
                Créez votre premier utilisateur pour commencer
              </Text>
            )}
          </View>
        ) : (
          <ScrollView style={styles.tableContainer}>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <TouchableOpacity
                  style={[styles.headerCell, styles.nameColumn]}
                  onPress={() => handleSort("firstname")}
                >
                  <Text style={styles.headerText}>Nom</Text>
                  {sortColumn === "firstname" && (
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
                  style={[styles.headerCell, styles.emailColumn]}
                  onPress={() => handleSort("email")}
                >
                  <Text style={styles.headerText}>Email</Text>
                  {sortColumn === "email" && (
                    <Ionicons
                      name={
                        sortDirection === "asc" ? "chevron-up" : "chevron-down"
                      }
                      size={16}
                      color={COLORS.tertiary}
                    />
                  )}
                </TouchableOpacity>

                <View style={[styles.headerCell, styles.roleColumn]}>
                  <Text style={styles.headerText}>Rôle</Text>
                </View>

                <View style={[styles.headerCell, styles.statusColumn]}>
                  <Text style={styles.headerText}>Statut</Text>
                </View>

                <View style={[styles.headerCell, styles.actionsColumn]}>
                  <Text style={styles.headerText}>Actions</Text>
                </View>
              </View>

              {/* Table Body */}
              {filteredUsers.map((userItem) => {
                const roleName = getRoleName(userItem.role_id, userItem.role);
                const statusName = getStatusName(
                  userItem.status_id,
                  userItem.status,
                );

                return (
                  <TouchableOpacity
                    key={userItem.id}
                    style={styles.tableRow}
                    onPress={() => setSelectedUser(userItem)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.cell, styles.nameColumn]}>
                      <Text style={styles.cellTitleText} numberOfLines={1}>
                        {userItem.firstname} {userItem.lastname}
                      </Text>
                      <Text style={styles.cellSubtext} numberOfLines={1}>
                        {userItem.identifier}
                      </Text>
                    </View>

                    <View style={[styles.cell, styles.emailColumn]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {userItem.email}
                      </Text>
                    </View>

                    <View style={[styles.cell, styles.roleColumn]}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: `${getRoleBadgeColor(userItem.role_id, roleName)}20`,
                            borderColor: getRoleBadgeColor(
                              userItem.role_id,
                              roleName,
                            ),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: getRoleBadgeColor(
                                userItem.role_id,
                                roleName,
                              ),
                            },
                          ]}
                        >
                          {roleName}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.cell, styles.statusColumn]}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: `${getStatusBadgeColor(userItem.status_id, statusName)}20`,
                            borderColor: getStatusBadgeColor(
                              userItem.status_id,
                              statusName,
                            ),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: getStatusBadgeColor(
                                userItem.status_id,
                                statusName,
                              ),
                            },
                          ]}
                        >
                          {statusName}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.cell, styles.actionsColumn]}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setSelectedUser(userItem)}
                      >
                        <Ionicons
                          name="open-outline"
                          size={18}
                          color={COLORS.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Modals */}
      <UserCreateModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={refreshUsers}
      />

      <WebUserDetail
        visible={selectedUser !== null}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUpdated={refreshUsers}
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
  },
  nameColumn: {
    flex: 2.5,
  },
  emailColumn: {
    flex: 2.5,
  },
  roleColumn: {
    flex: 1.5,
  },
  statusColumn: {
    flex: 1,
  },
  actionsColumn: {
    flex: 0.5,
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
  },
});
