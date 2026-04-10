import { useQuery } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import {
  fetchCalendarMarkings,
  fetchMemberDateCheckins,
  fetchMonthlyStatisticsSummary,
  fetchMemberProgress,
  fetchWeeklyStats,
} from '../services/statsService';
import { fetchMyGoalsForRange } from '../services/goalService';
import type { Goal } from '../types/domain';
import { queryKeys } from './queryKeys';

export function useMemberProgressQuery(teamId?: string, userId?: string, date = dayjs().format('YYYY-MM-DD')) {
  return useQuery({
    queryKey: queryKeys.stats.memberProgress(teamId, userId, date),
    queryFn: () => fetchMemberProgress(teamId, userId),
    enabled: !!userId,
  });
}

export function useCalendarMarkingsQuery(userId?: string, yearMonth?: string) {
  return useQuery({
    queryKey:
      userId && yearMonth
        ? queryKeys.stats.calendar(userId, yearMonth)
        : ['stats', 'calendar', null, yearMonth ?? null],
    queryFn: () => fetchCalendarMarkings(userId!, yearMonth!),
    enabled: !!userId && !!yearMonth,
  });
}

export function useMemberDateCheckinsQuery(
  teamId?: string,
  userId?: string,
  date = dayjs().format('YYYY-MM-DD'),
) {
  return useQuery({
    queryKey: userId
      ? queryKeys.stats.memberDateCheckins(teamId, userId, date)
      : ['stats', 'member-date-checkins', teamId ?? null, null, date],
    queryFn: () => fetchMemberDateCheckins(teamId, userId!, date),
    enabled: !!userId,
  });
}

export function useMonthlyStatisticsSummaryQuery(
  userId?: string,
  yearMonth?: string,
  teamId?: string,
) {
  return useQuery({
    queryKey:
      userId && yearMonth
        ? queryKeys.stats.monthlySummary(userId, yearMonth, teamId)
        : ['stats', 'monthly-summary', null, yearMonth ?? null, teamId ?? null],
    queryFn: () =>
      fetchMonthlyStatisticsSummary({
        userId: userId!,
        yearMonth: yearMonth!,
        teamId,
      }),
    enabled: !!userId && !!yearMonth,
  });
}

export function useWeeklyStatisticsBundleQuery(params: {
  userId?: string;
  teamId?: string;
  weekStart: string;
  teamGoals: Goal[];
}) {
  const { userId, teamId, weekStart, teamGoals } = params;
  const goalFingerprint = teamGoals
    .map((goal) => `${goal.id}:${goal.name}`)
    .sort()
    .join('|');

  return useQuery({
    queryKey: queryKeys.stats.weeklyBundle(teamId, userId, weekStart, goalFingerprint),
    queryFn: async () => {
      if (!userId || !teamId) {
        return {
          weeklyTeamData: [],
          weeklyCheckins: [],
          myWeeklyGoalPeriods: [],
        };
      }

      const weekEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');
      const goalNameMap = new Map(teamGoals.map((goal) => [goal.id, goal.name]));
      const [weeklyStats, myWeeklyGoalPeriods] = await Promise.all([
        fetchWeeklyStats({
          teamId,
          userId,
          weekStart,
          goalNameMap,
        }),
        fetchMyGoalsForRange(userId, weekStart, weekEnd),
      ]);

      return {
        weeklyTeamData: weeklyStats.weeklyTeamData,
        weeklyCheckins: weeklyStats.weeklyCheckins,
        myWeeklyGoalPeriods,
      };
    },
    enabled: !!userId,
  });
}
