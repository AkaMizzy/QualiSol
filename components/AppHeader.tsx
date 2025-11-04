import API_CONFIG from '@/app/config/api';
import { ICONS } from '@/constants/Icons';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';


interface AppHeaderProps {
  showNotifications?: boolean;
  showProfile?: boolean;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onNavigate?: () => void;
  user?: {
    firstname?: string;
    lastname?: string;
    photo?: string | null;
  };
}

export default function AppHeader({
  showNotifications = true,
  showProfile = true,
  onNotificationPress,
  onProfilePress,
  onNavigate,
  user
}: AppHeaderProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update time every second for a real-time feel
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000); // Update every second

    return () => {
      clearInterval(timerId);
    };
  }, []);

  // Reset image error when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.photo]);

  const handleNavigate = (path: React.ComponentProps<typeof Link>['href']) => {
    if (onNavigate) {
      onNavigate();
    }
    router.push(path);
  };

  const formatDateTime = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'short' });
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} - ${hours}:${minutes}`;
  };


  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      handleNavigate('/(tabs)/profile');
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.headerLeft}
          onPress={() => handleNavigate('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Navigate to home"
        >
          <Image
            source={ICONS.icon}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        {/* Center - User Name */}
        <View style={styles.headerCenter}>
          <Text style={styles.userName}>
            {user?.firstname && user?.lastname 
              ? `${user.firstname} ${user.lastname}`
              : 'QualiSol'
            }
          </Text>
          <Text style={styles.dateTime}>{formatDateTime(currentDate)}</Text>
        </View>
        
        {/* Right side - Action Icons */}
        <View style={styles.headerRight}>
          {showProfile && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.iconButton}
              onPress={handleProfilePress}
            >
              {user?.photo && !imageError ? (
                <Image
                  source={{ uri: `${API_CONFIG.BASE_URL}${user.photo}` }}
                  style={styles.avatar}
                  onError={() => {
                    console.log('Failed to load avatar image:', `${API_CONFIG.BASE_URL}${user.photo}`);
                    setImageError(true);
                  }}
                />
              ) : (
                <Ionicons name="person-circle-outline" size={28} color="#FF6B35" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#f87b1b',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerRight: { 
    width: 100,
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    gap: 8 
  },
  userName: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#11224e',
    textAlign: 'center'
  },
  dateTime: {
    fontSize: 14,
    color: '#11224e',
    opacity: 0.9,
    textAlign: 'center',
  },
  logo: {
    width: 50,
    height: 50,
  },
  iconButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
});
