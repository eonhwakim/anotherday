import { supabase } from '../lib/supabaseClient';
import dayjs from '../lib/dayjs';
import { getCalendarWeekRanges } from '../lib/statsUtils';
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
    console.error('findCurrentUserGoalPeriod error:', error.message);
    return null;
  }

  const rows = (data ?? []) as UserGoalPeriodRow[];
  return (
    rows.find((row) => {
      const startsOnOrBeforeReference = !row.start_date || row.start_date <= referenceDate;
      const endsOnOrAfterReference = !row.end_date || row.end_date >= referenceDate;
      return startsOnOrBeforeReference && endsOnOrAfterReference;
    }) ?? rows[0] ?? null
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
    console.error('fetchExtendableGoalsForMonth error:', error.message);
    return [];
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
    console.error('fetchExtendableGoalsForMonth next month query error:', nextMonthError.message);
    return targets;
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
    console.error('fetchLastMonthGoals error:', error.message);
    return [];
  }

  return (data ?? []) as UserGoal[];
}

export async function copyGoalsFromLastMonth(userId: string, goals: UserGoal[]): Promise<boolean> {
  if (goals.length === 0) return true;

  const today = dayjs().format('YYYY-MM-DD');
  const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

  const updates = goals.map((g) => ({
    id: g.id,
    user_id: userId,
    goal_id: g.goal_id,
    start_date: today,
    end_date: endOfMonth,
    is_active: true,
    frequency: g.frequency,
    target_count: g.target_count,
  }));

  const { error } = await supabase.from('user_goals').upsert(updates);
  if (error) {
    console.error('copyGoalsFromLastMonth error:', error.message);
    return false;
  }

  return true;
}

export async function extendGoalsForNewMonth(
  userId: string,
  newMonthStr: string,
): Promise<boolean> {
  const nextWindow = getRoutineWindowForMonth(newMonthStr);
  const targets = await fetchExtendableGoalsForMonth(userId, newMonthStr);

  if (!targets || targets.length === 0) return true;

  const inserts = targets.map((goal) => ({
    user_id: userId,
    goal_id: goal.goal_id,
    is_active: true,
    frequency: goal.frequency,
    target_count: goal.target_count,
    start_date: nextWindow.start,
    end_date: nextWindow.end,
    week_days: goal.week_days ?? null,
  }));

  const { error } = await supabase.from('user_goals').insert(inserts);

  if (error) {
    console.error('extendGoalsForNewMonth insert error:', error.message);
    return false;
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
    console.error('fetchTeamGoals error:', error.message);
    return [];
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
    console.error('fetchMyGoals error:', error.message);
    return [];
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
    console.error('fetchMyGoalsForMonth error:', error.message);
    return [];
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
    console.error('fetchWeeklyDoneCountsForGoals error:', error.message);
    return {};
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
    console.error('fetchMyGoalsForRange error:', error.message);
    return [];
  }

  return (data ?? []) as UserGoal[];
}

