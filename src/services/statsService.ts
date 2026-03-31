import { supabase } from '../lib/supabaseClient';
import { MOUNTAIN_THRESHOLDS } from '../constants/defaults';
import dayjs from '../lib/dayjs';
import { calcWeekAchievement, dayjsMax, dayjsMin, getCalendarWeekRanges } from '../lib/statsUtils';
import type {
  CalendarDayMarking,
  Checkin,
  CheckinWithGoal,
  MemberCheckinSummary,
  MemberGoalDetail,
  MemberProgress,
  MountainPosition,
} from '../types/domain';

interface ActiveUserGoalRow {
  user_id: string;
  goal_id: string;
  frequency: 'daily' | 'weekly_count';
  target_count: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface MemberRow {
  user_id: string;
  user?: any;
  users?: any;
}

interface GoalItem {
  goalId: string;
  name: string;
  frequency: string;
  targetCount: number | null;
}

export interface MyGoalDetail extends GoalItem {
  achievedWeeks: number;
  totalActiveWeeks: number;
  rate: number | null;
}

export interface MemberDetail {
  userId: string;
  nickname: string;
  isMe: boolean;
  rate: number | null;
  goals: GoalItem[];
  hanmadi: string;
  hoego: string;
}

export interface WeeklyTeamGoal {
  goalId: string;
  name: string;
  target: number;
  doneCount: number;
  isAchieved: boolean;
  isDaily: boolean;
}

export interface WeeklyTeamMember {
  userId: string;
  nickname: string;
  doneCount: number;
  isMe: boolean;
  totalGoals: number;
  failedGoals: number;
  isAllClear: boolean;
  goals: WeeklyTeamGoal[];
}

export interface WeeklyStatsResult {
  weeklyTeamData: WeeklyTeamMember[];
  weeklyCheckins: { user_id: string; goal_id: string; status: string; date: string }[];
}

export interface TeamDetailMemberStats {
  totalGoals: number;
  doneCount: number;
  passCount: number;
  missedCount: number;
  completionRate: number;
}

export interface TeamDetailMemberGoalStatus {
  goalId: string;
  name: string;
  frequency: 'daily' | 'weekly_count';
  targetCount: number | null;
  done: number;
  pass: number;
  fail: number;
  total: number;
}

export interface TeamDetailMonthlyData {
  members: any[];
  resolutions: Record<string, string>;
  retrospectives: Record<string, string>;
  memberStats: Record<string, TeamDetailMemberStats>;
  memberGoals: Record<string, TeamDetailMemberGoalStatus[]>;
}

function getPosition(done: number, total: number, pass: number = 0): MountainPosition {
  const effective = total - pass;
  if (effective <= 0) return pass > 0 ? 'summit' : 'base';
  const ratio = done / effective;
  if (ratio >= MOUNTAIN_THRESHOLDS.SUMMIT) return 'summit';
  if (ratio >= MOUNTAIN_THRESHOLDS.MIDDLE) return 'middle';
  return 'base';
}

function isGoalActiveOnDate(
  ug: { start_date?: string | null; end_date?: string | null },
  dateStr: string,
) {
  const d = dayjs(dateStr);
  const weekStart = d.startOf('isoWeek').format('YYYY-MM-DD');
  const weekEnd = d.endOf('isoWeek').format('YYYY-MM-DD');

  if (ug.start_date && weekEnd < ug.start_date) return false;
  if (ug.end_date && weekStart > ug.end_date) return false;
  return true;
}

function normalizeJoinedUser(user: any) {
  if (Array.isArray(user)) return user[0] ?? null;
  return user ?? null;
}

export async function fetchMemberProgress(
  teamId?: string,
  userId?: string,
): Promise<MemberProgress[]> {
  const today = dayjs().format('YYYY-MM-DD');

  let members: MemberRow[] = [];
  if (teamId) {
    const { data } = await supabase
      .from('team_members')
      .select('user_id, user:users(id, nickname, profile_image_url)')
      .eq('team_id', teamId);
    members = (data ?? []) as unknown as MemberRow[];
  } else if (userId) {
    const { data } = await supabase
      .from('users')
      .select('id, nickname, profile_image_url')
      .eq('id', userId)
      .single();
    if (data) {
      members = [{ user_id: data.id, user: data }];
    }
  }

  if (members.length === 0) return [];

  const memberIds = members
    .map((member) => member.user_id || member.user?.id)
    .filter((id): id is string => !!id);

  if (memberIds.length === 0) return [];

  const { data: userGoalsRaw } = await supabase
    .from('user_goals')
    .select('user_id, goal_id, frequency, target_count, start_date, end_date, goal:goals(owner_id)')
    .in('user_id', memberIds)
    .eq('is_active', true);

  const userGoalsByUserId = new Map<string, ActiveUserGoalRow[]>();
  (userGoalsRaw ?? []).forEach((row: any) => {
    if (row.goal?.owner_id !== row.user_id) return;
    const list = userGoalsByUserId.get(row.user_id) ?? [];
    list.push({
      user_id: row.user_id,
      goal_id: row.goal_id,
      frequency: row.frequency,
      target_count: row.target_count,
      start_date: row.start_date,
      end_date: row.end_date,
    });
    userGoalsByUserId.set(row.user_id, list);
  });

  const memberBases = members.map((member) => {
    const user = normalizeJoinedUser(member.user);
    const uid = (member.user_id || user?.id) as string;
    const goals = userGoalsByUserId.get(uid) ?? [];
    const todayGoalIds = goals
      .filter((goal) => isGoalActiveOnDate(goal, today))
      .map((goal) => goal.goal_id);

    return {
      uid,
      nickname: user?.nickname ?? '알 수 없음',
      profileImageUrl: user?.profile_image_url ?? null,
      todayGoalIds,
    };
  });

  const allTodayGoalIds = Array.from(new Set(memberBases.flatMap((member) => member.todayGoalIds)));
  const { data: goalRows } =
    allTodayGoalIds.length > 0
      ? await supabase.from('goals').select('id, name').in('id', allTodayGoalIds)
      : { data: [] as { id: string; name: string }[] };
  const goalNameMap = new Map((goalRows ?? []).map((goal: any) => [goal.id, goal.name as string]));

  const { data: todayCheckins } = await supabase
    .from('checkins')
    .select('user_id, goal_id, status')
    .in('user_id', memberIds)
    .eq('date', today);

  const doneByUser = new Map<string, Set<string>>();
  const passByUser = new Map<string, Set<string>>();

  (todayCheckins ?? []).forEach((checkin: any) => {
    const targetMap = checkin.status === 'pass' ? passByUser : doneByUser;
    const setForUser = targetMap.get(checkin.user_id) ?? new Set<string>();
    setForUser.add(checkin.goal_id);
    targetMap.set(checkin.user_id, setForUser);
  });

  return memberBases.map((member) => {
    const doneSet = doneByUser.get(member.uid) ?? new Set<string>();
    const passSet = passByUser.get(member.uid) ?? new Set<string>();

    let doneCount = 0;
    let passCount = 0;
    member.todayGoalIds.forEach((goalId) => {
      if (doneSet.has(goalId)) doneCount += 1;
      if (passSet.has(goalId)) passCount += 1;
    });

    const goalDetails: MemberGoalDetail[] = member.todayGoalIds.map((goalId) => ({
      goalId,
      goalName: goalNameMap.get(goalId) ?? '목표',
      isDone: doneSet.has(goalId),
      isPass: passSet.has(goalId),
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
}

export async function fetchCalendarMarkings(
  userId: string,
  yearMonth: string,
): Promise<CalendarDayMarking> {
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

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = dayjs(startDate).date(day).format('YYYY-MM-DD');
    if (dateStr > today) break;

    const activeGoals = (userGoals ?? []).filter((goal: any) => isGoalActiveOnDate(goal, dateStr));
    const totalGoals = activeGoals.length;
    if (totalGoals === 0) continue;

    const dayCheckins = (checkins ?? []).filter((checkin) => checkin.date === dateStr);
    const doneCount = dayCheckins.filter((checkin) => checkin.status === 'done').length;
    const passCount = dayCheckins.filter((checkin) => checkin.status === 'pass').length;

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

  return markings;
}

export async function fetchCheckinsForDate(
  userId: string,
  date: string,
): Promise<CheckinWithGoal[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*, goal:goals(id, name)')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at');

  if (error) {
    console.error('fetchCheckinsForDate error:', error.message);
    return [];
  }

  return (data ?? []) as CheckinWithGoal[];
}

export async function fetchMonthlyCheckins(userId: string, yearMonth: string): Promise<Checkin[]> {
  const monthStart = dayjs(`${yearMonth}-01`);
  const monthEnd = monthStart.endOf('month');
  let firstMon = monthStart;
  while (firstMon.day() !== 1) firstMon = firstMon.add(1, 'day');

  let fetchStart = `${yearMonth}-01`;
  let fetchEnd = monthEnd.format('YYYY-MM-DD');

  if (!monthStart.isSame(firstMon, 'day') && firstMon.diff(monthStart, 'day') >= 4) {
    fetchStart = monthStart.startOf('isoWeek').format('YYYY-MM-DD');
  }

  const lastMon = monthEnd.startOf('isoWeek');
  const daysAtEnd = monthEnd.diff(lastMon, 'day') + 1;
  if (daysAtEnd < 7 && daysAtEnd >= 4) {
    fetchEnd = lastMon.add(6, 'day').format('YYYY-MM-DD');
  }

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fetchStart)
    .lte('date', fetchEnd)
    .order('date');

  if (error) {
    console.error('fetchMonthlyCheckins error:', error.message);
    return [];
  }

  return (data ?? []) as Checkin[];
}

export async function fetchMemberDateCheckins(
  teamId: string | undefined,
  userId: string,
  date: string,
): Promise<MemberCheckinSummary[]> {
  let members: MemberRow[] = [];

  if (teamId) {
    const { data } = await supabase
      .from('team_members')
      .select('user_id, user:users(id, nickname, profile_image_url)')
      .eq('team_id', teamId);
    members = (data ?? []) as unknown as MemberRow[];
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
    const currentUser = normalizeJoinedUser(member.user);
    const uid = member.user_id || currentUser?.id;
    if (!uid) continue;

    const { data: userGoals } = await supabase
      .from('user_goals')
      .select('goal_id, frequency, target_count, start_date, end_date, goal:goals(name)')
      .eq('user_id', uid)
      .eq('is_active', true);

    const activeGoals = (userGoals ?? []).filter((goal: any) => isGoalActiveOnDate(goal, date));
    const activeGoalIds = activeGoals.map((goal: any) => goal.goal_id);

    const { data: checkins } = await supabase
      .from('checkins')
      .select(
        '*, goal:goals(id, name), reactions:checkin_reactions(id, checkin_id, user_id, created_at, user:users(id, nickname, profile_image_url))',
      )
      .eq('user_id', uid)
      .eq('date', date)
      .order('created_at');

    const typedCheckins = (checkins ?? []) as CheckinWithGoal[];
    const doneCount = typedCheckins.filter((checkin) => checkin.status === 'done').length;
    const passCount = typedCheckins.filter((checkin) => checkin.status === 'pass').length;

    summaries.push({
      userId: uid,
      nickname: currentUser?.nickname ?? '알 수 없음',
      profileImageUrl: currentUser?.profile_image_url ?? null,
      checkins: typedCheckins,
      totalGoals: activeGoalIds.length,
      doneCount,
      passCount,
      goals: activeGoals.map((goal: any) => ({
        goalId: goal.goal_id,
        name: goal.goal?.name ?? '알 수 없는 목표',
        frequency: goal.frequency,
        targetCount: goal.target_count,
      })),
    });
  }

  return summaries;
}

export async function toggleReaction(
  checkinId: string,
  userId: string,
  isReacted: boolean,
): Promise<boolean> {
  if (isReacted) {
    const { error } = await supabase
      .from('checkin_reactions')
      .delete()
      .match({ checkin_id: checkinId, user_id: userId });
    if (error) {
      console.error('toggleReaction delete error:', error.message);
      return false;
    }
    return true;
  }

  const { error } = await supabase.from('checkin_reactions').insert({
    checkin_id: checkinId,
    user_id: userId,
  });
  if (error) {
    console.error('toggleReaction insert error:', error.message);
    return false;
  }

  return true;
}

export async function fetchWeeklyStats(params: {
  teamId: string;
  userId: string;
  weekStart: string;
  goalNameMap: Map<string, string>;
}): Promise<WeeklyStatsResult> {
  const { teamId, userId, weekStart, goalNameMap } = params;
  const weekEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, users(nickname, profile_image_url)')
    .eq('team_id', teamId);

  const memberIds = (members ?? []).map((member: any) => member.user_id as string);
  if (memberIds.length === 0) {
    return { weeklyTeamData: [], weeklyCheckins: [] };
  }

  const { data: teamCheckins } = await supabase
    .from('checkins')
    .select('user_id, goal_id, status, date')
    .in('user_id', memberIds)
    .gte('date', weekStart)
    .lte('date', weekEnd);

  const { data: teamUserGoals } = await supabase
    .from('user_goals')
    .select('user_id, goal_id, frequency, target_count, start_date, end_date')
    .in('user_id', memberIds)
    .eq('is_active', true);

  const weeklyTeamData = (members ?? [])
    .map((member: any) => {
      const uid = member.user_id;
      const userCheckins = (teamCheckins ?? []).filter(
        (checkin: any) => checkin.user_id === uid && checkin.status === 'done',
      );
      const userGoals = (teamUserGoals ?? []).filter((goal: any) => goal.user_id === uid);

      const activeGoals = userGoals.filter((goal: any) => {
        if (goal.start_date && goal.start_date > weekEnd) return false;
        if (goal.end_date && goal.end_date < weekStart) return false;
        return true;
      });

      let totalGoals = 0;
      let failedGoals = 0;
      const goals: WeeklyTeamGoal[] = [];

      activeGoals.forEach((goal: any) => {
        const isDaily = goal.frequency === 'daily';
        let target = isDaily ? 7 : goal.target_count || 1;

        if (isDaily) {
          const effectiveStart = dayjsMax(dayjs(weekStart), dayjs(goal.start_date || weekStart));
          const effectiveEnd = dayjsMin(dayjs(weekEnd), dayjs(goal.end_date || weekEnd));
          if (effectiveStart.isAfter(effectiveEnd)) target = 0;
          else target = effectiveEnd.diff(effectiveStart, 'day') + 1;
        }

        if (target <= 0) return;

        totalGoals += 1;
        const doneCount = userCheckins.filter(
          (checkin: any) => checkin.goal_id === goal.goal_id,
        ).length;
        if (doneCount < target) failedGoals += 1;

        goals.push({
          goalId: goal.goal_id,
          name: goalNameMap.get(goal.goal_id) ?? '목표',
          target,
          doneCount,
          isAchieved: doneCount >= target,
          isDaily,
        });
      });

      const isAllClear = totalGoals > 0 && failedGoals === 0;

      return {
        userId: uid,
        nickname: member.users?.nickname || '알 수 없음',
        doneCount: userCheckins.length,
        isMe: uid === userId,
        totalGoals,
        failedGoals,
        isAllClear,
        goals,
      };
    })
    .filter((member) => !member.isMe)
    .sort((a, b) => {
      if (a.isAllClear && !b.isAllClear) return -1;
      if (!a.isAllClear && b.isAllClear) return 1;
      if (a.failedGoals !== b.failedGoals) return a.failedGoals - b.failedGoals;
      if (b.doneCount !== a.doneCount) return b.doneCount - a.doneCount;
      return 0;
    });

  return {
    weeklyTeamData,
    weeklyCheckins: (teamCheckins ?? []) as WeeklyStatsResult['weeklyCheckins'],
  };
}

export async function fetchMonthlyStatisticsSummary(params: {
  userId: string;
  yearMonth: string;
  teamId?: string;
}): Promise<{
  myRate: number | null;
  myGoalDetails: MyGoalDetail[];
  memberDetails: MemberDetail[];
}> {
  const { userId, yearMonth, teamId } = params;
  const { ranges } = getCalendarWeekRanges(yearMonth);
  if (ranges.length === 0) {
    return { myRate: null, myGoalDetails: [], memberDetails: [] };
  }

  const dataStart = ranges[0].s.format('YYYY-MM-DD');
  const dataEnd = ranges[ranges.length - 1].e.format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');
  const endedRanges = ranges.filter((range) => range.e.format('YYYY-MM-DD') < today);

  const [{ data: myCheckins }, { data: myUserGoalsRaw }] = await Promise.all([
    supabase
      .from('checkins')
      .select('goal_id, status, date')
      .eq('user_id', userId)
      .gte('date', dataStart)
      .lte('date', dataEnd),
    supabase
      .from('user_goals')
      .select('goal_id, frequency, target_count, start_date, end_date, goals(name)')
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  const myGoalsFiltered = (myUserGoalsRaw ?? []).filter((goal: any) => {
    if (goal.start_date && goal.start_date > dataEnd) return false;
    if (goal.end_date && goal.end_date < dataStart) return false;
    return true;
  });

  let myTotal = 0;
  let myFailed = 0;
  endedRanges.forEach((range) => {
    const result = calcWeekAchievement(
      range.s.format('YYYY-MM-DD'),
      myCheckins ?? [],
      myGoalsFiltered,
    );
    myTotal += result.totalGoals;
    myFailed += result.failedGoals;
  });

  const myRate = myTotal > 0 ? Math.round(((myTotal - myFailed) / myTotal) * 100) : null;

  const myGoalDetails: MyGoalDetail[] = myGoalsFiltered.map((goal: any) => {
    const singleGoal = [
      {
        goal_id: goal.goal_id,
        frequency: goal.frequency,
        target_count: goal.target_count,
        start_date: goal.start_date,
        end_date: goal.end_date,
      },
    ];

    let achievedWeeks = 0;
    let totalActiveWeeks = 0;
    endedRanges.forEach((range) => {
      const result = calcWeekAchievement(
        range.s.format('YYYY-MM-DD'),
        myCheckins ?? [],
        singleGoal,
      );
      if (result.totalGoals > 0) {
        totalActiveWeeks += 1;
        if (result.isAllClear) achievedWeeks += 1;
      }
    });

    return {
      goalId: goal.goal_id,
      name: goal.goals?.name ?? '목표',
      frequency: goal.frequency,
      targetCount: goal.target_count,
      achievedWeeks,
      totalActiveWeeks,
      rate: totalActiveWeeks > 0 ? Math.round((achievedWeeks / totalActiveWeeks) * 100) : null,
    };
  });

  if (!teamId) {
    return { myRate, myGoalDetails, memberDetails: [] };
  }

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, users(nickname)')
    .eq('team_id', teamId);

  const memberIds = (members ?? []).map((member: any) => member.user_id as string);
  if (memberIds.length === 0) {
    return { myRate, myGoalDetails, memberDetails: [] };
  }

  const [
    { data: teamCheckins },
    { data: teamUserGoalsRaw },
    { data: allResolutions },
    { data: allRetrospectives },
  ] = await Promise.all([
    supabase
      .from('checkins')
      .select('user_id, goal_id, status, date')
      .in('user_id', memberIds)
      .gte('date', dataStart)
      .lte('date', dataEnd),
    supabase
      .from('user_goals')
      .select('user_id, goal_id, frequency, target_count, start_date, end_date, goals(name)')
      .in('user_id', memberIds)
      .eq('is_active', true),
    supabase
      .from('monthly_resolutions')
      .select('user_id, content')
      .in('user_id', memberIds)
      .eq('team_id', teamId)
      .eq('year_month', yearMonth),
    supabase
      .from('monthly_retrospectives')
      .select('user_id, content')
      .in('user_id', memberIds)
      .eq('team_id', teamId)
      .eq('year_month', yearMonth),
  ]);

  const memberDetails = (members ?? [])
    .map((member: any) => {
      const uid = member.user_id;
      const userCheckins = (teamCheckins ?? [])
        .filter((checkin: any) => checkin.user_id === uid)
        .map((checkin: any) => ({
          goal_id: checkin.goal_id,
          status: checkin.status,
          date: checkin.date,
        }));

      const userGoalsRaw = (teamUserGoalsRaw ?? []).filter((goal: any) => goal.user_id === uid);
      const userGoals = userGoalsRaw
        .filter((goal: any) => {
          if (goal.start_date && goal.start_date > dataEnd) return false;
          if (goal.end_date && goal.end_date < dataStart) return false;
          return true;
        })
        .map((goal: any) => ({
          goal_id: goal.goal_id,
          frequency: goal.frequency,
          target_count: goal.target_count,
          start_date: goal.start_date,
          end_date: goal.end_date,
        }));

      let total = 0;
      let failed = 0;
      endedRanges.forEach((range) => {
        const result = calcWeekAchievement(range.s.format('YYYY-MM-DD'), userCheckins, userGoals);
        total += result.totalGoals;
        failed += result.failedGoals;
      });

      const goals: GoalItem[] = userGoalsRaw
        .filter((goal: any) => {
          if (goal.start_date && goal.start_date > dataEnd) return false;
          if (goal.end_date && goal.end_date < dataStart) return false;
          return true;
        })
        .map((goal: any) => ({
          goalId: goal.goal_id,
          name: goal.goals?.name ?? '목표',
          frequency: goal.frequency,
          targetCount: goal.target_count,
        }));

      return {
        userId: uid,
        nickname: member.users?.nickname || '알 수 없음',
        isMe: uid === userId,
        rate: total > 0 ? Math.round(((total - failed) / total) * 100) : null,
        goals,
        hanmadi: (allResolutions ?? []).find((row: any) => row.user_id === uid)?.content || '',
        hoego: (allRetrospectives ?? []).find((row: any) => row.user_id === uid)?.content || '',
      };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

  return { myRate, myGoalDetails, memberDetails };
}

export async function fetchTeamDetailMonthlyData(
  teamId: string,
  yearMonth: string,
): Promise<TeamDetailMonthlyData> {
  const { data: membersData, error: membersError } = await supabase
    .from('team_members')
    .select('*, user:users(id, nickname, profile_image_url, name, gender, age)')
    .eq('team_id', teamId);

  if (membersError) {
    throw membersError;
  }

  const members = [...((membersData ?? []) as any[])].sort((a, b) => {
    if (a.role === 'leader' && b.role !== 'leader') return -1;
    if (a.role !== 'leader' && b.role === 'leader') return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const [{ data: resData, error: resError }, { data: retroData, error: retroError }] =
    await Promise.all([
      supabase
        .from('monthly_resolutions')
        .select('*')
        .eq('team_id', teamId)
        .eq('year_month', yearMonth),
      supabase
        .from('monthly_retrospectives')
        .select('*')
        .eq('team_id', teamId)
        .eq('year_month', yearMonth),
    ]);

  if (resError) throw resError;
  if (retroError) throw retroError;

  const resolutions: Record<string, string> = {};
  (resData ?? []).forEach((row: any) => {
    resolutions[row.user_id] = row.content;
  });

  const retrospectives: Record<string, string> = {};
  (retroData ?? []).forEach((row: any) => {
    retrospectives[row.user_id] = row.content;
  });

  const memberIds = members.map((member) => member.user_id);
  const { data: teamGoalsData } = await supabase.from('goals').select('*').eq('team_id', teamId);
  const teamGoalsMap = new Map((teamGoalsData ?? []).map((goal: any) => [goal.id, goal.name]));

  const startOfMonth = `${yearMonth}-01`;
  const endOfMonth = dayjs(startOfMonth).endOf('month').format('YYYY-MM-DD');

  const { data: userGoalsData } = await supabase
    .from('user_goals')
    .select('*')
    .in('user_id', memberIds)
    .eq('is_active', true);

  const teamUserGoals = ((userGoalsData ?? []) as any[]).filter((goal) => {
    if (!teamGoalsMap.has(goal.goal_id)) return false;
    if (goal.start_date && goal.start_date > endOfMonth) return false;
    if (goal.end_date && goal.end_date < startOfMonth) return false;
    return true;
  });

  const { data: checkinsData } = await supabase
    .from('checkins')
    .select('*')
    .in('user_id', memberIds)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth);
  const checkins = (checkinsData ?? []) as Checkin[];

  const memberStats: Record<string, TeamDetailMemberStats> = {};
  const memberGoals: Record<string, TeamDetailMemberGoalStatus[]> = {};
  const todayStr = dayjs().format('YYYY-MM-DD');

  memberIds.forEach((uid) => {
    const myGoals = teamUserGoals.filter((goal) => goal.user_id === uid);
    const myCheckins = checkins.filter((checkin) => checkin.user_id === uid);
    const relevantCheckins = myCheckins.filter((checkin) =>
      myGoals.some((goal) => goal.goal_id === checkin.goal_id),
    );
    const doneCount = relevantCheckins.filter((checkin) => checkin.status === 'done').length;
    const passCount = relevantCheckins.filter((checkin) => checkin.status === 'pass').length;

    const goalStatuses: TeamDetailMemberGoalStatus[] = myGoals.map((goal) => {
      const goalCheckins = relevantCheckins.filter((checkin) => checkin.goal_id === goal.goal_id);
      const goalDone = goalCheckins.filter((checkin) => checkin.status === 'done').length;
      const explicitPass = goalCheckins.filter((checkin) => checkin.status === 'pass').length;
      const goalStart =
        goal.start_date && goal.start_date > startOfMonth ? goal.start_date : startOfMonth;
      const countEnd = todayStr < endOfMonth ? todayStr : endOfMonth;
      const activeDays = goalStart <= countEnd ? dayjs(countEnd).diff(dayjs(goalStart), 'day') : 0;
      const noCheckinDays = Math.max(0, activeDays - goalDone - explicitPass);
      const isWeekly = goal.frequency === 'weekly_count';
      const goalPass = explicitPass + (isWeekly ? noCheckinDays : 0);
      const goalFail = isWeekly ? 0 : noCheckinDays;

      return {
        goalId: goal.goal_id,
        name: teamGoalsMap.get(goal.goal_id) || 'Unknown',
        frequency: goal.frequency || 'daily',
        targetCount: goal.target_count,
        done: goalDone,
        pass: goalPass,
        fail: goalFail,
        total: activeDays,
      };
    });

    memberGoals[uid] = goalStatuses;
    const totalMissed = goalStatuses.reduce((sum, goal) => sum + goal.fail, 0);
    memberStats[uid] = {
      totalGoals: myGoals.length,
      doneCount,
      passCount,
      missedCount: totalMissed,
      completionRate: 0,
    };
  });

  return {
    members,
    resolutions,
    retrospectives,
    memberStats,
    memberGoals,
  };
}
