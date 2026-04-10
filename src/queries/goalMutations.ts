import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import { createCheckin, deleteCheckin, extendGoalsForNewMonth } from '../services/goalService';
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
