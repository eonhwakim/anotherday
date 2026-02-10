import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type {
  Goal,
  UserGoal,
  Checkin,
  CheckinWithGoal,
  MemberProgress,
  MemberCheckinSummary,
  MountainPosition,
  CalendarDayMarking,
} from '../types/domain';
import { MOUNTAIN_THRESHOLDS } from '../constants/defaults';
import dayjs from '../lib/dayjs';

// ─── Helpers ──────────────────────────────────────────────────

/** 달성률 → 산 위치 매핑 */
function getPosition(completed: number, total: number): MountainPosition {
  if (total === 0) return 'base';
  const ratio = completed / total;
  if (ratio >= MOUNTAIN_THRESHOLDS.SUMMIT) return 'summit';
  if (ratio >= MOUNTAIN_THRESHOLDS.MIDDLE) return 'middle';
  return 'base';
}

/** 주의 시작 월요일 (dayjs 기준) */
function getWeekMonday(dateStr: string): string {
  const d = dayjs(dateStr);
  const day = d.day(); // 0=일, 1=월, ...
  const diff = day === 0 ? 6 : day - 1; // 월요일 기준 offset
  return d.subtract(diff, 'day').format('YYYY-MM-DD');
}

/** 해당 날짜에 이 목표가 유효한지 판별 */
function isGoalActiveOnDate(ug: any, dateStr: string): boolean {
  if (!ug.start_date) return true; // start_date가 없으면 항상 유효
  return dateStr >= ug.start_date;
}

/** 주 N회 목표가 연습 주인지 (생성 주와 같은 주) */
function isPracticeWeek(startDate: string, dateStr: string): boolean {
  if (!startDate) return false;
  return getWeekMonday(startDate) === getWeekMonday(dateStr);
}

/**
 * 주 N회 목표의 이번 주 완료 횟수를 세어서,
 * 오늘 목표에 포함해야 하는지 판별
 */
async function getWeekDoneCount(
  userId: string,
  goalId: string,
  dateStr: string,
): Promise<number> {
  const monday = getWeekMonday(dateStr);
  const sunday = dayjs(monday).add(6, 'day').format('YYYY-MM-DD');

  const { count } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('status', 'done')
    .gte('date', monday)
    .lte('date', sunday);

  return count ?? 0;
}

// ─── Store Interface ──────────────────────────────────────────

interface GoalState {
  teamGoals: Goal[];
  myGoals: UserGoal[];
  todayCheckins: Checkin[];
  memberProgress: MemberProgress[];
  calendarMarkings: CalendarDayMarking;
  selectedDateCheckins: CheckinWithGoal[];
  monthlyCheckins: Checkin[];
  memberDateCheckins: MemberCheckinSummary[];
  isLoading: boolean;

