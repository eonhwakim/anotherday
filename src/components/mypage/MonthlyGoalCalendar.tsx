import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, UserGoal, Checkin } from '../../types/domain';
import { colors } from '../../design/tokens';
import dayjs from '../../lib/dayjs';

interface MonthlyGoalCalendarProps {
  yearMonth: string;
  nickname: string;
  teamGoals: Goal[];
  myGoals: UserGoal[];
  checkins: Checkin[];
  onDayPress: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

// 주 단위: 월~일 (ISO 8601 기준)
const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 마이페이지 월간 캘린더 (Neo Glass Style)
 */
export default function MonthlyGoalCalendar({
  yearMonth,
  nickname,
  teamGoals = [],
  myGoals = [],
  checkins = [],
  onDayPress,
  onPrevMonth,
  onNextMonth,
}: MonthlyGoalCalendarProps) {
  const today = dayjs().format('YYYY-MM-DD');

  /** 특정 날짜에 유효한 목표 ID 목록 (start_date ~ end_date 범위) */
  const getActiveGoalIdsForDate = (dateStr: string): string[] => {
    return (myGoals || [])
      .filter((ug) => {
        if (ug.is_active === false && dateStr >= today) return false;
        if (ug.start_date && dateStr < ug.start_date) return false;
        if (ug.end_date && dateStr > ug.end_date) return false;
        return true;
      })
      .map((ug) => ug.goal_id);
  };

  /** 전체 목표 ID (범례, 요약용) */
  const allMyGoalIds = useMemo(() => (myGoals || []).map((ug) => ug.goal_id), [myGoals]);

  const primaryGoalName = useMemo(() => {
    if (allMyGoalIds.length === 0) return null;
    return (teamGoals || []).find((g) => g.id === allMyGoalIds[0])?.name ?? null;
  }, [allMyGoalIds, teamGoals]);

  const weeks = useMemo(() => {
    const first = dayjs(`${yearMonth}-01`);
    const daysInMonth = first.daysInMonth();
    // 월요일=0, 일요일=6 (ISO 8601 기준)
    const startDow = (first.day() + 6) % 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [yearMonth]);

  const getDayStatus = (dateStr: string) => {
    const activeIds = getActiveGoalIdsForDate(dateStr);
    const dayCheckins = (checkins || []).filter((c) => c.date === dateStr);

    const doneCount = dayCheckins.filter((c) => c.status === 'done').length;
    const explicitPassCount = dayCheckins.filter((c) => c.status === 'pass').length;

    // 자동 패스: 주N회 목표 중 체크인 없는 것 (과거 날짜만)
    let autoPassCount = 0;
    if (dateStr < today) {
      activeIds.forEach((goalId) => {
        const ug = (myGoals || []).find((g) => g.goal_id === goalId);
        if (ug?.frequency !== 'weekly_count') return;
        const hasCheckin = dayCheckins.some((c) => c.goal_id === goalId);
        if (!hasCheckin) autoPassCount++;
      });
    }

    const totalPassCount = explicitPassCount + autoPassCount;
    const completed = doneCount + totalPassCount;
    const total = activeIds.length;
    const hasPass = totalPassCount > 0;

    // 미달: 매일 목표 중 체크인 없는 것 (과거 날짜만)
    let missed = 0;
    if (dateStr < today) {
      activeIds.forEach((goalId) => {
        const ug = (myGoals || []).find((g) => g.goal_id === goalId);
        if (ug?.frequency === 'weekly_count') return;
        const hasCheckin = dayCheckins.some((c) => c.goal_id === goalId);
        if (!hasCheckin) missed++;
      });
    }

    return {
      completed,
      total,
      allDone: total > 0 && completed >= total,
      hasPass,
      activeIds,
      missed,
    };
  };

  return (
    <View style={styles.card}>
      {/* 헤더: 월 이동 */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{dayjs(`${yearMonth}-01`).format('YYYY년 M월')}</Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.dowRow}>
        {DOW_LABELS.map((label, i) => (
          <Text
            key={label}
            style={[
              styles.dowLabel,
              i === 5 && { color: colors.primaryLight },
              i === 6 && { color: colors.error },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* 주별 그리드 */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={`e-${di}`} style={styles.dayCell} />;
            }

            const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const isFuture = dayjs(dateStr).isAfter(dayjs(), 'day');
            const { completed, total, allDone, hasPass, activeIds, missed } = getDayStatus(dateStr);
            const someDone = completed > 0;
            const hasGoals = total > 0; // 해당 날짜에 유효 목표가 있는지

            // 해당 날짜의 첫 번째 유효 목표 이름
            const dayPrimaryGoalName = hasGoals
              ? ((teamGoals || []).find((g) => g.id === activeIds[0])?.name ?? null)
              : null;

            return (
              <TouchableOpacity
                key={`d-${di}`}
                style={[
                  styles.dayCell,
                  isToday && styles.dayCellToday,
                  allDone && hasGoals && styles.dayCellAllDone,
                  !allDone && someDone && styles.dayCellPartial,
                ]}
                onPress={() => onDayPress(dateStr)}
                disabled={isFuture}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberToday,
                    isFuture && styles.dayNumberFuture,
                    di === 5 && { color: colors.primaryLight },
                    di === 6 && { color: colors.error },
                    allDone && hasGoals && { color: '#4ADE80' },
                  ]}
                >
                  {day}
                </Text>

                {/* 닉네임 + 목표 스티커 (해당 날짜에 유효 목표가 있을 때만) */}
                {!isFuture && hasGoals && dayPrimaryGoalName && (
                  <View style={[styles.sticker, allDone && styles.stickerDone]}>
                    <Text
                      style={[styles.stickerText, allDone && { color: '#4ADE80' }]}
                      numberOfLines={1}
                    >
                      {nickname}
                    </Text>
                    <Text
                      style={[styles.stickerGoal, allDone && { color: 'rgba(74, 222, 128, 0.65)' }]}
                      numberOfLines={1}
                    >
                      {dayPrimaryGoalName}
                    </Text>
                  </View>
                )}

                {/* 상태 인디케이터 (유효 목표가 있을 때만) */}
                {!isFuture && hasGoals && (
                  <View style={styles.indicators}>
                    {allDone ? (
                      <Ionicons name="checkmark-circle" size={11} color="#4ADE80" />
                    ) : someDone ? (
                      <View style={styles.partialDot} />
                    ) : (
                      dateStr === today && <View style={styles.pendingDot} />
                    )}

                    {missed > 0 && <View style={styles.missedDot} />}

                    {hasPass && <Text style={styles.passIndicator}>P</Text>}
                  </View>
                )}

                {/* 추가 목표 수 (해당 날짜 유효 목표 기준) */}
                {!isFuture && activeIds.length > 1 && (
                  <Text
                    style={[styles.moreGoals, allDone && { color: 'rgba(74, 222, 128, 0.65)' }]}
                  >
                    +{activeIds.length - 1}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4ADE80' }]} />
          <Text style={styles.legendText}>완료</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>패스</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>미달</Text>
        </View>
      </View>
    </View>
  );
}

const CELL_HEIGHT = 72;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.15)',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.50)',
    paddingVertical: 6,
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: 'center',
    paddingTop: 6,
    borderRadius: 4,
    marginHorizontal: 1.5,
    backgroundColor: '#FFFAF7',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 61, 0.08)',
  },
  dayCellToday: {
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 61, 0.25)',
  },
  dayCellAllDone: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  dayCellPartial: {
    backgroundColor: 'rgba(255, 107, 61, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.75)',
  },
  dayNumberToday: {
    color: '#FF6B3D',
    fontWeight: '900',
  },
  dayNumberFuture: {
    opacity: 0.2,
  },
  sticker: {
    marginTop: 3,
    backgroundColor: 'rgba(255, 107, 61, 0.04)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    width: '92%',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 61, 0.10)',
  },
  stickerDone: {
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    borderColor: 'rgba(74, 222, 128, 0.18)',
  },
  stickerText: {
    fontSize: 8,
    color: 'rgba(26,26,26,0.50)',
    fontWeight: '700',
  },
  stickerGoal: {
    fontSize: 7,
    color: 'rgba(26,26,26,0.30)',
    fontWeight: '600',
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  partialDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(74, 222, 128, 0.40)',
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(26,26,26,0.25)',
  },
  missedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.error,
  },
  passIndicator: {
    fontSize: 8,
    fontWeight: '800',
    color: '#E8960A',
    backgroundColor: 'rgba(255,181,71,0.15)',
    paddingHorizontal: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  moreGoals: {
    fontSize: 8,
    color: 'rgba(26,26,26,0.30)',
    marginTop: 2,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 61, 0.08)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.50)',
    fontWeight: '600',
  },
});
