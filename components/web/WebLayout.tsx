import { COLORS, FONT, SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useWebGalerie } from '@/hooks/useWebGalerie';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebFolderList from './WebFolderList';
import WebGalerie from './WebGalerie';

export default function WebLayout() {
  const { user, logout } = useAuth();
  
  // Lift galerie state to parent so it's shared between WebGalerie and WebFolderList
  const galerieState = useWebGalerie();

  const handleLogout = async () => {
    if (confirm('Voulez-vous vraiment vous déconnecter?')) {
      await logout();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/icons/new_icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
        </View>

        <View style={styles.headerRight}>
          {user && (
            <View style={styles.userInfo}>
              <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.userName}>
                {user.firstname} {user.lastname}
              </Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content - Split View */}
      <div style={styles.mainContent as any}>
        <div style={styles.galerieSection as any}>
          <WebGalerie galerieState={galerieState} />
        </div>
        
        <div style={styles.folderSection as any}>
          <WebFolderList galerieState={galerieState} />
        </div>
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
    height: '100vh' as any,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 80,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 100,
    height: 100,
    
    
  },
  appTitle: {
    fontFamily: FONT.bold,
    fontSize: 28,
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 20,
  },
  userName: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.tertiary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  logoutText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    height: 'calc(100vh - 80px)',
    gap: 0,
  } as any,
  galerieSection: {
    borderRight: `2px solid ${COLORS.gray2}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  } as any,
  folderSection: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  } as any,
});
