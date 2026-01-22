import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
    downloadImagesZip,
    Ged,
    getCompanyImages,
} from "@/services/gedService";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function WebCompanyGallery() {
  const { token } = useAuth();
  const [images, setImages] = useState<Ged[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getCompanyImages(token);
      setImages(data);
    } catch (err) {
      console.error("Error loading images:", err);
      setError("Impossible de charger les images.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 10) {
        alert("Vous ne pouvez sélectionner que 10 images maximum.");
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDownload = async () => {
    if (!token || selectedIds.length === 0) return;

    try {
      setDownloading(true);
      await downloadImagesZip(token, selectedIds);
      setSelectedIds([]); // Clear selection after download
    } catch (err: any) {
      console.error("Download error:", err);
      alert(err.message || "Erreur lors du téléchargement.");
    } finally {
      setDownloading(false);
    }
  };

  const renderItem = ({ item }: { item: Ged }) => {
    const isSelected = selectedIds.includes(item.id);
    const imageUrl = item.url
      ? `${API_CONFIG.BASE_URL}${item.url}`
      : "https://via.placeholder.com/150";

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => toggleSelection(item.id)}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} />
        {isSelected && (
          <View style={styles.checkmarkOverlay}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title || "Sans titre"}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchImages} style={styles.retryButton}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Aucune image disponible.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.infoText}>
          Sélectionnez des images pour les télécharger (Max 10).
          {selectedIds.length > 0 && ` ${selectedIds.length} sélectionnée(s)`}
        </Text>
        <TouchableOpacity
          style={[
            styles.downloadButton,
            (selectedIds.length === 0 || downloading) &&
              styles.downloadButtonDisabled,
          ]}
          onPress={handleDownload}
          disabled={selectedIds.length === 0 || downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.downloadButtonText}>
              Télécharger la sélection
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={images}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={4} // Adjust based on screen size if needed, but 4 is decent for web
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  infoText: {
    fontFamily: FONT.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  downloadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  downloadButtonDisabled: {
    backgroundColor: COLORS.gray2,
    opacity: 0.7,
  },
  downloadButtonText: {
    fontFamily: FONT.bold,
    color: COLORS.white,
    fontSize: SIZES.medium,
  },
  listContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    overflow: "hidden",
    maxWidth: "24%", // Approx 4 columns with gap
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardSelected: {
    borderColor: COLORS.primary,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  checkmarkOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  checkmark: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  cardFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
  },
  cardTitle: {
    color: COLORS.white,
    fontFamily: FONT.medium,
    fontSize: 12,
  },
  cardDate: {
    color: COLORS.gray2,
    fontFamily: FONT.regular,
    fontSize: 10,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    fontFamily: FONT.medium,
  },
  retryButton: {
    padding: 10,
    backgroundColor: COLORS.gray2,
    borderRadius: 5,
  },
  retryText: {
    fontFamily: FONT.medium,
    color: COLORS.tertiary,
  },
  emptyText: {
    fontFamily: FONT.medium,
    color: COLORS.gray,
    fontSize: SIZES.large,
  },
});
