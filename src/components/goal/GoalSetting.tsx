import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, UserGoal } from '../../types/domain';
import GlassCard from '../ui/GlassCard';
import Badge from '../ui/Badge';
import dayjs from '../../lib/dayjs';
import { colors, radius, spacing, typography } from '../../design/recipes';
import { getCalendarWeekRanges } from '../../lib/statsUtils';
import CircularProgress from '../ui/CircularProgress';
import BaseCard from '../ui/BaseCard';

type SelectedDayGoalStatus = 'done' | 'pass' | 'pending';

interface GoalSettingProps {
  teamGoals: Goal[];
  myGoals: UserGoal[];
  weeklyDoneCounts?: Record<string, number>;
  todayCheckedInGoalIds?: Set<string>;
  selectedWeekLabel?: string;
  selectedDayGoalStatusById?: Record<string, SelectedDayGoalStatus>;
  onEnd: (goalId: string) => void;
  onRemove: (goalId: string) => void;
  monthlyResolution?: string;
  monthlyRetrospective?: string;
  /** 오른쪽 편집 아이콘 탭 시 (예: 한마디 GlassModal) */
  onEditResolution?: () => void;
  onEditRetrospective?: () => void;
  onAddRoutine?: () => void;
  title?: string;
  subtitle?: string;
  yearMonth?: string;
}

function freqLabel(ug: UserGoal): string {
  if (ug.frequency === 'daily') return '매일';
  if (ug.frequency === 'weekly_count' && ug.target_count) return `주 ${ug.target_count}회`;
  return '매일';
}

function periodLabel(ug?: UserGoal): string | null {
  if (!ug || !ug.start_date || !ug.end_date) return null;
  return `${dayjs(ug.start_date).format('MM/DD')}~${dayjs(ug.end_date).format('MM/DD')}`;
}

