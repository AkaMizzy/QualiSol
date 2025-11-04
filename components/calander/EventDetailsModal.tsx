import API_CONFIG from '@/app/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CALENDAR_CONTEXTS } from '../../constants/Calendar';

interface Props {
  visible: boolean;
  eventId: string | null;
  onClose: () => void;
}

export default function EventDetailsModal({ visible, eventId, onClose }: Props) {
  const { token } = useAuth();
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const anim = React.useRef(new Animated.Value(0)).current;

  const ctx = React.useMemo(() => {
    if (!data) return null;
    return CALENDAR_CONTEXTS.find(c => c.value === data.context) || null;
  }, [data]);

  React.useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!visible || !eventId || !token) { setData(null); return; }
      try {
        setLoading(true);
        const res = await fetch(`${API_CONFIG.BASE_URL}/calendar/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!cancelled) setData(res.ok ? json : null);
      } catch { if (!cancelled) setData(null); }
      finally { if (!cancelled) setLoading(false); }
    }
    run();
    return () => { cancelled = true; };
  }, [visible, eventId, token]);

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button"><Ionicons name="close" size={24} color="#1C1C1E" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Event details</Text>
          <View style={{ width: 24 }} />
        </View>

        <Animated.View style={{ flex: 1, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [12,0] }) }] }}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heroRow}>
              {ctx?.icon ? (
                <Image source={ctx.icon} style={styles.heroIcon} contentFit="contain" />
              ) : (
                <View style={styles.heroIconFallback}><Text style={styles.heroIconText}>{(data?.context || '?').slice(0,1)}</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>{data?.title || 'Untitled'}</Text>
                <Text style={styles.subtitle}>{ctx?.label || data?.context || ''}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <LabelValue label="Date" value={data?.date} />
              <LabelValue label="Time" value={formatTimeRange(data?.heur_debut, data?.heur_fin)} />
              <LabelValue label="Module" value={data?.module || '—'} />
              <LabelValue label="Function" value={data?.function || '—'} />
              <LabelValue label="Company" value={data?.id_company || '—'} />
              <LabelValue label="Created by" value={fullName(data?.firstname, data?.lastname)} />
            </View>

            {data?.description ? (
              <View style={styles.descCard}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descText}>{data?.description}</Text>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function LabelValue({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.lvRow}>
      <Text style={styles.lvLabel}>{label}</Text>
      <Text style={styles.lvValue}>{value || '—'}</Text>
    </View>
  );
}

function formatTimeRange(s?: string | null, e?: string | null) {
  if (!s && !e) return '—';
  if (s && e) return `${s} – ${e}`;
  return s || e || '—';
}

function fullName(a?: string, b?: string) {
  return [a, b].filter(Boolean).join(' ');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  closeBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#11224e' },
  content: { padding: 16, gap: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 40, height: 40, borderRadius: 8 },
  heroIconFallback: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  heroIconText: { fontWeight: '700', color: '#1C1C1E' },
  title: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#ECECEC' },
  lvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  lvLabel: { fontSize: 12, color: '#8E8E93' },
  lvValue: { fontSize: 14, color: '#1C1C1E', fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#11224e', marginBottom: 8 },
  descCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#ECECEC' },
  descText: { fontSize: 14, color: '#1C1C1E', lineHeight: 20 },
});


