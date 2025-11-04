import { CALENDAR_CONTEXTS } from '../constants/Calendar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Animated, Easing, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EventDetailsModal from './EventDetailsModal';

export interface DayEventItem {
  id?: string;
  date: string; // YYYY-MM-DD
  context: string;
  title: string;
  heur_debut?: string | null;
  heur_fin?: string | null;
}

interface Props {
  visible: boolean;
  date: string | null;
  events: DayEventItem[];
  onClose: () => void;
}

const ctxMap = Object.fromEntries(CALENDAR_CONTEXTS.map(c => [c.value, c]));

export default function DayEventsModal({ visible, date, events, onClose }: Props) {
  const anim = React.useRef(new Animated.Value(0)).current;
  const [detailsVisible, setDetailsVisible] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const humanDate = React.useMemo(() => formatHumanDate(date), [date]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
            <Ionicons name="close" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{humanDate.title}</Text>
            <Text style={styles.headerSub}>{humanDate.subtitle}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <Animated.View style={{ flex: 1, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [16, 0] }) }] }}>
          {events.length === 0 ? (
            <View style={styles.empty}> 
              <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>No events on this day</Text>
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item, idx) => item.id || `${item.date}_${item.context}_${idx}`}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => {
                const ctx = ctxMap[item.context];
                return (
                  <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => { setSelectedId(item.id || null); setDetailsVisible(true); }} accessibilityRole="button">
                    <View style={styles.cardRow}>
                      {ctx?.icon ? (
                        <Image source={ctx.icon} style={styles.iconImage} contentFit="contain" />
                      ) : (
                        <View style={styles.iconPill}>
                          <Text style={styles.iconText}>{(ctx?.label || item.context).slice(0,1)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.metaRow}>
                          <View style={styles.contextBadge}>
                            <Text style={styles.contextBadgeText}>{ctx?.label || item.context}</Text>
                          </View>
                          {(item.heur_debut || item.heur_fin) ? (
                            <View style={styles.timeChip}>
                              <Ionicons name="time-outline" size={12} color="#8E8E93" />
                              <Text style={styles.timeChipText}>
                                {item.heur_debut || ''}{item.heur_debut && item.heur_fin ? ' – ' : ''}{item.heur_fin || ''}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </Animated.View>
        <EventDetailsModal visible={detailsVisible} eventId={selectedId} onClose={() => setDetailsVisible(false)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  closeBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#11224e' },
  headerSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, color: '#8E8E93' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'android' ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconImage: { width: 28, height: 28, borderRadius: 6, overflow: 'hidden' },
  iconPill: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontWeight: '700', color: '#1C1C1E' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  cardSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  contextBadge: { backgroundColor: '#F2F2F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  contextBadgeText: { fontSize: 11, color: '#11224e', fontWeight: '600' },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF5EE', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  timeChipText: { fontSize: 11, color: '#1C1C1E', fontWeight: '600' },
  listContent: { padding: 16 },
});

function formatHumanDate(date?: string | null) {
  if (!date) return { title: 'Events', subtitle: '' };
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const weekday = dt.toLocaleDateString(undefined, { weekday: 'short' });
  const month = dt.toLocaleDateString(undefined, { month: 'long' });
  return {
    title: `${weekday}, ${d} ${capitalize(month)}`,
    subtitle: `${y}`,
  };
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}