export async function endTeamGoal(userId: string, goalId: string): Promise<boolean> {
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const currentGoalRow = await findCurrentUserGoalPeriod(userId, goalId, today);

  if (!currentGoalRow) return false;

  const { count: todayCheckinCount, error: todayCheckinError } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('date', today);

  if (todayCheckinError) {
    console.error('endTeamGoal today checkin count error:', todayCheckinError.message);
    return false;
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
    console.error('endTeamGoal error:', error.message);
    return false;
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
    console.error('fetchTodayCheckins error:', error.message);
    return [];
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
  const checkinDate = date ?? dayjs().format('YYYY-MM-DD');

  const { data: existing, error: existingError } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('date', checkinDate)
    .maybeSingle();

  if (existingError) {
    console.error('createCheckin existing query error:', existingError.message);
    return false;
  }

  if (existing) return false;

  const { error } = await supabase.from('checkins').insert({
    user_id: userId,
    goal_id: goalId,
    date: checkinDate,
    photo_url: photoUrl ?? null,
    memo: memo ?? null,
    status,
  });

  if (error) {
    console.error('createCheckin error:', error.message);
    return false;
  }

  return true;
}

export async function toggleUserGoal(userId: string, goalId: string): Promise<boolean> {
  const { data: current, error: selectError } = await supabase
    .from('user_goals')
    .select('is_active')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .single();

  if (selectError) {
    console.error('toggleUserGoal user_goals select error:', selectError.message);
    return false;
  }

  const { error: updateError } = await supabase
    .from('user_goals')
    .update({ is_active: !current.is_active })
    .eq('user_id', userId)
    .eq('goal_id', goalId);

  if (updateError) {
    console.error('toggleUserGoal user_goals update error:', updateError.message);
    return false;
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
    (goal) => goal.name.toLowerCase() === trimmed.toLowerCase() && goal.owner_id === userId,
  );

  if (myExisting) {
    const { data: myGoal, error: myGoalError } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', myExisting.id)
      .maybeSingle();

    if (myGoalError) {
      console.error('addGoal existing user_goal query error:', myGoalError.message);
      return false;
    }

    if (myGoal) {
      if (myGoal.is_active && !myGoal.deleted_at) return false;

      const { error } = await supabase
        .from('user_goals')
        .update({
          is_active: true,
          deleted_at: null,
          frequency,
          target_count: targetCount,
          start_date: today,
          end_date: computedEndDate,
        })
        .eq('id', myGoal.id);

      if (error) {
        console.error('addGoal reactivate user_goal error:', error.message);
        return false;
      }

      return true;
    }

    const { error } = await supabase.from('user_goals').insert({
      user_id: userId,
      goal_id: myExisting.id,
      is_active: true,
      frequency,
      target_count: targetCount,
      start_date: today,
      end_date: computedEndDate,
    });

    if (error) {
      console.error('addGoal insert user_goal error:', error.message);
      return false;
    }

    return true;
  }

  const payload: { name: string; owner_id: string; team_id?: string } = {
    name: trimmed,
    owner_id: userId,
  };
  if (teamId) payload.team_id = teamId;

  const { data: newGoal, error } = await supabase.from('goals').insert(payload).select().single();
  if (error || !newGoal) {
    console.error('addGoal insert goal error:', error?.message);
    return false;
  }

  const { error: userGoalError } = await supabase.from('user_goals').insert({
    user_id: userId,
    goal_id: newGoal.id,
    is_active: true,
    frequency,
    target_count: targetCount,
    start_date: today,
    end_date: computedEndDate,
  });

  if (userGoalError) {
    console.error('addGoal insert user_goal error:', userGoalError.message);
    return false;
  }

  return true;
}

export async function removeTeamGoal(teamId: string, userId: string, goalId: string): Promise<boolean> {
  const today = dayjs().format('YYYY-MM-DD');
  const currentGoalRow = await findCurrentUserGoalPeriod(userId, goalId, today);

  if (!currentGoalRow) return false;

  const activeStart = currentGoalRow.start_date ?? today;
  const activeEnd = currentGoalRow.end_date ?? today;

  const { error: checkinDeleteError } = await supabase
    .from('checkins')
    .delete()
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .gte('date', activeStart)
    .lte('date', activeEnd);

  if (checkinDeleteError) {
    console.error('removeTeamGoal checkins delete error:', checkinDeleteError.message);
    return false;
  }

  const { error: userGoalDeleteError } = await supabase
    .from('user_goals')
    .delete()
    .eq('id', currentGoalRow.id);

  if (userGoalDeleteError) {
    console.error('removeTeamGoal user_goals delete error:', userGoalDeleteError.message);
    return false;
  }

  const { count: totalCheckinsCount, error: totalCheckinsError } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId);
  if (totalCheckinsError) {
    console.error('removeTeamGoal total checkins count error:', totalCheckinsError.message);
    return false;
  }

  const { count: otherUsersCount, error: otherUsersError } = await supabase
    .from('user_goals')
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId)
    .is('deleted_at', null);
  if (otherUsersError) {
    console.error('removeTeamGoal other users count error:', otherUsersError.message);
    return false;
  }

  if ((!totalCheckinsCount || totalCheckinsCount === 0) && (!otherUsersCount || otherUsersCount === 0)) {
    const { error: goalError } = await supabase.from('goals').delete().eq('id', goalId);
    if (goalError) {
      console.error('removeTeamGoal goals delete error:', goalError.message);
      return false;
    }
  }

  return true;
}

export async function deleteCheckin(checkinId: string): Promise<boolean> {
  const { error } = await supabase.from('checkins').delete().eq('id', checkinId);
  if (error) {
    console.error('deleteCheckin error:', error.message);
    return false;
  }

  return true;
}
