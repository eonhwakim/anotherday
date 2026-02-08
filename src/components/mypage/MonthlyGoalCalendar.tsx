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
  yearMonth: string; // 'YYYY-MM'
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
 * 마이페이지 월간 캘린더 (3D Clay 스타일)
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

  /** 내 활성 목표 ID 목록 */
  const myGoalIds = useMemo(
    () => (myGoals || []).map((ug) => ug.goal_id),
    [myGoals],
  );

  /** 내 활성 목표 이름 (첫 번째) */
  const primaryGoalName = useMemo(() => {
    if (myGoalIds.length === 0) return null;
    return (teamGoals || []).find((g) => g.id === myGoalIds[0])?.name ?? null;
  }, [myGoalIds, teamGoals]);

  /** 캘린더 그리드 생성 */
  const weeks = useMemo(() => {
    const first = dayjs(`${yearMonth}-01`);
    const daysInMonth = first.daysInMonth();
    const startDow = first.day(); // 0=일요일

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

  /** 특정 날짜의 체크인 상태 계산 */
  const getDayStatus = (dateStr: string) => {
    const dayCheckins = (checkins || []).filter((c) => c.date === dateStr);
    const doneGoalIds = dayCheckins.map((c) => c.goal_id);
    const completed = myGoalIds.filter((id) =>
      doneGoalIds.includes(id),
    ).length;
    const total = myGoalIds.length;

    // 패스 여부 확인
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
            size={20}
            color={COLORS.text}
          />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {dayjs(`${yearMonth}-01`).format('YYYY년 M월')}
        </Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.arrowBtn}>
          <Ionicons
            name="chevron-forward"
            size={20}
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
              i === 6 && { color: COLORS.primary },
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
                {/* 날짜 */}
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberToday,
                    isFuture && styles.dayNumberFuture,
                    di === 0 && { color: COLORS.error },
                    di === 6 && { color: COLORS.primary },
                    allDone && { color: '#fff' }, // 완료된 날짜는 흰색 텍스트
                  ]}
                >
                  {day}
                </Text>

                {/* 목표 이름 (작은 텍스트) -> 닉네임 + 목표 스티커 */}
                {!isFuture && primaryGoalName && (
                  <View style={[
                    styles.sticker,
                    allDone && styles.stickerDone
                  ]}>
                    <Text style={[
                      styles.stickerText,
                      allDone && { color: '#fff' }
                    ]} numberOfLines={1}>
                      {nickname}
                    </Text>
                    <Text style={[
                      styles.stickerGoal,
                      allDone && { color: 'rgba(255,255,255,0.8)' }
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
                        size={12}
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
                    allDone && { color: 'rgba(255,255,255,0.8)' }
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
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 32, // 더 둥글게
    marginBottom: 20,
    // Clay Shadow
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  // ── 요일 ──
  dowRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingVertical: 6,
  },
  // ── 주 / 날짜 셀 ──
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: 'center',
    paddingTop: 6,
    borderRadius: 18,
    marginHorizontal: 2,
    backgroundColor: '#F7FAFC', // 기본 배경 (연한 회색)
  },
  dayCellToday: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dayCellAllDone: {
    backgroundColor: COLORS.success, // 성공 시 진한 색상
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  dayCellPartial: {
    backgroundColor: COLORS.accentYellow,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayNumberToday: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  dayNumberFuture: {
    opacity: 0.3,
  },
  sticker: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    width: '94%',
    alignItems: 'center',
  },
  stickerDone: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stickerText: {
    fontSize: 9,
    color: COLORS.text,
    fontWeight: '800',
  },
  stickerGoal: {
    fontSize: 8,
    color: COLORS.text,
    fontWeight: '600',
    opacity: 0.8,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  partialDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E0',
  },
  passIndicator: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  moreGoals: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── 범례 ──
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
