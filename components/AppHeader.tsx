import API_CONFIG from "@/app/config/api";
import { ICONS } from "@/constants/Icons";
import companyService from "@/services/companyService";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
    role?: string;
    role_id?: string;
  };
}

export default function AppHeader({
  showNotifications = true,
  showProfile = true,
  onNotificationPress,
  onProfilePress,
  onNavigate,
  user,
}: AppHeaderProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyTitle, setCompanyTitle] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  // Fetch company logo on mount
  useEffect(() => {
    const fetchCompanyLogo = async () => {
      try {
        const company = await companyService.getCompany();
        if (company) {
          if (company.logo) setCompanyLogo(company.logo);
          if (company.title) setCompanyTitle(company.title);
        }
      } catch (error) {
        console.error("Error fetching company logo:", error);
      }
    };

    if (user) {
      fetchCompanyLogo();
    }
  }, [user]);

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
    setLogoError(false);
  }, [user?.photo, companyLogo]);

  const handleNavigate = (path: React.ComponentProps<typeof Link>["href"]) => {
    if (onNavigate) {
      onNavigate();
    }
    router.push(path);
  };

  const formatDateTime = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString("en-GB", { month: "short" });
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} - ${hours}:${minutes}`;
  };

  const getUserNameColor = () => {
    if (!user) return "#1e293b"; // Default dark color

    const lowerRole = user.role?.toLowerCase() || "";

    if (lowerRole.includes("admin")) {
      return "#f87b1b"; // Orange for Admin & Super Admin
    } else if (lowerRole === "user") {
      return "#2563eb"; // Blue for User
    }

    return "#1e293b"; // Default dark color for other roles
  };

  const usernameColor = getUserNameColor();

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      handleNavigate("/(tabs)/profile");
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => handleNavigate("/(tabs)")}
          accessibilityRole="button"
          accessibilityLabel="Navigate to home"
        >
          <Image
            source={
              companyLogo && !logoError ? { uri: companyLogo } : ICONS.newIcon
            }
            style={styles.logo}
            resizeMode="contain"
            onError={() => setLogoError(true)}
          />
        </TouchableOpacity>

        {/* Center - Company Name & User Info */}
        <View style={styles.headerCenter}>
          {companyTitle && (
            <Text style={styles.companyName} numberOfLines={1}>
              {companyTitle}
            </Text>
          )}
          {user && (
            <View style={styles.userInfo}>
              <Text style={[styles.userNameText, { color: usernameColor }]}>
                {user.firstname} {user.lastname}
              </Text>
            </View>
          )}
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
                    console.log(
                      "Failed to load avatar image:",
                      `${API_CONFIG.BASE_URL}${user.photo}`,
                    );
                    setImageError(true);
                  }}
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color="#FF6B35"
                />
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 2,
    borderBottomColor: "#f87b1b",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    width: 50,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: "600",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#11224e",
    textAlign: "center",
    marginBottom: 2,
  },
  dateTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#11224e",
    textAlign: "center",
  },
  logo: {
    width: 45,
    height: 45,
  },
  iconButton: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerIcon: {
    width: 28,
    height: 28,
  },
});
