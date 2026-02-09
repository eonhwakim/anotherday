import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, UserGoal, Checkin } from '../../types/domain';
import { COLORS } from '../../constants/defaults';
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

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

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

  const myGoalIds = useMemo(
    () => (myGoals || []).map((ug) => ug.goal_id),
    [myGoals],
  );

  const primaryGoalName = useMemo(() => {
    if (myGoalIds.length === 0) return null;
    return (teamGoals || []).find((g) => g.id === myGoalIds[0])?.name ?? null;
  }, [myGoalIds, teamGoals]);

  const weeks = useMemo(() => {
    const first = dayjs(`${yearMonth}-01`);
    const daysInMonth = first.daysInMonth();
    const startDow = first.day();

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
    const dayCheckins = (checkins || []).filter((c) => c.date === dateStr);
    const doneGoalIds = dayCheckins.map((c) => c.goal_id);
    const completed = myGoalIds.filter((id) =>
      doneGoalIds.includes(id),
    ).length;
    const total = myGoalIds.length;

    const hasPass = dayCheckins.some((c) =>
      c.memo?.startsWith('[패스]'),
    );

    return { completed, total, allDone: total > 0 && completed >= total, hasPass };
  };

  return (
    <View style={styles.card}>
      {/* 헤더: 월 이동 */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.arrowBtn}>
          <Ionicons
            name="chevron-back"
            size={18}
            color={COLORS.text}
          />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {dayjs(`${yearMonth}-01`).format('YYYY년 M월')}
        </Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.arrowBtn}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.text}
          />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.dowRow}>
        {DOW_LABELS.map((label, i) => (
          <Text
            key={label}
            style={[
              styles.dowLabel,
              i === 0 && { color: COLORS.error },
              i === 6 && { color: COLORS.primaryLight },
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
            const { completed, total, allDone, hasPass } =
              getDayStatus(dateStr);
            const someDone = completed > 0;

            return (
              <TouchableOpacity
                key={`d-${di}`}
                style={[
                  styles.dayCell,
                  isToday && styles.dayCellToday,
                  allDone && styles.dayCellAllDone,
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
                    di === 0 && { color: COLORS.error },
                    di === 6 && { color: COLORS.primaryLight },
                    allDone && { color: '#fff' },
                  ]}
                >
                  {day}
                </Text>

                {/* 닉네임 + 목표 스티커 */}
                {!isFuture && primaryGoalName && (
                  <View style={[
                    styles.sticker,
                    allDone && styles.stickerDone
                  ]}>
                    <Text style={[
                      styles.stickerText,
                      allDone && { color: 'rgba(255,255,255,0.9)' }
                    ]} numberOfLines={1}>
                      {nickname}
                    </Text>
                    <Text style={[
                      styles.stickerGoal,
                      allDone && { color: 'rgba(255,255,255,0.7)' }
                    ]} numberOfLines={1}>
                      {primaryGoalName}
                    </Text>
                  </View>
                )}

                {/* 상태 인디케이터 */}
                {!isFuture && total > 0 && (
                  <View style={styles.indicators}>
                    {allDone ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={11}
                        color="#fff"
                      />
                    ) : someDone ? (
                      <View style={styles.partialDot} />
                    ) : (
                      dateStr <= today && (
                        <View style={styles.pendingDot} />
                      )
                    )}
                    {hasPass && (
                      <Text style={styles.passIndicator}>P</Text>
                    )}
                  </View>
                )}

                {/* 추가 목표 수 */}
                {!isFuture && myGoalIds.length > 1 && (
                  <Text style={[
                    styles.moreGoals,
                    allDone && { color: 'rgba(255,255,255,0.7)' }
                  ]}>
                    +{myGoalIds.length - 1}
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
          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>성공</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.accentYellow }]} />
          <Text style={styles.legendText}>진행중</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>패스</Text>
        </View>
      </View>
    </View>
  );
}

const CELL_HEIGHT = 72;

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0,245,255,0.04)',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,255,0.14)',
    borderTopColor: 'rgba(255,105,180,0.10)',
    borderBottomColor: 'rgba(162,155,254,0.14)',
    shadowColor: 'rgba(0,245,255,0.5)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: 'rgba(162,155,254,0.06)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.16)',
    shadowColor: 'rgba(162,155,254,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
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
    color: COLORS.textSecondary,
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
    backgroundColor: 'rgba(162,155,254,0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(162,155,254,0.08)',
  },
  dayCellToday: {
    backgroundColor: 'rgba(0,245,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,255,0.30)',
    shadowColor: 'rgba(0,245,255,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  dayCellAllDone: {
    backgroundColor: 'rgba(0,255,178,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,178,0.30)',
    borderTopColor: 'rgba(0,245,255,0.25)',
    shadowColor: 'rgba(0,255,178,0.6)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  dayCellPartial: {
    backgroundColor: 'rgba(255,217,61,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,217,61,0.18)',
    shadowColor: 'rgba(255,217,61,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayNumberToday: {
    color: COLORS.secondary,
    fontWeight: '900',
  },
  dayNumberFuture: {
    opacity: 0.2,
  },
  sticker: {
    marginTop: 3,
    backgroundColor: 'rgba(162,155,254,0.06)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    width: '92%',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(162,155,254,0.12)',
  },
  stickerDone: {
    backgroundColor: 'rgba(0,245,255,0.12)',
    borderColor: 'rgba(0,245,255,0.22)',
  },
  stickerText: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  stickerGoal: {
    fontSize: 7,
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.accentYellow,
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.textMuted,
  },
  passIndicator: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  moreGoals: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
