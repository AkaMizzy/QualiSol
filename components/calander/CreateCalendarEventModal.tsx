import { CALENDAR_CONTEXTS } from '../../constants/Calendar';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Keyboard, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export interface CreateCalendarEventValues {
  context: string;
  title: string;
  description: string;
  date: string;
  heur_debut?: string;
  heur_fin?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: CreateCalendarEventValues) => Promise<void> | void;
}

export default function CreateCalendarEventModal({ visible, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<CreateCalendarEventValues>({
    context: CALENDAR_CONTEXTS[0].value,
    title: '',
    description: '',
    date: '',
    heur_debut: '',
    heur_fin: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  function update<K extends keyof CreateCalendarEventValues>(key: K, val: CreateCalendarEventValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function toISODate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDisplayDate(iso?: string) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function toTimeString(d: Date) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  function validate(): string | null {
    if (!values.context) return 'Context is required';
    if (!values.title.trim()) return 'Title is required';
    if (!values.description.trim()) return 'Description is required';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) return 'Date must be YYYY-MM-DD';
    if (values.heur_debut && !/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(values.heur_debut)) return 'Start time must be HH:MM or HH:MM:SS';
    if (values.heur_fin && !/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(values.heur_fin)) return 'End time must be HH:MM or HH:MM:SS';
    if (values.heur_debut && values.heur_fin) {
      const s = new Date(`2000-01-01T${values.heur_debut}`);
      const e = new Date(`2000-01-01T${values.heur_fin}`);
      if (e < s) return 'End time must be after start time';
    }
    return null;
  }

  async function handleSubmit() {
    const v = validate();
    if (v) {
      if (v === 'End time must be after start time') {
        Alert.alert('Invalid time range', v);
      } else {
        setError(v);
      }
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({ ...values, heur_debut: values.heur_debut || undefined, heur_fin: values.heur_fin || undefined });
      onClose();
      setValues({ context: CALENDAR_CONTEXTS[0].value, title: '', description: '', date: '', heur_debut: '', heur_fin: '' });
    } catch (e: any) {
      setError(e?.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}} accessible={false}>
            <View style={styles.card}>
          <Text style={styles.title}>Create Event</Text>

          <Text style={styles.label}>Context</Text>
          <View style={styles.contextRow}>
            {CALENDAR_CONTEXTS.map((c) => {
              const isActive = values.context === c.value;
              return (
                <TouchableOpacity key={c.value} onPress={() => update('context', c.value)} style={[styles.contextPill, isActive && styles.contextPillActive]} accessibilityRole="button" accessibilityLabel={`Select ${c.label}`}>
                  <Text style={[styles.contextPillText, isActive && styles.contextPillTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Title</Text>
          <TextInput value={values.title} onChangeText={(t) => update('title', t)} placeholder="Title" style={styles.input} accessibilityLabel="Title" />

          <Text style={styles.label}>Description</Text>
          <TextInput value={values.description} onChangeText={(t) => update('description', t)} placeholder="Description" style={[styles.input, styles.multiline]} multiline accessibilityLabel="Description" />

          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)} accessibilityRole="button">
            <Ionicons name="calendar-outline" size={18} color="#8E8E93" />
            <Text style={[styles.dateText, !values.date && styles.placeholderText]}>
              {values.date ? formatDisplayDate(values.date) : 'Select date'}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            date={values.date ? new Date(values.date) : new Date()}
            onConfirm={(d) => {
              setShowDatePicker(false);
              update('date', toISODate(d));
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start time</Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)} accessibilityRole="button">
                <Ionicons name="time-outline" size={18} color="#8E8E93" />
                <Text style={[styles.dateText, !values.heur_debut && styles.placeholderText]}>
                  {values.heur_debut || 'Select time'}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showStartPicker}
                mode="time"
                date={new Date()}
                onConfirm={(d) => {
                  setShowStartPicker(false);
                  update('heur_debut', toTimeString(d));
                }}
                onCancel={() => setShowStartPicker(false)}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End time</Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)} accessibilityRole="button">
                <Ionicons name="time-outline" size={18} color="#8E8E93" />
                <Text style={[styles.dateText, !values.heur_fin && styles.placeholderText]}>
                  {values.heur_fin || 'Select time'}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showEndPicker}
                mode="time"
                date={new Date()}
                onConfirm={(d) => {
                  setShowEndPicker(false);
                  update('heur_fin', toTimeString(d));
                }}
                onCancel={() => setShowEndPicker(false)}
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.secondaryBtn]} accessibilityRole="button"><Text style={[styles.btnText, styles.secondaryBtnText]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={[styles.btn, styles.primaryBtn]} disabled={submitting} accessibilityRole="button"><Text style={styles.btnText}>{submitting ? 'Saving…' : 'Create'}</Text></TouchableOpacity>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11224e',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    fontSize: 14,
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextPill: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  contextPillActive: {
    borderColor: '#f87b1b',
    backgroundColor: '#FFF5EE',
  },
  contextPillText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  contextPillTextActive: {
    color: '#f87b1b',
  },
  error: {
    color: '#FF3B30',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryBtn: {
    backgroundColor: '#f87b1b',
  },
  secondaryBtn: {
    backgroundColor: '#F2F2F7',
  },
  secondaryBtnText: {
    color: '#1C1C1E',
  },
  // Modern pill-like input button used for date/time pickers
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: { color: '#1C1C1E', fontSize: 14 },
  placeholderText: { color: '#8E8E93' },
});


