import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { View, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { AppTabParamList } from '../../types/navigation';
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
  useSaveMonthlyResolutionMutation,
  useSaveMonthlyRetrospectiveMutation,
} from '../../queries/monthlyMutations';
import { fetchCalendarMarkings } from '../../services/statsService';
import dayjs from '../../lib/dayjs';
import { getCalendarWeekRanges, getOwningMonthForDate } from '../../lib/statsUtils';
import { useMemberProgressQuery } from '../../queries/statsQueries';
import { colors, ds, spacing } from '../../design/recipes';

import GradientBackground from '../../components/ui/GradientBackground';
import PageHeader from '../../components/ui/PageHeader';
import GoalSetting from '../../components/goal/GoalSetting';
import AddRoutineModal from '../../components/goal/AddRoutineModal';
import DaySummaryCard from '../../components/goal/DaySummaryCard';
import GlassModal from '../../components/ui/GlassModal';
import WeeklyCalendarCard from '../../components/goal/WeeklyCalendarCard';
import MonthPickerModal from '../../components/common/MonthPickerModal';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';

export default function GoalScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation, scrollRef });
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const endTeamGoalMutation = useEndTeamGoalMutation({
    userId: user?.id,
    teamId: currentTeam?.id,
  });
  const removeTeamGoalMutation = useRemoveTeamGoalMutation({
    userId: user?.id,
    teamId: currentTeam?.id,
  });
  const saveMonthlyResolutionMutation = useSaveMonthlyResolutionMutation();
  const saveMonthlyRetrospectiveMutation = useSaveMonthlyRetrospectiveMutation();
  const todayStr = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [addRoutineVisible, setAddRoutineVisible] = useState(false);
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [retrospectiveModalVisible, setRetrospectiveModalVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [resolutionInput, setResolutionInput] = useState('');
  const [retrospectiveInput, setRetrospectiveInput] = useState('');
  const selectedYearMonth = useMemo(() => getOwningMonthForDate(selectedDate), [selectedDate]);
  const selectedWeekStart = useMemo(
    () => dayjs(selectedDate).startOf('isoWeek').format('YYYY-MM-DD'),
    [selectedDate],
  );
  const selectedWeekEnd = useMemo(
    () => dayjs(selectedDate).endOf('isoWeek').format('YYYY-MM-DD'),
    [selectedDate],
  );
  const selectedWeekLabel = useMemo(
    () =>
      `${dayjs(selectedWeekStart).format('M월 D일')} - ${dayjs(selectedWeekEnd).format('M월 D일')}`,
    [selectedWeekEnd, selectedWeekStart],
  );
  const teamGoalsQuery = useTeamGoalsQuery(currentTeam?.id ?? '', user?.id);
  const monthGoalsQuery = useMyGoalsForMonthQuery(user?.id, selectedYearMonth);
  const memberProgressQuery = useMemberProgressQuery(currentTeam?.id, user?.id, selectedDate);
  const monthlyResolutionQuery = useMonthlyResolutionQuery({
    userId: user?.id,
    yearMonth: selectedYearMonth,
    teamId: currentTeam?.id ?? null,
  });
  const monthlyRetrospectiveQuery = useMonthlyRetrospectiveQuery({
    userId: user?.id,
    yearMonth: selectedYearMonth,
    teamId: currentTeam?.id ?? null,
  });

  const teamGoals = useMemo(() => teamGoalsQuery.data ?? [], [teamGoalsQuery.data]);
  const monthGoals = useMemo(() => monthGoalsQuery.data ?? [], [monthGoalsQuery.data]);
  const memberProgress = useMemo(() => memberProgressQuery.data ?? [], [memberProgressQuery.data]);
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

  const [currentMonthStreakQuery, previousMonthStreakQuery, twoMonthsAgoStreakQuery] = useQueries({
    queries: streakMonths.map((month) => ({
      queryKey: user?.id
        ? queryKeys.stats.calendar(user.id, month)
        : ['stats', 'calendar', null, month],
      queryFn: () => fetchCalendarMarkings(user!.id, month),
      enabled: !!user?.id,
    })),
  });
  const currentMonthStreakData = currentMonthStreakQuery.data;
  const previousMonthStreakData = previousMonthStreakQuery.data;
  const twoMonthsAgoStreakData = twoMonthsAgoStreakQuery.data;
  const isCurrentMonthStreakLoading = currentMonthStreakQuery.isLoading;
  const isPreviousMonthStreakLoading = previousMonthStreakQuery.isLoading;
  const isTwoMonthsAgoStreakLoading = twoMonthsAgoStreakQuery.isLoading;
  const refetchCurrentMonthStreak = currentMonthStreakQuery.refetch;
  const refetchPreviousMonthStreak = previousMonthStreakQuery.refetch;
  const refetchTwoMonthsAgoStreak = twoMonthsAgoStreakQuery.refetch;

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
    weekStart: selectedWeekStart,
    weekEnd: selectedWeekEnd,
  });
  const weeklyDoneCounts = weeklyDoneCountsQuery.data ?? {};

  const todayCheckedInGoalIds = useMemo(
    () =>
      new Set(
        (memberProgress.find((progress) => progress.userId === user?.id)?.goalDetails ?? [])
          .filter((goal) => goal.isDone || goal.isPass)
          .map((goal) => goal.goalId),
      ),
    [memberProgress, user?.id],
  );
  const selectedDayGoalStatusById = useMemo(() => {
    if (!user) return {};

    const me = memberProgress.find((progress) => progress.userId === user.id);
    if (!me) return {};

    return Object.fromEntries(
      (me.goalDetails ?? []).map((goal) => [
        goal.goalId,
        goal.isPass ? 'pass' : goal.isDone ? 'done' : 'pending',
      ]),
    );
  }, [memberProgress, user]);

  const daySummaryStats = useMemo(() => {
    if (!user) return null;

    const me = memberProgress.find((progress) => progress.userId === user.id);
    if (!me) return null;

    const totalGoals = me.totalGoals ?? 0;
    const goalDetails = me.goalDetails ?? [];
    const doneCount =
      goalDetails.length > 0
        ? goalDetails.filter((goal) => !goal.isPass && !!goal.isDone).length
        : (me.doneGoals ?? 0);
    const passCount =
      goalDetails.length > 0
        ? goalDetails.filter((goal) => !!goal.isPass).length
        : (me.passGoals ?? 0);
    const missedCount = Math.max(0, totalGoals - doneCount - passCount);

    return { totalGoals, doneCount, passCount, missedCount };
  }, [memberProgress, user]);

  const calendarMarkings = useMemo(() => {
    if (selectedYearMonth === streakMonths[0]) return currentMonthStreakData ?? {};
    if (selectedYearMonth === streakMonths[1]) return previousMonthStreakData ?? {};
    if (selectedYearMonth === streakMonths[2]) return twoMonthsAgoStreakData ?? {};
    return {};
  }, [
    currentMonthStreakData,
    previousMonthStreakData,
    selectedYearMonth,
    streakMonths,
    twoMonthsAgoStreakData,
  ]);

  const isLoading =
    !user ||
    teamGoalsQuery.isLoading ||
    monthGoalsQuery.isLoading ||
    memberProgressQuery.isLoading ||
    weeklyDoneCountsQuery.isLoading ||
    monthlyResolutionQuery.isLoading ||
    (Boolean(currentTeam?.id) && monthlyRetrospectiveQuery.isLoading) ||
    isCurrentMonthStreakLoading ||
    isPreviousMonthStreakLoading ||
    isTwoMonthsAgoStreakLoading;

  const loadData = useCallback(async () => {
    if (!user) return;

    const refetches: Promise<unknown>[] = [
      monthGoalsQuery.refetch(),
      memberProgressQuery.refetch(),
      weeklyDoneCountsQuery.refetch(),
      monthlyResolutionQuery.refetch(),
      refetchCurrentMonthStreak(),
      refetchPreviousMonthStreak(),
      refetchTwoMonthsAgoStreak(),
    ];

    if (currentTeam?.id) {
      refetches.unshift(teamGoalsQuery.refetch(), monthlyRetrospectiveQuery.refetch());
    }

    await Promise.all(refetches);
  }, [
    currentTeam?.id,
    memberProgressQuery.refetch,
    monthGoalsQuery.refetch,
    monthlyResolutionQuery.refetch,
    monthlyRetrospectiveQuery.refetch,
    refetchCurrentMonthStreak,
    refetchPreviousMonthStreak,
    teamGoalsQuery.refetch,
    refetchTwoMonthsAgoStreak,
    user,
    weeklyDoneCountsQuery.refetch,
  ]);

  const handleUpdateResolution = useCallback(
    async (text: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const ok = await saveMonthlyResolutionMutation.mutateAsync({
          userId: user.id,
          yearMonth: selectedYearMonth,
          content: text,
          teamId: currentTeam?.id ?? null,
        });
        if (!ok) throw new Error('save failed');
        setResolutionInput(text);
        return true;
      } catch (e) {
        handleServiceError(e);
        return false;
      }
    },
    [currentTeam?.id, saveMonthlyResolutionMutation, selectedYearMonth, user],
  );

  const handleUpdateRetrospective = useCallback(
    async (text: string): Promise<boolean> => {
      if (!user || !currentTeam?.id) return false;
      try {
        const ok = await saveMonthlyRetrospectiveMutation.mutateAsync({
          userId: user.id,
          yearMonth: selectedYearMonth,
          content: text,
          teamId: currentTeam.id,
        });
        if (!ok) throw new Error('save failed');
        setRetrospectiveInput(text);
        return true;
      } catch (e) {
        handleServiceError(e);
        return false;
      }
    },
    [currentTeam?.id, saveMonthlyRetrospectiveMutation, selectedYearMonth, user],
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
      const today = dayjs().format('YYYY-MM-DD');
      setSelectedDate(today);
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

  const handleSelectYearMonthWeek = useCallback((yearMonth: string, weekNumber?: number) => {
    const { ranges } = getCalendarWeekRanges(yearMonth);
    if (ranges.length === 0) {
      setSelectedDate(`${yearMonth}-01`);
      return;
    }

    const targetIndex = weekNumber ? Math.min(Math.max(weekNumber - 1, 0), ranges.length - 1) : 0;
    const targetRange = ranges[targetIndex];
    const today = dayjs();
    const todayStr = today.format('YYYY-MM-DD');

    if (
      getOwningMonthForDate(todayStr) === yearMonth &&
      targetRange.s.format('YYYY-MM-DD') <= todayStr &&
      targetRange.e.format('YYYY-MM-DD') >= todayStr
    ) {
      setSelectedDate(todayStr);
      return;
    }

    setSelectedDate(targetRange.s.format('YYYY-MM-DD'));
  }, []);

  return (
    <GradientBackground>
      <SafeAreaView style={ds.safe} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          style={ds.scroll}
          contentContainerStyle={ds.tabScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <PageHeader title="Routine" />

            <WeeklyCalendarCard
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              markings={calendarMarkings}
              setMonthPickerVisible={setMonthPickerVisible}
              selectedYearMonth={selectedYearMonth}
            />

            {/* 선택한 날짜 통계 카드 */}
            <View style={styles.section}>
              <DaySummaryCard
                stats={user ? daySummaryStats : null}
                isToday={selectedDate === todayStr}
                isFuture={selectedDate > todayStr}
              />
            </View>

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <GoalSetting
                yearMonth={selectedYearMonth}
                teamGoals={myVisibleGoals}
                myGoals={currentTeamUserGoals}
                weeklyDoneCounts={weeklyDoneCounts}
                todayCheckedInGoalIds={todayCheckedInGoalIds}
                selectedWeekLabel={selectedWeekLabel}
                selectedDayGoalStatusById={selectedDayGoalStatusById}
                onEnd={handleEndGoal}
                onRemove={handleRemoveGoal}
                monthlyResolution={monthlyResolution}
                monthlyRetrospective={monthlyRetrospective}
                onEditResolution={openResolutionModal}
                onEditRetrospective={currentTeam ? openRetrospectiveModal : undefined}
                onAddRoutine={() => setAddRoutineVisible(true)}
              />
            )}
          </View>
        </ScrollView>

        <AddRoutineModal visible={addRoutineVisible} onClose={() => setAddRoutineVisible(false)} />

        <GlassModal
          visible={resolutionModalVisible}
          title={`${dayjs(`${selectedYearMonth}-01`).format('YYYY년 M월')} 한마디`}
          onClose={() => setResolutionModalVisible(false)}
          onConfirm={async () => {
            const ok = await handleUpdateResolution(resolutionInput);
            if (ok) setResolutionModalVisible(false);
          }}
        >
          <TextInput
            placeholder="이번 달의 다짐이나 목표를 적어보세요"
            value={resolutionInput}
            onChangeText={setResolutionInput}
            autoFocus
            maxLength={50}
          />
        </GlassModal>

        <GlassModal
          visible={retrospectiveModalVisible}
          title={`${dayjs(`${selectedYearMonth}-01`).format('YYYY년 M월')} 회고`}
          onClose={() => setRetrospectiveModalVisible(false)}
          onConfirm={async () => {
            const ok = await handleUpdateRetrospective(retrospectiveInput);
            if (ok) setRetrospectiveModalVisible(false);
          }}
        >
          <TextInput
            placeholder="이번 달은 어떠셨나요? 회고를 남겨보세요"
            value={retrospectiveInput}
            onChangeText={setRetrospectiveInput}
            autoFocus
            maxLength={200}
            multiline
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
        </GlassModal>
        <MonthPickerModal
          visible={monthPickerVisible}
          onClose={() => setMonthPickerVisible(false)}
          currentYearMonth={selectedYearMonth}
          currentDate={selectedDate}
          onSelect={handleSelectYearMonthWeek}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  loadingWrap: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
