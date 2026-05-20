import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from '../../lib/dayjs';
import { colors, radius, spacing } from '../../design/recipes';

import { Ionicons } from '@expo/vector-icons';

import BaseCard from '../ui/BaseCard';
import { getCalendarWeekRanges, getOwningMonthForDate } from '../../lib/statsUtils';

interface WeeklyCalendarCardProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  markings?: Record<string, any>;
  setMonthPickerVisible: (visible: boolean) => void;
  selectedYearMonth: string;
}

export default function WeeklyCalendarCard({
  selectedDate,
  onSelectDate,
  markings = {},
  setMonthPickerVisible,
  selectedYearMonth,
}: WeeklyCalendarCardProps) {
  const selectedWeekRange = useMemo(() => {
    const owningMonth = getOwningMonthForDate(selectedDate);
    const { ranges } = getCalendarWeekRanges(owningMonth);
    const rangeIndex = ranges.findIndex(
      (r) => r.s.format('YYYY-MM-DD') <= selectedDate && r.e.format('YYYY-MM-DD') >= selectedDate,
    );
    if (rangeIndex !== -1) {
      return { ...ranges[rangeIndex], weekNumber: rangeIndex + 1, owningMonth };
    }
    const s = dayjs(selectedDate).startOf('isoWeek');
    return { s, e: s.add(6, 'day'), weekNumber: 1, owningMonth };
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    const days = [];
    let current = selectedWeekRange.s;
    while (current.isBefore(selectedWeekRange.e) || current.isSame(selectedWeekRange.e, 'day')) {
      days.push(current);
      current = current.add(1, 'day');
    }
    return days;
  }, [selectedWeekRange]);

  const monthLabel = dayjs(`${selectedWeekRange.owningMonth}-01`).format('M월');
  const weekLabel = `${monthLabel} ${selectedWeekRange.weekNumber}주차`;

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setMonthPickerVisible(true)}
          style={styles.monthPickerButton}
          activeOpacity={0.7}
        >
          <Text style={styles.monthPickerText}>
            {dayjs(`${selectedYearMonth}-01`).format('YYYY MMMM ')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.darkGreen} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMonthPickerVisible(true)}
          style={styles.weekBadge}
          activeOpacity={0.7}
        >
          <Text style={styles.weekBadgeText}>{weekLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.daysRow}>
        {weekDays.map((d) => {
          const dateStr = d.format('YYYY-MM-DD');
          const isSelected = dateStr === selectedDate;
          const dayName = d.format('dd'); // 월, 화, 수...
          const dayNum = d.format('D');
          const hasDot = markings[dateStr]?.totalGoals > 0;

          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.dayCol}
              onPress={() => onSelectDate(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>{dayName}</Text>

              {isSelected ? (
                <BaseCard glassOnly padded={false} style={styles.dayCircleSelected}>
                  <Text style={styles.dayNumSelected}>{dayNum}</Text>
                </BaseCard>
              ) : (
                <View style={styles.dayCircle}>
                  <Text style={styles.dayNum}>{dayNum}</Text>
                </View>
              )}

              {hasDot && !isSelected && <View style={styles.dot} />}
              {hasDot && isSelected && (
                <View style={[styles.dot, { backgroundColor: colors.softCoral }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  monthPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthPickerText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.darkGreen,
  },
  weekBadge: {
    backgroundColor: colors.white60,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.82)',
  },
  weekBadgeText: {
    color: colors.softCoral,
    fontSize: 12,
    fontWeight: '800',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
  },
  dayCol: {
    alignItems: 'center',
    width: 42,
  },
  dayName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing[2],
    fontWeight: '500',
  },
  dayNameSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  dayCircleSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGreen,
  },
  dayNumSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.darkGreen,
    position: 'absolute',
    bottom: -10,
  },
});
