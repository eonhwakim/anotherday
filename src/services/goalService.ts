import { supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from '../lib/auth';
import dayjs from '../lib/dayjs';
import { getCalendarWeekRanges } from '../lib/statsUtils';
import { ServiceError } from '../lib/serviceError';
import type { Checkin, Goal, UserGoal } from '../types/domain';

function getRoutineWindowForMonth(monthStr: string) {
  const { ranges } = getCalendarWeekRanges(monthStr);
  if (ranges.length > 0) {
    return {
      start: ranges[0].s.format('YYYY-MM-DD'),
      end: ranges[ranges.length - 1].e.format('YYYY-MM-DD'),
    };
  }

  return {
    start: dayjs(`${monthStr}-01`).startOf('month').format('YYYY-MM-DD'),
    end: dayjs(`${monthStr}-01`).endOf('month').format('YYYY-MM-DD'),
  };
}

interface UserGoalPeriodRow {
  id: string;
  start_date: string | null;
  end_date: string | null;
}

async function findCurrentUserGoalPeriod(
  userId: string,
  goalId: string,
  referenceDate = dayjs().format('YYYY-MM-DD'),
): Promise<UserGoalPeriodRow | null> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('id, start_date, end_date')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('start_date', { ascending: false });

  if (error) {
    throw new ServiceError('목표 정보를 불러오지 못했습니다.', 'findCurrentUserGoalPeriod', error.message);
  }

  const rows = (data ?? []) as UserGoalPeriodRow[];
  return (
    rows.find((row) => {
      const startsOnOrBeforeReference = !row.start_date || row.start_date <= referenceDate;
      const endsOnOrAfterReference = !row.end_date || row.end_date >= referenceDate;
      return startsOnOrBeforeReference && endsOnOrAfterReference;
    }) ?? null
  );
}

