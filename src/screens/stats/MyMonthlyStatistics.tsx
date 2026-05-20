import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BaseCard from '../../components/ui/BaseCard';
import { colors, ds } from '../../design/recipes';
import type { MemberDetail, MyGoalDetail } from '../../services/statsService';
import { statisticsSharedStyles as sharedStyles } from './statisticsShared';
import MonthlySummaryCards from '../../components/ui/MonthlySummaryCards';
import RoutineStatusCard from '../../components/stats/RoutineStatusCard';

interface Props {
  monthLabel: string;
  _monthNum: number;
  canNext: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  _hasTeam: boolean;
  myRate: number | null;
  myPrevMonthRate: number | null;
  myWeeklyRates: { week: number; rate: number | null; startDate: string; endDate: string }[];
  myGoalDetails: MyGoalDetail[];
  myMember?: MemberDetail;
  _onEditReview: () => void;
  monthTotalDays: number;
}

export default function MyMonthlyStatistics({
  monthLabel,
  _monthNum,
  canNext,
  onPrevMonth,
  onNextMonth,
  _hasTeam,
  myRate,
  myPrevMonthRate,
  myWeeklyRates,
  myGoalDetails,
  myMember,
  _onEditReview,
  monthTotalDays,
}: Props) {
  const bestWeek = myWeeklyRates.reduce(
    (best, curr) => {
      if (curr.rate !== null && (!best || curr.rate > best.rate)) {
        return { week: curr.week, rate: curr.rate };
      }
      return best;
    },
    null as { week: number; rate: number } | null,
  );

  return (
    <View style={sharedStyles.container}>
      <View style={sharedStyles.selectorRow}>
        <TouchableOpacity style={sharedStyles.selectorBtn} onPress={onPrevMonth}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={sharedStyles.labelBox}>
          <Text style={sharedStyles.labelMain}>{monthLabel}</Text>
        </View>
        <TouchableOpacity
          style={[sharedStyles.selectorBtn, !canNext && { opacity: 0.4 }]}
          onPress={onNextMonth}
          disabled={!canNext}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={canNext ? colors.primaryLight : 'rgba(26,26,26,0.25)'}
          />
        </TouchableOpacity>
      </View>
      {/* 통계카드(3) */}
      <MonthlySummaryCards
        rate={myRate}
        prevRate={myPrevMonthRate}
        centerValue={bestWeek ? `${bestWeek.week}주차` : null}
        centerLabel="최고 주차"
        rateLabel="월간 평균"
      />

      {/* 주차별 달성률 차트 */}
      <View style={[sharedStyles.cardHeader, styles.cardHeader]}>
        <Text style={ds.cardTitle}>Weekly Achievement Rate</Text>
      </View>

      <BaseCard glassOnly style={styles.weeklyBarsContainer}>
        {myWeeklyRates.map((w) => (
          <View key={w.week} style={styles.weeklyBarRow}>
            <View style={styles.weeklyBarHeader}>
              <View style={styles.weeklyBarLabelWrap}>
                <Text style={styles.weeklyBarLabel}>{w.week}주차</Text>
                <Text style={styles.weeklyBarDate}>
                  ({w.startDate} - {w.endDate})
                </Text>
              </View>
              <Text style={[styles.weeklyBarValue, w.rate === null && { color: colors.textMuted }]}>
                {w.rate === null ? '-' : `${w.rate}%`}
              </Text>
            </View>
            <View style={styles.weeklyBarTrack}>
              {w.rate !== null && <View style={[styles.weeklyBarFill, { width: `${w.rate}%` }]} />}
            </View>
          </View>
        ))}
      </BaseCard>
      {/* 루틴 카드 */}
      <View style={sharedStyles.section}>
        {myGoalDetails.length > 0 && (
          <>
            <View style={[sharedStyles.cardHeader, styles.cardHeader]}>
              <Text style={ds.cardTitle}>Routine Status</Text>
              <Text style={sharedStyles.cardSubText}>통계 기준 총 일수: {monthTotalDays}일</Text>
            </View>
            <View>
              {myGoalDetails.map((goal) => (
                <RoutineStatusCard
                  key={goal.goalId}
                  name={goal.name}
                  frequency={goal.frequency}
                  targetCount={goal.targetCount}
                  _totalTarget={goal.totalTarget}
                  rate={goal.rate ?? 0}
                  isEnded={goal.isEnded}
                  done={goal.done}
                  pass={goal.pass}
                  fail={goal.fail}
                  variant="monthly"
                />
              ))}
            </View>
            {/* <>
              <View style={sharedStyles.dividerSection}>
                <Text style={sharedStyles.subLabel}>한마디</Text>
                <Text style={[sharedStyles.reviewText, !myMember?.hanmadi && styles.placeholder]}>
                  {myMember?.hanmadi || '이번 달의 다짐을 남겨보세요.'}
                </Text>
              </View>

              <View style={sharedStyles.dividerSection}>
                <Text style={sharedStyles.subLabel}>회고</Text>
                <Text style={[sharedStyles.reviewText, !myMember?.hoego && styles.placeholder]}>
                  {myMember?.hoego || '이번 달은 어떠셨나요? "내목표"에서 남겨보세요!'}
                </Text>
              </View>
            </> */}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    marginTop: 26,
  },
  weeklyBarsContainer: {
    gap: 16,
  },
  weeklyBarRow: {
    marginBottom: 14,
  },
  weeklyBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weeklyBarLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weeklyBarLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  weeklyBarDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  weeklyBarValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  weeklyBarTrack: {
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  weeklyBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  placeholder: {
    color: colors.textMuted,
  },
});
