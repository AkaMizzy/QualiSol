import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface MapSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: { latitude: number; longitude: number }) => void;
}

const mapHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      body { margin: 0; padding: 0; }
      #map { width: 100%; height: 100vh; }
      .location-info {
        position: absolute;
        top: 10px;
        left: 10px;
        background: white;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        font-family: Arial, sans-serif;
        font-size: 14px;
      }
      .select-button {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f87b1b;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 16px;
        font-weight: bold;
        z-index: 1000;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="location-info">
      <strong>Localisation Sélectionnée:</strong><br>
      <span id="coordinates">Appuyez sur la carte pour sélectionner</span>
    </div>
    <button class="select-button" onclick="selectLocation()">Sélectionner cette localisation</button>
    
    <script>
      let map, marker, selectedLat, selectedLng;
      
      map = L.map('map').setView([33.5731, -7.5898], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        if (marker) {
          map.removeLayer(marker);
        }
        
        marker = L.marker([lat, lng]).addTo(map);
        
        selectedLat = lat;
        selectedLng = lng;
        document.getElementById('coordinates').innerHTML = 
          lat.toFixed(6) + ', ' + lng.toFixed(6);
      });
      
      function selectLocation() {
        if (selectedLat !== undefined && selectedLng !== undefined) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'locationSelected',
            latitude: selectedLat,
            longitude: selectedLng
          }));
        }
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          map.setView([lat, lng], 15);
          L.marker([lat, lng])
            .addTo(map)
            .bindPopup('Votre position actuelle')
            .openPopup();
        });
      }
    </script>
  </body>
  </html>
`;

export default function MapSelectionModal({ visible, onClose, onLocationSelect }: MapSelectionModalProps) {
  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        onLocationSelect({ latitude: data.latitude, longitude: data.longitude });
        onClose();
      }
    } catch (error) {
      console.error('Error parsing map message:', error);
    }
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sélectionner un Emplacement</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
            <Ionicons name="close-circle" size={32} color="#f87b1b" />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={handleMapMessage}
          javaScriptEnabled={true}
          startInLoadingState={true}
        />
      </SafeAreaView>
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
});
