import { useQuery } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import { fetchMemberProgress } from '../services/statsService';
import { queryKeys } from './queryKeys';

export function useMemberProgressQuery(teamId?: string, userId?: string, date = dayjs().format('YYYY-MM-DD')) {
  return useQuery({
    queryKey: queryKeys.stats.memberProgress(teamId, userId, date),
    queryFn: () => fetchMemberProgress(teamId, userId),
    enabled: !!userId,
  });
}
