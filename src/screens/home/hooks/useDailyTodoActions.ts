import { useCallback } from 'react';
import { handleServiceError } from '../../../lib/serviceError';
import {
  useCreateDailyTodoMutation,
  useDeleteDailyTodoMutation,
  useToggleDailyTodoMutation,
  useUpdateDailyTodoMutation,
} from '../../../queries/todoMutations';
import type { DailyTodoReminderMinutes } from '../../../types/domain';

type DailyTodoPayload = {
  title: string;
  dueTime: string;
  reminderMinutes: DailyTodoReminderMinutes | null;
};

type DailyTodoUpdatePayload = DailyTodoPayload & {
  todoId: string;
};

export function useDailyTodoActions(params: { todayStr: string; userId?: string }) {
  const { todayStr, userId } = params;
  const createDailyTodoMutation = useCreateDailyTodoMutation({
    userId,
    date: todayStr,
  });
  const toggleDailyTodoMutation = useToggleDailyTodoMutation({
    userId,
    date: todayStr,
  });
  const updateDailyTodoMutation = useUpdateDailyTodoMutation({
    userId,
    date: todayStr,
  });
  const deleteDailyTodoMutation = useDeleteDailyTodoMutation({
    userId,
    date: todayStr,
  });

  const handleAddDailyTodo = useCallback(
    async (params: DailyTodoPayload) => {
      if (!userId) return;
      try {
        await createDailyTodoMutation.mutateAsync({
          userId,
          date: todayStr,
          title: params.title,
          dueTime: params.dueTime,
          reminderMinutes: params.reminderMinutes,
        });
      } catch (e) {
        handleServiceError(e);
      }
    },
    [createDailyTodoMutation, todayStr, userId],
  );

  const handleUpdateDailyTodo = useCallback(
    async (params: DailyTodoUpdatePayload) => {
      try {
        await updateDailyTodoMutation.mutateAsync(params);
      } catch (e) {
        handleServiceError(e);
      }
    },
    [updateDailyTodoMutation],
  );

  const handleToggleDailyTodo = useCallback(
    async (todo: { id: string; is_completed: boolean }) => {
      try {
        await toggleDailyTodoMutation.mutateAsync({
          todoId: todo.id,
          isCompleted: !todo.is_completed,
        });
      } catch (e) {
        handleServiceError(e);
      }
    },
    [toggleDailyTodoMutation],
  );

  const handleDeleteDailyTodo = useCallback(
    async (todo: { id: string }) => {
      try {
        await deleteDailyTodoMutation.mutateAsync(todo.id);
      } catch (e) {
        handleServiceError(e);
      }
    },
    [deleteDailyTodoMutation],
  );

  return {
    handleAddDailyTodo,
    handleDeleteDailyTodo,
    handleToggleDailyTodo,
    handleUpdateDailyTodo,
  };
}
