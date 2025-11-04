import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first calendar: map JS getDay() (Sun=0..Sat=6) to Mon=0..Sun=6
  const startWeekdayMonFirst = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startWeekdayMonFirst);
  const today = new Date();

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const isCurrentMonth = d.getMonth() === month;
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    cells.push({ date: d, isCurrentMonth, isToday });
  }
  return cells;
}

function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

interface Props {
  eventsByDate?: Record<string, string[]>; // date ISO -> array of contexts
  onMonthChange?: (startIso: string, endIso: string) => void;
  onDayPress?: (dateIso: string) => void;
  onAddEvent?: () => void;
}

export default function CalendarComp({ eventsByDate = {}, onMonthChange, onDayPress, onAddEvent }: Props) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const { width } = useWindowDimensions();

  // Build a stable 6x7 matrix (Mon → Sun per row) to avoid wrapping issues
  const weeks = useMemo(() => {
    const flat = buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth());
    const rows: DayCell[][] = [];
    for (let i = 0; i < 42; i += 7) {
      rows.push(flat.slice(i, i + 7));
    }
    return rows;
  }, [visibleMonth]);

  // Responsive sizing (subtract wrapper margin + inner padding + gaps)
  const outerMargin = 20; // must match wrapper.marginHorizontal
  const pagePadding = 20; // must match grid/weekday paddingHorizontal
  const gap = 8;
  const totalGaps = gap * 6;
  const availableWidth = Math.max(
    0,
    width - (outerMargin * 2 + pagePadding * 2 + totalGaps)
  );
  const cellSize = Math.floor(availableWidth / 7);

  const goPrev = () => setVisibleMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1));
  const goNext = () => setVisibleMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1));
  const goToday = () => setVisibleMonth(new Date());

  // Effect to handle month changes, including the initial load
  useEffect(() => {
    if (!onMonthChange) return;
    const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const end = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
    const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
    const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    onMonthChange(startIso, endIso);
  }, [visibleMonth, onMonthChange]); // Reruns when month or callback changes

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={goPrev} accessibilityRole="button">
          <Text style={styles.navText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{formatMonthTitle(visibleMonth)}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={goNext} accessibilityRole="button">
          <Text style={styles.navText}>{'>'}</Text>
        </TouchableOpacity>
        {onAddEvent && (
          <TouchableOpacity style={styles.addEventBtn} onPress={onAddEvent} accessibilityRole="button">
            <Ionicons name="add-circle" size={24} color="#f87b1b" />
          </TouchableOpacity>
        )}
      </View>
     
      <View style={[styles.weekRow, { paddingHorizontal: pagePadding }]}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w => (
          <View key={w} style={[styles.weekdayCell, { width: cellSize }]}> 
            <Text style={styles.weekdayText}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: pagePadding }}>
        {weeks.map((week, wIdx) => (
          <View key={`week_${wIdx}`} style={[styles.weekDaysRow, { marginBottom: wIdx < 5 ? gap : 0 }]}>
            {week.map((cell, cIdx) => (
              <TouchableOpacity
                key={`${cell.date.toISOString()}_${cIdx}`}
                style={[
                  styles.dayCell,
                  { width: cellSize, height: cellSize, marginRight: cIdx < 6 ? gap : 0 },
                  // Apply background color if there are events on this day
                  (() => {
                    const key = formatDateKey(cell.date);
                    const contexts = eventsByDate[key] || [];
                    if (contexts.length === 0) return {};
                    const bg = contextToColor(contexts[0]);
                    return { backgroundColor: bg, borderColor: bg };
                  })(),
                  cell.isToday && styles.todayCell,
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  if (!onDayPress) return;
                  const iso = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
                  onDayPress(iso);
                }}
              >
                {(() => {
                  const key = formatDateKey(cell.date);
                  const hasEvents = (eventsByDate[key] || []).length > 0;
                  return (
                    <Text style={[
                      styles.dayText,
                      !cell.isCurrentMonth && styles.mutedDay,
                      hasEvents && styles.dayTextOnColored
                    ]}>
                  {cell.date.getDate()}
                    </Text>
                  );
                })()}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 0,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 2,
    borderColor: '#f87b1b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11224e',
    textTransform: 'capitalize',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  addEventBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    marginLeft: 10,
  },
  navText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  todayPill: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  todayPillText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 6,
  },
  weekdayCell: {
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekDaysRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  dayCell: {
    marginBottom: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dayText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '700',
  },
  dayTextOnColored: {
    color: '#FFFFFF',
  },
  mutedDay: {
    color: '#C7C7CC',
    fontWeight: '600',
  },
  todayCell: {
    borderColor: '#f87b1b',
    borderWidth: 2,
  },
});

function contextToColor(ctx: string): string {
  switch (ctx) {
    case 'declaration_anomalie':
      return '#FF3B30';
    case 'action_corrective':
      return '#34C759';
    case 'audit_zone':
      return '#007AFF';
    case 'prelevement_echantillon':
      return '#AF52DE';
    case 'inventaire_article':
      return '#FF9F0A';
    default:
      return '#8E8E93';
  }
}

function formatDateKey(d: Date): string {
  // Use the device's local calendar day without timezone shifting
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


