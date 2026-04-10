import { create } from 'zustand';
import type {
  Checkin,
  CheckinWithGoal,
  MemberProgress,
  MemberCheckinSummary,
  CalendarDayMarking,
  User,
  ReactionWithUser,
} from '../types/domain';
import { handleServiceError } from '../lib/serviceError';
import { runSingleFlight } from '../lib/requestCache';
import {
  fetchCalendarMarkings,
  fetchCheckinsForDate,
  fetchMemberDateCheckins,
  fetchMemberProgress,
  fetchMonthlyCheckins,
  toggleReaction as persistToggleReaction,
} from '../services/statsService';

let memberProgressRequestSeq = 0;
let calendarMarkingsRequestSeq = 0;
let selectedDateCheckinsRequestSeq = 0;
let monthlyCheckinsRequestSeq = 0;
let memberDateCheckinsRequestSeq = 0;

const pendingReactionIds = new Set<string>();

/**
 * 같은 날짜를 다시 fetch할 때 서버 응답이 낙관적 리액션보다 늦게 도착하면
 * 내 리액션만 이전 스토어와 맞춘다(캘린더 포커스 fetch가 덮어쓰는 레이스 방지).
 */
function mergeMyReactionWithPrevCheckin(
  server: CheckinWithGoal,
  prev: CheckinWithGoal | undefined,
  currentUserId: string,
): CheckinWithGoal {
  if (!prev) return server;
  const s = server.reactions ?? [];
  const p = prev.reactions ?? [];
  const sMine = s.some((r) => r.user_id === currentUserId);
  const pMine = p.some((r) => r.user_id === currentUserId);
  if (sMine === pMine) return server;
  const others = s.filter((r) => r.user_id !== currentUserId);
  let next: ReactionWithUser[];
  if (pMine) {
    const mine = p.find((r) => r.user_id === currentUserId)!;
    next = [...others, mine];
  } else {
    next = others;
  }
  return { ...server, reactions: next };
}

function mergeMemberDateCheckinsWithPrevForSameDate(
  serverSummaries: MemberCheckinSummary[],
  prevSummaries: MemberCheckinSummary[],
  currentUserId: string,
): MemberCheckinSummary[] {
  const prevByUserId = new Map(prevSummaries.map((m) => [m.userId, m]));
  return serverSummaries.map((summary) => {
    const prevSummary = prevByUserId.get(summary.userId);
    if (!prevSummary) return summary;
    const prevByCheckinId = new Map(prevSummary.checkins.map((c) => [c.id, c]));
    return {
      ...summary,
      checkins: summary.checkins.map((c) =>
        mergeMyReactionWithPrevCheckin(c, prevByCheckinId.get(c.id), currentUserId),
      ),
    };
  });
}

// ─── Store Interface ──────────────────────────────────────────

interface StatsState {
  memberProgress: MemberProgress[];
  calendarMarkings: CalendarDayMarking;
  selectedDateCheckins: CheckinWithGoal[];
  monthlyCheckins: Checkin[];
  memberDateCheckins: MemberCheckinSummary[];
  /** `memberDateCheckins`가 마지막으로 로드된 날짜(같은 날 재fetch 시 리액션 병합용) */
  memberDateCheckinsForDate: string | null;

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
  memberDateCheckinsForDate: null,

