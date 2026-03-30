import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type {
  Checkin,
  CheckinWithGoal,
  MemberProgress,
  MemberGoalDetail,
  MemberCheckinSummary,
  CalendarDayMarking,
} from '../types/domain';
import { MOUNTAIN_THRESHOLDS } from '../constants/defaults';
import type { MountainPosition } from '../types/domain';
import dayjs from '../lib/dayjs';

// ─── Helpers ──────────────────────────────────────────────────

function getPosition(done: number, total: number, pass: number = 0): MountainPosition {
  const effective = total - pass;
  if (effective <= 0) return pass > 0 ? 'summit' : 'base';
  const ratio = done / effective;
  if (ratio >= MOUNTAIN_THRESHOLDS.SUMMIT) return 'summit';
  if (ratio >= MOUNTAIN_THRESHOLDS.MIDDLE) return 'middle';
  return 'base';
}

function isGoalActiveOnDate(ug: any, dateStr: string): boolean {
  // 통계 주차 로직: 목표의 원래 시작일/종료일이 아니라
  // 통계 편의상 해당 주가 속한 범위라면 보여주는 것이 맞음.
  // 이 부분은 주차 기반(getCalendarWeekRanges)으로 넘어올 때는 dateStr 자체가 해당 범위 내에 있는지를 확인하므로
  // 단순 목표의 start_date/end_date 검사 로직을 조금 유연하게 처리해야 함.

  const d = dayjs(dateStr);
  const weekStart = d.startOf('isoWeek').format('YYYY-MM-DD');
  const weekEnd = d.endOf('isoWeek').format('YYYY-MM-DD');

  if (ug.start_date && weekEnd < ug.start_date) return false;
  if (ug.end_date && weekStart > ug.end_date) return false;
  return true;
}

// ─── Store Interface ──────────────────────────────────────────

interface StatsState {
  memberProgress: MemberProgress[];
  calendarMarkings: CalendarDayMarking;
  selectedDateCheckins: CheckinWithGoal[];
  monthlyCheckins: Checkin[];
  memberDateCheckins: MemberCheckinSummary[];

