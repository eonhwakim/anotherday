import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, ds, numericFont, radius } from '../../design/recipes';
import { statisticsSharedStyles as sharedStyles } from '../../screens/stats/statisticsShared';
import RoutineStatusCard from './RoutineStatusCard';
import type { WeeklyTeamMember, MemberDetail } from '../../services/statsService';

interface Props {
  member: WeeklyTeamMember | MemberDetail;
  rank: number;
  isWeekEnded?: boolean;
  variant: 'weekly' | 'monthly';
  monthTotalDays?: number;
  /** 위쪽 구분선 (목록 첫 항목은 false) */
  showDivider?: boolean;
}

/** 완료 / 패스 / 미달을 앱 공통 색 점 범례로 */
function CountDots({ done, pass, fail }: { done: number; pass: number; fail: number }) {
  const items = [
    done > 0 ? { key: 'done', color: colors.softGreen, value: done } : null,
    pass > 0 ? { key: 'pass', color: colors.softYellow, value: pass } : null,
    fail > 0 ? { key: 'fail', color: colors.softCoral, value: fail } : null,
  ].filter(Boolean) as { key: string; color: string; value: number }[];

  if (items.length === 0) return null;

  return (
    <View style={styles.countRow}>
      {items.map((item) => (
        <View key={item.key} style={styles.countItem}>
          <View style={[styles.countDot, { backgroundColor: item.color }]} />
          <Text style={styles.countValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function rankLabel(rank: number, hideMedal: boolean) {
  if (hideMedal) return String(rank);
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}

export default function TeamMemberCard({
  member,
  rank,
  isWeekEnded,
  variant,
  monthTotalDays,
  showDivider = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const isMonthly = variant === 'monthly';
  const monthlyMember = member as MemberDetail;
  const weeklyMember = member as WeeklyTeamMember;

  // 월간: 한 달치 완료/패스/미달을 합산해 한 줄로 보여준다
  const monthlyTotals = React.useMemo(() => {
    if (!isMonthly) return { done: 0, pass: 0, fail: 0 };
    return monthlyMember.goals.reduce(
      (acc, goal) => ({
        done: acc.done + (goal.done ?? 0),
        pass: acc.pass + (goal.pass ?? 0),
        fail: acc.fail + (goal.fail ?? 0),
      }),
      { done: 0, pass: 0, fail: 0 },
    );
  }, [isMonthly, monthlyMember.goals]);

  const goalCount = isMonthly ? monthlyMember.goals.length : weeklyMember.totalGoals;
  const rate = isMonthly ? monthlyMember.rate : null;

  return (
    <View style={[styles.wrap, showDivider && styles.wrapDivided]}>
      {/* 헤더 — 순위 · 이름 · 결과 */}
      <View style={styles.headerRow}>
        <View style={sharedStyles.teamMemberRank}>
          <Text style={sharedStyles.teamMemberRankText}>
            {rankLabel(rank, isMonthly && rate === null)}
          </Text>
        </View>

        <View style={styles.nameGroup}>
          <Text
            style={[styles.name, member.isMe && styles.nameMe]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {member.nickname}
            {member.isMe ? ' (나)' : ''}
          </Text>
          {/* 주간은 총 루틴 수를 이름 옆에 나란히 */}
          {!isMonthly ? <Text style={styles.metaText}>루틴 {goalCount}개</Text> : null}
        </View>

        {isMonthly ? (
          rate === null ? (
            <Text style={styles.rateEmpty}>집계 중</Text>
          ) : (
            <Text style={styles.rate}>
              {rate}%{rate === 100 ? ' 🏆' : ''}
            </Text>
          )
        ) : weeklyMember.totalGoals === 0 ? (
          <Text style={styles.rateEmpty}>루틴 없음</Text>
        ) : weeklyMember.isAllClear ? (
          <View style={sharedStyles.badgeClear}>
            <Text style={sharedStyles.badgeTextClear}>🏆 올클리어</Text>
          </View>
        ) : !isWeekEnded ? (
          <Text style={styles.rateEmpty}>진행 중</Text>
        ) : (
          <CountDots
            done={weeklyMember.totalGoals - weeklyMember.failedGoals}
            pass={0}
            fail={weeklyMember.failedGoals}
          />
        )}
      </View>

      {/* 요약 — 월간은 달성률 바 + 합계, 주간은 루틴 수 */}
      {isMonthly ? (
        <View style={styles.summary}>
          <View style={styles.rateTrack}>
            <View
              style={[
                styles.rateFill,
                member.isMe ? styles.rateFillMe : null,
                { width: `${Math.min(Math.max(rate ?? 0, 0), 100)}%` },
              ]}
            />
          </View>
          <View style={styles.summaryMetaRow}>
            <Text style={styles.metaText}>
              루틴 {goalCount}개{monthTotalDays !== undefined ? ` · ${monthTotalDays}일 기준` : ''}
            </Text>
            <CountDots
              done={monthlyTotals.done}
              pass={monthlyTotals.pass}
              fail={monthlyTotals.fail}
            />
          </View>
        </View>
      ) : null}

      {/* 루틴별 상세 */}
      {member.goals.length > 0 ? (
        <>
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={expanded ? '루틴 상세 접기' : '루틴 상세 보기'}
          >
            <Text style={styles.expandText}>루틴 {expanded ? '접기' : '보기'}</Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {expanded ? (
            <View style={styles.goalList}>
              {isMonthly
                ? monthlyMember.goals.map((goal, index) => (
                    <RoutineStatusCard
                      key={goal.goalId}
                      showDivider={index > 0}
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
                  ))
                : weeklyMember.goals.map((goal, index) => (
                    <RoutineStatusCard
                      key={goal.goalId}
                      showDivider={index > 0}
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
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 14,
  },
  wrapDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  headerRow: {
    ...ds.rowCenter,
    gap: 10,
  },
  nameGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
    color: colors.text,
  },
  nameMe: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  rate: {
    ...numericFont,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  rateEmpty: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  summary: {
    marginTop: 10,
    gap: 7,
  },
  rateTrack: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(26, 26, 26, 0.18)',
  },
  rateFillMe: {
    backgroundColor: colors.primaryWarm,
  },
  summaryMetaRow: {
    ...ds.rowBetween,
    gap: 10,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  countValue: {
    ...numericFont,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingTop: 10,
    paddingBottom: 2,
  },
  expandText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  goalList: {
    marginTop: 4,
    paddingLeft: 2,
  },
});
