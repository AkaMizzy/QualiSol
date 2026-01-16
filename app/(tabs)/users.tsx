import AppHeader from '@/components/AppHeader';
import CreateUserModal from '@/components/users/CreateUserModal';
import UserDetailModal from '@/components/users/UserDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers } from '@/services/userService';
import { CompanyUser } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API_CONFIG from '../config/api';

export default function UsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const userList = await getUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const userList = await getUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Error refreshing users:', error);
      Alert.alert('Erreur', 'Impossible de rafraîchir la liste des utilisateurs');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserCreated = async () => {
    // Refresh users list when a new user is created
    await fetchUsers();
  };

  const handleUserCardPress = (user: CompanyUser) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedUser(null);
  };

  const getRoleStyle = (roleName?: string) => {
    const lowerCaseRole = roleName?.toLowerCase();
    return lowerCaseRole === 'admin'
      ? { bg: '#ffffff', color: '#11224e', border: '#11224e', label: 'Admin' }
      : { bg: '#ffffff', color: '#f87b1b', border: '#f87b1b', label: 'Utilisateur' };
  };

  const getStatusStyle = (statusName?: string) => {
    const lowerCaseStatus = statusName?.toLowerCase();
    return lowerCaseStatus === 'actif' || lowerCaseStatus === 'active'
      ? { bg: '#e9f7ef', color: '#2ecc71', border: '#c6f0d9', label: 'Actif' }
      : { bg: '#f4f5f7', color: '#6b7280', border: '#e5e7eb', label: 'Inactif' };
  };

  const getInterneStyle = (interne?: number) => {
    return interne === 1 || interne === undefined
      ? { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe', label: 'Interne', icon: 'business' as const }
      : { bg: '#fff7ed', color: '#f87b1b', border: '#fed7aa', label: 'Externe', icon: 'globe' as const };
  };

  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role?.name.toLowerCase() !== roleFilter) return false;
      if (!q) return true;
      const hay = `${u.firstname} ${u.lastname} ${u.email} ${u.phone1 ?? ''} ${u.phone2 ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, searchQuery, roleFilter]);

  const renderUserCard = ({ item }: { item: CompanyUser }) => {
    const roleStyle = getRoleStyle(item.role?.name);
    const statusStyle = getStatusStyle(item.status?.name);
    const interneStyle = getInterneStyle(item.interne);
    
    // Build avatar URL if photo exists
    const avatarUrl = item.photo 
      ? `${API_CONFIG.BASE_URL}${item.photo}`
      : null;
    
    return (
      <TouchableOpacity 
        style={[
          styles.userCard,
          item.role?.name === 'admin' && styles.adminCard
        ]}
        onPress={() => handleUserCardPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color="#6b7280" />
              </View>
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.firstname} {item.lastname}
            </Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.phone1 && (
              <Text style={styles.userPhone}>{item.phone1}</Text>
            )}
          </View>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            {item.role?.name && (
              <View style={[styles.badge, { backgroundColor: roleStyle.bg, borderColor: roleStyle.border }]}>
                <Text style={[styles.badgeText, { color: roleStyle.color }]}>
                  {roleStyle.label}
                </Text>
              </View>
            )}
            {item.status?.name && (
              <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border, marginTop: 4 }]}>
                <Text style={[styles.badgeText, { color: statusStyle.color }]}>
                  {statusStyle.label}
                </Text>
              </View>
            )}
            {/* Internal/External indicator */}
            <View style={[styles.badge, { backgroundColor: interneStyle.bg, borderColor: interneStyle.border, marginTop: 4, flexDirection: 'row', gap: 4 }]}>
              <Ionicons name={interneStyle.icon} size={10} color={interneStyle.color} />
              <Text style={[styles.badgeText, { color: interneStyle.color }]}>
                {interneStyle.label}
              </Text>
            </View>
            {/* Show represented company for external users */}
            {item.interne === 0 && item.represent && (
              <Text style={{ fontSize: 10, color: '#f87b1b', marginTop: 4, textAlign: 'right' as const }}>
                {item.represent}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#11224e" size="large" />
        <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <AppHeader user={user || undefined} />
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSearchContainer}>
              <Ionicons name="search" size={18} color="#6b7280" />
              <View style={{ width: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher (nom, email, tél)"
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#f87b1b" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.controlsContainer}>
            <View style={styles.filtersRow}>
              {/* Role chips */}
              <View style={styles.filterGroup}>
                <TouchableOpacity
                  style={[styles.chip, roleFilter === 'all' && styles.chipActive]}
                  onPress={() => setRoleFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, roleFilter === 'all' && styles.chipTextActive]}>Tous rôles</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, roleFilter === 'admin' && styles.chipActive]}
                  onPress={() => setRoleFilter('admin')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, roleFilter === 'admin' && styles.chipTextActive]}>Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, roleFilter === 'user' && styles.chipActive]}
                  onPress={() => setRoleFilter('user')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, roleFilter === 'user' && styles.chipTextActive]}>Utilisateur</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserCard}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#11224e']}
                tintColor="#11224e"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#9ca3af" />
                <Text style={styles.emptyTitle}>Aucun utilisateur</Text>
                <Text style={styles.emptySubtitle}>
                  Commencez par ajouter des utilisateurs à votre entreprise
                </Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>

      <CreateUserModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={handleUserCreated}
      />

      <UserDetailModal
        visible={showDetailModal}
        user={selectedUser}
        onClose={handleCloseDetailModal}
        onUserUpdated={(updatedUser) => {
          // Update the user in the local state
          setUsers(prevUsers => 
            prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
          );
        }}
        onUserDeleted={(userId) => {
          setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
        }}
      />
    </>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
  },
  headerSearchContainer: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#11224e',
  },
  subtitle: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 14,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filtersRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-start' as const,
    marginTop: 12,
  },
  filterGroup: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: '#f87b1b',
    backgroundColor: '#fff7ed',
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500' as const,
  },
  chipTextActive: {
    color: '#f87b1b',
    fontWeight: '600' as const,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f87b1b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#f87b1b',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#f87b1b',
    marginLeft: 6,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  adminCard: {
    borderColor: '#f87b1b',
  },
  userHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#11224e',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  badgesContainer: {
    alignItems: 'flex-end' as const,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center' as const,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: 8,
    paddingHorizontal: 32,
  },
} as const;
