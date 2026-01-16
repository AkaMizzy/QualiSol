import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import companyService from '@/services/companyService';
import { createZone, getAllZones, getAllZoneTypes, type ZoneType } from '@/services/zoneService';
import { Company } from '@/types/company';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
  projectCode?: string;
  onCreated?: () => Promise<void> | void;
};

export default function CreateZoneModal({ visible, onClose, projectId, projectTitle, projectCode, onCreated }: Props) {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [companyUsers, setCompanyUsers] = useState<{ id: string; firstname?: string; lastname?: string; email?: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [zonetypeId, setZonetypeId] = useState('');
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>([]);
  const [zoneTypeOpen, setZoneTypeOpen] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [controlId, setControlId] = useState<string>('');
  const [technicienId, setTechnicienId] = useState<string>('');
  const [controlOpen, setControlOpen] = useState(false);
  const [technicienOpen, setTechnicienOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentZonesCount, setCurrentZonesCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const adminUser = useMemo(() => companyUsers.find(u => u.id === ownerId), [companyUsers, ownerId]);

  const controlUsers = useMemo(() => companyUsers.filter(u => u.id !== ownerId), [companyUsers, ownerId]);
  const technicienUsers = useMemo(() => companyUsers.filter(u => u.id !== ownerId && u.id !== controlId), [companyUsers, ownerId, controlId]);

  const isDisabled = useMemo(() => !title || !token || !projectId || isLimitReached, [title, token, projectId, isLimitReached]);

  function validate(): string | null {
    if (!title) return 'Le titre est requis';
    return null;
  }

  function generateZoneCode() {
    const ts = Date.now().toString(36).toUpperCase();
    return `ZON-${ts}`;
  }

  async function onSubmit() {
    if (!token) return;
    const v = validate();
    if (v) { setError(v); return; }
    
    if (isLimitReached) {
      setError(`Vous avez atteint la limite de ${companyInfo?.nbzones || 2} zones. Veuillez mettre à niveau votre plan pour ajouter plus de zones.`);
      return;
    }
    
    try {
      setIsSubmitting(true);
      await createZone(token, {
        code: generateZoneCode(),
        title,
        description: description || undefined,
        project_id: projectId,
        owner_id: ownerId || undefined,
        control_id: controlId,
        technicien_id: isAdmin ? undefined : technicienId, // Admin cannot assign technicians
        zonetype_id: zonetypeId || undefined,
      });
      setTitle(''); setDescription(''); setZonetypeId(''); setLatitude(''); setLongitude(''); setError(null); setOwnerId(''); setControlId(''); setTechnicienId('');
      if (onCreated) await onCreated();
      onClose();
    } catch (e: any) {
      // Handle 403 error specifically for limit reached
      if (e?.message?.includes('limit') || e?.message?.includes('Zone limit')) {
        setError(e?.message || `Vous avez atteint la limite de ${companyInfo?.nbzones || 2} zones.`);
      } else {
        setError(e?.message || 'Création de zone échouée');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLocationToggle() {
    setShowLocationInput(!showLocationInput);
  }

  function getCoordinateDisplay() {
    const lat = latitude ? Number(latitude) : undefined;
    const lng = longitude ? Number(longitude) : undefined;
    if (Number.isFinite(lat as number) && Number.isFinite(lng as number)) {
      return `${(lat as number).toFixed(6)}, ${(lng as number).toFixed(6)}`;
    }
    return 'Appuyez pour sélectionner la localisation';
  }

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\" />
      <link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\" />
      <script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .location-info { position: absolute; top: 10px; left: 10px; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1000; font-family: Arial, sans-serif; font-size: 14px; }
        .select-button { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: #f87b1b; color: white; border: none; padding: 12px 24px; border-radius: 25px; font-size: 16px; font-weight: bold; z-index: 1000; cursor: pointer; }
      </style>
    </head>
    <body>
      <div id=\"map\"></div>
      <div class=\"location-info\">
        <strong>Localisation Sélectionnée:</strong><br>
        <span id=\"coordinates\">Appuyez sur la carte pour sélectionner</span>
      </div>
      <button class=\"select-button\" onclick=\"selectLocation()\">Sélectionner cette localisation</button>
      <script>
        let map, marker, selectedLat, selectedLng;
        map = L.map('map').setView([33.5731, -7.5898], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
        map.on('click', function(e) {
          const lat = e.latlng.lat; const lng = e.latlng.lng;
          if (marker) { map.removeLayer(marker); }
          marker = L.marker([lat, lng]).addTo(map);
          selectedLat = lat; selectedLng = lng;
          document.getElementById('coordinates').innerHTML = lat.toFixed(6) + ', ' + lng.toFixed(6);
        });
        function selectLocation() {
          if (selectedLat !== undefined && selectedLng !== undefined) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'locationSelected', latitude: selectedLat, longitude: selectedLng }));
          }
        }
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude; const lng = position.coords.longitude;
            map.setView([lat, lng], 15);
            L.marker([lat, lng]).addTo(map).bindPopup('Votre position').openPopup();
          });
        }
      </script>
    </body>
    </html>
  `;

  function handleMapMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        setLatitude(String(data.latitude));
        setLongitude(String(data.longitude));
        setShowLocationInput(false);
      }
    } catch {}
  }

  function getMiniMapHtml() {
    const latNum = latitude ? Number(latitude) : undefined;
    const lngNum = longitude ? Number(longitude) : undefined;
    const lat = Number.isFinite(latNum as number) ? (latNum as number) : 33.5731;
    const lng = Number.isFinite(lngNum as number) ? (lngNum as number) : -7.5898;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\" />
        <link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\" />
        <script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script>
        <style> html, body, #miniMap { height: 100%; } body { margin: 0; padding: 0; } #miniMap { width: 100%; } </style>
      </head>
      <body>
        <div id=\"miniMap\"></div>
        <script>
          const miniMap = L.map('miniMap', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(miniMap);
          L.marker([${lat}, ${lng}]).addTo(miniMap);
          setTimeout(() => { miniMap.invalidateSize(); }, 100);
        </script>
      </body>
      </html>
    `;
  }

  // Owner is now manually selected, not auto-assigned (except for Admin who is auto-assigned)
  useEffect(() => {
    // Auto-assign Admin as owner when modal becomes visible
    if (visible && isAdmin && user?.id) {
      setOwnerId(user.id);
    }
  }, [visible, isAdmin, user?.id]);

  useEffect(() => {
    const fetchLimitInfo = async () => {
      try {
        setLoadingLimits(true);
        if (!token) return;
        
        const [company, zones] = await Promise.all([
          companyService.getCompany(),
          getAllZones(token)
        ]);
        
        setCompanyInfo(company);
        setCurrentZonesCount(zones.length);
        
        const limit = company.nbzones || 2;
        setIsLimitReached(zones.length >= limit);
      } catch (error) {
        console.error('Error fetching limit info:', error);
      } finally {
        setLoadingLimits(false);
      }
    };

    if (visible) {
      fetchLimitInfo();
    }
  }, [visible, token]);

  useEffect(() => {
    async function loadZoneTypes() {
      if (!token) return;
      setLoadingTypes(true);
      try {
        const data = await getAllZoneTypes(token);
        setZoneTypes(data);
      } catch {
        setZoneTypes([]);
      } finally {
        setLoadingTypes(false);
      }
    }
    if (token) loadZoneTypes();
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    async function loadCompanyUsers() {
      if (!visible || !token) { setCompanyUsers([]); return; }
      try {
        setLoadingUsers(true);
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/users`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && Array.isArray(data)) setCompanyUsers(data);
          else setCompanyUsers([]);
        }
      } catch {
        if (!cancelled) setCompanyUsers([]);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }
    loadCompanyUsers();
    return () => { cancelled = true; };
  }, [visible, token]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Ajouter une zone</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Project Context */}
          <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="albums-outline" size={16} color="#f87b1b" />
            <Text style={{ fontSize: 12, color: '#92400E', flex: 1 }} numberOfLines={1}>
              Projet: {projectTitle || projectId}{projectCode ? ` (${projectCode})` : ''}
            </Text>
          </View>

          {/* Error Banner (only on failure per requirement) */}
          {error && (
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text style={styles.alertBannerText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Ionicons name="close" size={16} color="#b45309" />
              </TouchableOpacity>
            </View>
          )}

          {/* Limit Info Banner */}
          {!loadingLimits && companyInfo && (
            <View style={[styles.limitInfoBanner, isLimitReached && styles.limitInfoBannerWarning]}>
              <Ionicons 
                name={isLimitReached ? "warning" : "map"} 
                size={16} 
                color={isLimitReached ? "#b45309" : "#3b82f6"} 
              />
              <Text style={[styles.limitInfoText, isLimitReached && styles.limitInfoTextWarning]}>
                Zones: {currentZonesCount} / {companyInfo.nbzones || 2}
                {isLimitReached && " - Nombre des zones dépassé"}
              </Text>
            </View>
          )}

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                <Ionicons name="text-outline" size={16} color="#6b7280" />
                <TextInput placeholder="Titre" placeholderTextColor="#9ca3af" value={title} onChangeText={setTitle} style={styles.input} />
              </View>
              <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                <TextInput placeholder="Description (optionnel)" placeholderTextColor="#9ca3af" value={description} onChangeText={setDescription} style={styles.input} multiline numberOfLines={3} />
              </View>
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Type de zone</Text>
                <TouchableOpacity style={[styles.inputWrap, { justifyContent: 'space-between' }]} onPress={() => setZoneTypeOpen(v => !v)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="albums-outline" size={16} color="#6b7280" />
                    <Text style={[styles.input, { color: zonetypeId ? '#111827' : '#9ca3af' }]} numberOfLines={1}>
                      {zonetypeId ? (zoneTypes.find(zt => String(zt.id) === String(zonetypeId))?.title || zonetypeId) : 'Choisir un type (optionnel)'}
                    </Text>
                  </View>
                  <Ionicons name={zoneTypeOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                </TouchableOpacity>
                {zoneTypeOpen && (
                  <View style={{ maxHeight: 220, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {loadingTypes ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                      ) : zoneTypes.length === 0 ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun type</Text></View>
                      ) : (
                        zoneTypes.map(zt => (
                          <TouchableOpacity key={zt.id} onPress={() => { setZonetypeId(String(zt.id)); setZoneTypeOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: String(zonetypeId) === String(zt.id) ? '#f1f5f9' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                            <Text style={{ color: '#11224e' }}>{zt.title}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Map Zone Selection Section - Commented Out */}
              {/* <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Localisation (optionnel)</Text>
                <TouchableOpacity style={[styles.inputWrap, { padding: 0, overflow: 'hidden', borderColor: '#e5e7eb' }]} onPress={handleLocationToggle}>
                  <View style={{ height: 100, width: '100%', position: 'relative' }}>
                    <WebView source={{ html: getMiniMapHtml() }} style={{ flex: 1 }} javaScriptEnabled scrollEnabled={false} />
                    <View style={{ position: 'absolute', bottom: 6, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: '#111827', fontSize: 12 }}>{getCoordinateDisplay()}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View> */}

              {/* Owner (Admin) Select - Disabled for Admin users */}
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Admin {isAdmin ? '(vous)' : '(optionnel)'}</Text>
                <TouchableOpacity 
                  style={[styles.inputWrap, { justifyContent: 'space-between' }, isAdmin && { opacity: 0.7, backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }]} 
                  onPress={() => !isAdmin && setOwnerOpen(v => !v)}
                  disabled={isAdmin}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="person-circle-outline" size={16} color={isAdmin ? '#3b82f6' : '#6b7280'} />
                    <Text style={[styles.input, { color: ownerId ? '#111827' : '#9ca3af' }]} numberOfLines={1}>
                      {isAdmin ? `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || user?.email || 'Vous' : (ownerId ? (companyUsers.find(u => String(u.id) === String(ownerId))?.firstname ? `${companyUsers.find(u => String(u.id) === String(ownerId))?.firstname} ${companyUsers.find(u => String(u.id) === String(ownerId))?.lastname || ''}` : ownerId) : 'Choisir un admin')}
                    </Text>
                  </View>
                  <Ionicons name={isAdmin ? 'lock-closed-outline' : (ownerOpen ? 'chevron-up' : 'chevron-down')} size={16} color="#9ca3af" />
                </TouchableOpacity>
                {ownerOpen && !isAdmin && (
                  <View style={{ maxHeight: 220, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {loadingUsers ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                      ) : companyUsers.length === 0 ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun utilisateur</Text></View>
                      ) : (
                        companyUsers.map(u => (
                          <TouchableOpacity key={u.id} onPress={() => { setOwnerId(String(u.id)); setOwnerOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: String(ownerId) === String(u.id) ? '#f1f5f9' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                            <Text style={{ color: '#11224e' }}>{u.firstname || ''} {u.lastname || ''}</Text>
                            {u.email ? <Text style={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Text> : null}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Control Select - Filtered to exclude owner */}
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Contrôleur (optionnel)</Text>
                <TouchableOpacity style={[styles.inputWrap, { justifyContent: 'space-between' }]} onPress={() => setControlOpen(v => !v)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#6b7280" />
                    <Text style={[styles.input, { color: controlId ? '#111827' : '#9ca3af' }]} numberOfLines={1}>
                      {controlId ? (companyUsers.find(u => String(u.id) === String(controlId))?.firstname ? `${companyUsers.find(u => String(u.id) === String(controlId))?.firstname} ${companyUsers.find(u => String(u.id) === String(controlId))?.lastname || ''}` : controlId) : 'Choisir un contrôleur'}
                    </Text>
                  </View>
                  <Ionicons name={controlOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                </TouchableOpacity>
                {controlOpen && (
                  <View style={{ maxHeight: 220, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {loadingUsers ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                      ) : controlUsers.length === 0 ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun utilisateur</Text></View>
                      ) : (
                        controlUsers.map(u => (
                          <TouchableOpacity key={u.id} onPress={() => { setControlId(String(u.id)); setControlOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: String(controlId) === String(u.id) ? '#f1f5f9' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                            <Text style={{ color: '#11224e' }}>{u.firstname || ''} {u.lastname || ''}</Text>
                            {u.email ? <Text style={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Text> : null}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Technicien Select - Disabled for Admin users */}
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Technicien (optionnel)</Text>
                <TouchableOpacity 
                  style={[styles.inputWrap, { justifyContent: 'space-between' }, isAdmin && { opacity: 0.5, backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }]} 
                  onPress={() => !isAdmin && setTechnicienOpen(v => !v)}
                  disabled={isAdmin}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="construct-outline" size={16} color={isAdmin ? '#9ca3af' : '#6b7280'} />
                    <Text style={[styles.input, { color: isAdmin ? '#9ca3af' : (technicienId ? '#111827' : '#9ca3af') }]} numberOfLines={1}>
                      {isAdmin ? 'Non autorisé' : (technicienId ? (companyUsers.find(u => String(u.id) === String(technicienId))?.firstname ? `${companyUsers.find(u => String(u.id) === String(technicienId))?.firstname} ${companyUsers.find(u => String(u.id) === String(technicienId))?.lastname || ''}` : technicienId) : 'Choisir un technicien')}
                    </Text>
                  </View>
                  <Ionicons name={isAdmin ? 'lock-closed-outline' : (technicienOpen ? 'chevron-up' : 'chevron-down')} size={16} color="#9ca3af" />
                </TouchableOpacity>
                {technicienOpen && !isAdmin && (
                  <View style={{ maxHeight: 220, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {loadingUsers ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                      ) : technicienUsers.length === 0 ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun utilisateur</Text></View>
                      ) : (
                        technicienUsers.map(u => (
                          <TouchableOpacity key={u.id} onPress={() => { setTechnicienId(String(u.id)); setTechnicienOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: String(technicienId) === String(u.id) ? '#f1f5f9' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                            <Text style={{ color: '#11224e' }}>{u.firstname || ''} {u.lastname || ''}</Text>
                            {u.email ? <Text style={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Text> : null}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.submitButton, (!token || isSubmitting || isDisabled) && styles.submitButtonDisabled]} 
              disabled={!token || isSubmitting || isDisabled} 
              onPress={onSubmit}
            >
              {isSubmitting ? (
                <>
                  <Ionicons name="hourglass" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Enregistrement...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Créer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        {/* Full Screen Map - Commented Out */}
        {/* {showLocationInput && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF' }}>
            <WebView source={{ html: mapHtml }} style={{ flex: 1 }} onMessage={handleMapMessage} javaScriptEnabled startInLoadingState />
            <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 6 }} onPress={handleLocationToggle}>
              <Ionicons name="close" size={28} color="#11224e" />
            </TouchableOpacity>
          </View>
        )} */}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  closeButton: { padding: 8 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  placeholder: { width: 40 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  alertBannerText: { color: '#b45309', flex: 1, fontSize: 12 },
  content: { flex: 1, paddingHorizontal: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginTop: 20, marginHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f87b1b', gap: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f87b1b', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  input: { flex: 1, color: '#111827' },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  submitButton: { 
    backgroundColor: '#f87b1b', 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 24,
    alignItems: 'center', 
    justifyContent: 'center', 
    flexDirection: 'row', 
    gap: 8, 
    shadowColor: '#f87b1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { backgroundColor: '#d1d5db' },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  limitInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  limitInfoBannerWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  limitInfoText: {
    color: '#1e40af',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  limitInfoTextWarning: {
    color: '#b45309',
  },
});


