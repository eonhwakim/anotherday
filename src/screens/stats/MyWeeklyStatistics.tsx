import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import { dayjsMax, dayjsMin } from '../../lib/statsUtils';

import type { WeeklyStatsResult } from '../../services/statsService';
import type { UserGoal } from '../../types/domain';
import { getWeekLabelParts, statisticsSharedStyles as sharedStyles } from './statisticsShared';

import BaseCard from '../../components/ui/BaseCard';
import RoutineStatusCard from '../../components/stats/RoutineStatusCard';

interface Props {
  userId?: string;
  weekStart: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  weeklyCheckins: WeeklyStatsResult['weeklyCheckins'];
  myWeeklyGoalPeriods: UserGoal[];
  goalNameMap: Map<string, string>;
}

export default function MyWeeklyStatistics({
  userId,
  weekStart,
  onPrevWeek,
  onNextWeek,
  weeklyCheckins,
  myWeeklyGoalPeriods,
  goalNameMap,
}: Props) {
  const weekLabelParts = useMemo(() => getWeekLabelParts(weekStart), [weekStart]);

  const myWeeklyGoals = useMemo(() => {
    if (!userId) return [];

    const weekEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');
    const activeGoals = myWeeklyGoalPeriods.filter((goal) => {
      if (goal.start_date && goal.start_date > weekEnd) return false;
      if (goal.end_date && goal.end_date < weekStart) return false;
      return true;
    });

    const myCheckins = weeklyCheckins.filter((checkin) => checkin.user_id === userId);

    return activeGoals
      .map((goal) => {
        const isDaily = goal.frequency === 'daily';
        let target = isDaily ? 7 : goal.target_count || 1;

        if (isDaily) {
          const effectiveStart = dayjsMax(dayjs(weekStart), dayjs(goal.start_date || weekStart));
          const effectiveEnd = dayjsMin(dayjs(weekEnd), dayjs(goal.end_date || weekEnd));
          if (effectiveStart.isAfter(effectiveEnd)) {
            target = 0;
          } else {
            target = effectiveEnd.diff(effectiveStart, 'day') + 1;
          }
        }

        const doneCount = myCheckins.filter(
          (checkin) => checkin.goal_id === goal.goal_id && checkin.status === 'done',
        ).length;
        const isAchieved = target > 0 && doneCount >= target;

        return {
          goalId: goal.goal_id,
          name: goalNameMap.get(goal.goal_id) ?? '루틴',
          target,
          doneCount,
          isAchieved,
          isDaily,
          isEnded: goal.is_active === false || (!!goal.end_date && goal.end_date <= weekEnd),
          startDate: goal.start_date ?? null,
          endDate: goal.end_date ?? null,
        };
      })
      .filter((goal) => goal.target > 0);
  }, [goalNameMap, myWeeklyGoalPeriods, userId, weekStart, weeklyCheckins]);

  const isAllClear = myWeeklyGoals.length > 0 && myWeeklyGoals.every((goal) => goal.isAchieved);
  const myTotalGoals = myWeeklyGoals.length;
  const myFailedGoals = myWeeklyGoals.filter((goal) => !goal.isAchieved).length;
  const isWeekEnded = dayjs(weekStart).endOf('isoWeek').isBefore(dayjs(), 'day');

  return (
    <View style={sharedStyles.container}>
      {/* ── 주 선택 ── */}
      <View style={sharedStyles.selectorRow}>
        <TouchableOpacity style={sharedStyles.selectorBtn} onPress={onPrevWeek}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={sharedStyles.labelBox}>
          <Text style={sharedStyles.labelMain}>{weekLabelParts.week}</Text>
          <Text style={sharedStyles.labelSub}>{weekLabelParts.range}</Text>
        </View>
        <TouchableOpacity style={sharedStyles.selectorBtn} onPress={onNextWeek}>
          <Ionicons name="chevron-forward" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {/* ── 집계 한마디 카드 ── */}
      <View>
        {isAllClear ? (
          <BaseCard
            glassOnly
            style={sharedStyles.allClearBox}
            contentStyle={sharedStyles.allClearBoxContent}
          >
            <Text style={sharedStyles.allClearEmoji}>🏆</Text>
            <Text style={sharedStyles.allClearTitle}>이번 주 올클리어 달성!</Text>
            <Text style={sharedStyles.allClearSub}>모든 루틴을 완벽하게 해냈어요</Text>
          </BaseCard>
        ) : null}
      </View>

      {/* 루틴 현황 카드 */}
      {myWeeklyGoals.length === 0 ? (
        <BaseCard glassOnly>
          <Text style={sharedStyles.emptySmall}>이번 주 진행 중인 루틴이 없어요</Text>
        </BaseCard>
      ) : (
        <View style={sharedStyles.section}>
          <BaseCard glassOnly>
            <View style={sharedStyles.cardHeader}>
              <View
                style={{
                  gap: 4,
                }}
              >
                <Text style={[sharedStyles.cardName]}>루틴 현황</Text>
                <Text style={sharedStyles.cardSubText}>총 루틴 {myTotalGoals}개</Text>
              </View>
              <View style={sharedStyles.scoreBox}>
                {isAllClear ? (
                  <View style={sharedStyles.badgeClear}>
                    <Text style={sharedStyles.badgeTextClear}>🏆 올클리어</Text>
                  </View>
                ) : !isWeekEnded ? (
                  <View style={sharedStyles.badgeProgress}>
                    <Text
                      style={[sharedStyles.badgeTextProgress, { color: 'rgba(26,26,26,0.45)' }]}
                    >
                      아직 진행중
                    </Text>
                  </View>
                ) : (
                  <View style={sharedStyles.badgeProgress}>
                    <Text style={sharedStyles.badgeTextProgress}>
                      <Text style={{ color: '#15803d' }}>
                        {myTotalGoals - myFailedGoals}개 완료
                      </Text>
                      <Text style={{ color: 'rgba(26,26,26,0.2)' }}> | </Text>
                      <Text style={{ color: '#EF4444' }}>{myFailedGoals}개 미달</Text>
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {/* 목표리스트 */}
            {myWeeklyGoals.map((goal) => (
              <RoutineStatusCard
                key={goal.goalId}
                name={goal.name}
                frequency={goal.isDaily ? 'daily' : 'weekly_count'}
                targetCount={goal.target}
                rate={goal.target > 0 ? (goal.doneCount / goal.target) * 100 : 0}
                isAchieved={goal.isAchieved}
                isEnded={goal.isEnded}
                startDate={goal.startDate}
                endDate={goal.endDate}
                doneCount={goal.doneCount}
                target={goal.target}
                variant="weekly"
              />
            ))}
          </BaseCard>
        </View>
      )}
    </View>
  );
}
