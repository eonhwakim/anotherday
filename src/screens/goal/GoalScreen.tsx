import React, { useCallback, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { handleServiceError } from '../../lib/serviceError';
import {
  useMyGoalsForMonthQuery,
  useTeamGoalsQuery,
  useWeeklyDoneCountsQuery,
} from '../../queries/goalQueries';
import { useEndTeamGoalMutation, useRemoveTeamGoalMutation } from '../../queries/goalMutations';
import {
  useMonthlyResolutionQuery,
  useMonthlyRetrospectiveQuery,
} from '../../queries/monthlyQueries';
import { queryKeys } from '../../queries/queryKeys';
import {
  saveMonthlyResolution,
  saveMonthlyRetrospective,
} from '../../services/monthlyService';
import { fetchCalendarMarkings } from '../../services/statsService';
import dayjs from '../../lib/dayjs';
import { getCalendarWeekRanges, computeConsecutiveAchievementDays } from '../../lib/statsUtils';
import { useMemberProgressQuery } from '../../queries/statsQueries';
import { colors, ds, radius, spacing, typography } from '../../design/recipes';

import ScreenBackground from '../../components/ui/ScreenBackground';
import GoalSetting from '../../components/goal/GoalSetting';
import AddRoutineModal from '../../components/goal/AddRoutineModal';
import TodayStatsCard from '../../components/goal/TodayStatsCard';
import GlassModal from '../../components/ui/GlassModal';
import Input from '../../components/common/Input';

function getOwningMonthForDate(dateStr: string): string {
  const date = dayjs(dateStr);
  const candidates = [
    date.subtract(1, 'month').format('YYYY-MM'),
    date.format('YYYY-MM'),
    date.add(1, 'month').format('YYYY-MM'),
  ];

  for (const monthStr of candidates) {
    const { ranges } = getCalendarWeekRanges(monthStr);
    const isInOwnedRange = ranges.some(
      (range) => range.s.format('YYYY-MM-DD') <= dateStr && range.e.format('YYYY-MM-DD') >= dateStr,
    );
    if (isInOwnedRange) return monthStr;
  }

  return date.format('YYYY-MM');
}

export default function GoalScreen() {
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const queryClient = useQueryClient();
  const endTeamGoalMutation = useEndTeamGoalMutation({
    userId: user?.id,
    teamId: currentTeam?.id,
  });
  const removeTeamGoalMutation = useRemoveTeamGoalMutation({
    userId: user?.id,
    teamId: currentTeam?.id,
  });
  const todayOwnedMonth = React.useMemo(
    () => getOwningMonthForDate(dayjs().format('YYYY-MM-DD')),
    [],
  );
  const todayStr = dayjs().format('YYYY-MM-DD');
  const [yearMonth, setYearMonth] = useState(todayOwnedMonth);
  const [addRoutineVisible, setAddRoutineVisible] = useState(false);
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [retrospectiveModalVisible, setRetrospectiveModalVisible] = useState(false);
  const [resolutionInput, setResolutionInput] = useState('');
  const [retrospectiveInput, setRetrospectiveInput] = useState('');
  const teamGoalsQuery = useTeamGoalsQuery(
    currentTeam?.id ?? '',
    user?.id,
  );
  const monthGoalsQuery = useMyGoalsForMonthQuery(
    user?.id,
    yearMonth,
  );
  const memberProgressQuery = useMemberProgressQuery(
    currentTeam?.id,
    user?.id,
    todayStr,
  );
  const monthlyResolutionQuery = useMonthlyResolutionQuery({
    userId: user?.id,
    yearMonth,
    teamId: currentTeam?.id ?? null,
  });
  const monthlyRetrospectiveQuery = useMonthlyRetrospectiveQuery({
    userId: user?.id,
    yearMonth,
    teamId: currentTeam?.id ?? null,
  });

  const teamGoals = useMemo(() => teamGoalsQuery.data ?? [], [teamGoalsQuery.data]);
  const monthGoals = useMemo(() => monthGoalsQuery.data ?? [], [monthGoalsQuery.data]);
  const memberProgress = useMemo(
    () => memberProgressQuery.data ?? [],
    [memberProgressQuery.data],
  );
  const monthlyResolution = monthlyResolutionQuery.data ?? '';
  const monthlyRetrospective = monthlyRetrospectiveQuery.data ?? '';

  const streakMonths = useMemo(
    () => [
      dayjs().format('YYYY-MM'),
      dayjs().subtract(1, 'month').format('YYYY-MM'),
      dayjs().subtract(2, 'month').format('YYYY-MM'),
    ],
    [],
  );

  const streakQueries = useQueries({
    queries: streakMonths.map((month) => ({
      queryKey: user?.id
        ? queryKeys.stats.calendar(user.id, month)
        : ['stats', 'calendar', null, month],
      queryFn: () => fetchCalendarMarkings(user!.id, month),
      enabled: !!user?.id,
    })),
  });

  const currentTeamUserGoals = useMemo(() => {
    if (!teamGoals || teamGoals.length === 0) return [];
    if (!monthGoals || !user) return [];

    const myOwnedGoalIds = new Set(
      teamGoals.filter((goal) => goal.owner_id === user.id).map((goal) => goal.id),
    );
    return monthGoals.filter((userGoal) => myOwnedGoalIds.has(userGoal.goal_id));
  }, [teamGoals, monthGoals, user]);

  const weeklyGoalIds = useMemo(
    () =>
      currentTeamUserGoals
        .filter((goal) => goal.frequency === 'weekly_count')
        .map((goal) => goal.goal_id),
    [currentTeamUserGoals],
  );
  const weeklyDoneCountsQuery = useWeeklyDoneCountsQuery({
    userId: user?.id,
    goalIds: weeklyGoalIds,
  });
  const weeklyDoneCounts = weeklyDoneCountsQuery.data ?? {};

  const todayCheckedInGoalIds = useMemo(
    () =>
      new Set(
        (
          memberProgress.find((progress) => progress.userId === user?.id)?.goalDetails ?? []
        )
          .filter((goal) => goal.isDone || goal.isPass)
          .map((goal) => goal.goalId),
      ),
    [memberProgress, user?.id],
  );

  const heroStats = useMemo(() => {
    if (!user) return null;

    const me = memberProgress.find((progress) => progress.userId === user.id);
    if (!me) return null;

    const totalTodayAll = me.totalGoals ?? 0;
    const goalDetails = me.goalDetails ?? [];
    const passToday =
      goalDetails.length > 0
        ? goalDetails.filter((goal) => !!goal.isPass).length
        : (me.passGoals ?? 0);
    const totalTodayNonPass =
      goalDetails.length > 0
        ? goalDetails.filter((goal) => !goal.isPass).length
        : Math.max(0, totalTodayAll - (me.passGoals ?? 0));
    const doneToday =
      goalDetails.length > 0
        ? goalDetails.filter((goal) => !goal.isPass && !!goal.isDone).length
        : (me.doneGoals ?? 0);
    const ratePct = totalTodayNonPass > 0 ? Math.round((doneToday / totalTodayNonPass) * 100) : 0;

    const mergedMarkings = streakQueries.reduce<Record<string, unknown>>((acc, query) => {
      return query.data ? { ...acc, ...query.data } : acc;
    }, {});
    const streak = computeConsecutiveAchievementDays(mergedMarkings as Parameters<typeof computeConsecutiveAchievementDays>[0]);

    return { ratePct, streak, doneToday, totalToday: totalTodayNonPass, passToday };
  }, [memberProgress, streakQueries, user]);

  const isLoading =
    !user ||
    teamGoalsQuery.isLoading ||
    monthGoalsQuery.isLoading ||
    memberProgressQuery.isLoading ||
    weeklyDoneCountsQuery.isLoading ||
    monthlyResolutionQuery.isLoading ||
    (Boolean(currentTeam?.id) && monthlyRetrospectiveQuery.isLoading) ||
    streakQueries.some((query) => query.isLoading);

  const loadData = useCallback(async () => {
    if (!user) return;

    const refetches: Promise<unknown>[] = [
      monthGoalsQuery.refetch(),
      memberProgressQuery.refetch(),
      weeklyDoneCountsQuery.refetch(),
      monthlyResolutionQuery.refetch(),
      ...streakQueries.map((query) => query.refetch()),
    ];

    if (currentTeam?.id) {
      refetches.unshift(teamGoalsQuery.refetch(), monthlyRetrospectiveQuery.refetch());
    }

    await Promise.all(refetches);
  }, [
    currentTeam?.id,
    memberProgressQuery,
    monthGoalsQuery,
    monthlyResolutionQuery,
    monthlyRetrospectiveQuery,
    streakQueries,
    teamGoalsQuery,
    user,
    weeklyDoneCountsQuery,
  ]);

  const handleUpdateResolution = useCallback(
    async (text: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const ok = await saveMonthlyResolution({
          userId: user.id,
          yearMonth,
          content: text,
          teamId: currentTeam?.id ?? null,
        });
        if (!ok) throw new Error('save failed');
        setResolutionInput(text);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.monthly.resolution(user.id, yearMonth, currentTeam?.id ?? null),
        });
        return true;
      } catch (e) {
        handleServiceError(e);
        return false;
      }
    },
    [currentTeam?.id, queryClient, user, yearMonth],
  );

  const handleUpdateRetrospective = useCallback(
    async (text: string): Promise<boolean> => {
      if (!user || !currentTeam?.id) return false;
      try {
        const ok = await saveMonthlyRetrospective({
          userId: user.id,
          yearMonth,
          content: text,
          teamId: currentTeam.id,
        });
        if (!ok) throw new Error('save failed');
        setRetrospectiveInput(text);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.monthly.retrospective(user.id, yearMonth, currentTeam.id),
        });
        return true;
      } catch (e) {
        handleServiceError(e);
        return false;
      }
    },
    [currentTeam?.id, queryClient, user, yearMonth],
  );

  const openResolutionModal = useCallback(() => {
    setResolutionInput(monthlyResolution);
    setResolutionModalVisible(true);
  }, [monthlyResolution]);

  const openRetrospectiveModal = useCallback(() => {
    setRetrospectiveInput(monthlyRetrospective);
    setRetrospectiveModalVisible(true);
  }, [monthlyRetrospective]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleEndGoal = useCallback(
    async (goalId: string) => {
      if (!user) return;
      try {
        await endTeamGoalMutation.mutateAsync({ goalId });
      } catch (e) {
        handleServiceError(e);
      }
    },
    [endTeamGoalMutation, user],
  );

  const handleRemoveGoal = useCallback(
    async (goalId: string) => {
      if (!user) return;
      try {
        await removeTeamGoalMutation.mutateAsync({ goalId });
      } catch (e) {
        handleServiceError(e);
      }
    },
    [removeTeamGoalMutation, user],
  );

  const myVisibleGoals = useMemo(() => {
    if (!teamGoals || !user) return [];

    const activeGoalIds = new Set(currentTeamUserGoals.map((userGoal) => userGoal.goal_id));
    return teamGoals.filter((goal) => goal.owner_id === user.id && activeGoalIds.has(goal.id));
  }, [teamGoals, currentTeamUserGoals, user]);

  const monthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');
  const canNext = yearMonth < todayOwnedMonth;
  const showCurrentChip = yearMonth === todayOwnedMonth;

  const goToPrevMonth = () => {
    setYearMonth((prev) => dayjs(`${prev}-01`).subtract(1, 'month').format('YYYY-MM'));
  };

  const goToNextMonth = () => {
    if (!canNext) return;
    setYearMonth((prev) => dayjs(`${prev}-01`).add(1, 'month').format('YYYY-MM'));
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={ds.pagePadding as ViewStyle}>
            <View style={styles.header}>
              <Text style={ds.headerTitle as TextStyle}>내 목표</Text>
              <Text style={styles.subtitle}>매일 꾸준히, 작은 습관이 큰 변화를 만듭니다</Text>
            </View>
            {/* 오늘 통계 카드 */}
            <View style={styles.section}>
              <TodayStatsCard stats={user ? heroStats : null} />
            </View>

            {/* 달력컨트롤 */}
            <View style={styles.section}>
              <View style={styles.monthSelectorWrap}>
                <View style={styles.monthSelector}>
                  <TouchableOpacity onPress={goToPrevMonth} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={24} color={colors.primaryLight} />
                  </TouchableOpacity>

                  <View style={styles.monthLabelWrap}>
                    <Text style={styles.monthLabel}>{monthLabel}</Text>
                    {showCurrentChip ? (
                      <View style={styles.monthStatusChip}>
                        <Text style={styles.monthStatusChipText}>진행중</Text>
                      </View>
                    ) : null}
                  </View>

                  <TouchableOpacity onPress={goToNextMonth} activeOpacity={0.8} disabled={!canNext}>
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={canNext ? colors.primaryLight : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.helperText}>
                * 월초와 월말의 부분주는 4일 미만이면 인접 월에 편입돼요.
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <GoalSetting
                yearMonth={yearMonth}
                teamGoals={myVisibleGoals}
                myGoals={currentTeamUserGoals}
                weeklyDoneCounts={weeklyDoneCounts}
                todayCheckedInGoalIds={todayCheckedInGoalIds}
                onEnd={handleEndGoal}
                onRemove={handleRemoveGoal}
                monthlyResolution={monthlyResolution}
                monthlyRetrospective={monthlyRetrospective}
                onEditResolution={openResolutionModal}
                onEditRetrospective={currentTeam ? openRetrospectiveModal : undefined}
              />
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setAddRoutineVisible(true)}
          activeOpacity={0.8}
        >
          <Image
            source={require('../../../assets/plus-btn.png')}
            style={styles.floatingButtonImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <AddRoutineModal
          visible={addRoutineVisible}
          onClose={() => setAddRoutineVisible(false)}
        />

        <GlassModal
          visible={resolutionModalVisible}
          title={`${dayjs(`${yearMonth}-01`).format('YYYY년 M월')} 한마디`}
          onClose={() => setResolutionModalVisible(false)}
          onConfirm={async () => {
            const ok = await handleUpdateResolution(resolutionInput);
            if (ok) setResolutionModalVisible(false);
          }}
        >
          <Input
            placeholder="이번 달의 다짐이나 목표를 적어보세요"
            value={resolutionInput}
            onChangeText={setResolutionInput}
            autoFocus
            maxLength={50}
          />
        </GlassModal>

        <GlassModal
          visible={retrospectiveModalVisible}
          title={`${dayjs(`${yearMonth}-01`).format('YYYY년 M월')} 회고`}
          onClose={() => setRetrospectiveModalVisible(false)}
          onConfirm={async () => {
            const ok = await handleUpdateRetrospective(retrospectiveInput);
            if (ok) setRetrospectiveModalVisible(false);
          }}
        >
          <Input
            placeholder="이번 달은 어떠셨나요? 회고를 남겨보세요"
            value={retrospectiveInput}
            onChangeText={setRetrospectiveInput}
            autoFocus
            maxLength={200}
            multiline
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
        </GlassModal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 132,
  },
  header: {
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  section: {
    marginBottom: spacing[3],
  },
  monthSelectorWrap: {
    marginVertical: spacing[3],
  },
  monthSelector: {
    ...(ds.rowCenter as ViewStyle),
    justifyContent: 'center',
    gap: spacing[4],
  },
  monthLabelWrap: {
    minWidth: 140,
    alignItems: 'center',
    gap: spacing[1],
  },
  monthButtonFrame: {
    width: 48,
    minWidth: 48,
    marginTop: 0,
    borderRadius: radius.lg,
  },
  monthButtonFrameDisabled: {
    opacity: 0.45,
  },
  monthButtonContent: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    minWidth: 140,
    textAlign: 'center',
  },
  monthStatusChip: {
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.brandLight,
    borderWidth: 1,
    borderColor: colors.brandMid,
  },
  monthStatusChipText: {
    ...typography.bodyStrong,
    fontSize: 11,
    color: colors.primary,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginTop: spacing[1],
  },
  loadingWrap: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonImage: {
    width: '100%',
    height: '100%',
  },
});