  fetchMemberProgress: async (teamId, userId) => {
    try {
      const requestId = ++memberProgressRequestSeq;
      const progress = await runSingleFlight(
        `stats:memberProgress:${teamId ?? 'personal'}:${userId ?? ''}`,
        () => fetchMemberProgress(teamId, userId),
      );
      if (requestId !== memberProgressRequestSeq) return;
      set({ memberProgress: progress });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchCalendarMarkings: async (userId, yearMonth) => {
    try {
      const requestId = ++calendarMarkingsRequestSeq;
      const markings = await runSingleFlight(`stats:calendar:${userId}:${yearMonth}`, () =>
        fetchCalendarMarkings(userId, yearMonth),
      );
      if (requestId !== calendarMarkingsRequestSeq) return;
      set({ calendarMarkings: markings });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchCheckinsForDate: async (userId, date) => {
    try {
      const requestId = ++selectedDateCheckinsRequestSeq;
      const checkins = await runSingleFlight(`stats:dateCheckins:${userId}:${date}`, () =>
        fetchCheckinsForDate(userId, date),
      );
      if (requestId !== selectedDateCheckinsRequestSeq) return;
      set({ selectedDateCheckins: checkins });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchMonthlyCheckins: async (userId, yearMonth) => {
    try {
      const requestId = ++monthlyCheckinsRequestSeq;
      const checkins = await runSingleFlight(`stats:monthlyCheckins:${userId}:${yearMonth}`, () =>
        fetchMonthlyCheckins(userId, yearMonth),
      );
      if (requestId !== monthlyCheckinsRequestSeq) return;
      set({ monthlyCheckins: checkins });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  fetchMemberDateCheckins: async (teamId, userId, date) => {
    try {
      const requestId = ++memberDateCheckinsRequestSeq;
      const summaries = await runSingleFlight(
        `stats:memberDateCheckins:${teamId ?? 'personal'}:${userId}:${date}`,
        () => fetchMemberDateCheckins(teamId, userId, date),
      );
      if (requestId !== memberDateCheckinsRequestSeq) return;
      const prev = get().memberDateCheckins;
      const prevForDate = get().memberDateCheckinsForDate;
      const merged =
        prevForDate === date && prev.length > 0
          ? mergeMemberDateCheckinsWithPrevForSameDate(summaries, prev, userId)
          : summaries;
      set({ memberDateCheckins: merged, memberDateCheckinsForDate: date });
    } catch (e) {
      handleServiceError(e, { silent: true });
    }
  },

  toggleReaction: async (checkinId, user: Pick<User, 'id' | 'nickname' | 'profile_image_url'>) => {
    if (pendingReactionIds.has(checkinId)) {
      return;
    }

    pendingReactionIds.add(checkinId);
    const userId = user.id;
    const currentMemberCheckins = get().memberDateCheckins;
    const currentMemberProgress = get().memberProgress;

    const resolveIsReacted = (): boolean => {
      for (const summary of currentMemberCheckins) {
        const c = summary.checkins.find((x) => x.id === checkinId);
        if (c) return (c.reactions ?? []).some((r) => r.user_id === userId);
      }
      for (const m of currentMemberProgress) {
        const c = m.todayCheckins?.find((x) => x.id === checkinId);
        if (c) return (c.reactions ?? []).some((r) => r.user_id === userId);
      }
      return false;
    };

    const isReacted = resolveIsReacted();

    const patchCheckin = (c: CheckinWithGoal): CheckinWithGoal => {
      if (c.id !== checkinId) return c;
      const reactions = c.reactions || [];
      const existing = reactions.find((r) => r.user_id === userId);
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
    };

    const nextMemberCheckins = currentMemberCheckins.map((summary) => ({
      ...summary,
      checkins: summary.checkins.map(patchCheckin),
    }));

    const nextMemberProgress = currentMemberProgress.map((m) => ({
      ...m,
      todayCheckins: m.todayCheckins?.map(patchCheckin),
    }));

    set({
      memberDateCheckins: nextMemberCheckins,
      memberProgress: nextMemberProgress,
    });

    try {
      await persistToggleReaction(checkinId, userId, isReacted);
    } catch (e) {
      handleServiceError(e);
      set({
        memberDateCheckins: currentMemberCheckins,
        memberProgress: currentMemberProgress,
      });
    } finally {
      pendingReactionIds.delete(checkinId);
    }
  },

  reset: () => {
    set({
      memberProgress: [],
      calendarMarkings: {},
      selectedDateCheckins: [],
      monthlyCheckins: [],
      memberDateCheckins: [],
      memberDateCheckinsForDate: null,
    });
  },
}));
