import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheetModal from '../ui/BottomSheetModal';
import dayjs from '../../lib/dayjs';
import { colors } from '../../design/tokens';
import { getCalendarWeekRanges, getOwningMonthForDate } from '../../lib/statsUtils';

interface MonthPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentYearMonth: string;
  currentDate?: string;
  onSelect: (yearMonth: string, weekNumber?: number) => void;
}

export default function MonthPickerModal({
  visible,
  onClose,
  currentYearMonth,
  currentDate,
  onSelect,
}: MonthPickerModalProps) {
  const [viewYear, setViewYear] = useState(dayjs(currentYearMonth).year());
  const [selectedYearMonth, setSelectedYearMonth] = useState(currentYearMonth);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const weekRanges = useMemo(
    () => getCalendarWeekRanges(selectedYearMonth).ranges,
    [selectedYearMonth],
  );

  const selectedWeekNumber = useMemo(() => {
    if (!currentDate || getOwningMonthForDate(currentDate) !== selectedYearMonth) return null;

    const rangeIndex = weekRanges.findIndex(
      (range) =>
        range.s.format('YYYY-MM-DD') <= currentDate && range.e.format('YYYY-MM-DD') >= currentDate,
    );

    return rangeIndex === -1 ? null : rangeIndex + 1;
  }, [currentDate, selectedYearMonth, weekRanges]);

  useEffect(() => {
    if (!visible) return;
    setViewYear(dayjs(currentYearMonth).year());
    setSelectedYearMonth(currentYearMonth);
  }, [currentYearMonth, visible]);

  const handleSelectMonth = (month: number) => {
    const mm = month < 10 ? `0${month}` : `${month}`;
    setSelectedYearMonth(`${viewYear}-${mm}`);
  };

  const handleSelectWeek = (weekNumber: number) => {
    onSelect(selectedYearMonth, weekNumber);
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="월/주차 선택" maxHeight={520}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setViewYear((y) => y - 1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.yearText}>{viewYear}년</Text>
        <TouchableOpacity onPress={() => setViewYear((y) => y + 1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {months.map((m) => {
          const mm = m < 10 ? `0${m}` : `${m}`;
          const isSelected = selectedYearMonth === `${viewYear}-${mm}`;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.monthItem, isSelected && styles.monthItemSelected]}
              onPress={() => handleSelectMonth(m)}
            >
              <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>{m}월</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.weekSection}>
        <Text style={styles.sectionLabel}>
          {dayjs(`${selectedYearMonth}-01`).format('M월')} 주차
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekList}
        >
          {weekRanges.map((range, index) => {
            const weekNumber = index + 1;
            const isSelected = selectedWeekNumber === weekNumber;
            return (
              <TouchableOpacity
                key={`${selectedYearMonth}-${weekNumber}`}
                style={[styles.weekItem, isSelected && styles.weekItemSelected]}
                onPress={() => handleSelectWeek(weekNumber)}
              >
                <Text style={[styles.weekText, isSelected && styles.weekTextSelected]}>
                  {weekNumber}주차
                </Text>
                <Text style={[styles.weekRangeText, isSelected && styles.weekRangeTextSelected]}>
                  {range.s.format('M/D')} - {range.e.format('M/D')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  arrowBtn: {
    padding: 8,
  },
  yearText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  monthItem: {
    width: '30%',
    aspectRatio: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  monthItemSelected: {
    backgroundColor: '#FF6B3D',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  monthTextSelected: {
    color: '#FFF',
  },
  weekSection: {
    paddingTop: 0,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  weekList: {
    gap: 10,
    paddingRight: 20,
  },
  weekItem: {
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  weekItemSelected: {
    backgroundColor: '#FF6B3D',
    borderColor: '#FF6B3D',
  },
  weekText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  weekTextSelected: {
    color: '#FFF',
  },
  weekRangeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  weekRangeTextSelected: {
    color: 'rgba(255,255,255,0.82)',
  },
});
