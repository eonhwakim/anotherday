import { create } from 'zustand';
import type {
  Checkin,
  CheckinWithGoal,
  MemberProgress,
  MemberCheckinSummary,
  CalendarDayMarking,
} from '../types/domain';
import { handleServiceError } from '../lib/serviceError';
import {
  fetchCalendarMarkings,
  fetchCheckinsForDate,
  fetchMemberDateCheckins,
  fetchMemberProgress,
  fetchMonthlyCheckins,
  toggleReaction,
} from '../services/statsService';

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

  fetchMemberProgress: async (teamId, userId) => {
    try {
      const progress = await fetchMemberProgress(teamId, userId);
      set({ memberProgress: progress });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchCalendarMarkings: async (userId, yearMonth) => {
    try {
      const markings = await fetchCalendarMarkings(userId, yearMonth);
      set({ calendarMarkings: markings });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchCheckinsForDate: async (userId, date) => {
    try {
      const checkins = await fetchCheckinsForDate(userId, date);
      set({ selectedDateCheckins: checkins });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchMonthlyCheckins: async (userId, yearMonth) => {
    try {
      const checkins = await fetchMonthlyCheckins(userId, yearMonth);
      set({ monthlyCheckins: checkins });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchMemberDateCheckins: async (teamId, userId, date) => {
    try {
      const summaries = await fetchMemberDateCheckins(teamId, userId, date);
      set({ memberDateCheckins: summaries });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

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
      await toggleReaction(checkinId, userId, isReacted);
    } catch (e) {
      handleServiceError(e);
      set({ memberDateCheckins: currentMemberCheckins });
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
