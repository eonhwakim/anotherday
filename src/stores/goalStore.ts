import { create } from 'zustand';
import type { Goal, UserGoal, Checkin } from '../types/domain';
import { scheduleGoalReminderNotification } from '../utils/notifications';
import {
  addGoal,
  copyGoalsFromLastMonth,
  createCheckin,
  deleteCheckin,
  extendGoalsForNewMonth,
  fetchLastMonthGoals,
  fetchMyGoals,
  fetchTeamGoals,
  fetchTodayCheckins,
  removeTeamGoal,
  toggleUserGoal,
} from '../services/goalService';

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
  extendGoalsForNewMonth: (userId: string, newMonthStr: string) => Promise<boolean>;
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
    const goals = await fetchLastMonthGoals(userId);
    set({ lastMonthGoals: goals });
  },

  // ── 지난 달 목표 그대로 가져오기 ──
  copyGoalsFromLastMonth: async (userId) => {
    const goals = get().lastMonthGoals;
    if (goals.length === 0) return;

    const ok = await copyGoalsFromLastMonth(userId, goals);
    if (!ok) return;

    await get().fetchMyGoals(userId);
    set({ lastMonthGoals: [] });
  },

  // ── 새 달 목표 연장 ──
  extendGoalsForNewMonth: async (userId, newMonthStr) => {
    const ok = await extendGoalsForNewMonth(userId, newMonthStr);
    if (!ok) return false;
    await get().fetchMyGoals(userId);
    return true;
  },

  // ── 팀 목표 로드 ──
  fetchTeamGoals: async (teamId, userId) => {
    const goals = await fetchTeamGoals(teamId, userId);
    set({ teamGoals: goals });
  },

  // ── 내 목표 로드 ──
  fetchMyGoals: async (userId) => {
    const goals = await fetchMyGoals(userId);
    set({ myGoals: goals });
  },

  // ── 오늘 체크인 로드 ──
  fetchTodayCheckins: async (userId) => {
    const checkins = await fetchTodayCheckins(userId);
    set({ todayCheckins: checkins });
  },

  // ── 체크인 생성 ──
  createCheckin: async ({ userId, goalId, date, photoUrl, memo, status = 'done' }) => {
    const ok = await createCheckin({ userId, goalId, date, photoUrl, memo, status });
    if (!ok) return false;
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
    const ok = await toggleUserGoal(userId, goalId);
    if (!ok) return;
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
    const ok = await addGoal({
      teamId,
      userId,
      name,
      frequency,
      targetCount,
      duration,
      existingGoals: get().teamGoals,
    });
    if (!ok) return false;

    await get().fetchMyGoals(userId);
    if (teamId) await get().fetchTeamGoals(teamId, userId);
    return true;
  },

  // ── 목표 삭제 (Soft Delete 지원) ──
  removeTeamGoal: async (teamId, userId, goalId) => {
    const ok = await removeTeamGoal(teamId, userId, goalId);
    if (!ok) return;
    await Promise.all([get().fetchTeamGoals(teamId, userId), get().fetchMyGoals(userId)]);
  },

  // ── 체크인 삭제 ──
  deleteCheckin: async (checkinId) => {
    await deleteCheckin(checkinId);
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
