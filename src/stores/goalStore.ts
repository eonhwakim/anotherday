import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { Goal, UserGoal, Checkin } from '../types/domain';
import dayjs from '../lib/dayjs';
import { scheduleGoalReminderNotification } from '../utils/notifications';
import { getCalendarWeekRanges } from '../lib/statsUtils';

interface GoalState {
  teamGoals: Goal[];
  myGoals: UserGoal[];
  todayCheckins: Checkin[];
  lastMonthGoals: UserGoal[];
  isLoading: boolean;

  fetchTeamGoals: (teamId: string, userId?: string) => Promise<void>;
  fetchMyGoals: (userId: string) => Promise<void>;
  fetchLastMonthGoals: (userId: string) => Promise<void>;
  copyGoalsFromLastMonth: (userId: string) => Promise<void>;
  extendGoalsForNewMonth: (userId: string, newMonthStr: string) => Promise<void>;
  fetchTodayCheckins: (userId: string) => Promise<void>;
  createCheckin: (params: {
    userId: string;
    goalId: string;
    date?: string;
    photoUrl?: string | null;
    memo?: string | null;
    status?: 'done' | 'pass';
  }) => Promise<boolean>;
  toggleUserGoal: (userId: string, goalId: string) => Promise<void>;
  addGoal: (params: {
    teamId?: string;
    userId: string;
    name: string;
    frequency?: 'daily' | 'weekly_count';
    targetCount?: number | null;
    duration?: 'continuous' | 'this_month';
  }) => Promise<boolean>;
  removeTeamGoal: (teamId: string, userId: string, goalId: string) => Promise<void>;
  deleteCheckin: (checkinId: string) => Promise<void>;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  teamGoals: [],
  myGoals: [],
  todayCheckins: [],
  lastMonthGoals: [],
  isLoading: false,

  // ── 지난 달 목표 로드 (Carry Over용) ──
  fetchLastMonthGoals: async (userId) => {
    const today = dayjs().format('YYYY-MM-DD');
    const lastMonthStart = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');

    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .lt('end_date', today)
      .gte('end_date', lastMonthStart);

    set({ lastMonthGoals: data ?? [] });
  },

  // ── 지난 달 목표 그대로 가져오기 ──
  copyGoalsFromLastMonth: async (userId) => {
    const goals = get().lastMonthGoals;
    if (goals.length === 0) return;

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
    if (error) console.error('copyGoals error:', error);

    await get().fetchMyGoals(userId);
    set({ lastMonthGoals: [] });
  },

  // ── 새 달 목표 연장 ──
  extendGoalsForNewMonth: async (userId, newMonthStr) => {
    const newMonthEnd = dayjs(`${newMonthStr}-01`).endOf('month').format('YYYY-MM-DD');
    const prevMonthStr = dayjs(`${newMonthStr}-01`).subtract(1, 'month').format('YYYY-MM');
    const prevMonthStart = dayjs(`${prevMonthStr}-01`).startOf('month').format('YYYY-MM-DD');
    const prevMonthEnd = dayjs(`${prevMonthStr}-01`).endOf('month').format('YYYY-MM-DD');

    // 이전 달에 끝나는 활성 목표만 연장 (종료일 없는 목표는 이미 무기한)
    const { data: targets } = await supabase
      .from('user_goals')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .gte('end_date', prevMonthStart)
      .lte('end_date', prevMonthEnd);

    if (!targets || targets.length === 0) return;

    const ids = targets.map((g: any) => g.id);
    await supabase.from('user_goals').update({ end_date: newMonthEnd }).in('id', ids);
    await get().fetchMyGoals(userId);
  },

  // ── 팀 목표 로드 ──
  fetchTeamGoals: async (teamId, userId) => {
    let query = supabase.from('goals').select('*').is('deleted_at', null).order('created_at');

    if (userId) {
      if (teamId && teamId.trim().length > 0) {
        query = query.or(`team_id.eq.${teamId},owner_id.eq.${userId}`);
      } else {
        query = query.eq('owner_id', userId);
      }
    } else {
      if (!teamId || teamId.trim().length === 0) {
        set({ teamGoals: [] });
        return;
      }
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;
    if (error) console.error('fetchTeamGoals error:', error);
    set({ teamGoals: data ?? [] });
  },

  // ── 내 목표 로드 ──
  fetchMyGoals: async (userId) => {
    const today = dayjs().format('YYYY-MM-DD');
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(`end_date.is.null,end_date.gte.${today}`);
    set({ myGoals: data ?? [] });
  },

  // ── 오늘 체크인 로드 ──
  fetchTodayCheckins: async (userId) => {
    const today = dayjs().format('YYYY-MM-DD');
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);
    set({ todayCheckins: data ?? [] });
  },