  fetchTeamGoals: (teamId: string, userId?: string) => Promise<void>;
  fetchMyGoals: (userId: string) => Promise<void>;
  fetchTodayCheckins: (userId: string) => Promise<void>;
  createCheckin: (params: {
    userId: string;
    goalId: string;
    date?: string;
    photoUrl?: string | null;
    memo?: string | null;
  }) => Promise<boolean>;
  toggleUserGoal: (userId: string, goalId: string) => Promise<void>;
  addGoal: (params: {
    teamId?: string;
    userId: string;
    name: string;
    frequency?: 'daily' | 'weekly_count';
    targetCount?: number | null;
  }) => Promise<boolean>;
  removeTeamGoal: (teamId: string, userId: string, goalId: string) => Promise<void>;
  fetchMemberProgress: (teamId?: string, userId?: string) => Promise<void>;
  fetchCalendarMarkings: (userId: string, yearMonth: string) => Promise<void>;
  fetchCheckinsForDate: (userId: string, date: string) => Promise<void>;
  fetchMonthlyCheckins: (userId: string, yearMonth: string) => Promise<void>;
  fetchMemberDateCheckins: (teamId: string | undefined, userId: string, date: string) => Promise<void>;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────

export const useGoalStore = create<GoalState>((set, get) => ({
  teamGoals: [],
  myGoals: [],
  todayCheckins: [],
  memberProgress: [],
  calendarMarkings: {},
  selectedDateCheckins: [],
  monthlyCheckins: [],
  memberDateCheckins: [],
  isLoading: false,

  // ── 팀 목표 로드 ──
  fetchTeamGoals: async (teamId, userId) => {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    if (userId) {
      if (teamId) {
        query = query.or(`team_id.eq.${teamId},owner_id.eq.${userId}`);
      } else {
        query = query.eq('owner_id', userId);
      }
    } else {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;
    if (error) console.error('fetchTeamGoals error:', error);
    set({ teamGoals: data ?? [] });
  },

  // ── 내 목표 로드 ──
  fetchMyGoals: async (userId) => {
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
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
  createCheckin: async ({ userId, goalId, date, photoUrl, memo }) => {
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
    });

    if (error) return false;
    await get().fetchTodayCheckins(userId);
    return true;
  },

  // ── 목표 토글 ──
  toggleUserGoal: async (userId, goalId) => {
    const existing = get().myGoals.find(
      (ug) => ug.goal_id === goalId && ug.user_id === userId,
    );

    if (existing) {
      await supabase.from('user_goals').update({ is_active: false }).eq('id', existing.id);
    } else {
      const today = dayjs().format('YYYY-MM-DD');
      await supabase.from('user_goals').upsert(
        {
          user_id: userId,
          goal_id: goalId,
          is_active: true,
          start_date: today,
        },
        { onConflict: 'user_id, goal_id' },
      );
    }

    await get().fetchMyGoals(userId);
  },

  // ── 목표 추가 ──
  addGoal: async ({ teamId, userId, name, frequency = 'daily', targetCount = null }) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const today = dayjs().format('YYYY-MM-DD');

    const existing = get().teamGoals.find(
      (g) => g.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (existing) {
      const myGoal = get().myGoals.find(
        (ug) => ug.goal_id === existing.id && ug.user_id === userId,
      );

      if (myGoal) {
        if (myGoal.is_active) return false;
        await supabase
          .from('user_goals')
          .update({ is_active: true, frequency, target_count: targetCount, start_date: today })
          .eq('id', myGoal.id);
      } else {
        await supabase.from('user_goals').insert({
          user_id: userId,
          goal_id: existing.id,
          is_active: true,
          frequency,
          target_count: targetCount,
          start_date: today,
        });
      }

      await get().fetchMyGoals(userId);
      return true;
    }

    // goals 테이블에 추가
    const payload: any = { name: trimmed, is_active: true, owner_id: userId };
    if (teamId) payload.team_id = teamId;

    const { data: newGoal, error } = await supabase
      .from('goals')
      .insert(payload)
      .select()
      .single();

    if (error || !newGoal) {
      console.error('addGoal error:', error);
      return false;
    }

    // user_goals에 자동 선택
    await supabase.from('user_goals').insert({
      user_id: userId,
      goal_id: newGoal.id,
      is_active: true,
      frequency,
      target_count: targetCount,
      start_date: today,
    });

    await get().fetchMyGoals(userId);
    if (teamId) await get().fetchTeamGoals(teamId, userId);
    return true;
  },

  // ── 목표 삭제 ──
  removeTeamGoal: async (teamId, userId, goalId) => {
    await supabase.from('goals').update({ is_active: false }).eq('id', goalId);
    await supabase
      .from('user_goals')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('goal_id', goalId);

    await Promise.all([get().fetchTeamGoals(teamId), get().fetchMyGoals(userId)]);
  },

  // ── 멤버 진행상황 (산 애니메이션) ──
  fetchMemberProgress: async (teamId, userId) => {
    const today = dayjs().format('YYYY-MM-DD');

    let members: any[] = [];
    if (teamId) {
      const { data } = await supabase
        .from('team_members')
        .select('user_id, user:users(id, nickname, profile_image_url)')
        .eq('team_id', teamId);
      members = data ?? [];
    } else if (userId) {
      const { data } = await supabase
        .from('users')
        .select('id, nickname, profile_image_url')
        .eq('id', userId)
        .single();
      if (data) members = [{ user_id: data.id, user: data }];
    }

    if (members.length === 0) {
      set({ memberProgress: [] });
      return;
    }

    const progress: MemberProgress[] = [];

    for (const member of members) {
      const user = member.user as any;
      const uid = member.user_id || user.id;

      // 활성 목표
      const { data: userGoals } = await supabase
        .from('user_goals')
        .select('goal_id, frequency, target_count, start_date')
        .eq('user_id', uid)
        .eq('is_active', true);

      // 오늘 해당되는 목표 필터링
      const todayGoalIds: string[] = [];
      for (const ug of userGoals ?? []) {
        if (!isGoalActiveOnDate(ug, today)) continue;

        if (ug.frequency === 'daily') {
          todayGoalIds.push(ug.goal_id);
        } else if (ug.frequency === 'weekly_count') {
          const practice = isPracticeWeek(ug.start_date, today);
          if (practice) {
            todayGoalIds.push(ug.goal_id); // 연습 주에도 목표에 포함
          } else {
            const weekDone = await getWeekDoneCount(uid, ug.goal_id, today);
            if (weekDone < (ug.target_count ?? 1)) {
              todayGoalIds.push(ug.goal_id);
            }
          }
        } else {
          todayGoalIds.push(ug.goal_id);
        }
      }

      const total = todayGoalIds.length;

      // 오늘 체크인
      const { data: todayCheckins } = await supabase
        .from('checkins')
        .select('goal_id, status')
        .eq('user_id', uid)
        .eq('date', today)
        .in('goal_id', total > 0 ? todayGoalIds : ['__none__']);

      const doneCount = (todayCheckins ?? []).filter((c: any) => c.status === 'done').length;
      const passCount = (todayCheckins ?? []).filter((c: any) => c.status === 'pass').length;
      const effectiveTotal = total - passCount;

      progress.push({
        userId: uid,
        nickname: user?.nickname ?? '알 수 없음',
        profileImageUrl: user?.profile_image_url ?? null,
        totalGoals: effectiveTotal > 0 ? effectiveTotal : total,
        completedGoals: doneCount,
        position: getPosition(doneCount, effectiveTotal > 0 ? effectiveTotal : total),
      });
    }

    set({ memberProgress: progress });
  },

  // ── 캘린더 마킹 ──
  fetchCalendarMarkings: async (userId, yearMonth) => {
    const startDate = `${yearMonth}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

    const { data: checkins } = await supabase
      .from('checkins')
      .select('date, status, goal_id')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    const { data: userGoals } = await supabase
      .from('user_goals')
      .select('goal_id, frequency, target_count, start_date')
      .eq('user_id', userId)
      .eq('is_active', true);

    const markings: CalendarDayMarking = {};
    const today = dayjs().format('YYYY-MM-DD');
    const daysInMonth = dayjs(startDate).daysInMonth();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (dateStr > today) break;

      // 해당 날짜에 유효한 목표 (start_date 이후 + frequency 규칙)
      const activeGoals = (userGoals ?? []).filter((ug: any) => {
        if (!isGoalActiveOnDate(ug, dateStr)) return false;
        if (ug.frequency === 'daily') return true;
        if (ug.frequency === 'weekly_count') return true; // weekly_count는 일단 모두 포함
        return true;
      });

      const totalGoals = activeGoals.length;
      if (totalGoals === 0) continue;

      const dayCheckins = (checkins ?? []).filter((c) => c.date === dateStr);
      const doneCount = dayCheckins.filter((c) => c.status === 'done').length;
      const passCount = dayCheckins.filter((c) => c.status === 'pass').length;

      let dayStatus: 'all_done' | 'mixed' | 'mostly_fail' | 'partial' | 'none' = 'none';
      if (doneCount + passCount >= totalGoals && doneCount > 0) {
        dayStatus = passCount > 0 ? 'mixed' : 'all_done';
      } else if (doneCount > 0 || passCount > 0) {
        dayStatus = 'partial';
      } else {
        dayStatus = 'mostly_fail';
      }

      markings[dateStr] = {
        marked: true,
        dotColor: dayStatus === 'all_done' ? '#4ADE80' : dayStatus === 'mixed' ? '#FBBF24' : '#EF4444',
        checkinCount: doneCount + passCount,
        dayStatus,
        doneCount,
        passCount,
        totalGoals,
      };
    }

    set({ calendarMarkings: markings });
  },

  // ── 날짜별 체크인 ──
  fetchCheckinsForDate: async (userId, date) => {
    const { data } = await supabase
      .from('checkins')
      .select('*, goal:goals(id, name)')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at');

    set({ selectedDateCheckins: (data as CheckinWithGoal[]) ?? [] });
  },

  // ── 월간 체크인 ──
  fetchMonthlyCheckins: async (userId, yearMonth) => {
    const startDate = `${yearMonth}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    set({ monthlyCheckins: data ?? [] });
  },

  // ── 팀 멤버 날짜별 체크인 ──
  fetchMemberDateCheckins: async (teamId, userId, date) => {
    let members: any[] = [];

    if (teamId) {
      const { data } = await supabase
        .from('team_members')
        .select('user_id, user:users(id, nickname, profile_image_url)')
        .eq('team_id', teamId);
      members = data ?? [];
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, nickname, profile_image_url')
        .eq('id', userId)
        .single();
      if (data) members = [{ user_id: data.id, user: data }];
    }

    const summaries: MemberCheckinSummary[] = [];

    for (const member of members) {
      const u = member.user as any;
      const uid = member.user_id || u.id;

      // 활성 목표 (start_date 기준 필터링)
      const { data: userGoals } = await supabase
        .from('user_goals')
        .select('goal_id, frequency, target_count, start_date')
        .eq('user_id', uid)
        .eq('is_active', true);

      const activeGoalIds = (userGoals ?? [])
        .filter((ug: any) => isGoalActiveOnDate(ug, date))
        .map((ug: any) => ug.goal_id);

      // 해당 날짜 체크인
      const { data: checkins } = await supabase
        .from('checkins')
        .select('*, goal:goals(id, name)')
        .eq('user_id', uid)
        .eq('date', date)
        .order('created_at');

      const typedCheckins = (checkins ?? []) as CheckinWithGoal[];
      const doneCount = typedCheckins.filter((c) => c.status === 'done').length;
      const passCount = typedCheckins.filter((c) => c.status === 'pass').length;

      summaries.push({
        userId: uid,
        nickname: u?.nickname ?? '알 수 없음',
        profileImageUrl: u?.profile_image_url ?? null,
        checkins: typedCheckins,
        totalGoals: activeGoalIds.length,
        doneCount,
        passCount,
      });
    }

    set({ memberDateCheckins: summaries });
  },

  reset: () => {
    set({
      teamGoals: [],
      myGoals: [],
      todayCheckins: [],
      memberProgress: [],
      calendarMarkings: {},
      selectedDateCheckins: [],
      monthlyCheckins: [],
      memberDateCheckins: [],
      isLoading: false,
    });
  },
}));
