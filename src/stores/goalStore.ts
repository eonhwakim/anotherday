import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type {
  Goal,
  UserGoal,
  Checkin,
  CheckinWithGoal,
  MemberProgress,
  MountainPosition,
  CalendarDayMarking,
} from '../types/domain';
import { MOUNTAIN_THRESHOLDS } from '../constants/defaults';
import dayjs from '../lib/dayjs';

interface GoalState {
  /** 팀 공통 목표 목록 */
  teamGoals: Goal[];
  /** 내가 선택한 목표 목록 */
  myGoals: UserGoal[];
  /** 오늘 나의 체크인 목록 */
  todayCheckins: Checkin[];
  /** 팀 멤버 진행 상황 */
  memberProgress: MemberProgress[];
  /** 캘린더 마킹 데이터 */
  calendarMarkings: CalendarDayMarking;
  /** 선택한 날짜의 체크인 목록 */
  selectedDateCheckins: CheckinWithGoal[];
  /** 월간 체크인 목록 (마이페이지 캘린더 용) */
  monthlyCheckins: Checkin[];

  isLoading: boolean;

  // ─── Actions ────────────────────────────────────────────────
  /** 팀 목표 로드 (개인 목표 포함) */
  fetchTeamGoals: (teamId: string, userId?: string) => Promise<void>;
  /** 내가 선택한 목표 로드 */
  fetchMyGoals: (userId: string) => Promise<void>;
  /** 오늘 나의 체크인 로드 */
  fetchTodayCheckins: (userId: string) => Promise<void>;
  /** 체크인 생성 (인증하기) — date 를 생략하면 오늘 */
  createCheckin: (params: {
    userId: string;
    goalId: string;
    date?: string;
    photoUrl?: string | null;
    memo?: string | null;
  }) => Promise<boolean>;
  /** 목표 선택/해제 토글 */
  toggleUserGoal: (userId: string, goalId: string) => Promise<void>;
  /** 목표 추가 (팀 or 개인) */
  addGoal: (params: { teamId?: string; userId: string; name: string }) => Promise<boolean>;
  /** 팀 목표 삭제 (비활성화) */
  removeTeamGoal: (teamId: string, userId: string, goalId: string) => Promise<void>;
  /** 팀 멤버 산 진행상황 계산 */
  fetchMemberProgress: (teamId?: string, userId?: string) => Promise<void>;
  /** 월별 캘린더 마킹 로드 */
  fetchCalendarMarkings: (userId: string, yearMonth: string) => Promise<void>;
  /** 특정 날짜의 체크인 목록 로드 */
  fetchCheckinsForDate: (userId: string, date: string) => Promise<void>;
  /** 월간 체크인 로드 (마이페이지 캘린더) */
  fetchMonthlyCheckins: (userId: string, yearMonth: string) => Promise<void>;
}

/** 달성률 → 산 위치 매핑 */
function getPosition(completed: number, total: number): MountainPosition {
  if (total === 0) return 'base';
  const ratio = completed / total;
  if (ratio >= MOUNTAIN_THRESHOLDS.SUMMIT) return 'summit';
  if (ratio >= MOUNTAIN_THRESHOLDS.MIDDLE) return 'middle';
  return 'base';
}

