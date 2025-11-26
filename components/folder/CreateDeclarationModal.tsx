import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import API_CONFIG from '../app/config/api';
import { CompanyUser, CreateDeclarationData, DeclarationType, ManifolderDetailsForDeclaration, Project, Zone } from '../types/declaration';

interface CreateDeclarationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeclarationData) => Promise<void>;
  declarationTypes: DeclarationType[];
  zones: Zone[];
  projects: Project[];
  companyUsers: CompanyUser[];
  currentUser: CompanyUser;
  isLoading?: boolean;
  manifolderDetails?: ManifolderDetailsForDeclaration;
  prefill?: {
    id_zone?: string;
    id_project?: string;
    latitude?: number;
    longitude?: number;
    photoPath?: string; // relative path like /uploads/qualiphoto/...
    photoUri?: string; // full URI if already absolute
    title?: string;
    description?: string;
    disableFields?: boolean; // if true, disable zone, project, and location fields
  };
}

const { width } = Dimensions.get('window');

export default function CreateDeclarationModal({
  visible,
  onClose,
  onSubmit,
  declarationTypes,
  zones,
  projects,
  companyUsers,
  currentUser,
  isLoading = false,
  manifolderDetails,
  prefill,
}: CreateDeclarationModalProps) {
  const [formData, setFormData] = useState<Omit<CreateDeclarationData, 'code_declaration'>>({
    title: '',
    id_declaration_type: '',
    severite: 5,
    id_zone: '',
    description: '',
    date_declaration: '',
    id_declarent: currentUser?.id,
    latitude: undefined,
    longitude: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeclarantModal, setShowDeclarantModal] = useState(false);
  const [declarantSearchQuery, setDeclarantSearchQuery] = useState('');
  
  const [selectedPhotos, setSelectedPhotos] = useState<{ uri: string; type: string; name: string }[]>([]);
  
  const [showLocationInput, setShowLocationInput] = useState(false);

  const toISODate = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  const formatDisplayDate = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  useEffect(() => {
    if (!visible) return;

    const initialFormData: Omit<CreateDeclarationData, 'code_declaration'> = {
      title: manifolderDetails ? `Déclaration pour ${manifolderDetails.manifolderDetail.questionTitle}` : (prefill?.title || ''),
      id_declaration_type: '',
      severite: 5,
      id_zone: manifolderDetails ? manifolderDetails.manifolder.defaultZoneId : '' ,
      description: manifolderDetails ? `Lié à la question du manifolder: ${manifolderDetails.manifolderDetail.questionTitle}` : (prefill?.description || ''),
      date_declaration: toISODate(new Date()),
      id_declarent: currentUser?.id,
      latitude: undefined,
      longitude: undefined,
      id_manifold: manifolderDetails ? manifolderDetails.manifolder.id : undefined,
      id_manifold_detail: manifolderDetails ? manifolderDetails.manifolderDetail.id : undefined,
      id_project: undefined,
    } as any;

    // Apply prefill overrides if provided
    const withPrefill = {
      ...initialFormData,
      id_zone: prefill?.id_zone ? String(prefill.id_zone) : initialFormData.id_zone,
      id_project: prefill?.id_project ? String(prefill.id_project) : initialFormData.id_project,
      latitude: prefill?.latitude !== undefined && prefill?.latitude !== null ? Number(prefill.latitude) : initialFormData.latitude,
      longitude: prefill?.longitude !== undefined && prefill?.longitude !== null ? Number(prefill.longitude) : initialFormData.longitude,
    } as Omit<CreateDeclarationData, 'code_declaration'>;

    setFormData(withPrefill);
    setErrors({});
    setSelectedPhotos([]);
    setShowLocationInput(false);

    // Prefill photo if provided
    const absolutePhotoUri = prefill?.photoUri
      || (prefill?.photoPath ? `${API_CONFIG.BASE_URL}${prefill.photoPath}` : undefined);
    if (absolutePhotoUri) {
      const name = (() => {
        try {
          const url = new URL(absolutePhotoUri);
          const last = url.pathname.split('/').pop() || 'qualiphoto.jpg';
          return last;
        } catch {
          const parts = absolutePhotoUri.split('/');
          return parts[parts.length - 1] || 'qualiphoto.jpg';
        }
      })();
      setSelectedPhotos([{ uri: absolutePhotoUri, type: 'image/jpeg', name }]);
    }
  }, [visible, currentUser?.id, manifolderDetails, prefill]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    }
    if (!formData.id_declaration_type) {
      newErrors.id_declaration_type = 'Le type de déclaration est requis';
    }
    if (!formData.id_zone) {
      newErrors.id_zone = 'La zone est requise';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }
    if (!formData.date_declaration) {
      newErrors.date_declaration = 'La date de déclaration est requise';
    }
    if (formData.severite < 0 || formData.severite > 10) {
      newErrors.severite = 'La sévérité doit être entre 0 et 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const dataWithPhotos = {
        ...formData,
        code_declaration: '', // The backend generates the code, this is to satisfy the type.
        photos: selectedPhotos.length > 0 ? selectedPhotos : undefined
      };
      await onSubmit(dataWithPhotos);
      // No alert on success, just close the modal.
      onClose();
    } catch (error) {
      console.error('❌ Failed to create declaration:', error);
      Alert.alert('Erreur', 'La création de la déclaration a échoué. Veuillez réessayer.');
    }
  };

  const getDeclarationTypeTitle = (id: string) => {
    const type = declarationTypes.find(t => t.id === id);
    return type ? type.title : 'Sélectionner le type';
  };

  const getZoneTitle = (id: string) => {
    const zone = zones.find(z => z.id === id);
    return zone ? zone.title : 'Sélectionner la zone';
  };

  const getZoneLogo = (id: string) => {
    const zone = zones.find(z => z.id === id);
    if (!zone || !zone.logo) return null;
    return `${API_CONFIG.BASE_URL}${zone.logo}`;
  };

  const getProjectTitle = (id: string) => {
    const project = projects.find(p => p.id === id);
    return project ? project.title : 'Sélectionner le projet';
  };

  const getDeclarantName = (id: string) => {
    if (id === currentUser?.id) {
      return `${currentUser.firstname} ${currentUser.lastname}`;
    }
    const user = companyUsers.find(u => u.id === id);
    return user ? `${user.firstname} ${user.lastname}` : 'Sélectionner le déclarant';
  };

  const getFilteredDeclarants = () => {
    const query = declarantSearchQuery.trim().toLowerCase();
    const allUsers = [
      { id: currentUser.id, firstname: currentUser.firstname, lastname: currentUser.lastname, isCurrentUser: true },
      ...companyUsers.filter(user => user.id !== currentUser.id).map(user => ({ ...user, isCurrentUser: false }))
    ];
    
    if (!query) return allUsers;
    
    return allUsers.filter(user => 
      `${user.firstname} ${user.lastname}`.toLowerCase().includes(query)
    );
  };

  const handleLocationToggle = () => {
    setShowLocationInput(!showLocationInput);
  };

  const getCoordinateDisplay = () => {
    const lat = formData.latitude !== undefined && formData.latitude !== null ? Number(formData.latitude) : undefined;
    const lng = formData.longitude !== undefined && formData.longitude !== null ? Number(formData.longitude) : undefined;
    if (Number.isFinite(lat as number) && Number.isFinite(lng as number)) {
      return `${(lat as number).toFixed(6)}, ${(lng as number).toFixed(6)}`;
    }
    return 'Appuyez pour sélectionner la localisation';
  };

  // OpenStreetMap HTML with Leaflet
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
        
        // Initialize map
        map = L.map('map').setView([33.5731, -7.5898], 13);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Handle map clicks
        map.on('click', function(e) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          
          // Remove existing marker
          if (marker) {
            map.removeLayer(marker);
          }
          
          // Add new marker
          marker = L.marker([lat, lng]).addTo(map);
          
          // Update coordinates display
          selectedLat = lat;
          selectedLng = lng;
          document.getElementById('coordinates').innerHTML = 
            lat.toFixed(6) + ', ' + lng.toFixed(6);
        });
        
        // Function to select location and send to React Native
        function selectLocation() {
          if (selectedLat !== undefined && selectedLng !== undefined) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'locationSelected',
              latitude: selectedLat,
              longitude: selectedLng
            }));
          }
        }
        
        // Try to get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Center map on user location
            map.setView([lat, lng], 15);
            
            // Add user location marker
            L.marker([lat, lng])
              .addTo(map)
              .bindPopup('Your current location')
              .openPopup();
          });
        }
      </script>
    </body>
    </html>
  `;

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        setFormData(prev => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
        }));
        setShowLocationInput(false);
      }
    } catch (error) {
      console.error('Error parsing map message:', error);
    }
  };

  // Mini map HTML for preview
  const getMiniMapHtml = () => {
    const latNum = formData.latitude !== undefined && formData.latitude !== null ? Number(formData.latitude) : undefined;
    const lngNum = formData.longitude !== undefined && formData.longitude !== null ? Number(formData.longitude) : undefined;
    const lat = Number.isFinite(latNum as number) ? (latNum as number) : 33.5731; // Casablanca default
    const lng = Number.isFinite(lngNum as number) ? (lngNum as number) : -7.5898;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #miniMap { height: 100%; }
          body { margin: 0; padding: 0; }
          #miniMap { width: 100%; }
        </style>
      </head>
      <body>
        <div id="miniMap"></div>
        <script>
          const miniMap = L.map('miniMap', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(miniMap);
          L.marker([${lat}, ${lng}]).addTo(miniMap);
          setTimeout(() => { miniMap.invalidateSize(); }, 100);
        </script>
      </body>
      </html>
    `;
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return '#FF3B30'; // High - Red
    if (severity >= 5) return '#FF9500'; // Medium - Orange
    return '#34C759'; // Low - Green
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 7) return 'Haute';
    if (severity >= 5) return 'Moyenne';
    return 'Basse';
  };

  const updateFormData = (field: keyof CreateDeclarationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Requise', 'Veuillez autoriser l\'accès à la galerie pour sélectionner des photos.');
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
        }));
        
        setSelectedPhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Erreur', 'La sélection des images a échoué. Veuillez réessayer.');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Requise', 'Veuillez autoriser l\'accès à la caméra pour prendre des photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newPhoto = {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
        };
        
        setSelectedPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'La prise de photo a échoué. Veuillez réessayer.');
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Ajouter des Photos',
      'Choisissez comment ajouter des photos',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Prendre une Photo', onPress: takePhoto },
        { text: 'Choisir de la Galerie', onPress: pickImages },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Créer une Déclaration</Text>
              <Text style={styles.headerSubtitle}>Remplissez les détails ci-dessous</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Manifolder Information */}
          {manifolderDetails && (
            <View style={styles.manifolderInfoContainer}>
              <Ionicons name="link" size={16} color="#f87b1b" />
              <Text style={styles.manifolderInfoText} numberOfLines={1}>
                Lié à: {manifolderDetails.manifolderDetail.questionTitle}
              </Text>
            </View>
          )}

          {/* Form */}
          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Unified Card */}
            <View style={styles.card}>
              {/* --- CONTEXT SECTION --- */}
              <TouchableOpacity 
                style={[styles.inputContainer, prefill?.disableFields && styles.inputDisabled]} 
                onPress={() => !prefill?.disableFields && setShowProjectDropdown(!showProjectDropdown)}
                disabled={prefill?.disableFields}
              >
                <Text style={[styles.inputText, !formData.id_project && styles.placeholderText]}>
                  {getProjectTitle(formData.id_project || '')}
                </Text>
                {!prefill?.disableFields && (
                  <Ionicons name={showProjectDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>
              {showProjectDropdown && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => { updateFormData('id_project', undefined); setShowProjectDropdown(false); }}>
                    <Text style={styles.dropdownItemText}>Aucun projet</Text>
                  </TouchableOpacity>
                  {projects.map(project => (
                    <TouchableOpacity key={project.id} style={styles.dropdownItem} onPress={() => { updateFormData('id_project', project.id); setShowProjectDropdown(false); }}>
                      <Text style={styles.dropdownItemText}>{project.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Zone */}
              <TouchableOpacity 
                style={[styles.inputContainer, { marginTop: 12 }, errors.id_zone && styles.inputError, prefill?.disableFields && styles.inputDisabled]} 
                onPress={() => !prefill?.disableFields && setShowZoneDropdown(!showZoneDropdown)}
                disabled={prefill?.disableFields}
              >
                 {formData.id_zone && getZoneLogo(formData.id_zone) && (
                    <Image source={{ uri: getZoneLogo(formData.id_zone)! }} style={styles.zoneLogo} />
                  )}
                <Text style={[styles.inputText, !formData.id_zone && styles.placeholderText]}>
                  {getZoneTitle(formData.id_zone)}
                </Text>
                {!prefill?.disableFields && (
                  <Ionicons name={showZoneDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>
              {showZoneDropdown && (
                <View style={styles.dropdownList}>
                  {zones.map(zone => (
                    <TouchableOpacity key={zone.id} style={styles.dropdownItem} onPress={() => { updateFormData('id_zone', zone.id); setShowZoneDropdown(false); }}>
                      {zone.logo ? (<Image source={{ uri: `${API_CONFIG.BASE_URL}${zone.logo}` }} style={styles.zoneLogo} />) : <View style={styles.zoneLogoPlaceholder}/>}
                      <Text style={styles.dropdownItemText}>{zone.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {errors.id_zone && <Text style={styles.errorText}>{errors.id_zone}</Text>}
              
              {/* Date */}
              <TouchableOpacity style={[styles.inputContainer, { marginTop: 12 }, errors.date_declaration && styles.inputError]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#f87b1b" />
                <Text style={[styles.inputText, !formData.date_declaration && styles.placeholderText]}>
                  {formData.date_declaration ? formatDisplayDate(formData.date_declaration) : 'Sélectionner la date'}
                </Text>
              </TouchableOpacity>
              {errors.date_declaration && <Text style={styles.errorText}>{errors.date_declaration}</Text>}
              
              {/* Declarant */}
               <TouchableOpacity style={[styles.inputContainer, { marginTop: 12 }]} onPress={() => setShowDeclarantModal(true)}>
                <Ionicons name="person-outline" size={18} color="#f87b1b" />
                <Text style={[styles.inputText, !formData.id_declarent && styles.placeholderText]}>
                  {getDeclarantName(formData.id_declarent || '')}
                </Text>
              </TouchableOpacity>

              {/* Declaration Type */}
              <TouchableOpacity
                style={[styles.inputContainer, { marginTop: 12 }, errors.id_declaration_type && styles.inputError]}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <Text style={[styles.inputText, !formData.id_declaration_type && styles.placeholderText]}>
                  {getDeclarationTypeTitle(formData.id_declaration_type)}
                </Text>
                <Ionicons name={showTypeDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
              </TouchableOpacity>
              {showTypeDropdown && (
                <View style={styles.dropdownList}>
                  {declarationTypes.map(type => (
                    <TouchableOpacity key={type.id} style={styles.dropdownItem} onPress={() => { updateFormData('id_declaration_type', type.id); setShowTypeDropdown(false); }}>
                      <Text style={styles.dropdownItemText}>{type.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {errors.id_declaration_type && <Text style={styles.errorText}>{errors.id_declaration_type}</Text>}
              
              {/* Title */}
              <TextInput
                style={[styles.inputContainer, styles.textInput, { marginTop: 12 }, errors.title && styles.inputError]}
                placeholder="Titre *"
                placeholderTextColor="#9ca3af"
                value={formData.title}
                onChangeText={value => updateFormData('title', value)}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

              <View style={styles.divider} />
              
              {/* --- SEVERITY & DESCRIPTION SECTION --- */}
              <View style={styles.severityContainer}>
                <View style={styles.severityHeader}>
                  <Text style={[styles.severityValue, { color: getSeverityColor(formData.severite) }]}>
                    {formData.severite}/10
                  </Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(formData.severite) }]}>
                    <Text style={styles.severityBadgeText}>{getSeverityText(formData.severite)}</Text>
                  </View>
                </View>
                <View style={styles.severitySlider}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.severityDot,
                        formData.severite >= value && [styles.severityDotActive, { backgroundColor: getSeverityColor(formData.severite) }],
                        formData.severite === value && [styles.severityDotSelected, { borderColor: getSeverityColor(formData.severite) }],
                      ]}
                      onPress={() => updateFormData('severite', value)}
                      activeOpacity={0.7}
                    />
                  ))}
                </View>
              </View>
              {errors.severite && <Text style={styles.errorText}>{errors.severite}</Text>}
              
              <TextInput
                style={[styles.inputContainer, styles.textArea, { marginTop: 16 }, errors.description && styles.inputError]}
                placeholder="Description *"
                placeholderTextColor="#9ca3af"
                value={formData.description}
                onChangeText={value => updateFormData('description', value)}
                multiline
                textAlignVertical="top"
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

              <View style={styles.divider} />
              
              {/* --- PHOTOS SECTION --- */}
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}><Ionicons name="images-outline" size={18} color="#f87b1b" /></View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Photos</Text>
                  <Text style={styles.cardHint}>Ajouter des photos (optionnel)</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.photoPickerButton} onPress={showPhotoOptions}>
                 <Ionicons name="camera-outline" size={24} color="#f87b1b" />
                 <Text style={styles.photoPickerText}>Ajouter des Photos</Text>
               </TouchableOpacity>

              {selectedPhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {selectedPhotos.map((photo, index) => (
                    <View key={index} style={styles.photoItem}>
                      <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                      <TouchableOpacity style={styles.removePhotoButton} onPress={() => removePhoto(index)}>
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.divider} />
              
              {/* --- LOCATION SECTION --- */}
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}><Ionicons name="location-outline" size={18} color="#f87b1b" /></View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Localisation</Text>
                  <Text style={styles.cardHint}>Coordonnées géographiques (optionnel)</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.mapButton, prefill?.disableFields && styles.inputDisabled]} 
                onPress={() => !prefill?.disableFields && handleLocationToggle()}
                disabled={prefill?.disableFields}
              >
                <View style={styles.miniMapPreview}>
                  <WebView
                    source={{ html: getMiniMapHtml() }}
                    style={styles.miniMap}
                    javaScriptEnabled={true}
                    scrollEnabled={false}
                    bounces={false}
                    pointerEvents="none"
                  />
                   <View style={styles.miniMapOverlay}>
                     <Text style={styles.miniMapCoordinates}>{getCoordinateDisplay()}</Text>
                   </View>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Spacer */}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitButtonText}>Création en cours...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Créer la Déclaration</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Full Screen Map View */}
          {showLocationInput && (
            <View style={styles.fullScreenMapContainer}>
              <WebView
                source={{ html: mapHtml }}
                style={styles.map}
                onMessage={handleMapMessage}
                javaScriptEnabled={true}
                startInLoadingState={true}
              />
              <TouchableOpacity style={styles.mapCloseButton} onPress={handleLocationToggle}>
                <Ionicons name="close" size={28} color="#11224e" />
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={formData.date_declaration ? new Date(formData.date_declaration) : new Date()}
        maximumDate={new Date()}
        onConfirm={selectedDate => { setShowDatePicker(false); if (selectedDate) updateFormData('date_declaration', toISODate(selectedDate)); }}
        onCancel={() => setShowDatePicker(false)}
      />
      
      {/* Declarant Selection Modal */}
      <Modal
        visible={showDeclarantModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDeclarantModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowDeclarantModal(false);
                setDeclarantSearchQuery('');
              }} 
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#f87b1b" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Sélectionner le Déclarant</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          {/* Search Bar */}
          <View style={styles.modalSearchContainer}>
            <View style={styles.modalSearchBar}>
              <Ionicons name="search" size={18} color="#8E8E93" />
              <TextInput
                placeholder="Rechercher les déclarantes..."
                placeholderTextColor="#8E8E93"
                value={declarantSearchQuery}
                onChangeText={setDeclarantSearchQuery}
                style={styles.modalSearchInput}
              />
              {declarantSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setDeclarantSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#C7C7CC" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Declarant List */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* No declarant option */}
            <TouchableOpacity
              style={styles.modalDeclarantItem}
              onPress={() => {
                updateFormData('id_declarent', undefined);
                setShowDeclarantModal(false);
                setDeclarantSearchQuery('');
              }}
            >
              <View style={styles.modalDeclarantInfo}>
                <Text style={styles.modalDeclarantName}>Aucun déclarant</Text>
              </View>
              {!formData.id_declarent && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>

            {/* Current user */}
            <TouchableOpacity
              style={styles.modalDeclarantItem}
              onPress={() => {
                updateFormData('id_declarent', currentUser.id);
                setShowDeclarantModal(false);
                setDeclarantSearchQuery('');
              }}
            >
              <View style={styles.modalDeclarantInfo}>
                <Text style={styles.modalDeclarantName}>{`${currentUser.firstname} ${currentUser.lastname}`}</Text>
                <Text style={styles.modalDeclarantSubtitle}>(Vous)</Text>
              </View>
              {formData.id_declarent === currentUser.id && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>

            {/* Other company users */}
            {getFilteredDeclarants()
              .filter(user => !user.isCurrentUser)
              .map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.modalDeclarantItem}
                  onPress={() => {
                    updateFormData('id_declarent', user.id);
                    setShowDeclarantModal(false);
                    setDeclarantSearchQuery('');
                  }}
                >
                  <View style={styles.modalDeclarantInfo}>
                    <Text style={styles.modalDeclarantName}>{`${user.firstname} ${user.lastname}`}</Text>
                  </View>
                  {formData.id_declarent === user.id && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  closeButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11224e'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  placeholder: {
    width: 40,
  },
  manifolderInfoContainer: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manifolderInfoText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  cardHeaderText: {
    flex: 1
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11224e'
  },
  cardHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
  },
  textInput: {
    paddingVertical: 14,
  },
  inputText: {
    fontSize: 16,
    color: '#11224e',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#11224e',
  },
  zoneLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  zoneLogoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  severityContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  severityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  severityValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  severitySlider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  severityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  severityDotActive: {
    borderColor: '#E5E5EA',
  },
  severityDotSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
  },
  textArea: {
    minHeight: 100,
    alignItems: 'flex-start',
  },
  photoPickerButton: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  photoPickerText: {
    color: '#475569',
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  photoItem: {
    position: 'relative',
    width: (width - 32 - 16 * 3) / 4, // 4 items per row
    aspectRatio: 1,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 6,
    marginLeft: 4,
  },
  actions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#f87b1b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapContainer: {
    height: 400,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  fullScreenMapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  mapCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 6,
    zIndex: 20,
  },
  miniMapPreview: {
    height: 100,
    position: 'relative',
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  miniMapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMapCoordinates: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    padding: 4,
  },
  // Modal styles (for declarant selection)
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalPlaceholder: {
    width: 40,
  },
  modalSearchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalSearchInput: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
    paddingVertical: 2,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDeclarantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  modalDeclarantInfo: {
    flex: 1,
  },
  modalDeclarantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  modalDeclarantSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
});
