export const queryKeys = {
  auth: {
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },
  teams: {
    list: (userId: string) => ['teams', 'list', userId] as const,
    members: (teamId: string, detailed = false) =>
      ['teams', 'members', teamId, detailed ? 'detailed' : 'basic'] as const,
    detailMonth: (teamId: string, yearMonth: string) =>
      ['teams', 'detail-month', teamId, yearMonth] as const,
  },
  goals: {
    team: (teamId: string, userId?: string) => ['goals', 'team', teamId, userId ?? null] as const,
    mine: (userId: string) => ['goals', 'mine', userId] as const,
    mineMonth: (userId: string, yearMonth: string) =>
      ['goals', 'mine-month', userId, yearMonth] as const,
    lastMonth: (userId: string) => ['goals', 'last-month', userId] as const,
    todayCheckins: (userId: string, date: string) =>
      ['goals', 'today-checkins', userId, date] as const,
    weeklyDoneCounts: (userId: string, weekStart: string, goalIds: string[]) =>
      ['goals', 'weekly-done-counts', userId, weekStart, ...goalIds] as const,
  },
  stats: {
    memberProgress: (teamId: string | undefined, userId: string | undefined, date: string) =>
      ['stats', 'member-progress', teamId ?? null, userId ?? null, date] as const,
    calendar: (userId: string, yearMonth: string) =>
      ['stats', 'calendar', userId, yearMonth] as const,
    monthlyCheckins: (userId: string, yearMonth: string) =>
      ['stats', 'monthly-checkins', userId, yearMonth] as const,
    dateCheckins: (userId: string, date: string) =>
      ['stats', 'date-checkins', userId, date] as const,
    memberDateCheckins: (teamId: string | undefined, userId: string, date: string) =>
      ['stats', 'member-date-checkins', teamId ?? null, userId, date] as const,
    weekly: (teamId: string, userId: string, weekStart: string) =>
      ['stats', 'weekly', teamId, userId, weekStart] as const,
    monthlySummary: (userId: string, yearMonth: string, teamId?: string) =>
      ['stats', 'monthly-summary', userId, yearMonth, teamId ?? null] as const,
  },
  monthly: {
    resolution: (userId: string, yearMonth: string, teamId?: string | null) =>
      ['monthly', 'resolution', userId, yearMonth, teamId ?? null] as const,
    retrospective: (userId: string, yearMonth: string, teamId?: string | null) =>
      ['monthly', 'retrospective', userId, yearMonth, teamId ?? null] as const,
  },
} as const;
