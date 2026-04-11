import { useQuery } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import {
  fetchExtendableGoalsForMonth,
  fetchMyGoals,
  fetchMyGoalsForMonth,
  fetchTeamGoals,
  fetchTodayCheckins,
  fetchWeeklyDoneCountsForGoals,
} from '../services/goalService';
import { queryKeys } from './queryKeys';

export function useTeamGoalsQuery(teamId: string, userId?: string) {
  return useQuery({
    queryKey: queryKeys.goals.team(teamId, userId),
    queryFn: () => fetchTeamGoals(teamId, userId),
    enabled: !!userId && !!teamId,
  });
}

export function useMyGoalsQuery(userId?: string) {
  return useQuery({
    queryKey: userId ? queryKeys.goals.mine(userId) : ['goals', 'mine', null],
    queryFn: () => fetchMyGoals(userId!),
    enabled: !!userId,
  });
}

export function useTodayCheckinsQuery(userId?: string, date = dayjs().format('YYYY-MM-DD')) {
  return useQuery({
    queryKey: userId ? queryKeys.goals.todayCheckins(userId, date) : ['goals', 'today-checkins', null, date],
    queryFn: () => fetchTodayCheckins(userId!),
    enabled: !!userId,
  });
}

export function useMyGoalsForMonthQuery(userId?: string, yearMonth?: string) {
  return useQuery({
    queryKey:
      userId && yearMonth
        ? queryKeys.goals.mineMonth(userId, yearMonth)
        : ['goals', 'mine-month', null, yearMonth ?? null],
    queryFn: () => fetchMyGoalsForMonth(userId!, yearMonth!),
    enabled: !!userId && !!yearMonth,
  });
}

export function useExtendableGoalsForMonthQuery(userId?: string, yearMonth?: string) {
  return useQuery({
    queryKey:
      userId && yearMonth
        ? queryKeys.goals.extendableMonth(userId, yearMonth)
        : ['goals', 'extendable-month', null, yearMonth ?? null],
    queryFn: () => fetchExtendableGoalsForMonth(userId!, yearMonth!),
    enabled: !!userId && !!yearMonth,
  });
}

export function useWeeklyDoneCountsQuery(params: {
  userId?: string;
  goalIds: string[];
  weekStart?: string;
  weekEnd?: string;
}) {
  const { userId, goalIds, weekStart, weekEnd } = params;
  const sortedGoalIds = [...goalIds].sort();
  const effectiveWeekStart = weekStart ?? dayjs().startOf('isoWeek').format('YYYY-MM-DD');
  const effectiveWeekEnd = weekEnd ?? dayjs(effectiveWeekStart).endOf('isoWeek').format('YYYY-MM-DD');

  return useQuery({
    queryKey: userId
      ? queryKeys.goals.weeklyDoneCounts(userId, effectiveWeekStart, effectiveWeekEnd, sortedGoalIds)
      : ['goals', 'weekly-done-counts', null, effectiveWeekStart, effectiveWeekEnd],
    queryFn: async () => {
      if (!userId || sortedGoalIds.length === 0) {
        return {} as Record<string, number>;
      }

      return fetchWeeklyDoneCountsForGoals({
        userId,
        goalIds: sortedGoalIds,
        weekStart: effectiveWeekStart,
        weekEnd: effectiveWeekEnd,
      });
    },
    enabled: !!userId,
  });
}
