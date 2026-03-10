import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type {
  Goal,
  UserGoal,
  Checkin,
  CheckinWithGoal,
  MemberProgress,
  MemberGoalDetail,
  MemberCheckinSummary,
  MountainPosition,
  CalendarDayMarking,
} from '../types/domain';
import { MOUNTAIN_THRESHOLDS } from '../constants/defaults';
import dayjs from '../lib/dayjs';
import { scheduleGoalReminderNotification } from '../utils/notifications';

// ─── Helpers ──────────────────────────────────────────────────

/** 달성률 → 산 위치 매핑 (패스 제외 공식: done / (total - pass)) */
function getPosition(done: number, total: number, pass: number = 0): MountainPosition {
  const effective = total - pass;
  if (effective <= 0) return pass > 0 ? 'summit' : 'base';
  const ratio = done / effective;
  if (ratio >= MOUNTAIN_THRESHOLDS.SUMMIT) return 'summit';
  if (ratio >= MOUNTAIN_THRESHOLDS.MIDDLE) return 'middle';
  return 'base';
}

/** 해당 날짜에 이 목표가 유효한지 판별 */
function isGoalActiveOnDate(ug: any, dateStr: string): boolean {
  if (ug.start_date && dateStr < ug.start_date) return false;
  if (ug.end_date && dateStr > ug.end_date) return false;
  return true;
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
  lastMonthGoals: UserGoal[];
  isLoading: boolean;

  fetchTeamGoals: (teamId: string, userId?: string) => Promise<void>;
  fetchMyGoals: (userId: string) => Promise<void>;
  fetchLastMonthGoals: (userId: string) => Promise<void>;
  copyGoalsFromLastMonth: (userId: string) => Promise<void>;
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
  }) => Promise<boolean>;
  removeTeamGoal: (teamId: string, userId: string, goalId: string) => Promise<void>;
  fetchMemberProgress: (teamId?: string, userId?: string) => Promise<void>;
  fetchCalendarMarkings: (userId: string, yearMonth: string) => Promise<void>;
  fetchCheckinsForDate: (userId: string, date: string) => Promise<void>;
  fetchMonthlyCheckins: (userId: string, yearMonth: string) => Promise<void>;
  fetchMemberDateCheckins: (teamId: string | undefined, userId: string, date: string) => Promise<void>;
  deleteCheckin: (checkinId: string) => Promise<void>;
  toggleReaction: (checkinId: string, user: { id: string; nickname: string; profile_image_url: string | null }) => Promise<void>;
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
  lastMonthGoals: [],
  isLoading: false,

  // ── 지난 달 목표 로드 (Carry Over용) ──
  fetchLastMonthGoals: async (userId) => {
    const today = dayjs().format('YYYY-MM-DD');
    const lastMonthStart = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');

    // 최근 한 달 내에 만료된 목표 조회
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
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

    // 기존 목표의 기간을 이번 달로 연장 (업데이트)
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

  // ── 팀 목표 로드 ──
  fetchTeamGoals: async (teamId, userId) => {
    let query = supabase
      .from('goals')
      .select('*')
      .order('created_at');

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

    const progress = get().memberProgress;
    const myProgress = progress.find((p) => p.userId === userId);
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
  addGoal: async ({ teamId, userId, name, frequency = 'daily', targetCount = null }) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const today = dayjs().format('YYYY-MM-DD');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

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
        if (myGoal.is_active) return false;
        await supabase
          .from('user_goals')
          .update({
            is_active: true,
            frequency,
            target_count: targetCount,
            start_date: today,
            end_date: endOfMonth,
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
          end_date: endOfMonth,
        });
      }

      await get().fetchMyGoals(userId);
      return true;
    }

    const payload: any = { name: trimmed, owner_id: userId };
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

    await supabase.from('user_goals').insert({
      user_id: userId,
      goal_id: newGoal.id,
      is_active: true,
      frequency,
      target_count: targetCount,
      start_date: today,
      end_date: endOfMonth,
    });

    await get().fetchMyGoals(userId);
    if (teamId) await get().fetchTeamGoals(teamId, userId);
    return true;
  },

  // ── 목표 삭제 (DB에서 완전 삭제) ──
  removeTeamGoal: async (teamId, userId, goalId) => {
    const { error: ugErr } = await supabase
      .from('user_goals')
      .delete()
      .eq('user_id', userId)
      .eq('goal_id', goalId);
    if (ugErr) console.error('removeTeamGoal user_goals delete error:', ugErr);

    const { error: goalErr } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);
    if (goalErr) console.error('removeTeamGoal goals delete error:', goalErr);

    await Promise.all([
      get().fetchTeamGoals(teamId, userId),
      get().fetchMyGoals(userId),
    ]);
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

      const ugQuery = supabase
        .from('user_goals')
        .select('goal_id, frequency, target_count, start_date, end_date, goal:goals!inner(team_id, owner_id)')
        .eq('user_id', uid)
        .eq('is_active', true)
        .eq('goal.owner_id', uid);
      const { data: userGoalsRaw } = await ugQuery;
      const userGoals = (userGoalsRaw ?? []).map((ug: any) => ({
        goal_id: ug.goal_id,
        frequency: ug.frequency,
        target_count: ug.target_count,
        start_date: ug.start_date,
        end_date: ug.end_date,
      }));

      const todayGoalIds: string[] = [];
      for (const ug of userGoals) {
        if (!isGoalActiveOnDate(ug, today)) continue;
        todayGoalIds.push(ug.goal_id);
      }

      const total = todayGoalIds.length;

      const { data: goalRows } = total > 0
        ? await supabase.from('goals').select('id, name').in('id', todayGoalIds)
        : { data: [] as { id: string; name: string }[] };
      const goalNameMap = new Map((goalRows ?? []).map((g: any) => [g.id, g.name as string]));

      const { data: todayCheckins } = await supabase
        .from('checkins')
        .select('goal_id, status, memo')
        .eq('user_id', uid)
        .eq('date', today)
        .in('goal_id', total > 0 ? todayGoalIds : ['__none__']);

      const doneGoalIds = new Set(
        (todayCheckins ?? [])
          .filter((c: any) => c.status === 'done' && !(c.memo && c.memo.startsWith('[패스]')))
          .map((c: any) => c.goal_id),
      );
      const passGoalIds = new Set(
        (todayCheckins ?? [])
          .filter((c: any) => c.status === 'pass' || (c.memo && c.memo.startsWith('[패스]')))
          .map((c: any) => c.goal_id),
      );
      const doneCount = doneGoalIds.size;
      const passCount = passGoalIds.size;

      const goalDetails: MemberGoalDetail[] = todayGoalIds.map((gid) => ({
        goalId: gid,
        goalName: goalNameMap.get(gid) ?? '목표',
        isDone: doneGoalIds.has(gid),
        isPass: passGoalIds.has(gid),
        isActive: true,
      }));

      progress.push({
        userId: uid,
        nickname: user?.nickname ?? '알 수 없음',
        profileImageUrl: user?.profile_image_url ?? null,
        totalGoals: total,
        completedGoals: doneCount + passCount,
        doneGoals: doneCount,
        passGoals: passCount,
        position: getPosition(doneCount, total, passCount),
        goalDetails,
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
      const doneCount = dayCheckins.filter((c) => c.status === 'done' && !(c.memo && (c.memo as string).startsWith('[패스]'))).length;
      const passCount = dayCheckins.filter((c) => c.status === 'pass' || (c.memo && (c.memo as string).startsWith('[패스]'))).length;

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

      // 활성 목표 (start_date, end_date 기준 필터링)
      const { data: userGoals } = await supabase
        .from('user_goals')
        .select('goal_id, frequency, target_count, start_date, end_date')
        .eq('user_id', uid)
        .eq('is_active', true);

      const activeGoalIds = (userGoals ?? [])
        .filter((ug: any) => isGoalActiveOnDate(ug, date))
        .map((ug: any) => ug.goal_id);

      // 해당 날짜 체크인 (리액션 포함)
      const { data: checkins } = await supabase
        .from('checkins')
        .select('*, goal:goals(id, name), reactions:checkin_reactions(id, checkin_id, user_id, created_at, user:users(id, nickname, profile_image_url))')
        .eq('user_id', uid)
        .eq('date', date)
        .order('created_at');

      const typedCheckins = (checkins ?? []) as CheckinWithGoal[];
      const doneCount = typedCheckins.filter((c) => c.status === 'done' && !(c.memo && (c.memo as string).startsWith('[패스]'))).length;
      const passCount = typedCheckins.filter((c) => c.status === 'pass' || (c.memo && (c.memo as string).startsWith('[패스]'))).length;

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

  // ── 체크인 삭제 ──
  deleteCheckin: async (checkinId) => {
    const { error } = await supabase.from('checkins').delete().eq('id', checkinId);
    if (error) console.error('deleteCheckin error:', error);
  },

  // ── 리액션 토글 (좋아요) - 낙관적 업데이트 적용 ──
  toggleReaction: async (checkinId, user) => {
    const userId = user.id;
    
    // 1. 현재 상태에서 리액션 여부 확인 (낙관적 업데이트를 위함)
    const currentMemberCheckins = get().memberDateCheckins;
    let isReacted = false;
    let reactionIdToRemove: string | undefined;

    // 현재 상태 복사 및 수정
    const nextMemberCheckins = currentMemberCheckins.map(summary => ({
      ...summary,
      checkins: summary.checkins.map(c => {
        if (c.id !== checkinId) return c;
        
        const reactions = c.reactions || [];
        const existing = reactions.find(r => r.user_id === userId);
        isReacted = !!existing;
        
        let newReactions;
        if (existing) {
          // 이미 있으면 제거 (삭제)
          reactionIdToRemove = existing.id; // DB 삭제용 (ID가 있다면)
          newReactions = reactions.filter(r => r.user_id !== userId);
        } else {
          // 없으면 추가 (생성)
          newReactions = [
            ...reactions,
            {
              id: 'temp-' + Date.now(), // 임시 ID
              checkin_id: checkinId,
              user_id: userId,
              created_at: new Date().toISOString(),
              user: {
                id: user.id,
                nickname: user.nickname,
                profile_image_url: user.profile_image_url
              }
            }
          ];
        }
        return { ...c, reactions: newReactions };
      })
    }));

    // 2. UI 즉시 업데이트
    set({ memberDateCheckins: nextMemberCheckins });

    try {
      if (isReacted) {
        // 삭제
        // DB에서 정확한 ID를 찾아서 지워야 함 (낙관적 업데이트라 ID를 모를 수 있음)
        // checkin_id + user_id로 삭제
        await supabase
          .from('checkin_reactions')
          .delete()
          .match({ checkin_id: checkinId, user_id: userId });
      } else {
        // 추가
        await supabase.from('checkin_reactions').insert({
          checkin_id: checkinId,
          user_id: userId,
        });
      }
    } catch (e) {
      console.error('toggleReaction error:', e);
      // 에러 시 롤백 (여기선 생략, 필요 시 previousState 저장 후 복구)
      // fetchMemberDateCheckins 등을 통해 다시 동기화 권장
    }
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
