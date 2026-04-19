import { supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from '../lib/auth';
import { ServiceError } from '../lib/serviceError';
import type { DailyTodo, DailyTodoReminderMinutes } from '../types/domain';

export async function fetchDailyTodos(userId: string, date: string): Promise<DailyTodo[]> {
  const actorUserId = await requireAuthenticatedUserId(userId);

  const { data, error } = await supabase
    .from('daily_todos')
    .select('*')
    .eq('user_id', actorUserId)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) {
    throw new ServiceError('오늘 할 일을 불러오지 못했습니다.', 'fetchDailyTodos', error.message);
  }

  return (data ?? []) as DailyTodo[];
}

export async function createDailyTodo(params: {
  userId: string;
  date: string;
  title: string;
  dueTime?: string | null;
  reminderMinutes?: DailyTodoReminderMinutes | null;
}): Promise<DailyTodo> {
  const actorUserId = await requireAuthenticatedUserId(params.userId);
  const trimmed = params.title.trim();
  if (!trimmed) {
    throw new ServiceError('할 일을 입력해주세요.', 'createDailyTodo', 'empty title');
  }

  const { data, error } = await supabase
    .from('daily_todos')
    .insert({
      user_id: actorUserId,
      date: params.date,
      title: trimmed,
      due_time: params.dueTime ?? null,
      reminder_minutes: params.reminderMinutes ?? null,
      is_completed: false,
    })
    .select('*')
    .single();

  if (error) {
    throw new ServiceError('오늘 할 일을 저장하지 못했습니다.', 'createDailyTodo', error.message);
  }

  return data as DailyTodo;
}

export async function updateDailyTodo(params: {
  todoId: string;
  title: string;
  dueTime?: string | null;
  reminderMinutes?: DailyTodoReminderMinutes | null;
}): Promise<DailyTodo> {
  const trimmed = params.title.trim();
  if (!trimmed) {
    throw new ServiceError('할 일을 입력해주세요.', 'updateDailyTodo', 'empty title');
  }

  const { data, error } = await supabase
    .from('daily_todos')
    .update({
      title: trimmed,
      due_time: params.dueTime ?? null,
      reminder_minutes: params.reminderMinutes ?? null,
    })
    .eq('id', params.todoId)
    .select('*')
    .single();

  if (error) {
    throw new ServiceError('할 일을 수정하지 못했습니다.', 'updateDailyTodo', error.message);
  }

  return data as DailyTodo;
}

export async function toggleDailyTodo(params: {
  todoId: string;
  isCompleted: boolean;
}): Promise<DailyTodo> {
  const { data, error } = await supabase
    .from('daily_todos')
    .update({ is_completed: params.isCompleted })
    .eq('id', params.todoId)
    .select('*')
    .single();

  if (error) {
    throw new ServiceError('할 일 상태를 변경하지 못했습니다.', 'toggleDailyTodo', error.message);
  }

  return data as DailyTodo;
}

export async function deleteDailyTodo(todoId: string): Promise<boolean> {
  const { error } = await supabase.from('daily_todos').delete().eq('id', todoId);

  if (error) {
    throw new ServiceError('할 일을 삭제하지 못했습니다.', 'deleteDailyTodo', error.message);
  }

  return true;
}
