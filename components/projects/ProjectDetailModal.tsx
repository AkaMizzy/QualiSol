import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Project, updateProject } from '@/services/projectService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateZoneModal from '../zone/CreateZoneModal';
import ZoneDetailModal from '../zone/ZoneDetailModal';

type Props = {
  visible: boolean;
  onClose: () => void;
  project?: Project | null;
  onEdit?: (project: Project) => void;
  onUpdated?: () => void;
};

type Company = { id: string; title?: string | null } | null;
type Owner = { id: string; firstname?: string; lastname?: string; email?: string } | null;
type Control = { id: string; firstname?: string; lastname?: string; email?: string } | null;
type Technicien = { id: string; firstname?: string; lastname?: string; email?: string } | null;

export default function ProjectDetailModal({ visible, onClose, project, onUpdated }: Props) {
  const { token } = useAuth();
  const [company, setCompany] = useState<Company>(null);
  const [owner, setOwner] = useState<Owner>(null);
  const [control, setControl] = useState<Control>(null);
  const [technicien, setTechnicien] = useState<Technicien>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<{
    id: string;
    title: string;
    code?: string | null;
    logo?: string | null;
    zone_logo?: string | null;
    level?: number | null;
    zone_type_title?: string | null;
  }[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isZoneDetailOpen, setIsZoneDetailOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Enable smooth layout animations on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // Collapsible sections state
  const [openOverview, setOpenOverview] = useState(true);
  const [openRelations, setOpenRelations] = useState(true);
  const [openMore, setOpenMore] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editOwner, setEditOwner] = useState<string>('');
  const [editControl, setEditControl] = useState<string>('');
  const [editTechnicien, setEditTechnicien] = useState<string>('');
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [technicienOpen, setTechnicienOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<{ id: string; firstname?: string; lastname?: string; email?: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Rotate chevrons
  const rotateAnim = useRef({
    overview: new Animated.Value(1),
    relations: new Animated.Value(1),
    more: new Animated.Value(0),
  }).current;

  function toggleSection(section: 'overview' | 'relations' | 'more') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const map = {
      overview: [openOverview, setOpenOverview],
      relations: [openRelations, setOpenRelations],
      more: [openMore, setOpenMore],
    } as const;
    const [isOpen, setIsOpen] = map[section];
    setIsOpen(!isOpen);
    Animated.timing(rotateAnim[section], {
      toValue: !isOpen ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function Chevron({ section }: { section: 'overview' | 'relations' | 'more' }) {
    const spin = rotateAnim[section].interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    return (
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="chevron-down" size={16} color="#9ca3af" />
      </Animated.View>
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      if (!project) { 
        setCompany(null); 
        setOwner(null); 
        setControl(null); 
        setTechnicien(null); 
        setCompanyUsers([]);
        return; 
      }
      setIsLoading(true);
      setError(null);
      try {
        const tasks: Promise<void>[] = [];
        
        // Fetch company details with authentication token
        if (project.company_id) {
          tasks.push((async () => {
            try {
              const res = await fetch(`${API_CONFIG.BASE_URL}/api/company/${project.company_id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined as any,
              });
              const data = await res.json();
              if (!cancelled) setCompany(res.ok ? { id: String(data.id), title: data.title } : null);
            } catch {
              if (!cancelled) setCompany(null);
            }
          })());
        } else {
          setCompany(null);
        }
        
        // Fetch all company users in a single request
        if (token) {
          tasks.push((async () => {
            try {
              const res = await fetch(`${API_CONFIG.BASE_URL}/api/users`, {
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (!cancelled) {
                if (res.ok && Array.isArray(data)) {
                  setCompanyUsers(data);
                } else {
                  setCompanyUsers([]);
                }
              }
            } catch {
              if (!cancelled) setCompanyUsers([]);
            }
          })());
        } else {
          setCompanyUsers([]);
        }
        
        await Promise.all(tasks);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadMeta();
    return () => { cancelled = true; };
  }, [project, token]);

  useEffect(() => {
    // initialize edit fields when opening or when project changes
    if (project) {
      setEditOwner(project.owner_id ? String(project.owner_id) : '');
      setEditControl(project.control_id ? String(project.control_id) : '');
      setEditTechnicien(project.technicien_id ? String(project.technicien_id) : '');
    }
  }, [project]);

  // Derive owner, control, and technicien from companyUsers list
  useEffect(() => {
    if (!project) {
      setOwner(null);
      setControl(null);
      setTechnicien(null);
      return;
    }

    if (project.owner_id && companyUsers.length > 0) {
      const ownerUser = companyUsers.find(u => String(u.id) === String(project.owner_id));
      setOwner(ownerUser ? { id: String(ownerUser.id), firstname: ownerUser.firstname, lastname: ownerUser.lastname, email: ownerUser.email } : null);
    } else if (!project.owner_id) {
      setOwner(null);
    }

    if (project.control_id && companyUsers.length > 0) {
      const controlUser = companyUsers.find(u => String(u.id) === String(project.control_id));
      setControl(controlUser ? { id: String(controlUser.id), firstname: controlUser.firstname, lastname: controlUser.lastname, email: controlUser.email } : null);
    } else if (!project.control_id) {
      setControl(null);
    }

    if (project.technicien_id && companyUsers.length > 0) {
      const technicienUser = companyUsers.find(u => String(u.id) === String(project.technicien_id));
      setTechnicien(technicienUser ? { id: String(technicienUser.id), firstname: technicienUser.firstname, lastname: technicienUser.lastname, email: technicienUser.email } : null);
    } else if (!project.technicien_id) {
      setTechnicien(null);
    }
  }, [project, companyUsers]);

  useEffect(() => {
    let cancelled = false;
    async function loadZones() {
      if (!visible || !project?.id) { setZones([]); setZonesError(null); return; }
      setZonesLoading(true);
      setZonesError(null);
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/zones`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined as any,
        });
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && Array.isArray(data)) {
            // Filter zones by project_id on the frontend
            const projectZones = data.filter((z: any) => z.project_id === project.id);
            setZones(projectZones);
          } else {
            setZones([]);
            setZonesError(typeof data?.error === 'string' ? data.error : 'Chargement des zones échoué');
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setZones([]);
          setZonesError(e?.message || 'Chargement des zones échoué');
        }
      } finally {
        if (!cancelled) setZonesLoading(false);
      }
    }
    loadZones();
    return () => { cancelled = true; };
  }, [visible, project?.id, token]);


  if (!project) return null;

  function getZoneLogoUrl(z: { logo?: string | null; zone_logo?: string | null }) {
    const raw = z.zone_logo ?? z.logo ?? null;
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${API_CONFIG.BASE_URL}${path}`;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{project.title}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Loading/Error */}
        {isLoading ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator color="#11224e" />
          </View>
        ) : null}
        {error ? (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color="#b45309" />
            <Text style={styles.alertBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={16} color="#b45309" />
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* CTA Row */}
          <View style={styles.ctaRow}>
            {!isEditing ? (
            <Pressable
              onPress={() => {
                if (!project) return;
                try { Share.share({ message: `${project.title} (${project.code || '—'})` }); } catch {}
              }}
              android_ripple={{ color: '#fde7d4' }}
              style={styles.ctaButton}
            >
              <Ionicons name="share-social-outline" size={16} color="#f87b1b" />
              <Text style={styles.ctaText}>Partager</Text>
            </Pressable>) : null}
            {!isEditing ? (
            <Pressable
              onPress={() => setIsEditing(true)}
              android_ripple={{ color: '#fde7d4' }}
              style={styles.ctaButton}
            >
              <Ionicons name="create-outline" size={16} color="#f87b1b" />
              <Text style={styles.ctaText}>Modifier</Text>
            </Pressable>) : null}
            {!isEditing ? (
            <Pressable onPress={onClose} android_ripple={{ color: '#fde7d4' }} style={styles.ctaButton}>
              <Ionicons name="trash-outline" size={16} color="#f87b1b" />
              <Text style={styles.ctaText}>Supprimer</Text>
            </Pressable>) : null}

            {isEditing ? (
            <Pressable
              disabled={isSaving}
              onPress={async () => {
                if (!project || !token) return;
                try {
                  setIsSaving(true);
                  await updateProject(token, project.id, { owner_id: editOwner || null, control_id: editControl || null, technicien_id: editTechnicien || null });
                  setIsEditing(false);
                  // reflect local change quickly
                  if (owner) setOwner(companyUsers.find(u => String(u.id) === String(editOwner)) || owner);
                  if (control) setControl(companyUsers.find(u => String(u.id) === String(editControl)) || control);
                  if (technicien) setTechnicien(companyUsers.find(u => String(u.id) === String(editTechnicien)) || technicien);
                  if (onUpdated) onUpdated();
                } catch (e: any) {
                  Alert.alert('Erreur', e?.message || 'Mise à jour échouée');
                } finally {
                  setIsSaving(false);
                }
              }}
              android_ripple={{ color: '#fde7d4' }}
              style={[styles.ctaButton, isSaving && { opacity: 0.6 }]}
            >
              <Ionicons name="save-outline" size={16} color="#f87b1b" />
              <Text style={styles.ctaText}>{isSaving ? 'Sauvegarde...' : 'Enregistrer'}</Text>
            </Pressable>) : null}
            {isEditing ? (
            <Pressable onPress={() => { setIsEditing(false); setOwnerOpen(false); setControlOpen(false); setTechnicienOpen(false); if (project) { setEditOwner(project.owner_id ? String(project.owner_id) : ''); setEditControl(project.control_id ? String(project.control_id) : ''); setEditTechnicien(project.technicien_id ? String(project.technicien_id) : ''); } }} android_ripple={{ color: '#fde7d4' }} style={styles.ctaButton}>
              <Ionicons name="close-circle-outline" size={16} color="#f87b1b" />
              <Text style={styles.ctaText}>Annuler</Text>
            </Pressable>) : null}
          </View>

          {/* Overview Card (collapsible) */}
          <View style={styles.card}>
            <Pressable onPress={() => toggleSection('overview')} style={styles.cardHeader} android_ripple={{ color: '#f3f4f6' }}>
              <Text style={styles.cardTitle}>Aperçu</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Chevron section="overview" />
              </View>
            </Pressable>
            {openOverview && (
              <View style={{ marginTop: 8, gap: 6 }}>
                <Pressable android_ripple={{ color: '#f3f4f6' }} style={styles.itemRow}>
                  <Ionicons name="barcode-outline" size={16} color="#6b7280" />
                  <Text style={styles.meta}>Code · {project.code || '—'}</Text>
                </Pressable>
                <Pressable android_ripple={{ color: '#f3f4f6' }} style={styles.itemRow}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={styles.meta}>Période · {project.dd} → {project.df}</Text>
                </Pressable>
                <Pressable android_ripple={{ color: '#f3f4f6' }} style={styles.itemRow}>
                  <Ionicons name="albums-outline" size={16} color="#6b7280" />
                  <Text style={styles.meta}>Type · {project.project_type_title || '—'}</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Relations Card (collapsible) */}
          <View style={styles.card}>
            <Pressable onPress={() => toggleSection('relations')} style={styles.cardHeader} android_ripple={{ color: '#f3f4f6' }}>
              <Text style={styles.cardTitle}>Relations</Text>
              <Chevron section="relations" />
            </Pressable>
            {openRelations && (
              <View style={{ marginTop: 8, gap: 6 }}>
                <Pressable android_ripple={{ color: '#f3f4f6' }} style={styles.itemRow}>
                  <Ionicons name="business-outline" size={16} color="#6b7280" />
                  <Text style={styles.meta}>Société · {company?.title || '—'}</Text>
                </Pressable>
                {!isEditing ? (
                <Pressable android_ripple={{ color: '#f3f4f6' }} style={styles.itemRow}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <Text style={styles.meta}>Propriétaire · {owner ? `${owner.firstname || ''} ${owner.lastname || ''}`.trim() || owner.email || owner.id : '—'}</Text>
                </Pressable>) : (
                <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <TouchableOpacity onPress={() => setOwnerOpen(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="person-outline" size={16} color="#6b7280" />
                      <Text style={{ color: '#111827' }} numberOfLines={1}>
                        {editOwner ? (companyUsers.find(u => String(u.id) === String(editOwner))?.firstname ? `${companyUsers.find(u => String(u.id) === String(editOwner))?.firstname} ${companyUsers.find(u => String(u.id) === String(editOwner))?.lastname || ''}` : editOwner) : 'Choisir un propriétaire'}
                      </Text>
                    </View>
                    <Ionicons name={ownerOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                  </TouchableOpacity>
                  {ownerOpen && (
                    <View style={{ maxHeight: 220 }}>
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {isLoading ? (
                          <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                        ) : companyUsers.length === 0 ? (
                          <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun utilisateur</Text></View>
                        ) : (
                          companyUsers.map(u => (
                            <TouchableOpacity key={u.id} onPress={() => { setEditOwner(String(u.id)); setOwnerOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: String(editOwner) === String(u.id) ? '#f1f5f9' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                              <Text style={{ color: '#11224e' }}>{u.firstname || ''} {u.lastname || ''}</Text>
                              {u.email ? <Text style={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Text> : null}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
                )}
                {!isEditing ? (
                <Pressable android_ripple={{ color: '#f3f4f6' }} style={styles.itemRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#6b7280" />
                  <Text style={styles.meta}>Contrôleur · {control ? `${control.firstname || ''} ${control.lastname || ''}`.trim() || control.email || control.id : '—'}</Text>
                </Pressable>) : (
                <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <TouchableOpacity onPress={() => setControlOpen(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="shield-checkmark-outline" size={16} color="#6b7280" />
                      <Text style={{ color: '#111827' }} numberOfLines={1}>
                        {editControl ? (companyUsers.find(u => String(u.id) === String(editControl))?.firstname ? `${companyUsers.find(u => String(u.id) === String(editControl))?.firstname} ${companyUsers.find(u => String(u.id) === String(editControl))?.lastname || ''}` : editControl) : 'Choisir un contrôleur'}
                      </Text>
                    </View>
                    <Ionicons name={controlOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                  </TouchableOpacity>
                  {controlOpen && (
                    <View style={{ maxHeight: 220 }}>
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {isLoading ? (
                          <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                        ) : companyUsers.length === 0 ? (
                          <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun utilisateur</Text></View>
                        ) : (
                          companyUsers.map(u => (
                            <TouchableOpacity key={u.id} onPress={() => { setEditControl(String(u.id)); setControlOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: String(editControl) === String(u.id) ? '#f1f5f9' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                              <Text style={{ color: '#11224e' }}>{u.firstname || ''} {u.lastname || ''}</Text>
                              {u.email ? <Text style={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Text> : null}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
                )}
                {!isEditing ? (
                <Pressable android_ripple={{ color: '#f3f4f6' }} style={styles.itemRow}>
                  <Ionicons name="construct-outline" size={16} color="#6b7280" />
                  <Text style={styles.meta}>Technicien · {technicien ? `${technicien.firstname || ''} ${technicien.lastname || ''}`.trim() || technicien.email || technicien.id : '—'}</Text>
                </Pressable>) : (
                <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <TouchableOpacity onPress={() => setTechnicienOpen(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="construct-outline" size={16} color="#6b7280" />
                      <Text style={{ color: '#111827' }} numberOfLines={1}>
                        {editTechnicien ? (companyUsers.find(u => String(u.id) === String(editTechnicien))?.firstname ? `${companyUsers.find(u => String(u.id) === String(editTechnicien))?.firstname} ${companyUsers.find(u => String(u.id) === String(editTechnicien))?.lastname || ''}` : editTechnicien) : 'Choisir un technicien'}
                      </Text>
                    </View>
                    <Ionicons name={technicienOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                  </TouchableOpacity>
                  {technicienOpen && (
                    <View style={{ maxHeight: 220 }}>
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {isLoading ? (
                          <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                        ) : companyUsers.length === 0 ? (
                          <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun utilisateur</Text></View>
                        ) : (
                          companyUsers.map(u => (
                            <TouchableOpacity key={u.id} onPress={() => { setEditTechnicien(String(u.id)); setTechnicienOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: String(editTechnicien) === String(u.id) ? '#f1f5f9' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                              <Text style={{ color: '#11224e' }}>{u.firstname || ''} {u.lastname || ''}</Text>
                              {u.email ? <Text style={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Text> : null}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
                )}
              </View>
            )}
          </View>

          {/* Zones du projet */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Zones du projet</Text>
              <TouchableOpacity onPress={() => setIsCreateZoneOpen(true)} style={[styles.ctaButton, { paddingVertical: 6, paddingHorizontal: 10 }]}> 
                <Ionicons name="add" size={16} color="#f87b1b" />
                <Text style={styles.ctaText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {zonesLoading ? (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <ActivityIndicator color="#11224e" />
                </View>
              ) : zonesError ? (
                <View style={styles.alertBanner}>
                  <Ionicons name="warning" size={16} color="#b45309" />
                  <Text style={styles.alertBannerText}>{zonesError}</Text>
                  <TouchableOpacity onPress={() => setZonesError(null)}>
                    <Ionicons name="close" size={16} color="#b45309" />
                  </TouchableOpacity>
                </View>
              ) : zones.length === 0 ? (
                <Text style={styles.meta}>Aucune zone pour ce projet</Text>
              ) : (
                <View style={styles.zonesGrid}>
                  {zones.map((z) => (
                    <TouchableOpacity
                      key={z.id}
                      style={styles.zoneCard}
                      activeOpacity={0.8}
                      onPress={() => { setSelectedZoneId(String(z.id)); setIsZoneDetailOpen(true); }}
                    >
                      <View style={styles.zoneHeader}>
                        {getZoneLogoUrl(z) ? (
                          <Image source={{ uri: getZoneLogoUrl(z) as string }} style={styles.zoneLogo} resizeMode="cover" />
                        ) : (
                          <View style={[styles.zoneLogo, styles.zoneLogoPlaceholder]}>
                            <Ionicons name="image-outline" size={16} color="#9ca3af" />
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.zoneTitle} numberOfLines={1}>{z.title}</Text>
                          <Text style={styles.zoneSub} numberOfLines={1}>{z.code || '—'}{z.zone_type_title ? ` · ${z.zone_type_title}` : ''}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        <CreateZoneModal
          visible={isCreateZoneOpen}
          onClose={() => setIsCreateZoneOpen(false)}
          projectId={String(project.id)}
          projectTitle={project.title}
          projectCode={project.code || undefined}
          onCreated={async () => {
            // refresh zones list after creation
            try {
              setZonesLoading(true);
              const res = await fetch(`${API_CONFIG.BASE_URL}/api/zones`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined as any,
              });
              const data = await res.json();
              if (res.ok && Array.isArray(data)) {
                // Filter zones by project_id on the frontend
                const projectZones = data.filter((z: any) => z.project_id === project.id);
                setZones(projectZones);
              }
            } catch {}
            finally { setZonesLoading(false); }
          }}
        />
        <ZoneDetailModal
          visible={isZoneDetailOpen}
          onClose={() => { setIsZoneDetailOpen(false); setSelectedZoneId(null); }}
          zoneId={selectedZoneId || undefined}
        />
      </SafeAreaView>
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
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 16, marginHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#f3f4f6' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#11224e' },
  meta: { color: '#374151', marginTop: 2 },
  ctaRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 8, paddingTop: 8 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f87b1b', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 9999 },
  ctaText: { color: '#f87b1b', fontWeight: '600', fontSize: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  zonesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  zoneCard: { width: '50%', paddingHorizontal: 6, paddingVertical: 6 },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10 },
  zoneLogo: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6' },
  zoneLogoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  zoneTitle: { color: '#111827', fontWeight: '600' },
  zoneSub: { color: '#6b7280', fontSize: 12, marginTop: 2 },
});


