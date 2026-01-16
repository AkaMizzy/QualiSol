import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import companyService from '@/services/companyService';
import { createProject, getAllProjects } from '@/services/projectService';
import { getAllProjectTypes } from '@/services/projectTypeService';
import { Company } from '@/types/company';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

export default function CreateProjectModal({ visible, onClose, onCreated }: Props) {
  const { token, user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dd, setDd] = useState('');
  const [df, setDf] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [controlId, setControlId] = useState('');
  const [technicienId, setTechnicienId] = useState('');
  const [projectTypeId, setProjectTypeId] = useState('');
  const [projectTypes, setProjectTypes] = useState<{ id: string; title: string }[]>([]);
  const [projectTypeOpen, setProjectTypeOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<{ id: string; firstname?: string; lastname?: string; email?: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [ownerOpen, setOwnerOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [technicienOpen, setTechnicienOpen] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDdPickerVisible, setDdPickerVisible] = useState(false);
  const [isDfPickerVisible, setDfPickerVisible] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [currentChantiersCount, setCurrentChantiersCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const adminUser = useMemo(() => companyUsers.find(u => u.id === ownerId), [companyUsers, ownerId]);
  const controlUsers = useMemo(() => companyUsers.filter(u => u.id !== ownerId), [companyUsers, ownerId]);
  const technicienUsers = useMemo(() => companyUsers.filter(u => u.id !== ownerId && u.id !== controlId), [companyUsers, ownerId, controlId]);

  const isDisabled = useMemo(() => !title || !token, [title, token]);

  function validate(): string | null {
    if (!title) return 'Le titre est requis';
    // dd/df are optional; if both provided, ensure ordering
    if (dd && df) {
      const start = new Date(dd);
      const end = new Date(df);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Dates invalides';
      if (start >= end) return 'La date de fin doit être postérieure à la date de début';
    }
    
    // Check for duplicate role assignments
    const roles = [ownerId, controlId, technicienId].filter(Boolean);
    const uniqueRoles = new Set(roles);
    if (roles.length !== uniqueRoles.size) {
      return 'Un utilisateur ne peut pas être assigné à plusieurs rôles (Admin, Contrôleur, Technicien).';
    }
    
    return null;
  }

  useEffect(() => {
    if (visible) {
      fetchLimitInfo();
    }
  }, [visible]);

  const fetchLimitInfo = async () => {
    try {
      setLoadingLimits(true);
      if (!token) return;
      
      const [company, projects] = await Promise.all([
        companyService.getCompany(),
        getAllProjects(token)
      ]);
      
      setCompanyInfo(company);
      setCurrentChantiersCount(projects.length);
      
      const limit = company.nbchanitiers || 2;
      setIsLimitReached(projects.length >= limit);
    } catch (error) {
      console.error('Error fetching limit info:', error);
    } finally {
      setLoadingLimits(false);
    }
  };

  useEffect(() => {
    async function loadUsers() {
      if (!visible) return;
      if (!token) {
        setCompanyUsers([]);
        return;
      }
      setLoadingUsers(true);
      try {
        const baseUrl = API_CONFIG.BASE_URL?.replace(/\/$/, '') || '';
        const url = `${baseUrl}/api/users`;
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          setCompanyUsers([]);
          return;
        }
        
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setCompanyUsers(data);
        } else {
          setCompanyUsers([]);
        }
      } catch {
        setCompanyUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, [visible, token]);

  useEffect(() => {
    async function loadProjectTypes() {
      if (!token) return;
      setLoadingTypes(true);
      try {
        const data = await getAllProjectTypes(token);
        setProjectTypes(data.map((t: any) => ({ id: String(t.id), title: t.title })));
      } catch {
        setProjectTypes([]);
      } finally {
        setLoadingTypes(false);
      }
    }
    if (visible && token) loadProjectTypes();
  }, [visible, token]);

  function generateProjectCode() {
    const ts = Date.now().toString(36).toUpperCase();
    return `PRJ-${ts}`;
  }

  async function onSubmit() {
    if (!token) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    
    if (isLimitReached) {
      Alert.alert(
        'Limite atteinte',
        `Vous avez atteint la limite de ${companyInfo?.nbchanitiers || 2} chantiers. Veuillez mettre à niveau votre plan pour ajouter plus de chantiers.`
      );
      return;
    }
    
    try {
      setIsSubmitting(true);
      await createProject(token, {
        code: generateProjectCode(),
        title,
        description: description || undefined,
        dd: dd || undefined as any,
        df: df || undefined as any,
        owner_id: ownerId || undefined,
        control_id: controlId,
        technicien_id: technicienId,
        projecttype_id: projectTypeId || undefined,
      });
      setTitle(''); setDescription(''); setDd(''); setDf(''); setOwnerId(''); setControlId(''); setTechnicienId(''); setProjectTypeId(''); setError(null);
      if (onCreated) await onCreated();
      onClose();
      Alert.alert('Succès', 'Chantier créé avec succès');
    } catch (e: any) {
      // Handle 403 error specifically for limit reached
      if (e?.message?.includes('limit') || e?.message?.includes('Chantier limit')) {
        Alert.alert(
          'Limite atteinte',
          e?.message || `Vous avez atteint la limite de ${companyInfo?.nbchanitiers || 2} chantiers.`
        );
      } else {
        setError(e?.message || 'Création échouée');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatDate(date: Date) {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return `${y}-${m}-${d}`;
  }

  return (
    <>
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={stylesFS.container}>
          {/* Header */}
          <View style={stylesFS.header}>
            <TouchableOpacity onPress={onClose} style={stylesFS.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={stylesFS.headerCenter}>
              <Text style={stylesFS.headerTitle}>Créer un chantier</Text>
            </View>
            <View style={stylesFS.placeholder} />
          </View>

          {/* Error Banner */}
          {error && (
            <View style={stylesFS.alertBanner}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text style={stylesFS.alertBannerText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Ionicons name="close" size={16} color="#b45309" />
              </TouchableOpacity>
            </View>
          )}

          {/* Limit Info Banner */}
          {!loadingLimits && companyInfo && (
            <View style={[stylesFS.limitInfoBanner, isLimitReached && stylesFS.limitInfoBannerWarning]}>
              <Ionicons 
                name={isLimitReached ? "warning" : "business"} 
                size={16} 
                color={isLimitReached ? "#b45309" : "#3b82f6"} 
              />
              <Text style={[stylesFS.limitInfoText, isLimitReached && stylesFS.limitInfoTextWarning]}>
                Chantiers: {currentChantiersCount} / {companyInfo.nbchanitiers || 2}
                {isLimitReached && " - Nombre des chantiers dépassé"}
              </Text>
            </View>
          )}

          {/* Content */}
          <ScrollView style={stylesFS.content} showsVerticalScrollIndicator={false}>
            <View style={stylesFS.card}>
              <View style={[stylesFS.inputWrap, { marginBottom: 16 }]}>
                <Ionicons name="text-outline" size={16} color="#6b7280" />
                <TextInput placeholder="Titre" placeholderTextColor="#9ca3af" value={title} onChangeText={setTitle} style={stylesFS.input} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TouchableOpacity style={[stylesFS.inputWrap, { flex: 1 }]} onPress={() => setDdPickerVisible(true)}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={[stylesFS.input, { color: dd ? '#111827' : '#9ca3af' }]}>{dd || 'Début (YYYY-MM-DD)'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[stylesFS.inputWrap, { flex: 1 }]} onPress={() => setDfPickerVisible(true)}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={[stylesFS.input, { color: df ? '#111827' : '#9ca3af' }]}>{df || 'Fin (YYYY-MM-DD)'}</Text>
                </TouchableOpacity>
              </View>
              <View style={[stylesFS.inputWrap, { marginBottom: 16, height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                <TextInput
                  placeholder="Description "
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  style={[stylesFS.input, { height: '100%' }]}
                  multiline
                />
              </View>

              {/* Project Type Select (optional) */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Type de chantier</Text>
                <TouchableOpacity style={[stylesFS.inputWrap, { justifyContent: 'space-between' }]} onPress={() => setProjectTypeOpen(v => !v)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="albums-outline" size={16} color="#6b7280" />
                    <Text style={[stylesFS.input, { color: projectTypeId ? '#111827' : '#9ca3af' }]} numberOfLines={1}>
                      {projectTypeId ? (projectTypes.find(pt => String(pt.id) === String(projectTypeId))?.title || projectTypeId) : 'Choisir un type (optionnel)'}
                    </Text>
                  </View>
                  <Ionicons name={projectTypeOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                </TouchableOpacity>
                {projectTypeOpen && (
                  <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {loadingTypes ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                      ) : projectTypes.length === 0 ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun type</Text></View>
                      ) : (
                        projectTypes.map(pt => (
                          <TouchableOpacity key={pt.id} onPress={() => { setProjectTypeId(String(pt.id)); setProjectTypeOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: String(projectTypeId) === String(pt.id) ? '#f1f5f9' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                            <Text style={{ color: '#11224e' }}>{pt.title}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
              {/* Owner (Admin) Select */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Admin (optionnel)</Text>
                <TouchableOpacity style={[stylesFS.inputWrap, { justifyContent: 'space-between' }]} onPress={() => setOwnerOpen(v => !v)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="person-circle-outline" size={16} color="#6b7280" />
                    <Text style={[stylesFS.input, { color: ownerId ? '#111827' : '#9ca3af' }]} numberOfLines={1}>
                      {ownerId ? (companyUsers.find(u => String(u.id) === String(ownerId))?.firstname ? `${companyUsers.find(u => String(u.id) === String(ownerId))?.firstname} ${companyUsers.find(u => String(u.id) === String(ownerId))?.lastname || ''}` : ownerId) : 'Choisir un admin'}
                    </Text>
                  </View>
                  <Ionicons name={ownerOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                </TouchableOpacity>
                {ownerOpen && (
                  <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
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
              {/* Control User Select */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Contrôleur (optionnel)</Text>
                <TouchableOpacity 
                  style={[stylesFS.inputWrap, { justifyContent: 'space-between' }, isSuperAdmin && { opacity: 0.5, backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }]} 
                  onPress={() => !isSuperAdmin && setControlOpen(v => !v)}
                  disabled={isSuperAdmin}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={isSuperAdmin ? '#9ca3af' : '#6b7280'} />
                    <Text style={[stylesFS.input, { color: isSuperAdmin ? '#9ca3af' : (controlId ? '#111827' : '#9ca3af') }]} numberOfLines={1}>
                      {isSuperAdmin ? 'Non autorisé' : (controlId ? (controlUsers.find(u => String(u.id) === String(controlId))?.firstname ? `${controlUsers.find(u => String(u.id) === String(controlId))?.firstname} ${controlUsers.find(u => String(u.id) === String(controlId))?.lastname || ''}` : controlId) : 'Choisir un contrôleur')}
                    </Text>
                  </View>
                  <Ionicons name={isSuperAdmin ? 'lock-closed-outline' : (controlOpen ? 'chevron-up' : 'chevron-down')} size={16} color="#9ca3af" />
                </TouchableOpacity>
                {controlOpen && !isSuperAdmin && (
                  <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
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
              {/* Technicien User Select */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Technicien (optionnel)</Text>
                <TouchableOpacity 
                  style={[stylesFS.inputWrap, { justifyContent: 'space-between' }, isSuperAdmin && { opacity: 0.5, backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }]} 
                  onPress={() => !isSuperAdmin && setTechnicienOpen(v => !v)}
                  disabled={isSuperAdmin}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="construct-outline" size={16} color={isSuperAdmin ? '#9ca3af' : '#6b7280'} />
                    <Text style={[stylesFS.input, { color: isSuperAdmin ? '#9ca3af' : (technicienId ? '#111827' : '#9ca3af') }]} numberOfLines={1}>
                      {isSuperAdmin ? 'Non autorisé' : (technicienId ? (technicienUsers.find(u => String(u.id) === String(technicienId))?.firstname ? `${technicienUsers.find(u => String(u.id) === String(technicienId))?.firstname} ${technicienUsers.find(u => String(u.id) === String(technicienId))?.lastname || ''}` : technicienId) : 'Choisir un technicien')}
                    </Text>
                  </View>
                  <Ionicons name={isSuperAdmin ? 'lock-closed-outline' : (technicienOpen ? 'chevron-up' : 'chevron-down')} size={16} color="#9ca3af" />
                </TouchableOpacity>
                {technicienOpen && !isSuperAdmin && (
                  <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
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
          <View style={stylesFS.footer}>
            <TouchableOpacity 
              style={[stylesFS.submitButton, (!token || isSubmitting || isDisabled || isLimitReached) && stylesFS.submitButtonDisabled]} 
              disabled={!token || isSubmitting || isDisabled || isLimitReached} 
              onPress={onSubmit}
            >
              {isSubmitting ? (
                <>
                  <Ionicons name="hourglass" size={20} color="#FFFFFF" />
                  <Text style={stylesFS.submitButtonText}>Enregistrement...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#FFFFFF" />
                  <Text style={stylesFS.submitButtonText}>Créer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Date Pickers */}
          <DateTimePickerModal
            key="dd-picker"
            isVisible={isDdPickerVisible}
            mode="date"
            onConfirm={(date) => { setDd(formatDate(date)); setDdPickerVisible(false); }}
            onCancel={() => setDdPickerVisible(false)}
          />
          <DateTimePickerModal
            key="df-picker"
            isVisible={isDfPickerVisible}
            mode="date"
            onConfirm={(date) => { setDf(formatDate(date)); setDfPickerVisible(false); }}
            onCancel={() => setDfPickerVisible(false)}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const stylesFS = StyleSheet.create({
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
  disabledInput: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
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


