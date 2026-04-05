import { create } from 'zustand';
import type { Goal, UserGoal, Checkin } from '../types/domain';
import { handleServiceError } from '../lib/serviceError';
import { scheduleGoalReminderNotification } from '../utils/notifications';
import dayjs from '../lib/dayjs';
import {
  addGoal,
  copyGoalsFromLastMonth,
  createCheckin,
  deleteCheckin,
  endTeamGoal,
  extendGoalsForNewMonth,
  fetchLastMonthGoals,
  fetchMyGoals,
  fetchMyGoalsForMonth,
  fetchTeamGoals,
  fetchTodayCheckins,
  removeTeamGoal,
  toggleUserGoal,
} from '../services/goalService';

interface GoalState {
  teamGoals: Goal[];
  myGoals: UserGoal[];
  monthGoals: UserGoal[];
  todayCheckins: Checkin[];
  lastMonthGoals: UserGoal[];
  isLoading: boolean;

  fetchTeamGoals: (teamId: string, userId?: string) => Promise<void>;
  fetchMyGoals: (userId: string) => Promise<void>;
  fetchMyGoalsForMonth: (userId: string, yearMonth: string) => Promise<void>;
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
  endTeamGoal: (teamId: string, userId: string, goalId: string) => Promise<void>;
  removeTeamGoal: (teamId: string, userId: string, goalId: string) => Promise<void>;
  deleteCheckin: (checkinId: string) => Promise<void>;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  teamGoals: [],
  myGoals: [],
  monthGoals: [],
  todayCheckins: [],
  lastMonthGoals: [],
  isLoading: false,

  fetchLastMonthGoals: async (userId) => {
    try {
      const goals = await fetchLastMonthGoals(userId);
      set({ lastMonthGoals: goals });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  copyGoalsFromLastMonth: async (userId) => {
    try {
      const goals = get().lastMonthGoals;
      if (goals.length === 0) return;

      const ok = await copyGoalsFromLastMonth(userId, goals);
      if (!ok) return;

      await get().fetchMyGoals(userId);
      set({ lastMonthGoals: [] });
    } catch (e) {
      handleServiceError(e);
    }
  },

  extendGoalsForNewMonth: async (userId, newMonthStr) => {
    try {
      const ok = await extendGoalsForNewMonth(userId, newMonthStr);
      if (!ok) return false;
      await get().fetchMyGoals(userId);
      return true;
    } catch (e) {
      handleServiceError(e);
      return false;
    }
  },

  fetchTeamGoals: async (teamId, userId) => {
    try {
      const goals = await fetchTeamGoals(teamId, userId);
      set({ teamGoals: goals });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchMyGoals: async (userId) => {
    try {
      const goals = await fetchMyGoals(userId);
      set({ myGoals: goals });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchMyGoalsForMonth: async (userId, yearMonth) => {
    try {
      const goals = await fetchMyGoalsForMonth(userId, yearMonth);
      set({ monthGoals: goals });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchTodayCheckins: async (userId) => {
    try {
      const checkins = await fetchTodayCheckins(userId);
      set({ todayCheckins: checkins });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  createCheckin: async ({ userId, goalId, date, photoUrl, memo, status = 'done' }) => {
    try {
      const ok = await createCheckin({ userId, goalId, date, photoUrl, memo, status });
      if (!ok) return false;
      await get().fetchTodayCheckins(userId);

      const { useStatsStore } = await import('./statsStore');
      const myProgress = useStatsStore.getState().memberProgress.find((p) => p.userId === userId);
      if (myProgress) {
        const uncompleted = myProgress.goalDetails
          .filter((g) => g.isActive && !g.isDone && !g.isPass && g.goalId !== goalId)
          .map((g) => g.goalName);
        scheduleGoalReminderNotification(uncompleted).catch(() => {});
      }

      return true;
    } catch (e) {
      handleServiceError(e);
      return false;
    }
  },

  toggleUserGoal: async (userId, goalId) => {
    try {
      const ok = await toggleUserGoal(userId, goalId);
      if (!ok) return;
      await get().fetchMyGoals(userId);
    } catch (e) {
      handleServiceError(e);
    }
  },

  addGoal: async ({
    teamId,
    userId,
    name,
    frequency = 'daily',
    targetCount = null,
    duration = 'continuous',
  }) => {
    try {
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
    } catch (e) {
      handleServiceError(e);
      return false;
    }
  },

  endTeamGoal: async (teamId, userId, goalId) => {
    try {
      const ok = await endTeamGoal(userId, goalId);
      if (!ok) return;
      await Promise.all([
        get().fetchTeamGoals(teamId, userId),
        get().fetchMyGoals(userId),
        get().fetchMyGoalsForMonth(userId, dayjs().format('YYYY-MM')),
        get().fetchTodayCheckins(userId),
      ]);
    } catch (e) {
      handleServiceError(e);
    }
  },

  removeTeamGoal: async (teamId, userId, goalId) => {
    try {
      const ok = await removeTeamGoal(teamId, userId, goalId);
      if (!ok) return;
      await Promise.all([
        get().fetchTeamGoals(teamId, userId),
        get().fetchMyGoals(userId),
        get().fetchMyGoalsForMonth(userId, dayjs().format('YYYY-MM')),
        get().fetchTodayCheckins(userId),
      ]);
    } catch (e) {
      handleServiceError(e);
    }
  },

  deleteCheckin: async (checkinId) => {
    try {
      await deleteCheckin(checkinId);
    } catch (e) {
      handleServiceError(e);
    }
  },

  reset: () => {
    set({
      teamGoals: [],
      myGoals: [],
      monthGoals: [],
      todayCheckins: [],
      lastMonthGoals: [],
      isLoading: false,
    });
  },
}));
