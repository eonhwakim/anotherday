import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import {
  createDailyTodo,
  deleteDailyTodo,
  toggleDailyTodo,
  updateDailyTodo,
} from '../services/todoService';
import {
  cancelTodoReminderNotification,
  scheduleTodoReminderNotification,
} from '../utils/notifications';
import { queryKeys } from './queryKeys';

export function useCreateDailyTodoMutation(params: {
  userId?: string;
  date?: string;
}) {
  const { userId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDailyTodo,
    onSuccess: async (createdTodo) => {
      if (!userId) return;

      await scheduleTodoReminderNotification(createdTodo);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todos.daily(userId, date),
      });
    },
  });
}

export function useToggleDailyTodoMutation(params: {
  userId?: string;
  date?: string;
}) {
  const { userId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleDailyTodo,
    onSuccess: async (updatedTodo) => {
      if (!userId) return;

      if (updatedTodo.is_completed) {
        await cancelTodoReminderNotification(updatedTodo.id);
      } else {
        await scheduleTodoReminderNotification(updatedTodo);
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todos.daily(userId, date),
      });
    },
  });
}

export function useUpdateDailyTodoMutation(params: {
  userId?: string;
  date?: string;
}) {
  const { userId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDailyTodo,
    onSuccess: async (updatedTodo) => {
      if (!userId) return;

      await scheduleTodoReminderNotification(updatedTodo);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todos.daily(userId, date),
      });
    },
  });
}

export function useDeleteDailyTodoMutation(params: {
  userId?: string;
  date?: string;
}) {
  const { userId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDailyTodo,
    onSuccess: async (_, deletedTodoId) => {
      if (!userId) return;

      await cancelTodoReminderNotification(deletedTodoId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todos.daily(userId, date),
      });
    },
  });
}
