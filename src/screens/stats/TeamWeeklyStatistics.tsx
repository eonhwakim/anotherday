import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import WeeklyStatusChart, {
  averageWeeklyStatus,
  buildWeeklyStatusDays,
} from '../../components/stats/WeeklyStatusChart';
import type { UserGoal } from '../../types/domain';
import { getWeekLabelParts, statisticsSharedStyles as sharedStyles } from './statisticsShared';

import BaseCard from '../../components/ui/BaseCard';
import TeamMemberCard from '../../components/stats/TeamMemberCard';
import type { WeeklyStatsResult, WeeklyTeamMember } from '../../services/statsService';

interface Props {
  _userId?: string;
  myNickname?: string;
  _myProfileImageUrl?: string | null;
  weekStart: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  chartAnimationKey: number;
  weeklyTeamData: WeeklyTeamMember[];
  weeklyCheckins: WeeklyStatsResult['weeklyCheckins'];
  _myWeeklyGoalPeriods: UserGoal[];
  _goalNameMap: Map<string, string>;
  hasTeam: boolean;
}

export default function TeamWeeklyStatistics({
  _userId,
  myNickname,
  _myProfileImageUrl,
  weekStart,
  onPrevWeek,
  onNextWeek,
  chartAnimationKey,
  weeklyTeamData,
  weeklyCheckins,
  _myWeeklyGoalPeriods,
  _goalNameMap,
  hasTeam,
}: Props) {
  const weekLabelParts = useMemo(() => getWeekLabelParts(weekStart), [weekStart]);
  const isWeekEnded = dayjs(weekStart).endOf('isoWeek').isBefore(dayjs(), 'day');
  const teamWeekdayRows = useMemo(() => {
    const rows = weeklyTeamData
      .filter((member) => member.totalGoals > 0)
      .map((member) => {
        const days = buildWeeklyStatusDays({
          weekStart,
          goals: member.goals.map((goal) => ({
            goalId: goal.goalId,
            startDate: goal.startDate,
            endDate: goal.endDate,
          })),
          checkins: weeklyCheckins.filter((checkin) => checkin.user_id === member.userId),
        });

        return {
          id: member.userId,
          name: member.isMe && myNickname ? `${myNickname} (나)` : member.nickname,
          profileImageUrl: member.profileImageUrl ?? null,
          isMe: member.isMe,
          days,
          rate: averageWeeklyStatus(days),
        };
      });

    return rows.sort((a, b) => {
      const rateA = a.rate ?? -1;
      const rateB = b.rate ?? -1;
      if (rateB !== rateA) return rateB - rateA;
      if (a.isMe && !b.isMe) return -1;
      if (!a.isMe && b.isMe) return 1;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [
    myNickname,
    weekStart,
    weeklyCheckins,
    weeklyTeamData,
  ]);

  const memberRanks = useMemo(() => {
    const ranks: number[] = [];
    let currentRank = 1;
    
    for (let i = 0; i < weeklyTeamData.length; i++) {
      if (i > 0) {
        const prev = weeklyTeamData[i - 1];
        const curr = weeklyTeamData[i];
        
        const isSameRank = 
          prev.isAllClear === curr.isAllClear &&
          prev.failedGoals === curr.failedGoals &&
          prev.doneCount === curr.doneCount;
          
        if (!isSameRank) {
          currentRank = i + 1;
        }
      }
      ranks.push(currentRank);
    }
    return ranks;
  }, [weeklyTeamData]);

  return (
    <View style={sharedStyles.container}>
      {/* 날짜 선택 */}
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
      {/* 요일달성률 */}
      {hasTeam && (
        <View style={sharedStyles.section}>
          <BaseCard glassOnly>
            {teamWeekdayRows.length === 0 ? (
              <Text style={sharedStyles.emptySmall}>요일별 달성률을 계산할 데이터가 없습니다</Text>
            ) : (
              <WeeklyStatusChart
                variant="members"
                title="팀원별 요일 달성률"
                members={teamWeekdayRows}
                animationKey={chartAnimationKey}
              />
            )}
          </BaseCard>
        </View>
      )}
      {/* 팀원 주간 루틴 */}
      {hasTeam && (
        <View style={sharedStyles.section}>
          <BaseCard glassOnly>
            {weeklyTeamData.length === 0 ? (
              <Text style={sharedStyles.emptySmall}>팀원 데이터가 없습니다</Text>
            ) : (
              <>
                <View style={sharedStyles.cardHeader}>
                  <Text style={sharedStyles.cardName}>팀원들의 주간 현황</Text>
                </View>
                {weeklyTeamData.map((member, index) => (
                  <TeamMemberCard
                    key={member.userId}
                    member={member}
                    rank={memberRanks[index]}
                    isWeekEnded={isWeekEnded}
                    variant="weekly"
                  />
                ))}
              </>
            )}
          </BaseCard>
        </View>
      )}
    </View>
  );
}
