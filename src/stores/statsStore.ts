import { create } from 'zustand';
import type {
  Checkin,
  CheckinWithGoal,
  MemberProgress,
  MemberCheckinSummary,
  CalendarDayMarking,
} from '../types/domain';
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

  // ── 멤버 진행상황 (산 애니메이션) ──
  fetchMemberProgress: async (teamId, userId) => {
    const progress = await fetchMemberProgress(teamId, userId);
    set({ memberProgress: progress });
  },

  // ── 캘린더 마킹 ──
  fetchCalendarMarkings: async (userId, yearMonth) => {
    const markings = await fetchCalendarMarkings(userId, yearMonth);
    set({ calendarMarkings: markings });
  },

  // ── 날짜별 체크인 ──
  fetchCheckinsForDate: async (userId, date) => {
    const checkins = await fetchCheckinsForDate(userId, date);
    set({ selectedDateCheckins: checkins });
  },

  // ── 월간 체크인 ──
  fetchMonthlyCheckins: async (userId, yearMonth) => {
    const checkins = await fetchMonthlyCheckins(userId, yearMonth);
    set({ monthlyCheckins: checkins });
  },

  // ── 팀 멤버 날짜별 체크인 ──
  fetchMemberDateCheckins: async (teamId, userId, date) => {
    const summaries = await fetchMemberDateCheckins(teamId, userId, date);
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
      await toggleReaction(checkinId, userId, isReacted);
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