function startLabel(ug?: UserGoal): string | null {
  if (!ug || !ug.start_date) return null;
  return `${dayjs(ug.start_date).format('MM/DD')}~`;
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

function getGoalProgress(params: {
  userGoal?: UserGoal;
  goalId: string;
  weeklyDoneCounts: Record<string, number>;
  todayCheckedInGoalIds: Set<string>;
}): number {
  const { userGoal, goalId, weeklyDoneCounts, todayCheckedInGoalIds } = params;
  if (!userGoal) return 0;

  if (userGoal.frequency === 'weekly_count') {
    const targetCount = userGoal.target_count ?? 0;
    if (targetCount <= 0) return 0;
    const doneCount = weeklyDoneCounts[goalId] ?? 0;
    return Math.min(100, Math.round((doneCount / targetCount) * 100));
  }

  return todayCheckedInGoalIds.has(goalId) ? 100 : 0;
}

function getGoalProgressLabel(params: {
  userGoal?: UserGoal;
  goalId: string;
  weeklyDoneCounts: Record<string, number>;
  todayCheckedInGoalIds: Set<string>;
}): string {
  const { userGoal, goalId, weeklyDoneCounts, todayCheckedInGoalIds } = params;
  if (!userGoal) return '-';

  if (userGoal.frequency === 'weekly_count') {
    const doneCount = weeklyDoneCounts[goalId] ?? 0;
    const targetCount = userGoal.target_count ?? 1;
    return `${doneCount}/${targetCount}`;
  }

  return `${todayCheckedInGoalIds.has(goalId) ? 1 : 0}/1`;
}

function getSelectedDayStatusMeta(status: SelectedDayGoalStatus | undefined) {
  if (status === 'done') {
    return {
      label: '완료',
      color: colors.successBright,
      iconName: 'checkmark-circle' as const,
      backgroundColor: 'rgba(134, 239, 172, 0.18)',
      borderColor: 'rgba(74, 222, 128, 0.34)',
    };
  }

  if (status === 'pass') {
    return {
      label: '패스',
      color: colors.warning,
      iconName: 'play-forward-circle' as const,
      backgroundColor: 'rgba(253, 230, 138, 0.2)',
      borderColor: 'rgba(242, 201, 76, 0.34)',
    };
  }

  return {
    label: '미인증',
    color: colors.primaryLight,
    iconName: 'alert-circle' as const,
    backgroundColor: 'rgba(252, 165, 165, 0.18)',
    borderColor: 'rgba(255, 126, 179, 0.24)',
  };
}

export default function GoalSetting({
  teamGoals = [],
  myGoals = [],
  weeklyDoneCounts = {},
  todayCheckedInGoalIds = new Set(),
  selectedWeekLabel,
  selectedDayGoalStatusById = {},
  onEnd,
  onRemove,
  monthlyResolution = '',
  monthlyRetrospective = '',
  onEditResolution,
  onEditRetrospective,
  onAddRoutine,
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

  const renderPassIndicator = (userGoal: UserGoal, doneCount: number, isEnded: boolean) => {
    if (userGoal.frequency !== 'weekly_count' || isEnded) return null;
    const targetCount = userGoal.target_count || 1;

    if (doneCount < targetCount) return null;

    return (
      <View style={styles.indicatorRow}>
        <Ionicons name="checkmark-circle" size={14} color={colors.successBright} />
        <Text style={[styles.indicatorText, { color: colors.successBright }]}>
          이번 주 목표 달성!
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 등록된 루틴 */}
      <View style={styles.section}>
        {teamGoals.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="bulb-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              아직 등록된 목표가 없어요{'\n'}아래 버튼을 눌러 새로운 루틴을 추가해보세요!
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.goalSection}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>This week's routine</Text>
                  {selectedWeekLabel ? (
                    <View style={styles.weekBadge}>
                      <Text style={styles.weekBadgeText}>{selectedWeekLabel}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.sectionHint}>길게 눌러 종료하거나 삭제할 수 있어요.</Text>
              </View>
            </View>

            <View style={styles.goalList}>
              {sortedGoals.map((goal) => {
                const userGoal = getMyGoal(goal.id);
                const isEnded =
                  !!userGoal &&
                  (userGoal.is_active === false ||
                    (!!userGoal.end_date && userGoal.end_date < todayStr));
                const isMergedWeekGoal =
                  !!userGoal && isMergedWeekGoalForMonth(userGoal, yearMonth);
                const progress = getGoalProgress({
                  userGoal,
                  goalId: goal.id,
                  weeklyDoneCounts,
                  todayCheckedInGoalIds,
                });
                const progressLabel = getGoalProgressLabel({
                  userGoal,
                  goalId: goal.id,
                  weeklyDoneCounts,
                  todayCheckedInGoalIds,
                });
                const progressColor = isEnded ? colors.textMuted : colors.primaryLight;
                const selectedDayStatusMeta = getSelectedDayStatusMeta(
                  selectedDayGoalStatusById[goal.id],
                );

                return (
                  <TouchableOpacity
                    key={goal.id}
                    onLongPress={isEnded ? undefined : () => handleLongPress(goal)}
                    activeOpacity={0.7}
                    delayLongPress={500}
                    disabled={isEnded}
                  >
                    <BaseCard glassOnly padded={false} style={styles.goalCard}>
                      <View style={styles.goalRowContentBox}>
                        <View style={styles.goalRowContent}>
                          <View style={styles.goalMainInfo}>
                            <View style={styles.goalLeading}>
                              <CircularProgress
                                size={52}
                                strokeWidth={4}
                                progress={progress}
                                color={progressColor}
                                trackColor={
                                  isEnded ? 'rgba(26,26,26,0.08)' : 'rgba(255, 107, 61, 0.15)'
                                }
                                label={progressLabel}
                              />
                            </View>
                            <View style={styles.goalTextWrap}>
                              <View style={styles.goalTitleRow}>
                                <Text
                                  style={[styles.goalRowName, isEnded && styles.goalRowNameEnded]}
                                  numberOfLines={1}
                                >
                                  {goal.name}
                                </Text>
                              </View>
                              {userGoal ? (
                                <View style={styles.goalSubtitleRow}>
                                  <View style={styles.goalSubtitleItem}>
                                    <Ionicons
                                      name="repeat"
                                      size={14}
                                      color={isEnded ? colors.textFaint : colors.textSecondary}
                                    />
                                    <Text
                                      style={[
                                        styles.goalSubtitleText,
                                        isEnded && styles.goalSubtitleTextEnded,
                                      ]}
                                    >
                                      {freqLabel(userGoal)}
                                    </Text>
                                  </View>
                                  <Text
                                    style={[
                                      styles.goalSubtitleDot,
                                      isEnded && styles.goalSubtitleTextEnded,
                                    ]}
                                  >
                                    ·
                                  </Text>
                                  <View style={styles.goalSubtitleItem}>
                                    <Ionicons
                                      name="time-outline"
                                      size={14}
                                      color={isEnded ? colors.textFaint : colors.textSecondary}
                                    />
                                    <Text
                                      style={[
                                        styles.goalSubtitleText,
                                        isEnded && styles.goalSubtitleTextEnded,
                                      ]}
                                    >
                                      {isEnded ? periodLabel(userGoal) : startLabel(userGoal)}
                                    </Text>
                                  </View>
                                </View>
                              ) : null}
                              {userGoal
                                ? renderPassIndicator(
                                    userGoal,
                                    weeklyDoneCounts[goal.id] || 0,
                                    isEnded,
                                  )
                                : null}
                            </View>
                          </View>
                          {userGoal ? (
                            <View style={styles.goalMetaRight}>
                              <View
                                style={[
                                  styles.selectedDayStatusIcon,
                                  {
                                    backgroundColor: isEnded
                                      ? 'rgba(255,255,255,0.42)'
                                      : selectedDayStatusMeta.backgroundColor,
                                    borderColor: isEnded
                                      ? 'rgba(255,255,255,0.48)'
                                      : selectedDayStatusMeta.borderColor,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={selectedDayStatusMeta.iconName}
                                  size={18}
                                  color={isEnded ? colors.textMuted : selectedDayStatusMeta.color}
                                />
                              </View>
                              {userGoal ? (
                                <View style={styles.goalPeriodRow}>
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
                          ) : null}
                        </View>
                      </View>
                    </BaseCard>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {onAddRoutine ? (
          <TouchableOpacity onPress={onAddRoutine} activeOpacity={0.7}>
            <GlassCard style={styles.addRoutineButton}>
              <Ionicons name="add-circle-outline" size={20} color="#FF6B3D" />
              <Text style={styles.addRoutineButtonText}>새 루틴 추가</Text>
            </GlassCard>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 한마디/회고 */}
      {/* <View style={styles.resolutionSection}>
        <GlassCard style={styles.resolutionCardInner}>
          <View style={styles.sectionHeader}>
            <Text style={styles.innerTitle}>이번 달 한마디</Text>
          </View>
          <View style={styles.resolutionRow}>
            <Text
              style={[styles.resolutionText, !monthlyResolution && styles.placeholderText]}
              numberOfLines={4}
            >
              {monthlyResolution ? monthlyResolution : '이번 달의 다짐이나 목표를 적어보세요.'}
            </Text>
            {onEditResolution ? (
              <TouchableOpacity
                onPress={onEditResolution}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="이번 달 한마디 편집"
              >
                <Ionicons name="create-outline" size={20} color="#FF6B3D" />
              </TouchableOpacity>
            ) : null}
          </View>
        </GlassCard>

        <GlassCard style={[styles.resolutionCardInner, { marginTop: 12 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.innerTitle}>이번 달 회고</Text>
          </View>
          <View style={styles.resolutionRow}>
            <Text
              style={[styles.resolutionText, !monthlyRetrospective && styles.placeholderText]}
              numberOfLines={4}
            >
              {monthlyRetrospective
                ? monthlyRetrospective
                : '이번 달은 어떠셨나요? 회고를 남겨보세요.'}
            </Text>
            {onEditRetrospective ? (
              <TouchableOpacity
                onPress={onEditRetrospective}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="이번 달 회고 편집"
              >
                <Ionicons name="create-outline" size={20} color="#FF6B3D" />
              </TouchableOpacity>
            ) : null}
          </View>
        </GlassCard>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 90,
  },
  sectionHeader: {
    marginBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing[6],
  },
  goalSection: {
    marginBottom: spacing[3],
    marginTop: spacing[1] + 2,
  },
  sectionHeading: {
    gap: spacing[1],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  weekBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
  },
  weekBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  resolutionSection: {
    marginBottom: spacing[5],
  },
  innerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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

  resolutionCardInner: {
    paddingVertical: spacing[4] + 2,
    paddingHorizontal: spacing[4],
  },
  resolutionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing[2],
    gap: spacing[3],
  },
  resolutionText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  emptyBox: {
    alignItems: 'center',
    marginBottom: spacing[4],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
    gap: spacing[3],
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 61, 0.2)',
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
    textAlign: 'center',
    alignSelf: 'stretch',
    marginTop: spacing[1],
  },
  goalList: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  goalCard: {
    borderRadius: 24,
  },
  goalLeading: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    gap: spacing[2],
  },
  goalBadge: {
    position: 'absolute',
    top: -14,
    minWidth: 16,
    textAlign: 'center',
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  goalRowFrame: {
    padding: 16,
    borderRadius: 50,
  },
  goalRowContentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  goalRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flex: 1,
    gap: spacing[2],
  },
  goalMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
    minWidth: 0,
  },
  goalTextWrap: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minWidth: 0,
    marginBottom: 4,
  },
  goalRowName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
    flexShrink: 1,
  },
  goalRowNameEnded: {
    color: colors.textSecondary,
  },
  goalSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalSubtitleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalSubtitleText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  goalSubtitleTextEnded: {
    color: colors.textFaint,
  },
  goalSubtitleDot: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 2,
    fontWeight: '600',
  },
  goalMetaRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: spacing[2],
  },
  goalPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
  selectedDayStatusIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  indicatorText: {
    ...typography.caption,
    fontWeight: '600',
  },
  addRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.xl,
  },
  addRoutineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B3D',
  },
});
