import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, UserGoal } from '../../types/domain';
import Badge from '../ui/Badge';
import dayjs from '../../lib/dayjs';
import { colors, ds, radius, spacing, typography } from '../../design/recipes';
import { getCalendarWeekRanges } from '../../lib/statsUtils';
import CircularProgress from '../ui/CircularProgress';
import BaseCard from '../ui/BaseCard';
import Button from '../common/Button';

export type SelectedDayGoalStatus = 'done' | 'pass' | 'pending';

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
      // Today Summary 범례와 같은 색 체계
      dotColor: colors.softGreen,
      color: colors.successBright,
      iconName: 'checkmark-circle' as const,
      backgroundColor: 'rgba(134, 239, 172, 0.18)',
      borderColor: 'rgba(74, 222, 128, 0.34)',
    };
  }

  if (status === 'pass') {
    return {
      label: '패스',
      dotColor: colors.softYellow,
      color: colors.warning,
      iconName: 'play-forward-circle' as const,
      backgroundColor: 'rgba(253, 230, 138, 0.2)',
      borderColor: 'rgba(242, 201, 76, 0.34)',
    };
  }

  return {
    label: '미인증',
    dotColor: colors.softCoral,
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
    <View>
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
            {/* 페이지 헤더가 이미 'Routine'이라 섹션 타이틀은 중복 — 안내만 목록 아래 각주로 둔다
            <View style={styles.goalSection}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionTitleRow}>
                  <Text style={ds.cardTitle as TextStyle}>My routine</Text>
                </View>
              </View>
            </View>
            */}

            {/* 루틴 목록 — 카드 하나에 행을 쌓고 구분선으로만 나눈다 */}
            <View style={styles.goalList}>
              {sortedGoals.map((goal, index) => {
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
                // 빈도는 매일 참조하는 정보, 기간은 참고용 — 같은 줄에서 톤으로만 구분한다
                const freqText = userGoal ? freqLabel(userGoal) : null;
                const periodText = userGoal
                  ? isEnded
                    ? periodLabel(userGoal)
                    : startLabel(userGoal)
                  : null;

                return (
                  <TouchableOpacity
                    key={goal.id}
                    onLongPress={isEnded ? undefined : () => handleLongPress(goal)}
                    activeOpacity={0.6}
                    delayLongPress={500}
                    disabled={isEnded}
                    style={[styles.goalRow, index > 0 && styles.goalRowDivided]}
                  >
                    {/* 리딩 슬롯 — 선택한 날짜의 상태 (Today Summary 범례와 같은 점) */}
                    <View style={styles.statusLeading}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isEnded
                              ? colors.borderMuted
                              : selectedDayStatusMeta.dotColor,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.goalTextWrap}>
                      <Text
                        style={[styles.goalRowName, isEnded && styles.goalRowNameEnded]}
                        numberOfLines={1}
                      >
                        {goal.name}
                      </Text>
                      {freqText ? (
                        <Text
                          style={[styles.goalMetaText, isEnded && styles.goalMetaTextEnded]}
                          numberOfLines={1}
                        >
                          {freqText}
                          {periodText ? (
                            <Text style={styles.goalMetaPeriod}> · {periodText}</Text>
                          ) : null}
                        </Text>
                      ) : null}
                      {userGoal
                        ? renderPassIndicator(userGoal, weeklyDoneCounts[goal.id] || 0, isEnded)
                        : null}
                    </View>

                    {userGoal ? (
                      <View style={styles.goalMetaRight}>
                        {isMergedWeekGoal ? (
                          <Badge
                            label="편입주"
                            tone="neutral"
                            style={styles.mergedBadge}
                            textStyle={styles.mergedBadgeText}
                          />
                        ) : null}
                        {isEnded ? (
                          <View style={styles.endedBadge}>
                            <Text style={styles.endedBadgeText}>종료됨</Text>
                          </View>
                        ) : null}
                        {/* 트레일링 슬롯 — 누적 진행률 */}
                        <CircularProgress
                          size={32}
                          strokeWidth={3}
                          progress={progress}
                          color={progressColor}
                          trackColor={isEnded ? colors.track : 'rgba(255, 107, 61, 0.14)'}
                          label={progressLabel}
                        />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionHint}>길게 눌러 종료하거나 삭제할 수 있어요.</Text>
          </>
        )}

        {onAddRoutine ? (
          <Button
            title="새 루틴 추가"
            onPress={onAddRoutine}
            style={{ marginTop: spacing[4] }}
            icon={<Ionicons name="add-circle-outline" size={20} color={colors.white} />}
          />
        ) : null}
      </View>

      {/* <View style={styles.resolutionSection}>
        <BaseCard glassOnly padded={false} style={styles.resolutionCardInner}>
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
        </BaseCard>

        <BaseCard glassOnly padded={false} style={[styles.resolutionCardInner, { marginTop: 12 }]}>
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
        </BaseCard>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  /** 목록 아래 각주 — 롱프레스 동작 안내 */
  sectionHint: {
    ...typography.caption,
    color: colors.textFaint,
    lineHeight: 16,
    paddingHorizontal: spacing[1],
    marginTop: -spacing[2],
    marginBottom: spacing[4],
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
  resolutionSection: {
    marginBottom: spacing[5],
  },
  innerTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
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
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  /** 루틴 목록 카드 — 행마다 카드를 두지 않고 하나로 묶는다 */
  goalList: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  /** 상태 점이 행마다 같은 x축에 정렬되도록 폭을 고정 */
  statusLeading: {
    width: 7,
    alignItems: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  goalRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  goalMetaText: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    marginTop: 3,
  },
  goalMetaTextEnded: {
    color: colors.textFaint,
  },
  /** 기간은 참고용이라 한 톤 더 흐리게 */
  goalMetaPeriod: {
    color: colors.textMuted,
  },
  goalTextWrap: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },

  goalRowName: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    color: colors.text,
    lineHeight: 20,
    flexShrink: 1,
  },
  goalRowNameEnded: {
    color: colors.textSecondary,
  },
  goalMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexShrink: 0,
  },
  endedBadge: {
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.bgSoft,
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
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  indicatorText: {
    ...typography.caption,
    fontWeight: '500',
  },
});
