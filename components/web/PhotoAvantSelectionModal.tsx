import API_CONFIG from "@/app/config/api";
import { COLORS, FONT, SIZES } from "@/constants/theme";
import { Ged } from "@/services/gedService";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface PhotoAvantSelectionModalProps {
  visible: boolean;
  photoAvants: Ged[];
  onSelect: (photoAvantId: string) => void;
  onClose: () => void;
}

export default function PhotoAvantSelectionModal({
  visible,
  photoAvants,
  onSelect,
  onClose,
}: PhotoAvantSelectionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <div style={overlayStyle}>
        <div style={backdropStyle} onClick={onClose} />

        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Sélectionnez la photo avant à lier</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.tertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.gridContainer}
          >
            {photoAvants.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={64} color={COLORS.gray} />
                <Text style={styles.emptyText}>
                  Aucune photo avant disponible
                </Text>
                <Text style={styles.emptySubtext}>
                  Créez d'abord une photo avant pour pouvoir lier une photo
                  après
                </Text>
              </View>
            ) : (
              photoAvants.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoCard}
                  onPress={() => onSelect(photo.id)}
                >
                  {photo.url && (
                    <Image
                      source={{ uri: `${API_CONFIG.BASE_URL}${photo.url}` }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoTitle} numberOfLines={2}>
                      {photo.title || "Sans titre"}
                    </Text>
                    <Text style={styles.photoDate}>
                      {new Date(photo.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </div>
    </Modal>
  );
}

const overlayStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10000,
};

const backdropStyle = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  cursor: "pointer",
};

const styles = StyleSheet.create({
  modalContainer: {
    width: "90%",
    maxWidth: 800,
    maxHeight: "80%",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 10001,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.lightWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray2,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.tertiary,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    padding: 20,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
  } as any,
  photoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    cursor: "pointer",
    transition: "transform 0.2s",
  } as any,
  photoImage: {
    width: "100%",
    height: 150,
    backgroundColor: COLORS.gray2,
  },
  photoOverlay: {
    padding: 12,
    backgroundColor: COLORS.white,
  },
  photoTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.small,
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  photoDate: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small - 2,
    color: COLORS.gray,
  },
  emptyState: {
    gridColumn: "1 / -1",
    padding: 60,
    alignItems: "center",
    gap: 12,
  } as any,
  emptyText: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.gray,
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.gray,
    textAlign: "center",
    maxWidth: 300,
  },
});
