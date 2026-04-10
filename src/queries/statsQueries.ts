import { useQuery } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import {
  fetchCalendarMarkings,
  fetchMemberDateCheckins,
  fetchMemberProgress,
} from '../services/statsService';
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
