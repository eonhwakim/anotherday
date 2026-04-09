import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';
import { ds, radius, typography } from '../../design/recipes';
import { statisticsSharedStyles as sharedStyles } from '../../screens/stats/statisticsShared';
import RoutineStatusCard from './RoutineStatusCard';
import type { WeeklyTeamMember, MemberDetail } from '../../services/statsService';

interface Props {
  member: WeeklyTeamMember | MemberDetail;
  rank: number;
  isWeekEnded?: boolean;
  variant: 'weekly' | 'monthly';
  monthTotalDays?: number;
}

export default function TeamMemberCard({
  member,
  rank,
  isWeekEnded,
  variant,
  monthTotalDays,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const isMonthly = variant === 'monthly';
  const monthlyMember = member as MemberDetail;
  const weeklyMember = member as WeeklyTeamMember;

  // const validRate = isMonthly ? (monthlyMember.rate ?? 0) : 0;
  const totalGoals = isMonthly ? monthlyMember.goals.length : weeklyMember.totalGoals;

  return (
    <View style={sharedStyles.container}>
      <View
        style={[
          isMonthly ? styles.headerRowMonthly : styles.headerRow,
          { justifyContent: 'space-between' },
        ]}
      >
        {/* 랭킹, 이름, 총루틴 - 왼쪽 */}
        <View style={styles.nameRow}>
          <View style={sharedStyles.teamMemberRank}>
            <Text style={sharedStyles.teamMemberRankText}>
              {isMonthly && monthlyMember.rate === null
                ? rank
                : rank === 1
                  ? '🥇'
                  : rank === 2
                    ? '🥈'
                    : rank === 3
                      ? '🥉'
                      : rank}
            </Text>
          </View>
          <Text style={[styles.teamMemberName, member.isMe && styles.teamMemberNameMe]}>
            {member.nickname}
            {member.isMe ? ' (나)' : ''}
          </Text>
          {!isMonthly && <Text style={sharedStyles.cardSubText}>총 루틴 {totalGoals}개</Text>}
        </View>
        {/* 점수 - 오른쪽 끝 */}
        <View style={sharedStyles.scoreBox}>
          {isMonthly ? (
            monthlyMember.rate === null ? (
              <Text style={styles.rateEmpty}>집계 중</Text>
            ) : (
              <Text style={[styles.rateMedium, { color: '#1A1A1A' }]}>
                {monthlyMember.rate}%{monthlyMember.rate === 100 ? ' 🏆' : ''}
              </Text>
            )
          ) : weeklyMember.totalGoals === 0 ? (
            <Text style={sharedStyles.cardSubText}>루틴 없음</Text>
          ) : weeklyMember.isAllClear ? (
            <View style={sharedStyles.badgeClear}>
              <Text style={sharedStyles.badgeTextClear}>🏆 올클리어</Text>
            </View>
          ) : !isWeekEnded ? (
            <View style={sharedStyles.badgeProgress}>
              <Text style={[sharedStyles.badgeTextProgress, { color: 'rgba(26,26,26,0.45)' }]}>
                아직 진행중
              </Text>
            </View>
          ) : (
            <View style={sharedStyles.badgeProgress}>
              <Text style={sharedStyles.badgeTextProgress}>
                <Text style={{ color: '#15803d' }}>
                  {weeklyMember.totalGoals - weeklyMember.failedGoals}개 완료
                </Text>
                <Text style={{ color: 'rgba(26,26,26,0.2)' }}> | </Text>
                <Text style={{ color: '#EF4444' }}>{weeklyMember.failedGoals}개 미달</Text>
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 월간 차트 */}
      {/* {isMonthly && (
        <View style={styles.chartBarBg}>
          <View
            style={[
              styles.chartBarFill,
              { width: `${validRate}%` },
              member.isMe
                ? { backgroundColor: colors.primary }
                : { backgroundColor: 'rgba(26,26,26,0.15)' },
            ]}
          />
        </View>
      )} */}

      {/* 루틴별 상세 접기/펼치기 */}
      {member.goals.length > 0 && (
        <View style={sharedStyles.section}>
          <TouchableOpacity
            style={isMonthly ? styles.expandButtonMonthly : styles.expandButton}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.6}
          >
            <View
              style={isMonthly ? { flexDirection: 'column', alignItems: 'flex-start' } : undefined}
            >
              <Text style={isMonthly ? sharedStyles.subLabel : styles.expandText}>
                {isMonthly ? '루틴' : '루틴별 상세'}
              </Text>
              {isMonthly && monthTotalDays !== undefined && (
                <Text style={sharedStyles.cardSubText}>통계 기준 총 일수: {monthTotalDays}일</Text>
              )}
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
              style={isMonthly ? { marginBottom: 8 } : {}}
            />
          </TouchableOpacity>

          {expanded && (
            <View style={styles.goalList}>
              {isMonthly ? (
                <View style={{ gap: 8 }}>
                  {monthlyMember.goals.map((goal) => (
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
              ) : (
                weeklyMember.goals.map((goal) => (
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
                ))
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRowMonthly: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  teamMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  teamMemberNameMe: {
    color: '#FF6B3D',
    fontWeight: '800',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingLeft: 26,
  },
  expandButtonMonthly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  expandText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  goalList: {
    marginTop: 8,
  },
  rateMedium: {
    fontSize: 18,
    fontWeight: '800',
  },
  rateEmpty: {
    ...typography.label,
    color: colors.textFaint,
    fontWeight: '500',
    textTransform: 'none',
  },
  chartBarBg: {
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 22,
    marginBottom: 16,
    marginTop: 4,
  },
  chartBarFill: { height: '100%', borderRadius: 6 },
  goalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  goalChip: {
    ...ds.rowCenter,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexWrap: 'wrap',
    gap: 4,
  },
  goalChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
  },
  goalChipFreq: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  goalEndedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surface,
  },
  goalEndedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
