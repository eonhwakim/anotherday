import { useQuery } from '@tanstack/react-query';
import {
  getMonthlyResolution,
  getMonthlyRetrospective,
} from '../services/monthlyService';
import { queryKeys } from './queryKeys';

export function useMonthlyResolutionQuery(params: {
  userId?: string;
  yearMonth?: string;
  teamId?: string | null;
}) {
  const { userId, yearMonth, teamId } = params;

  return useQuery({
    queryKey:
      userId && yearMonth
        ? queryKeys.monthly.resolution(userId, yearMonth, teamId)
        : ['monthly', 'resolution', null, yearMonth ?? null, teamId ?? null],
    queryFn: () => getMonthlyResolution(userId!, yearMonth!, teamId),
    enabled: !!userId && !!yearMonth,
  });
}

export function useMonthlyRetrospectiveQuery(params: {
  userId?: string;
  yearMonth?: string;
  teamId?: string | null;
}) {
  const { userId, yearMonth, teamId } = params;

  return useQuery({
    queryKey:
      userId && yearMonth && teamId
        ? queryKeys.monthly.retrospective(userId, yearMonth, teamId)
        : ['monthly', 'retrospective', null, yearMonth ?? null, teamId ?? null],
    queryFn: () => getMonthlyRetrospective(userId!, yearMonth!, teamId!),
    enabled: !!userId && !!yearMonth && !!teamId,
  });
}
