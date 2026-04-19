import { useQuery } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import { ServiceError } from '../lib/serviceError';
import { fetchDailyTodos } from '../services/todoService';
import { queryKeys } from './queryKeys';

export function useDailyTodosQuery(userId?: string, date = dayjs().format('YYYY-MM-DD')) {
  return useQuery({
    queryKey: userId ? queryKeys.todos.daily(userId, date) : ['todos', 'daily', null, date],
    queryFn: () => {
      if (!userId) {
        throw new ServiceError(
          '오늘 할 일을 불러올 조건이 올바르지 않습니다.',
          'useDailyTodosQuery',
          'userId is required',
        );
      }

      return fetchDailyTodos(userId, date);
    },
    enabled: !!userId,
  });
}
