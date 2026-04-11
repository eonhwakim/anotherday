import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  saveMonthlyResolution,
  saveMonthlyRetrospective,
} from '../services/monthlyService';
import { queryKeys } from './queryKeys';

export function useSaveMonthlyResolutionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveMonthlyResolution,
    onSuccess: async (_, variables) => {
      const { userId, yearMonth, teamId } = variables;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.resolution(userId, yearMonth, teamId ?? null),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthlySummary(userId, yearMonth, teamId ?? undefined),
      });
      if (teamId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.teams.detailMonth(teamId, yearMonth),
        });
      }
    },
  });
}

export function useSaveMonthlyRetrospectiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveMonthlyRetrospective,
    onSuccess: async (_, variables) => {
      const { userId, yearMonth, teamId } = variables;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.retrospective(userId, yearMonth, teamId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthlySummary(userId, yearMonth, teamId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teams.detailMonth(teamId, yearMonth),
      });
    },
  });
}