export const useGoalStore = create<GoalState>((set, get) => ({
  teamGoals: [],
  myGoals: [],
  todayCheckins: [],
  memberProgress: [],
  calendarMarkings: {},
  selectedDateCheckins: [],
  monthlyCheckins: [],
  isLoading: false,

  fetchTeamGoals: async (teamId, userId) => {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    if (userId) {
      if (teamId) {
        // 팀 목표 OR 내 개인 목표
        query = query.or(`team_id.eq.${teamId},owner_id.eq.${userId}`);
      } else {
        // 팀 없음 -> 내 개인 목표만
        query = query.eq('owner_id', userId);
      }
    } else {
      // userId 없음 -> 팀 목표만 (기존 로직 유지용)
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('fetchTeamGoals error:', error);
    }
    set({ teamGoals: data ?? [] });
  },

  fetchMyGoals: async (userId) => {
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    set({ myGoals: data ?? [] });
  },

  fetchTodayCheckins: async (userId) => {
    const today = dayjs().format('YYYY-MM-DD');
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);

    set({ todayCheckins: data ?? [] });
  },

  createCheckin: async ({ userId, goalId, date, photoUrl, memo }) => {
    const checkinDate = date ?? dayjs().format('YYYY-MM-DD');

    // 중복 체크인 방지
    const { data: existing } = await supabase
      .from('checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .eq('date', checkinDate)
      .maybeSingle();

    if (existing) return false; // 이미 인증 완료

    const { error } = await supabase.from('checkins').insert({
      user_id: userId,
      goal_id: goalId,
      date: checkinDate,
      photo_url: photoUrl ?? null,
      memo: memo ?? null,
    });

    if (error) return false;

    // 체크인 목록 새로고침
    await get().fetchTodayCheckins(userId);
    return true;
  },

  toggleUserGoal: async (userId, goalId) => {
    const existing = get().myGoals.find(
      (ug) => ug.goal_id === goalId && ug.user_id === userId
    );

    if (existing) {
      // 비활성화
      await supabase
        .from('user_goals')
        .update({ is_active: false })
        .eq('id', existing.id);
    } else {
      // 새로 추가하거나 다시 활성화 (Upsert)
      // unique constraint: (user_id, goal_id)
      await supabase.from('user_goals').upsert(
        {
          user_id: userId,
          goal_id: goalId,
          is_active: true,
        },
        { onConflict: 'user_id, goal_id' }
      );
    }

    await get().fetchMyGoals(userId);
  },

  addGoal: async ({ teamId, userId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    // 중복 이름 방지 (목록 내) -> 이미 있으면 내 목표로 연결
    const existing = get().teamGoals.find(
      (g) => g.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (existing) {
      // 이미 존재하는 목표라면, 내 목표로 등록되어 있는지 확인
      const myGoal = get().myGoals.find(
        (ug) => ug.goal_id === existing.id && ug.user_id === userId
      );

      if (myGoal) {
        // 이미 내 목표로 등록됨 (활성 상태면 중복 알림, 비활성이면 활성화)
        if (myGoal.is_active) {
          return false; // 이미 등록됨 -> UI에서 알림 처리
        } else {
          // 비활성 상태면 다시 활성화
          await supabase
            .from('user_goals')
            .update({ is_active: true })
            .eq('id', myGoal.id);
        }
      } else {
        // 내 목표 목록에 없으면 새로 연결 (insert)
        await supabase.from('user_goals').insert({
          user_id: userId,
          goal_id: existing.id,
          is_active: true,
        });
      }

      // 새로고침 후 성공 리턴
      await get().fetchMyGoals(userId);
      return true;
    }

    // 1) goals 테이블에 추가
    // teamId가 있으면 팀 목표, 없으면 개인 목표(owner_id)
    const payload: any = {
      name: trimmed,
      is_active: true,
      owner_id: userId,
    };
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

    // 2) user_goals 에 자동 선택
    await supabase.from('user_goals').insert({
      user_id: userId,
      goal_id: newGoal.id,
      is_active: true,
    });

    // 새로고침
    if (teamId) {
      await get().fetchTeamGoals(teamId, userId);
    } else {
      // 팀이 없어도 내 목표는 다시 불러와야 함 (구조상 fetchTeamGoals를 재활용하거나 분리해야 함)
      // 여기서는 fetchTeamGoals가 'availableGoals' 역할을 하므로 호출
      // teamId가 없으면 fetchTeamGoals 호출이 애매하므로, 로직 보완 필요.
      // 일단 teamId가 있는 경우만 상정하거나, fetchTeamGoals 로직을 수정했으므로 teamId null 처리를 해야함.
    }
    await get().fetchMyGoals(userId);
    
    // teamGoals가 업데이트되었을 수 있으므로 다시 불러오기
    if (teamId) await get().fetchTeamGoals(teamId, userId);
    
    return true;
  },

  removeTeamGoal: async (teamId, userId, goalId) => {
    // 목표 비활성화
    await supabase
      .from('goals')
      .update({ is_active: false })
      .eq('id', goalId);

    // 유저 선택도 비활성화
    await supabase
      .from('user_goals')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('goal_id', goalId);

    await Promise.all([
      get().fetchTeamGoals(teamId),
      get().fetchMyGoals(userId),
    ]);
  },

  fetchMemberProgress: async (teamId, userId) => {
    const today = dayjs().format('YYYY-MM-DD');

    let members: any[] = [];

    if (teamId) {
      // 1) 팀이 있는 경우: 팀 멤버 조회
      const { data } = await supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, nickname, profile_image_url)
        `)
        .eq('team_id', teamId);
      members = data ?? [];
    } else if (userId) {
      // 2) 팀이 없는 경우: 나 자신만 조회
      const { data } = await supabase
        .from('users')
        .select('id, nickname, profile_image_url')
        .eq('id', userId)
        .single();
      
      if (data) {
        members = [{
          user_id: data.id,
          user: data,
        }];
      }
    }

    if (members.length === 0) {
      set({ memberProgress: [] });
      return;
    }

    const progress: MemberProgress[] = [];

    for (const member of members) {
      const user = member.user as any;
      const targetUserId = member.user_id || user.id; // user_id가 없을 수도 있음(users 테이블 직접 조회 시)

      // 해당 유저의 활성 목표 수
      const { count: totalGoals } = await supabase
        .from('user_goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)
        .eq('is_active', true);

      // 오늘 체크인 수
      const { count: completedGoals } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)
        .eq('date', today);

      const total = totalGoals ?? 0;
      const completed = completedGoals ?? 0;

      progress.push({
        userId: targetUserId,
        nickname: user?.nickname ?? '알 수 없음',
        profileImageUrl: user?.profile_image_url ?? null,
        totalGoals: total,
        completedGoals: completed,
        position: getPosition(completed, total),
      });
    }

    set({ memberProgress: progress });
  },

  fetchCalendarMarkings: async (userId, yearMonth) => {
    // yearMonth: 'YYYY-MM'
    const startDate = `${yearMonth}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

    const { data } = await supabase
      .from('checkins')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    const markings: CalendarDayMarking = {};

    if (data) {
      // 날짜별 카운트
      const counts: Record<string, number> = {};
      data.forEach((c) => {
        counts[c.date] = (counts[c.date] || 0) + 1;
      });

      Object.entries(counts).forEach(([date, count]) => {
        markings[date] = {
          marked: true,
          dotColor: '#4F46E5',
          checkinCount: count,
        };
      });
    }

    set({ calendarMarkings: markings });
  },

  fetchCheckinsForDate: async (userId, date) => {
    const { data } = await supabase
      .from('checkins')
      .select(`
        *,
        goal:goals(id, name)
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at');

    set({ selectedDateCheckins: (data as CheckinWithGoal[]) ?? [] });
  },

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
}));