  fetchMemberProgress: (teamId?: string, userId?: string) => Promise<void>;
  fetchCalendarMarkings: (userId: string, yearMonth: string) => Promise<void>;
  fetchCheckinsForDate: (userId: string, date: string) => Promise<void>;
  fetchMonthlyCheckins: (userId: string, yearMonth: string) => Promise<void>;
  fetchMemberDateCheckins: (
    teamId: string | undefined,
    userId: string,
    date: string,
  ) => Promise<void>;
  toggleReaction: (
    checkinId: string,
    user: { id: string; nickname: string; profile_image_url: string | null },
  ) => Promise<void>;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────

export const useStatsStore = create<StatsState>((set, get) => ({
  memberProgress: [],
  calendarMarkings: {},
  selectedDateCheckins: [],
  monthlyCheckins: [],
  memberDateCheckins: [],

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

    const memberIds = members
      .map((m) => (m.user_id || m.user?.id) as string | undefined)
      .filter((id): id is string => !!id);

    if (memberIds.length === 0) {
      set({ memberProgress: [] });
      return;
    }

    const { data: userGoalsRaw } = await supabase
      .from('user_goals')
      .select(
        'user_id, goal_id, frequency, target_count, start_date, end_date, goal:goals(owner_id)',
      )
      .in('user_id', memberIds)
      .eq('is_active', true);

    const userGoalsByUserId = new Map<string, any[]>();
    (userGoalsRaw ?? []).forEach((ug: any) => {
      if (ug.goal?.owner_id !== ug.user_id) return;
      const list = userGoalsByUserId.get(ug.user_id) ?? [];
      list.push({
        goal_id: ug.goal_id,
        frequency: ug.frequency,
        target_count: ug.target_count,
        start_date: ug.start_date,
        end_date: ug.end_date,
      });
      userGoalsByUserId.set(ug.user_id, list);
    });

    const memberBases = members.map((member) => {
      const user = member.user as any;
      const uid = (member.user_id || user?.id) as string;
      const userGoals = userGoalsByUserId.get(uid) ?? [];
      const todayGoalIds = userGoals
        .filter((ug) => isGoalActiveOnDate(ug, today))
        .map((ug) => ug.goal_id as string);

      return {
        uid,
        nickname: user?.nickname ?? '알 수 없음',
        profileImageUrl: user?.profile_image_url ?? null,
        todayGoalIds,
      };
    });

    const allTodayGoalIds = Array.from(new Set(memberBases.flatMap((m) => m.todayGoalIds)));
    const { data: goalRows } =
      allTodayGoalIds.length > 0
        ? await supabase.from('goals').select('id, name').in('id', allTodayGoalIds)
        : { data: [] as { id: string; name: string }[] };
    const goalNameMap = new Map((goalRows ?? []).map((g: any) => [g.id, g.name as string]));

    const { data: todayCheckins } = await supabase
      .from('checkins')
      .select('user_id, goal_id, status')
      .in('user_id', memberIds)
      .eq('date', today);

    const doneByUser = new Map<string, Set<string>>();
    const passByUser = new Map<string, Set<string>>();
    (todayCheckins ?? []).forEach((c: any) => {
      const targetMap = c.status === 'pass' ? passByUser : doneByUser;
      const setForUser = targetMap.get(c.user_id) ?? new Set<string>();
      setForUser.add(c.goal_id);
      targetMap.set(c.user_id, setForUser);
    });

    const progress: MemberProgress[] = memberBases.map((member) => {
      const doneSet = doneByUser.get(member.uid) ?? new Set<string>();
      const passSet = passByUser.get(member.uid) ?? new Set<string>();

      let doneCount = 0;
      let passCount = 0;
      member.todayGoalIds.forEach((gid) => {
        if (doneSet.has(gid)) doneCount += 1;
        if (passSet.has(gid)) passCount += 1;
      });

      const goalDetails: MemberGoalDetail[] = member.todayGoalIds.map((gid) => ({
        goalId: gid,
        goalName: goalNameMap.get(gid) ?? '목표',
        isDone: doneSet.has(gid),
        isPass: passSet.has(gid),
        isActive: true,
      }));

      const total = member.todayGoalIds.length;
      return {
        userId: member.uid,
        nickname: member.nickname,
        profileImageUrl: member.profileImageUrl,
        totalGoals: total,
        completedGoals: doneCount + passCount,
        doneGoals: doneCount,
        passGoals: passCount,
        position: getPosition(doneCount, total, passCount),
        goalDetails,
      };
    });

    set({ memberProgress: progress });
  },

  // ── 캘린더 마킹 ──
  fetchCalendarMarkings: async (userId, yearMonth) => {
    const startDate = `${yearMonth}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

    const { data: checkins } = await supabase
      .from('checkins')
      .select('date, status, goal_id, memo')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    const { data: userGoals } = await supabase
      .from('user_goals')
      .select('goal_id, frequency, target_count, start_date, end_date')
      .eq('user_id', userId)
      .eq('is_active', true);

    const markings: CalendarDayMarking = {};
    const today = dayjs().format('YYYY-MM-DD');
    const daysInMonth = dayjs(startDate).daysInMonth();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (dateStr > today) break;

      const activeGoals = (userGoals ?? []).filter((ug: any) => isGoalActiveOnDate(ug, dateStr));
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
        dotColor: dayStatus === 'all_done' || dayStatus === 'mixed' ? '#4ADE80' : '#EF4444',
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
    const ms = dayjs(`${yearMonth}-01`);
    const monthEnd = ms.endOf('month');
    let firstMon = ms;
    while (firstMon.day() !== 1) firstMon = firstMon.add(1, 'day');

    let fetchStart = `${yearMonth}-01`;
    let fetchEnd = monthEnd.format('YYYY-MM-DD');

    if (!ms.isSame(firstMon, 'day') && firstMon.diff(ms, 'day') >= 4) {
      fetchStart = ms.startOf('isoWeek').format('YYYY-MM-DD');
    }

    const lastMon = monthEnd.startOf('isoWeek');
    const daysAtEnd = monthEnd.diff(lastMon, 'day') + 1;
    if (daysAtEnd < 7 && daysAtEnd >= 4) {
      fetchEnd = lastMon.add(6, 'day').format('YYYY-MM-DD');
    }

    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fetchStart)
      .lte('date', fetchEnd)
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

      const { data: userGoals } = await supabase
        .from('user_goals')
        .select('goal_id, frequency, target_count, start_date, end_date, goal:goals(name)')
        .eq('user_id', uid)
        .eq('is_active', true);

      const activeGoals = (userGoals ?? []).filter((ug: any) => isGoalActiveOnDate(ug, date));
      const activeGoalIds = activeGoals.map((ug: any) => ug.goal_id);

      const { data: checkins } = await supabase
        .from('checkins')
        .select(
          '*, goal:goals(id, name), reactions:checkin_reactions(id, checkin_id, user_id, created_at, user:users(id, nickname, profile_image_url))',
        )
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
        goals: activeGoals.map((ug: any) => ({
          goalId: ug.goal_id,
          name: ug.goal?.name ?? '알 수 없는 목표',
          frequency: ug.frequency,
          targetCount: ug.target_count,
        })),
      });
    }

    set({ memberDateCheckins: summaries });
  },

  // ── 리액션 토글 (낙관적 업데이트) ──
  toggleReaction: async (checkinId, user) => {
    const userId = user.id;

    const currentMemberCheckins = get().memberDateCheckins;
    let isReacted = false;

    const nextMemberCheckins = currentMemberCheckins.map((summary) => ({
      ...summary,
      checkins: summary.checkins.map((c) => {
        if (c.id !== checkinId) return c;

        const reactions = c.reactions || [];
        const existing = reactions.find((r) => r.user_id === userId);
        isReacted = !!existing;

        const newReactions = existing
          ? reactions.filter((r) => r.user_id !== userId)
          : [
              ...reactions,
              {
                id: 'temp-' + Date.now(),
                checkin_id: checkinId,
                user_id: userId,
                created_at: new Date().toISOString(),
                user: {
                  id: user.id,
                  nickname: user.nickname,
                  profile_image_url: user.profile_image_url,
                },
              },
            ];

        return { ...c, reactions: newReactions };
      }),
    }));

    set({ memberDateCheckins: nextMemberCheckins });

    try {
      if (isReacted) {
        await supabase
          .from('checkin_reactions')
          .delete()
          .match({ checkin_id: checkinId, user_id: userId });
      } else {
        await supabase.from('checkin_reactions').insert({
          checkin_id: checkinId,
          user_id: userId,
        });
      }
    } catch (e) {
      console.error('toggleReaction error:', e);
    }
  },

  reset: () => {
    set({
      memberProgress: [],
      calendarMarkings: {},
      selectedDateCheckins: [],
      monthlyCheckins: [],
      memberDateCheckins: [],
    });
  },
}));
