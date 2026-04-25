import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../queries/queryKeys';

export function useHomeRefresh(params: {
  currentTeamId?: string;
  todayStr: string;
  userId?: string;
}) {
  const { currentTeamId, todayStr, userId } = params;
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!userId) return;

    const refreshes = [
      queryClient.refetchQueries({
        queryKey: queryKeys.todos.daily(userId, todayStr),
        exact: true,
        type: 'active',
      }),
      queryClient.refetchQueries({
        queryKey: queryKeys.goals.mine(userId),
        exact: true,
        type: 'active',
      }),
      queryClient.refetchQueries({
        queryKey: queryKeys.goals.todayCheckins(userId, todayStr),
        exact: true,
        type: 'active',
      }),
      queryClient.refetchQueries({
        queryKey: queryKeys.stats.memberProgress(currentTeamId, userId, todayStr),
        exact: true,
        type: 'active',
      }),
      queryClient.refetchQueries({
        queryKey: ['goals', 'weekly-done-counts', userId],
        exact: false,
        type: 'active',
      }),
    ];

    if (currentTeamId) {
      refreshes.unshift(
        queryClient.refetchQueries({
          queryKey: queryKeys.goals.team(currentTeamId, userId),
          exact: true,
          type: 'active',
        }),
      );
    }

    await Promise.all(refreshes);
  }, [currentTeamId, queryClient, todayStr, userId]);
}
