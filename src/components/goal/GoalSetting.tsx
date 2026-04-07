import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, UserGoal } from '../../types/domain';
import BaseCard from '../ui/BaseCard';
import Badge from '../ui/Badge';
import dayjs from '../../lib/dayjs';
import { colors, radius, spacing, typography } from '../../design/recipes';
import { getCalendarWeekRanges } from '../../lib/statsUtils';

interface GoalSettingProps {
  teamGoals: Goal[];
  myGoals: UserGoal[];
  onEnd: (goalId: string) => void;
  onRemove: (goalId: string) => void;
  monthlyResolution?: string;
  title?: string;
  subtitle?: string;
  yearMonth?: string;
}

function freqLabel(ug: UserGoal): string {
  if (ug.frequency === 'daily') return '매일';
  if (ug.frequency === 'weekly_count' && ug.target_count) return `주 ${ug.target_count}회`;
  return '매일';
}

function periodLabel(ug: UserGoal): string | null {
  if (!ug.start_date || !ug.end_date) return null;
  return `${dayjs(ug.start_date).format('MM/DD')} ~ ${dayjs(ug.end_date).format('MM/DD')}`;
}

function startLabel(ug: UserGoal): string | null {
  if (!ug.start_date) return null;
  return `시작일:  ${dayjs(ug.start_date).format('MM/DD')}`;
}

function isMergedWeekGoalForMonth(ug: UserGoal, yearMonth?: string): boolean {
  if (!yearMonth) return false;

  const monthStart = dayjs(`${yearMonth}-01`).startOf('month');
  const monthEnd = monthStart.endOf('month');
  const { dataStart, dataEnd } = getCalendarWeekRanges(yearMonth);

  const windowStart = dayjs(dataStart);
  const windowEnd = dayjs(dataEnd);
  const goalStart = ug.start_date ? dayjs(ug.start_date) : null;
  const goalEnd = ug.end_date ? dayjs(ug.end_date) : null;

  const overlapsWindow =
    (!goalStart || !goalStart.isAfter(windowEnd, 'day')) &&
    (!goalEnd || !goalEnd.isBefore(windowStart, 'day'));

  const overlapsCalendarMonth =
    (!goalStart || !goalStart.isAfter(monthEnd, 'day')) &&
    (!goalEnd || !goalEnd.isBefore(monthStart, 'day'));

  return overlapsWindow && !overlapsCalendarMonth;
}

