import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MapSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: { latitude: number; longitude: number }) => void;
}

const INITIAL_REGION = {
  latitude: 33.5731, // Casablanca, Morocco
  longitude: -7.5898,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function MapSelectionModal({ visible, onClose, onLocationSelect }: MapSelectionModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const insets = useSafeAreaInsets();

  const handleMapPress = (e: any) => {
    setSelectedLocation(e.nativeEvent.coordinate);
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sélectionner un Emplacement</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
            <Ionicons name="close-circle" size={32} color="#f87b1b" />
          </TouchableOpacity>
        </View>

        <MapView style={styles.map} initialRegion={INITIAL_REGION} onPress={handleMapPress}>
          <UrlTile urlTemplate="http://c.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg" maximumZ={19} />
          {selectedLocation && <Marker coordinate={selectedLocation} />}
        </MapView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, !selectedLocation && styles.disabledButton]}
            onPress={handleConfirmLocation}
            disabled={!selectedLocation}>
            <Text style={styles.confirmButtonText}>Utiliser cet Emplacement</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11224e',
  },
  closeIcon: {
    position: 'absolute',
    right: 16,
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  confirmButton: {
    backgroundColor: '#f87b1b',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
});
