import { COLORS, FONT, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { WebGaleriePhoto } from "@/hooks/useWebGalerie";
import { Ionicons } from "@expo/vector-icons";
import { fr } from "date-fns/locale";
import React, { useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import DraggablePhotoCard from "./DraggablePhotoCard";
import ImagePreviewModal from "./ImagePreviewModal";
import WebAddImageModal from "./WebAddImageModal";

// Register French locale
registerLocale("fr", fr);

// Custom styles for the datepicker
const datepickerCustomStyles = `
  .custom-datepicker {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border: none !important;
    background: transparent !important;
  }
  
  .react-datepicker {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  
  .react-datepicker__header {
    background-color: #f87b1b !important;
    border-bottom: none !important;
    border-radius: 12px 12px 0 0 !important;
    padding-top: 12px !important;
  }
  
  .react-datepicker__current-month {
    color: white !important;
    font-weight: 600 !important;
    font-size: 16px !important;
    margin-bottom: 8px !important;
    text-transform: capitalize;
  }
  
  .react-datepicker__day-name {
    color: rgba(255, 255, 255, 0.9) !important;
    font-weight: 500 !important;
    width: 36px !important;
    line-height: 36px !important;
    margin: 2px !important;
  }
  
  .react-datepicker__month {
    margin: 8px !important;
    padding: 0 !important;
  }
  
  .react-datepicker__day {
    width: 36px !important;
    line-height: 36px !important;
    margin: 2px !important;
    border-radius: 50% !important;
    color: #312651 !important;
    font-weight: 500 !important;
    transition: all 0.15s ease !important;
  }
  
  .react-datepicker__day:hover {
    background-color: rgba(248, 123, 27, 0.15) !important;
    color: #f87b1b !important;
  }
  
  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected {
    background-color: #f87b1b !important;
    color: white !important;
    font-weight: 600 !important;
  }
  
  .react-datepicker__day--selected:hover {
    background-color: #e06f17 !important;
  }
  
  .react-datepicker__day--today {
    font-weight: 700 !important;
    border: 2px solid #f87b1b !important;
  }
  
  .react-datepicker__day--disabled {
    color: #d0d0d0 !important;
  }
  
  .react-datepicker__day--outside-month {
    color: #8E8E93 !important;
  }
  
  .react-datepicker__navigation {
    top: 12px !important;
  }
  
  .react-datepicker__navigation-icon::before {
    border-color: white !important;
    border-width: 2px 2px 0 0 !important;
  }
  
  .react-datepicker__navigation:hover *::before {
    border-color: rgba(255, 255, 255, 0.7) !important;
  }
  
  .react-datepicker__month-dropdown-container,
  .react-datepicker__year-dropdown-container {
    margin: 0 8px !important;
  }
  
  .react-datepicker__month-select,
  .react-datepicker__year-select {
    background: white !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    border-radius: 6px !important;
    padding: 4px 8px !important;
    color: #312651 !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    font-size: 14px !important;
  }
  
  .react-datepicker__month-select:focus,
  .react-datepicker__year-select:focus {
    outline: none !important;
    border-color: #f87b1b !important;
  }
`;

interface WebGalerieProps {
  galerieState: ReturnType<
    typeof import("@/hooks/useWebGalerie").useWebGalerie
  >;
}

export default function WebGalerie({ galerieState }: WebGalerieProps) {
  const { token } = useAuth();
  const {
    photos,
    loading,
    error,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
  } = galerieState;

  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<WebGaleriePhoto | null>(
    null,
  );
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handlePhotoClick = (photo: WebGaleriePhoto) => {
    setPreviewPhoto(photo);
  };

  const handleDragStart = (photoId: string) => {
    setDraggingPhotoId(photoId);
  };

  const handleDragEnd = () => {
    setDraggingPhotoId(null);
  };

  const handleUploadSuccess = () => {
    // Refresh the gallery to show the new photo
    if (galerieState.refetch) {
      galerieState.refetch();
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des photos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: datepickerCustomStyles }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Galerie</Text>
              <Text style={styles.headerSubtitle}>
                {galerieState.allPhotos.length} photo
                {galerieState.allPhotos.length !== 1 ? "s" : ""}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {/* Upload Button */}
              <button
                onClick={() => setShowUploadModal(true)}
                style={uploadButtonStyle}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color={COLORS.white}
                />
                <span
                  style={{
                    marginLeft: "8px",
                    color: COLORS.white,
                    fontFamily: FONT.medium,
                    fontSize: "15px",
                  }}
                >
                  Ajouter une photo
                </span>
              </button>

              {/* Date Filter */}
              <View style={styles.dateFilter}>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  style={calendarButtonStyle}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.calendarButtonText}>
                    {galerieState.selectedDate
                      ? new Date(galerieState.selectedDate).toLocaleDateString(
                          "fr-FR",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "Sélectionner une date"}
                  </Text>
                </button>

                {galerieState.selectedDate && (
                  <button
                    onClick={galerieState.clearDateFilter}
                    style={clearButtonStyle}
                    title="Effacer le filtre"
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={COLORS.white}
                    />
                  </button>
                )}
              </View>
            </View>

            {/* Calendar Dropdown */}
            {showCalendar && (
              <div style={calendarDropdownStyle}>
                <View style={styles.calendarContent}>
                  <Text style={styles.calendarTitle}>Filtrer par date</Text>

                  <DatePicker
                    selected={
                      galerieState.selectedDate
                        ? new Date(galerieState.selectedDate)
                        : null
                    }
                    onChange={(date: Date | null) => {
                      if (date) {
                        // Format date as YYYY-MM-DD for the filter
                        const formattedDate = date.toISOString().split("T")[0];
                        galerieState.setSelectedDate(formattedDate);
                        setShowCalendar(false);
                      }
                    }}
                    locale="fr"
                    dateFormat="dd/MM/yyyy"
                    inline
                    calendarClassName="custom-datepicker"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    maxDate={new Date()}
                  />

                  <View style={styles.calendarActions}>
                    <button
                      onClick={() => {
                        galerieState.clearDateFilter();
                        setShowCalendar(false);
                      }}
                      style={secondaryButtonStyle}
                    >
                      Annuler
                    </button>
                  </View>
                </View>
              </div>
            )}
          </View>
        </View>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
            padding: "16px",
            overflowY: "auto",
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {photos.map((photo) => (
            <DraggablePhotoCard
              key={photo.id}
              photo={photo}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onPress={handlePhotoClick}
            />
          ))}
        </div>

        {photos.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune photo disponible</Text>
          </View>
        )}

        {totalPages > 1 && (
          <View style={styles.pagination}>
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              style={{
                ...paginationButtonStyle,
                opacity: currentPage === 0 ? 0.5 : 1,
                cursor: currentPage === 0 ? "not-allowed" : "pointer",
              }}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
            </button>

            <Text style={styles.pageInfo}>
              Page {currentPage + 1} / {totalPages}
            </Text>

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              style={{
                ...paginationButtonStyle,
                opacity: currentPage === totalPages - 1 ? 0.5 : 1,
                cursor:
                  currentPage === totalPages - 1 ? "not-allowed" : "pointer",
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.primary}
              />
            </button>
          </View>
        )}
      </View>

      <ImagePreviewModal
        visible={!!previewPhoto}
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />

      <WebAddImageModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </>
  );
}

const paginationButtonStyle = {
  padding: "8px 16px",
  backgroundColor: COLORS.lightWhite,
  border: "none",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const uploadButtonStyle = {
  padding: "12px 20px",
  backgroundColor: COLORS.primary,
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "row" as const,
  alignItems: "center",
  gap: "10px",
  transition: "all 0.2s",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
};

const datePickerStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: `2px solid ${COLORS.gray2}`,
  fontSize: "16px",
  fontFamily: FONT.medium,
  color: COLORS.tertiary,
  backgroundColor: COLORS.white,
  width: "100%",
  cursor: "pointer",
  outline: "none",
  transition: "border-color 0.2s",
};

const calendarButtonStyle = {
  padding: "12px 20px",
  backgroundColor: COLORS.white,
  border: `2px solid ${COLORS.primary}`,
  borderRadius: "10px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "row" as const,
  alignItems: "center",
  gap: "10px",
  fontFamily: FONT.medium,
  fontSize: "15px",
  color: COLORS.primary,
  transition: "all 0.2s",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
};

const calendarDropdownStyle = {
  position: "absolute" as const,
  top: "100%",
  right: 0,
  marginTop: "10px",
  backgroundColor: COLORS.white,
  borderRadius: "12px",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.25)",
  padding: "20px",
  zIndex: 9999,
  minWidth: "320px",
  border: `1px solid ${COLORS.gray2}`,
};

const secondaryButtonStyle = {
  padding: "10px 20px",
  backgroundColor: COLORS.lightWhite,
  border: `1px solid ${COLORS.gray2}`,
  borderRadius: "8px",
  cursor: "pointer",
  fontFamily: FONT.medium,
  fontSize: "14px",
  color: COLORS.tertiary,
  width: "100%",
};

const clearButtonStyle = {
  padding: "10px 12px",
  backgroundColor: COLORS.deleteColor,
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "opacity 0.2s",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    zIndex: 100,
    position: "relative",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 24,
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "relative",
  },
  calendarButtonText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
  calendarTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZES.large,
    color: COLORS.tertiary,
    marginBottom: 16,
    textAlign: "center",
  },
  calendarContent: {
    gap: 16,
  },
  calendarActions: {
    marginTop: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  errorText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: "#ef4444",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: FONT.medium,
    fontSize: SIZES.medium,
    color: COLORS.gray,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  pageInfo: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
});
