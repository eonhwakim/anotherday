import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import type { UserGoal } from '../../types/domain';
import { getWeekLabelParts, statisticsSharedStyles as sharedStyles } from './statisticsShared';

import BaseCard from '../../components/ui/BaseCard';
import TeamMemberCard from '../../components/stats/TeamMemberCard';
import type { WeeklyTeamMember } from '../../services/statsService';

interface Props {
  _userId?: string;
  myNickname?: string;
  _myProfileImageUrl?: string | null;
  weekStart: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  weeklyTeamData: WeeklyTeamMember[];
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
  weeklyTeamData,
  _myWeeklyGoalPeriods,
  _goalNameMap,
  hasTeam,
}: Props) {
  const weekLabelParts = useMemo(() => getWeekLabelParts(weekStart), [weekStart]);
  const isWeekEnded = dayjs(weekStart).endOf('isoWeek').isBefore(dayjs(), 'day');

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