  // ── 체크인 생성 ──
  createCheckin: async ({ userId, goalId, date, photoUrl, memo, status = 'done' }) => {
    const checkinDate = date ?? dayjs().format('YYYY-MM-DD');

    const { data: existing } = await supabase
      .from('checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .eq('date', checkinDate)
      .maybeSingle();

    if (existing) return false;

    const { error } = await supabase.from('checkins').insert({
      user_id: userId,
      goal_id: goalId,
      date: checkinDate,
      photo_url: photoUrl ?? null,
      memo: memo ?? null,
      status,
    });

    if (error) return false;
    await get().fetchTodayCheckins(userId);

    // 미완료 목표 알림 (statsStore의 memberProgress 참조)
    const { useStatsStore } = await import('./statsStore');
    const myProgress = useStatsStore.getState().memberProgress.find((p) => p.userId === userId);
    if (myProgress) {
      const uncompleted = myProgress.goalDetails
        .filter((g) => g.isActive && !g.isDone && !g.isPass && g.goalId !== goalId)
        .map((g) => g.goalName);
      scheduleGoalReminderNotification(uncompleted).catch(() => {});
    }

    return true;
  },

  // ── 목표 토글 ──
  toggleUserGoal: async (userId, goalId) => {
    const { data: current, error: selectErr } = await supabase
      .from('user_goals')
      .select('is_active')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .single();

    if (selectErr) {
      console.error('toggleUserGoal user_goals select error:', selectErr);
      return;
    }

    const { error: updateErr } = await supabase
      .from('user_goals')
      .update({ is_active: !current.is_active })
      .eq('user_id', userId)
      .eq('goal_id', goalId);
    if (updateErr) console.error('toggleUserGoal user_goals update error:', updateErr);

    await get().fetchMyGoals(userId);
  },

  // ── 목표 추가 ──
  addGoal: async ({
    teamId,
    userId,
    name,
    frequency = 'daily',
    targetCount = null,
    duration = 'continuous',
  }) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const today = dayjs().format('YYYY-MM-DD');
    let computedEndDate: string | null = null;

    if (duration === 'this_month') {
      const todayDayjs = dayjs();
      const todayStr = todayDayjs.format('YYYY-MM-DD');

      const candidates = [
        todayDayjs.format('YYYY-MM'),
        todayDayjs.add(1, 'month').format('YYYY-MM'),
      ];

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

    const myExisting = get().teamGoals.find(
      (g) => g.name.toLowerCase() === trimmed.toLowerCase() && g.owner_id === userId,
    );

    if (myExisting) {
      const { data: myGoal } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('goal_id', myExisting.id)
        .maybeSingle();

      if (myGoal) {
        if (myGoal.is_active && !myGoal.deleted_at) return false;
        await supabase
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
      } else {
        await supabase.from('user_goals').insert({
          user_id: userId,
          goal_id: myExisting.id,
          is_active: true,
          frequency,
          target_count: targetCount,
          start_date: today,
          end_date: computedEndDate,
        });
      }

      await get().fetchMyGoals(userId);
      return true;
    }

    const payload: any = { name: trimmed, owner_id: userId };
    if (teamId) payload.team_id = teamId;

    const { data: newGoal, error } = await supabase.from('goals').insert(payload).select().single();

    if (error || !newGoal) {
      console.error('addGoal error:', error);
      return false;
    }

    await supabase.from('user_goals').insert({
      user_id: userId,
      goal_id: newGoal.id,
      is_active: true,
      frequency,
      target_count: targetCount,
      start_date: today,
      end_date: computedEndDate,
    });

    await get().fetchMyGoals(userId);
    if (teamId) await get().fetchTeamGoals(teamId, userId);
    return true;
  },

  // ── 목표 삭제 (Soft Delete 지원) ──
  removeTeamGoal: async (teamId, userId, goalId) => {
    // 1. 해당 사용자의 이 목표에 대한 체크인이 있는지 확인
    const { count: userCheckinsCount } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('goal_id', goalId);

    if (userCheckinsCount && userCheckinsCount > 0) {
      // 인증 기록이 있으면 Soft Delete (과거 통계 유지를 위해)
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      const { error: ugErr } = await supabase
        .from('user_goals')
        .update({
          deleted_at: new Date().toISOString(),
          end_date: yesterday,
        })
        .eq('user_id', userId)
        .eq('goal_id', goalId);
      if (ugErr) console.error('removeTeamGoal user_goals update error:', ugErr);
    } else {
      // 인증 기록이 없으면 Hard Delete
      const { error: ugErr } = await supabase
        .from('user_goals')
        .delete()
        .eq('user_id', userId)
        .eq('goal_id', goalId);
      if (ugErr) console.error('removeTeamGoal user_goals delete error:', ugErr);
    }

    // 2. 이 목표가 다른 사람에 의해 사용 중인지 확인
    const { count: totalCheckinsCount } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', goalId);

    const { count: otherUsersCount } = await supabase
      .from('user_goals')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', goalId)
      .is('deleted_at', null);

    if (
      (totalCheckinsCount && totalCheckinsCount > 0) ||
      (otherUsersCount && otherUsersCount > 0)
    ) {
      // 누군가 인증했거나 사용 중이면 goals는 Soft Delete (RLS 때문에 owner만 적용됨)
      const { error: goalErr } = await supabase
        .from('goals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', goalId);
      if (goalErr) console.error('removeTeamGoal goals update error:', goalErr);
    } else {
      // 아무도 안 쓰고 인증도 없으면 Hard Delete
      const { error: goalErr } = await supabase.from('goals').delete().eq('id', goalId);
      if (goalErr) console.error('removeTeamGoal goals delete error:', goalErr);
    }

    await Promise.all([get().fetchTeamGoals(teamId, userId), get().fetchMyGoals(userId)]);
  },

  // ── 체크인 삭제 ──
  deleteCheckin: async (checkinId) => {
    const { error } = await supabase.from('checkins').delete().eq('id', checkinId);
    if (error) console.error('deleteCheckin error:', error);
  },

  reset: () => {
    set({
      teamGoals: [],
      myGoals: [],
      todayCheckins: [],
      lastMonthGoals: [],
      isLoading: false,
    });
  },
}));
