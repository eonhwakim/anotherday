import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import {
  addGoal,
  createCheckin,
  deleteCheckin,
  endTeamGoal,
  extendGoalsForNewMonth,
  removeTeamGoal,
} from '../services/goalService';
import type { Goal } from '../types/domain';
import { queryKeys } from './queryKeys';

async function invalidateCheckinRelatedQueries(params: {
  queryClient: QueryClient;
  userId: string;
  teamId?: string;
  date: string;
}) {
  const { queryClient, userId, teamId, date } = params;
  const yearMonth = dayjs(date).format('YYYY-MM');

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.goals.todayCheckins(userId, date),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.goals.mine(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: ['goals', 'weekly-done-counts', userId],
      exact: false,
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.memberProgress(teamId, userId, date),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.calendar(userId, yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.monthlyCheckins(userId, yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.dateCheckins(userId, date),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.memberDateCheckins(teamId, userId, date),
    }),
  ]);
}

export function useCreateCheckinMutation(params: {
  userId?: string;
  teamId?: string;
  date?: string;
}) {
  const { userId, teamId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCheckin,
    onSuccess: async (_, variables) => {
      if (!userId) return;

      await invalidateCheckinRelatedQueries({
        queryClient,
        userId,
        teamId,
        date: variables.date ?? date,
      });
    },
  });
}

export function useDeleteCheckinMutation(params: {
  userId?: string;
  teamId?: string;
  date?: string;
}) {
  const { userId, teamId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCheckin,
    onSuccess: async () => {
      if (!userId) return;

      await invalidateCheckinRelatedQueries({
        queryClient,
        userId,
        teamId,
        date,
      });
    },
  });
}

export function useExtendGoalsForNewMonthMutation(params: {
  userId?: string;
  teamId?: string;
}) {
  const { userId, teamId } = params;
  const queryClient = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');

  return useMutation({
    mutationFn: ({ newMonthStr }: { newMonthStr: string }) => extendGoalsForNewMonth(userId!, newMonthStr),
    onSuccess: async () => {
      if (!userId) return;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.mine(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['goals', 'mine-month', userId],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.lastMonth(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['goals', 'weekly-done-counts', userId],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.memberProgress(teamId, userId, today),
        }),
      ]);
    },
  });
}

export function useAddGoalMutation(params: {
  userId?: string;
  teamId?: string;
  existingGoals: Goal[];
}) {
  const { userId, teamId, existingGoals } = params;
  const queryClient = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');

  return useMutation({
    mutationFn: (variables: {
      teamId?: string;
      userId: string;
      name: string;
      frequency?: 'daily' | 'weekly_count';
      targetCount?: number | null;
      duration?: 'continuous' | 'this_month';
    }) =>
      addGoal({
        ...variables,
        existingGoals,
      }),
    onSuccess: async () => {
      if (!userId) return;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.mine(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['goals', 'mine-month', userId],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: ['goals', 'team'],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.memberProgress(teamId, userId, today),
        }),
      ]);
    },
  });
}

export function useEndTeamGoalMutation(params: {
  userId?: string;
  teamId?: string;
}) {
  const { userId, teamId } = params;
  const queryClient = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');
  const currentMonth = dayjs().format('YYYY-MM');

  return useMutation({
    mutationFn: ({ goalId }: { goalId: string }) => endTeamGoal(userId!, goalId),
    onSuccess: async () => {
      if (!userId) return;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.mine(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['goals', 'mine-month', userId],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.todayCheckins(userId, today),
        }),
        queryClient.invalidateQueries({
          queryKey: ['goals', 'team'],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.memberProgress(teamId, userId, today),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.calendar(userId, currentMonth),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.monthlyCheckins(userId, currentMonth),
        }),
      ]);
    },
  });
}

export function useRemoveTeamGoalMutation(params: {
  userId?: string;
  teamId?: string;
}) {
  const { userId, teamId } = params;
  const queryClient = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');
  const currentMonth = dayjs().format('YYYY-MM');

  return useMutation({
    mutationFn: ({ goalId }: { goalId: string }) => removeTeamGoal(teamId ?? '', userId!, goalId),
    onSuccess: async () => {
      if (!userId) return;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.mine(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['goals', 'mine-month', userId],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.goals.todayCheckins(userId, today),
        }),
        queryClient.invalidateQueries({
          queryKey: ['goals', 'team'],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.memberProgress(teamId, userId, today),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.calendar(userId, currentMonth),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.monthlyCheckins(userId, currentMonth),
        }),
      ]);
    },
  });
}
