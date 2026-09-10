import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { Dayjs } from 'dayjs';
import dayjs from '../../lib/dayjs';
import { colors, radius, spacing } from '../../design/recipes';

import { Ionicons } from '@expo/vector-icons';

import { getCalendarWeekRanges, getOwningMonthForDate } from '../../lib/statsUtils';

interface WeeklyCalendarCardProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  markings?: Record<string, any>;
  setMonthPickerVisible: (visible: boolean) => void;
  selectedYearMonth: string;
}

/** 그 날의 성취 상태를 점 색으로 옮긴다 (markings.dayStatus) */
function getDayDotColor(dayStatus?: string) {
  if (dayStatus === 'all_done') return colors.success;
  if (dayStatus === 'mixed') return colors.warning;
  if (dayStatus === 'mostly_fail') return colors.softCoral;
  return colors.borderMuted;
}

function buildWeek(start: Dayjs, end?: Dayjs) {
  const days: Dayjs[] = [];
  let current = start;
  const last = end ?? start.add(6, 'day');
  while (current.isBefore(last) || current.isSame(last, 'day')) {
    days.push(current);
    current = current.add(1, 'day');
  }
  return days;
}

export default function WeeklyCalendarCard({
  selectedDate,
  onSelectDate,
  markings = {},
  setMonthPickerVisible,
  selectedYearMonth,
}: WeeklyCalendarCardProps) {
  const todayStr = dayjs().format('YYYY-MM-DD');
  const [pageWidth, setPageWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isSettlingRef = useRef(false);

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

  // 손가락을 따라오는 느낌을 주려면 앞뒤 주가 실제로 그려져 있어야 한다
  const weekPages = useMemo(
    () => [
      buildWeek(selectedWeekRange.s.subtract(7, 'day')),
      buildWeek(selectedWeekRange.s, selectedWeekRange.e),
      buildWeek(selectedWeekRange.e.add(1, 'day')),
    ],
    [selectedWeekRange],
  );

  const monthLabel = dayjs(`${selectedYearMonth}-01`).format('YYYY년 M월');
  const weekLabel = `${selectedWeekRange.weekNumber}주차`;

  const centerScroll = useCallback(
    (animated: boolean) => {
      if (pageWidth <= 0) return;
      scrollRef.current?.scrollTo({ x: pageWidth, animated });
    },
    [pageWidth],
  );

  // 주가 바뀌면(스와이프·월 선택·포커스 복귀) 가운데 페이지로 되돌린다
  const weekKey = selectedWeekRange.s.format('YYYY-MM-DD');
  React.useEffect(() => {
    isSettlingRef.current = false;
    centerScroll(false);
  }, [weekKey, centerScroll]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setPageWidth(e.nativeEvent.layout.width);
  }, []);

  // 요일은 유지한 채 한 주씩 이동
  const shiftWeek = useCallback(
    (offset: number) => {
      const next = dayjs(selectedDate).add(offset * 7, 'day');
      onSelectDate(next.format('YYYY-MM-DD'));
    },
    [onSelectDate, selectedDate],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth <= 0 || isSettlingRef.current) return;

      const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      if (page === 1) return;

      // 먼저 가운데로 되돌린 뒤 주를 옮겨야 페이지가 튀지 않는다
      isSettlingRef.current = true;
      centerScroll(false);
      shiftWeek(page === 0 ? -1 : 1);
    },
    [centerScroll, pageWidth, shiftWeek],
  );

  const renderDay = (d: Dayjs) => {
    const dateStr = d.format('YYYY-MM-DD');
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const marking = markings[dateStr];
    const hasDot = !isFuture && marking?.totalGoals > 0;

    return (
      <TouchableOpacity
        key={dateStr}
        style={styles.dayCol}
        onPress={() => onSelectDate(dateStr)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayName,
            isSelected && styles.dayNameSelected,
            isFuture && styles.dayTextFuture,
          ]}
        >
          {d.format('dd')}
        </Text>

        <View
          style={[
            styles.dayCircle,
            isToday && !isSelected && styles.dayCircleToday,
            isSelected && styles.dayCircleSelected,
          ]}
        >
          <Text
            style={[
              styles.dayNum,
              isToday && styles.dayNumToday,
              isSelected && styles.dayNumSelected,
              isFuture && styles.dayTextFuture,
            ]}
          >
            {d.format('D')}
          </Text>
        </View>

        {hasDot ? (
          <View style={[styles.dot, { backgroundColor: getDayDotColor(marking?.dayStatus) }]} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <View style={styles.header}>
        {/* 월·주차를 한 버튼으로 (좌우 이동은 스와이프로 대체) */}
        <TouchableOpacity
          onPress={() => setMonthPickerVisible(true)}
          style={styles.monthPickerButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="월·주차 선택"
        >
          <Text style={styles.monthPickerText}>
            {monthLabel} · {weekLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.darkGreen} />
        </TouchableOpacity>
      </View>

      <View onLayout={handleLayout}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          contentOffset={{ x: pageWidth, y: 0 }}
          scrollEventThrottle={16}
        >
          {weekPages.map((days, index) => (
            <View
              key={`${days[0]?.format('YYYY-MM-DD')}-${index}`}
              style={[styles.weekPage, { width: pageWidth }]}
            >
              {days.map(renderDay)}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  monthPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  monthPickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGreen,
  },
  weekPage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  dayCol: {
    alignItems: 'center',
    width: 42,
  },
  dayName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing[2],
    fontWeight: '500',
  },
  dayNameSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  dayTextFuture: {
    color: colors.textMuted,
  },
  /** 선택 시에도 크기는 그대로 두고 채움만 바뀐다 (잔떨림 방지) */
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(222, 235, 242, 0.72)',
  },
  dayCircleToday: {
    borderColor: colors.primaryPale,
  },
  dayCircleSelected: {
    backgroundColor: colors.white,
    borderColor: colors.white,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.darkGreen,
  },
  dayNumToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  dayNumSelected: {
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
  },
});
