import API_CONFIG from '@/app/config/api';
import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import folderService, { CreateFolderPayload, Folder } from '@/services/qualiphotoService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceNoteRecorder from '../VoiceNoteRecorder';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (created: Partial<Folder>) => void;
  projectId?: string;
  zoneId?: string;
};

export default function CreateQualiPhotoModal({ visible, onClose, onSuccess, projectId, zoneId }: Props) {
  const { token } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyUsers, setCompanyUsers] = useState<{ id: string; firstname?: string; lastname?: string; email?: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [controlId, setControlId] = useState('');
  const [technicienId, setTechnicienId] = useState('');
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [technicienOpen, setTechnicienOpen] = useState(false);

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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setCompanyUsers([]); return; }
        const data = await res.json();
        if (Array.isArray(data)) setCompanyUsers(data);
        else setCompanyUsers([]);
      } catch {
        setCompanyUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, [visible, token]);

  const isDisabled = useMemo(() => !title || !token || submitting, [title, token, submitting]);

  const handleSubmit = async () => {
    if (!token) return;
    setError(null);
    if (!title || title.trim().length === 0) { setError('Veuillez saisir un titre.'); return; }
    setSubmitting(true);
    try {
      const payload: CreateFolderPayload = {
        code: `F-${Date.now().toString(36).toUpperCase()}`,
        title,
        description,
        foldertype: 'reception',
        owner_id: ownerId || undefined,
        control_id: controlId || undefined,
        technicien_id: technicienId || undefined,
        project_id: projectId,
        zone_id: zoneId,
      };
      const created = await folderService.createFolder(payload, token);
      onSuccess && onSuccess(created);
      handleClose();
    } catch (e: any) {
      setError(e?.message || 'Échec de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setOwnerId('');
    setControlId('');
    setTechnicienId('');
    setOwnerOpen(false);
    setControlOpen(false);
    setTechnicienOpen(false);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Nouveau dossier</Text>
              <Image source={ICONS.folder} style={{ width: 24, height: 24 }} />
            </View>
            <View style={styles.placeholder} />
          </View>

          {error && (
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text style={styles.alertBannerText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Ionicons name="close" size={16} color="#b45309" />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={{paddingTop: 16}}>
              <View style={[styles.inputWrap, { marginBottom: 16 }]}>
                <Ionicons name="text-outline" size={16} color="#f87b1b" />
                <TextInput
                  placeholder="Titre"
                  placeholderTextColor="#9ca3af"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                />
              </View>

              {/* Owner (Admin) Select */}
              <View style={{ gap: 8, marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Admin </Text>
                <TouchableOpacity style={[styles.inputWrap, { justifyContent: 'space-between' }]} onPress={() => setOwnerOpen(v => !v)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="person-circle-outline" size={16} color="#f87b1b" />
                    <Text style={[styles.input, { color: ownerId ? '#111827' : '#9ca3af' }]} numberOfLines={1}>
                      {ownerId ? (companyUsers.find(u => String(u.id) === String(ownerId))?.firstname ? `${companyUsers.find(u => String(ownerId) === String(u.id))?.firstname} ${companyUsers.find(u => String(ownerId) === String(u.id))?.lastname || ''}` : ownerId) : 'Choisir un admin'}
                    </Text>
                  </View>
                  <Ionicons name={ownerOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#f87b1b" />
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

              {/* Control Select */}
              <View style={{ gap: 8, marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Contrôleur</Text>
                <TouchableOpacity style={[styles.inputWrap, { justifyContent: 'space-between' }]} onPress={() => setControlOpen(v => !v)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#f87b1b" />
                    <Text style={[styles.input, { color: controlId ? '#111827' : '#9ca3af' }]} numberOfLines={1}>
                      {controlId ? (companyUsers.find(u => String(u.id) === String(controlId))?.firstname ? `${companyUsers.find(u => String(controlId) === String(u.id))?.firstname} ${companyUsers.find(u => String(controlId) === String(u.id))?.lastname || ''}` : controlId) : 'Choisir un contrôleur'}
                    </Text>
                  </View>
                  <Ionicons name={controlOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#f87b1b" />
                </TouchableOpacity>
                {controlOpen && (
                  <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {loadingUsers ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                      ) : companyUsers.length === 0 ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun utilisateur</Text></View>
                      ) : (
                        companyUsers.map(u => (
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

              {/* Technicien Select */}
              <View style={{ gap: 8, marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 2 }}>Technicien</Text>
                <TouchableOpacity style={[styles.inputWrap, { justifyContent: 'space-between' }]} onPress={() => setTechnicienOpen(v => !v)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="construct-outline" size={16} color="#f87b1b" />
                    <Text style={[styles.input, { color: technicienId ? '#111827' : '#9ca3af' }]} numberOfLines={1}>
                      {technicienId ? (companyUsers.find(u => String(u.id) === String(technicienId))?.firstname ? `${companyUsers.find(u => String(technicienId) === String(u.id))?.firstname} ${companyUsers.find(u => String(technicienId) === String(u.id))?.lastname || ''}` : technicienId) : 'Choisir un technicien'}
                    </Text>
                  </View>
                  <Ionicons name={technicienOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#f87b1b" />
                </TouchableOpacity>
                {technicienOpen && (
                  <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {loadingUsers ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Chargement...</Text></View>
                      ) : companyUsers.length === 0 ? (
                        <View style={{ padding: 12 }}><Text style={{ color: '#6b7280' }}>Aucun utilisateur</Text></View>
                      ) : (
                        companyUsers.map(u => (
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

              <View style={{ marginBottom: 16 }}>
                <VoiceNoteRecorder
                  onRecordingComplete={() => {
                    // Not saving audio file here, just using for transcription
                  }}
                  onTranscriptionComplete={(text) => {
                    setDescription(prev => (prev ? `${prev}\n${text}` : text));
                  }}
                />
              </View>

              <View style={[styles.inputWrap, { alignItems: 'flex-start' }]}> 
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#f87b1b" style={{ marginTop: 4 }} />
                <TextInput
                  placeholder="Introduction"
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input, { height: 250 }]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]} disabled={isDisabled} onPress={handleSubmit}>
              {submitting ? (<><Ionicons name="hourglass" size={16} color="#FFFFFF" /><Text style={styles.submitButtonText}>Enregistrement...</Text></>) : (<><Ionicons name="save" size={16} color="#FFFFFF" /><Text style={styles.submitButtonText}>Enregistrer</Text></>)}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  closeButton: { padding: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#f87b1b' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 16 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  alertBannerText: { color: '#b45309', flex: 1, fontSize: 12 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f87b1b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, color: '#111827' },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  submitButton: { backgroundColor: '#f87b1b', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, height: 48, alignSelf: 'center', width: '92%' },
  submitButtonDisabled: { backgroundColor: '#d1d5db' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});