export async function fetchExtendableGoalsForMonth(
  userId: string,
  newMonthStr: string,
): Promise<UserGoal[]> {
  const prevMonthStr = dayjs(`${newMonthStr}-01`).subtract(1, 'month').format('YYYY-MM');
  const prevWindow = getRoutineWindowForMonth(prevMonthStr);
  const nextWindow = getRoutineWindowForMonth(newMonthStr);

  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .eq('end_date', prevWindow.end);

  if (error) {
    throw new ServiceError('연장 가능한 목표를 확인하지 못했습니다.', 'fetchExtendableGoalsForMonth', error.message);
  }

  const targets = (data ?? []) as UserGoal[];
  if (targets.length === 0) return [];

  const { data: nextMonthGoals, error: nextMonthError } = await supabase
    .from('user_goals')
    .select('goal_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .lte('start_date', nextWindow.end)
    .or(`end_date.is.null,end_date.gte.${nextWindow.start}`);

  if (nextMonthError) {
    throw new ServiceError('다음 달 목표를 확인하지 못했습니다.', 'fetchExtendableGoalsForMonth', nextMonthError.message);
  }

  const existingGoalIds = new Set((nextMonthGoals ?? []).map((row: { goal_id: string }) => row.goal_id));
  return targets.filter((goal) => !existingGoalIds.has(goal.goal_id));
}

export async function fetchLastMonthGoals(userId: string): Promise<UserGoal[]> {
  const today = dayjs().format('YYYY-MM-DD');
  const lastMonthStart = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');

  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .lt('end_date', today)
    .gte('end_date', lastMonthStart);

  if (error) {
    throw new ServiceError('지난 달 목표를 불러오지 못했습니다.', 'fetchLastMonthGoals', error.message);
  }

  return (data ?? []) as UserGoal[];
}

export async function copyGoalsFromLastMonth(userId: string, goals: UserGoal[]): Promise<boolean> {
  if (goals.length === 0) return true;

  const actorUserId = await requireAuthenticatedUserId(userId);
  const today = dayjs().format('YYYY-MM-DD');
  const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

  const updates = goals.map((g) => ({
    id: g.id,
    user_id: actorUserId,
    goal_id: g.goal_id,
    start_date: today,
    end_date: endOfMonth,
    is_active: true,
    frequency: g.frequency,
    target_count: g.target_count,
  }));

  const { error } = await supabase.from('user_goals').upsert(updates);
  if (error) {
    throw new ServiceError('목표 복사에 실패했습니다.', 'copyGoalsFromLastMonth', error.message);
  }

  return true;
}

export async function extendGoalsForNewMonth(
  userId: string,
  newMonthStr: string,
): Promise<boolean> {
  const actorUserId = await requireAuthenticatedUserId(userId);
  const nextWindow = getRoutineWindowForMonth(newMonthStr);
  const targets = await fetchExtendableGoalsForMonth(actorUserId, newMonthStr);

  if (!targets || targets.length === 0) return true;

  const targetGoalIds = Array.from(new Set(targets.map((goal) => goal.goal_id)));
  const { data: existingRows, error: existingRowsError } = await supabase
    .from('user_goals')
    .select('goal_id, start_date, end_date')
    .eq('user_id', actorUserId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .in('goal_id', targetGoalIds)
    .lte('start_date', nextWindow.end)
    .or(`end_date.is.null,end_date.gte.${nextWindow.start}`);

  if (existingRowsError) {
    throw new ServiceError(
      '목표 연장에 실패했습니다.',
      'extendGoalsForNewMonth',
      existingRowsError.message,
    );
  }

  const existingGoalIds = new Set(
    ((existingRows ?? []) as Pick<UserGoal, 'goal_id'>[]).map((row) => row.goal_id),
  );

  const inserts = targets
    .map((goal) => {
      if (existingGoalIds.has(goal.goal_id)) return null;

      return {
        user_id: actorUserId,
        goal_id: goal.goal_id,
        is_active: true,
        frequency: goal.frequency,
        target_count: goal.target_count,
        start_date: nextWindow.start,
        end_date: nextWindow.end,
        week_days: goal.week_days ?? null,
      };
    })
    .filter((goal): goal is NonNullable<typeof goal> => goal !== null);

  if (inserts.length === 0) {
    return true;
  }

  const { error } = await supabase.from('user_goals').insert(inserts);

  if (error) {
    throw new ServiceError('목표 연장에 실패했습니다.', 'extendGoalsForNewMonth', error.message);
  }

  return true;
}

export async function fetchTeamGoals(teamId: string, userId?: string): Promise<Goal[]> {
  let query = supabase.from('goals').select('*').is('deleted_at', null).order('created_at');

  if (userId) {
    if (teamId && teamId.trim().length > 0) {
      query = query.or(`team_id.eq.${teamId},owner_id.eq.${userId}`);
    } else {
      query = query.eq('owner_id', userId);
    }
  } else {
    if (!teamId || teamId.trim().length === 0) return [];
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query;
  if (error) {
    throw new ServiceError('목표 목록을 불러오지 못했습니다.', 'fetchTeamGoals', error.message);
  }

  return (data ?? []) as Goal[];
}

export async function fetchMyGoals(userId: string): Promise<UserGoal[]> {
  const today = dayjs().format('YYYY-MM-DD');
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (error) {
    throw new ServiceError('내 목표를 불러오지 못했습니다.', 'fetchMyGoals', error.message);
  }

  return (data ?? []) as UserGoal[];
}

export async function fetchMyGoalsForMonth(userId: string, yearMonth: string): Promise<UserGoal[]> {
  const window = getRoutineWindowForMonth(yearMonth);
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .lte('start_date', window.end)
    .or(`end_date.is.null,end_date.gte.${window.start}`)
    .order('start_date', { ascending: false });

  if (error) {
    throw new ServiceError('월간 목표를 불러오지 못했습니다.', 'fetchMyGoalsForMonth', error.message);
  }

  return (data ?? []) as UserGoal[];
}

export async function fetchWeeklyDoneCountsForGoals(params: {
  userId: string;
  goalIds: string[];
  weekStart?: string;
  weekEnd?: string;
}): Promise<Record<string, number>> {
  const { userId, goalIds, weekStart, weekEnd } = params;
  if (goalIds.length === 0) return {};

  const start = weekStart ?? dayjs().startOf('isoWeek').format('YYYY-MM-DD');
  const end = weekEnd ?? dayjs().endOf('isoWeek').format('YYYY-MM-DD');

  const { data, error } = await supabase
    .from('checkins')
    .select('goal_id')
    .eq('user_id', userId)
    .eq('status', 'done')
    .in('goal_id', goalIds)
    .gte('date', start)
    .lte('date', end);

  if (error) {
    throw new ServiceError('주간 완료 횟수를 불러오지 못했습니다.', 'fetchWeeklyDoneCountsForGoals', error.message);
  }

  return (data ?? []).reduce<Record<string, number>>((acc, row: { goal_id: string }) => {
    acc[row.goal_id] = (acc[row.goal_id] ?? 0) + 1;
    return acc;
  }, {});
}

export async function fetchMyGoalsForRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<UserGoal[]> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .lte('start_date', endDate)
    .or(`end_date.is.null,end_date.gte.${startDate}`)
    .order('start_date', { ascending: false });

  if (error) {
    throw new ServiceError('목표를 불러오지 못했습니다.', 'fetchMyGoalsForRange', error.message);
  }

  return (data ?? []) as UserGoal[];
}

export async function endTeamGoal(userId: string, goalId: string): Promise<boolean> {
  const actorUserId = await requireAuthenticatedUserId(userId);
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const currentGoalRow = await findCurrentUserGoalPeriod(actorUserId, goalId, today);

  if (!currentGoalRow) return false;

  const { count: todayCheckinCount, error: todayCheckinError } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', actorUserId)
    .eq('goal_id', goalId)
    .eq('date', today);

  if (todayCheckinError) {
    throw new ServiceError('루틴 종료 처리에 실패했습니다.', 'endTeamGoal', todayCheckinError.message);
  }

  const requestedEndDate =
    currentGoalRow.start_date === today || (todayCheckinCount && todayCheckinCount > 0)
      ? today
      : yesterday;
  const nextEndDate =
    currentGoalRow.end_date && currentGoalRow.end_date < requestedEndDate
      ? currentGoalRow.end_date
      : requestedEndDate;

  const { error } = await supabase
    .from('user_goals')
    .update({ end_date: nextEndDate, is_active: false })
    .eq('id', currentGoalRow.id);

  if (error) {
    throw new ServiceError('루틴 종료 처리에 실패했습니다.', 'endTeamGoal', error.message);
  }

  return true;
}

export async function fetchTodayCheckins(userId: string): Promise<Checkin[]> {
  const today = dayjs().format('YYYY-MM-DD');
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today);

  if (error) {
    throw new ServiceError('오늘의 체크인을 불러오지 못했습니다.', 'fetchTodayCheckins', error.message);
  }

  return (data ?? []) as Checkin[];
}

export async function createCheckin(params: {
  userId: string;
  goalId: string;
  date?: string;
  photoUrl?: string | null;
  memo?: string | null;
  status?: 'done' | 'pass';
}): Promise<boolean> {
  const { userId, goalId, date, photoUrl, memo, status = 'done' } = params;
  const actorUserId = await requireAuthenticatedUserId(userId);
  const checkinDate = date ?? dayjs().format('YYYY-MM-DD');

  const { error } = await supabase.from('checkins').insert({
    user_id: actorUserId,
    goal_id: goalId,
    date: checkinDate,
    photo_url: photoUrl ?? null,
    memo: memo ?? null,
    status,
  });

  if (error) {
    // UNIQUE(user_id, goal_id, date) 위반 — 이미 체크인된 목표
    if (error.code === '23505') return false;
    throw new ServiceError('체크인 저장에 실패했습니다.', 'createCheckin', error.message);
  }

  return true;
}

export async function toggleUserGoal(userId: string, goalId: string): Promise<boolean> {
  const actorUserId = await requireAuthenticatedUserId(userId);
  const { data: current, error: selectError } = await supabase
    .from('user_goals')
    .select('is_active')
    .eq('user_id', actorUserId)
    .eq('goal_id', goalId)
    .single();

  if (selectError) {
    throw new ServiceError('목표 상태 변경에 실패했습니다.', 'toggleUserGoal', selectError.message);
  }

  const { error: updateError } = await supabase
    .from('user_goals')
    .update({ is_active: !current.is_active })
    .eq('user_id', actorUserId)
    .eq('goal_id', goalId);

  if (updateError) {
    throw new ServiceError('목표 상태 변경에 실패했습니다.', 'toggleUserGoal', updateError.message);
  }

  return true;
}

export async function addGoal(params: {
  teamId?: string;
  userId: string;
  name: string;
  frequency?: 'daily' | 'weekly_count';
  targetCount?: number | null;
  duration?: 'continuous' | 'this_month';
  existingGoals: Goal[];
}): Promise<boolean> {
  const {
    teamId,
    userId,
    name,
    frequency = 'daily',
    targetCount = null,
    duration = 'continuous',
    existingGoals,
  } = params;
  const actorUserId = await requireAuthenticatedUserId(userId);

  const trimmed = name.trim();
  if (!trimmed) return false;

  const today = dayjs().format('YYYY-MM-DD');
  let computedEndDate: string | null = null;

  if (duration === 'this_month') {
    const todayDayjs = dayjs();
    const todayStr = todayDayjs.format('YYYY-MM-DD');
    const candidates = [todayDayjs.format('YYYY-MM'), todayDayjs.add(1, 'month').format('YYYY-MM')];

    let targetMonth = candidates[0];
    let matchedRanges: { s: dayjs.Dayjs; e: dayjs.Dayjs }[] = [];

    for (const monthStr of candidates) {
      const { ranges } = getCalendarWeekRanges(monthStr);
      const isTodayInRanges = ranges.some(
        (r) => r.s.format('YYYY-MM-DD') <= todayStr && r.e.format('YYYY-MM-DD') >= todayStr,
      );
      if (isTodayInRanges) {
        targetMonth = monthStr;
        matchedRanges = ranges;
        break;
      }
    }

    if (matchedRanges.length > 0) {
      computedEndDate = matchedRanges[matchedRanges.length - 1].e.format('YYYY-MM-DD');
    } else {
      computedEndDate = dayjs(`${targetMonth}-01`).endOf('month').format('YYYY-MM-DD');
    }
  }

  const myExisting = existingGoals.find(
    (goal) => goal.name.toLowerCase() === trimmed.toLowerCase() && goal.owner_id === actorUserId,
  );

  if (myExisting) {
    const { data: myGoalRows, error: myGoalError } = await supabase
      .from('user_goals')
      .select('id, start_date, end_date')
      .eq('user_id', actorUserId)
      .eq('goal_id', myExisting.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

    if (myGoalError) {
      throw new ServiceError('루틴 추가에 실패했습니다.', 'addGoal', myGoalError.message);
    }

    const hasActivePeriodToday = (myGoalRows ?? []).some((row: UserGoalPeriodRow) => {
      const startsOnOrBeforeToday = !row.start_date || row.start_date <= today;
      const endsOnOrAfterToday = !row.end_date || row.end_date >= today;
      return startsOnOrBeforeToday && endsOnOrAfterToday;
    });

    if (hasActivePeriodToday) {
      return false;
    }

    const { error } = await supabase.from('user_goals').insert({
      user_id: actorUserId,
      goal_id: myExisting.id,
      is_active: true,
      frequency,
      target_count: targetCount,
      start_date: today,
      end_date: computedEndDate,
    });

    if (error) {
      throw new ServiceError('루틴 추가에 실패했습니다.', 'addGoal', error.message);
    }

    return true;
  }

  const payload: { name: string; owner_id: string; team_id?: string } = {
    name: trimmed,
    owner_id: actorUserId,
  };
  if (teamId) payload.team_id = teamId;

  const { data: newGoal, error } = await supabase.from('goals').insert(payload).select().single();
  if (error || !newGoal) {
    throw new ServiceError('루틴 추가에 실패했습니다.', 'addGoal', error?.message);
  }

  const { error: userGoalError } = await supabase.from('user_goals').insert({
    user_id: actorUserId,
    goal_id: newGoal.id,
    is_active: true,
    frequency,
    target_count: targetCount,
    start_date: today,
    end_date: computedEndDate,
  });

  if (userGoalError) {
    throw new ServiceError('루틴 추가에 실패했습니다.', 'addGoal', userGoalError.message);
  }

  return true;
}

export async function removeTeamGoal(teamId: string, userId: string, goalId: string): Promise<boolean> {
  const actorUserId = await requireAuthenticatedUserId(userId);
  const today = dayjs().format('YYYY-MM-DD');
  const currentGoalRow = await findCurrentUserGoalPeriod(actorUserId, goalId, today);

  if (!currentGoalRow) return false;

  const activeStart = currentGoalRow.start_date ?? today;
  const activeEnd = currentGoalRow.end_date ?? today;

  const { error: checkinDeleteError } = await supabase
    .from('checkins')
    .delete()
    .eq('user_id', actorUserId)
    .eq('goal_id', goalId)
    .gte('date', activeStart)
    .lte('date', activeEnd);

  if (checkinDeleteError) {
    throw new ServiceError('루틴 삭제에 실패했습니다.', 'removeTeamGoal', checkinDeleteError.message);
  }

  const { error: userGoalDeleteError } = await supabase
    .from('user_goals')
    .delete()
    .eq('id', currentGoalRow.id);

  if (userGoalDeleteError) {
    throw new ServiceError('루틴 삭제에 실패했습니다.', 'removeTeamGoal', userGoalDeleteError.message);
  }

  const { count: totalCheckinsCount, error: totalCheckinsError } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId);
  if (totalCheckinsError) {
    throw new ServiceError('루틴 삭제에 실패했습니다.', 'removeTeamGoal', totalCheckinsError.message);
  }

  const { count: otherUsersCount, error: otherUsersError } = await supabase
    .from('user_goals')
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId)
    .is('deleted_at', null);
  if (otherUsersError) {
    throw new ServiceError('루틴 삭제에 실패했습니다.', 'removeTeamGoal', otherUsersError.message);
  }

  if ((!totalCheckinsCount || totalCheckinsCount === 0) && (!otherUsersCount || otherUsersCount === 0)) {
    const { error: goalError } = await supabase.from('goals').delete().eq('id', goalId);
    if (goalError) {
      throw new ServiceError('루틴 삭제에 실패했습니다.', 'removeTeamGoal', goalError.message);
    }
  }

  return true;
}

export async function deleteCheckin(checkinId: string): Promise<boolean> {
  const { error } = await supabase.from('checkins').delete().eq('id', checkinId);
  if (error) {
    throw new ServiceError('체크인 삭제에 실패했습니다.', 'deleteCheckin', error.message);
  }

  return true;
}