export default function GoalSetting({
  teamGoals = [],
  myGoals = [],
  onEnd,
  onRemove,
  monthlyResolution = '',
  title = '목표 설정',
  subtitle = '* 목표를 추가하면 오늘부터 적용됩니다',
  yearMonth,
}: GoalSettingProps) {
  const todayStr = dayjs().format('YYYY-MM-DD');
  const getMyGoal = React.useCallback(
    (goalId: string) =>
      myGoals.find((ug) => ug.goal_id === goalId && (!ug.end_date || ug.end_date >= todayStr)) ??
      myGoals.find((ug) => ug.goal_id === goalId),
    [myGoals, todayStr],
  );
  const sortedGoals = React.useMemo(() => {
    return [...teamGoals].sort((a, b) => {
      const aGoal = getMyGoal(a.id);
      const bGoal = getMyGoal(b.id);
      const aEnded =
        !!aGoal && (aGoal.is_active === false || (!!aGoal.end_date && aGoal.end_date < todayStr));
      const bEnded =
        !!bGoal && (bGoal.is_active === false || (!!bGoal.end_date && bGoal.end_date < todayStr));

      if (aEnded === bEnded) return 0;
      return aEnded ? 1 : -1;
    });
  }, [getMyGoal, teamGoals, todayStr]);

  const handleLongPress = (goal: Goal) => {
    Alert.alert('루틴 관리', `"${goal.name}" 루틴을 어떻게 처리할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '루틴 종료',
        onPress: () => {
          Alert.alert(
            '루틴 종료',
            '오늘 이후 이 루틴을 더 이상 진행하지 않습니다.\n지금까지의 인증 기록과 통계는 유지됩니다.',
            [
              { text: '취소', style: 'cancel' },
              { text: '종료', onPress: () => onEnd(goal.id) },
            ],
          );
        },
      },
      {
        text: '완전 삭제',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            '완전 삭제',
            '루틴과 인증 기록이 모두 삭제됩니다.\n그래도 삭제 하시겠습니까?',
            [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: () => onRemove(goal.id) },
            ],
          );
        },
      },
    ]);
  };

  return (
    <>
      {title || subtitle ? (
        <View style={styles.titleBlock}>
          {title ? (
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
            </View>
          ) : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}

      <View style={styles.resolutionSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>이번 달 한마디</Text>
        </View>

        <BaseCard
          glassOnly
          padded={false}
          style={styles.innerCard}
          contentStyle={styles.resolutionBox}
        >
          <Text style={[styles.resolutionText, !monthlyResolution && styles.placeholderText]}>
            {monthlyResolution ? monthlyResolution : '이번 달의 다짐이나 목표를 적어보세요.'}
          </Text>
        </BaseCard>
      </View>

      <View style={styles.goalsSection}>
        {teamGoals.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="bulb-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              아직 등록된 목표가 없어요{'\n'}아래 플러스 버튼으로 루틴을 추가해보세요!
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>등록된 루틴 (길게 누름: 종료/삭제)</Text>
              <Text style={styles.hintLabel}>
                * 종료는 기록을 남기고, 완전 삭제는 기록도 모두 삭제됩니다.
              </Text>
            </View>
            <View style={styles.goalList}>
              {sortedGoals.map((goal, index) => {
                const userGoal = getMyGoal(goal.id);
                const isEnded =
                  !!userGoal &&
                  (userGoal.is_active === false ||
                    (!!userGoal.end_date && userGoal.end_date < todayStr));
                const isMergedWeekGoal =
                  !!userGoal && isMergedWeekGoalForMonth(userGoal, yearMonth);

                return (
                  <TouchableOpacity
                    key={goal.id}
                    onLongPress={isEnded ? undefined : () => handleLongPress(goal)}
                    activeOpacity={0.7}
                    delayLongPress={500}
                    disabled={isEnded}
                  >
                    <BaseCard
                      glassOnly
                      padded={false}
                      style={styles.goalRowFrame}
                      contentStyle={styles.goalRowContentBox}
                    >
                      <View style={styles.goalNumIcon}>
                        <Text style={styles.goalNumText}>{index + 1}</Text>
                      </View>
                      <View style={styles.goalRowContent}>
                        <View style={styles.goalTextWrap}>
                          <Text
                            style={[styles.goalRowName, isEnded && styles.goalRowNameEnded]}
                            numberOfLines={1}
                          >
                            {goal.name}
                          </Text>
                          {userGoal ? (
                            <View style={styles.goalPeriodRow}>
                              <Text style={styles.goalPeriod}>
                                {isEnded ? periodLabel(userGoal) : startLabel(userGoal)}
                              </Text>
                              {isMergedWeekGoal ? (
                                <Badge
                                  label="편입주"
                                  tone="warning"
                                  style={styles.mergedBadge}
                                  textStyle={styles.mergedBadgeText}
                                />
                              ) : null}
                              {isEnded ? (
                                <View style={styles.endedBadge}>
                                  <Text style={styles.endedBadgeText}>종료됨</Text>
                                </View>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                        {userGoal ? (
                          <View style={styles.goalMetaRight}>
                            <Text style={[styles.goalRowFreq, isEnded && styles.goalRowFreqEnded]}>
                              {freqLabel(userGoal)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </BaseCard>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    marginBottom: spacing[4],
  },
  resolutionSection: {
    marginBottom: spacing[4],
  },
  sectionHeader: {
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.text,
  },
  goalsSection: {
    marginTop: spacing[1],
  },
  //----------
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1] + 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing[6] + 2,
    lineHeight: 20,
  },

  innerCard: {
    borderRadius: radius.md,
    marginTop: 0,
  },
  resolutionBox: {
    padding: spacing[3] + 2,
  },
  resolutionText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  section: {
    marginTop: spacing[3],
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandLight,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  hintLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing[1] + 2,
    marginBottom: spacing[3],
  },
  goalList: {
    gap: spacing[2] + 2,
  },
  goalNumIcon: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  goalRowFrame: {
    borderRadius: radius.md,
    marginTop: 0,
  },
  goalRowContentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[4],
  },
  goalRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flex: 1,
    gap: spacing[3],
  },
  goalTextWrap: {
    flex: 1,
  },
  goalRowName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  goalRowNameEnded: {
    color: colors.textSecondary,
  },
  goalMetaRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 64,
  },
  goalPeriod: {
    ...typography.caption,
    color: colors.textMuted,
  },
  goalPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: 2,
    flexWrap: 'wrap',
  },
  goalRowFreq: {
    ...typography.body,
    color: colors.textSecondary,
    textTransform: 'none',
    textAlign: 'right',
  },
  goalRowFreqEnded: {
    color: colors.textFaint,
  },
  endedBadge: {
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surface,
  },
  endedBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  mergedBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  mergedBadgeText: {
    fontSize: 11,
    letterSpacing: 0,
  },
});
