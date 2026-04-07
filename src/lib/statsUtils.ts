import dayjs from './dayjs';
import type { CalendarDayMarking } from '../types/domain';

export interface GoalStat {
  goalId: string;
  name: string;
  frequency: 'daily' | 'weekly_count';
  targetCount: number | null;
  startDate: string | null;
  done: number;
  pass: number;
  fail: number;
  rate: number;
}

export interface WeekData {
  label: string;
  range: string;
  days: number;
  rate: number;
  doneCount: number;
  passCount: number;
}

export interface WeeklyPaceGoal {
  goalId: string;
  name: string;
  frequency: 'daily' | 'weekly_count';
  target: number;
  done: number;
  rate: number;
}

export const dayjsMax = (a: dayjs.Dayjs, b: dayjs.Dayjs) => (a.isAfter(b) ? a : b);
export const dayjsMin = (a: dayjs.Dayjs, b: dayjs.Dayjs) => (a.isBefore(b) ? a : b);
export const isPassCheckin = (c: any) => c.status === 'pass';
export const isDoneCheckin = (c: any) => c.status === 'done';

// ─── Calendar-style week ranges for a given month ───────────
// 월요일 기준 Mon-Sun 주 단위.
// 월초/월말 부분주가 4일 미만이면 인접 월에 편입 (해당 월에서 제외).
// 이 월이 소유하는 주차는 인접 월 날짜까지 포함하는 완전한 Mon-Sun 범위를 반환.
// dataStart/dataEnd: 체크인 데이터를 조회해야 하는 전체 날짜 범위.
export function getCalendarWeekRanges(yearMonth: string) {
  const ms = dayjs(`${yearMonth}-01`);
  const monthEnd = ms.endOf('month');

  let firstMon = ms;
  while (firstMon.day() !== 1) firstMon = firstMon.add(1, 'day');

  const ranges: { s: dayjs.Dayjs; e: dayjs.Dayjs }[] = [];

  if (!ms.isSame(firstMon, 'day')) {
    const prevMon = ms.startOf('isoWeek');
    const daysInThisMonth = firstMon.diff(ms, 'day');
    if (daysInThisMonth >= 4) {
      ranges.push({ s: prevMon, e: firstMon.subtract(1, 'day') });
    }
  }

  let cursor = firstMon;
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'day')) {
    const weekSun = cursor.add(6, 'day');
    if (weekSun.isBefore(monthEnd) || weekSun.isSame(monthEnd, 'day')) {
      ranges.push({ s: cursor, e: weekSun });
    } else {
      const daysInThisMonth = monthEnd.diff(cursor, 'day') + 1;
      if (daysInThisMonth >= 4) {
        ranges.push({ s: cursor, e: weekSun });
      }
    }
    cursor = cursor.add(1, 'week');
  }

  const dataStart = ranges.length > 0 ? ranges[0].s.format('YYYY-MM-DD') : ms.format('YYYY-MM-DD');
  const dataEnd =
    ranges.length > 0
      ? ranges[ranges.length - 1].e.format('YYYY-MM-DD')
      : monthEnd.format('YYYY-MM-DD');

  return { ranges, monthEnd, dataStart, dataEnd };
}

export interface GoalWeekRange {
  s: dayjs.Dayjs;
  e: dayjs.Dayjs;
  label: string;
  activeDays: number;
  isMerged: boolean;
}

/**
 * 주N회 목표의 통계용 주차 범위 계산.
 * 활성일이 targetCount 미만인 부분 주는 인접 주에 합산.
 */
export function getGoalWeekRanges(
  yearMonth: string,
  goalStart: string,
  goalEnd: string,
  targetCount: number,
): GoalWeekRange[] {
  const { ranges } = getCalendarWeekRanges(yearMonth);

  const dataStart =
    ranges.length > 0
      ? ranges[0].s.format('YYYY-MM-DD')
      : dayjs(`${yearMonth}-01`).format('YYYY-MM-DD');
  const dataEnd =
    ranges.length > 0
      ? ranges[ranges.length - 1].e.format('YYYY-MM-DD')
      : dayjs(`${yearMonth}-01`).endOf('month').format('YYYY-MM-DD');

  if (goalStart > dataEnd) return [];
  if (goalEnd < dataStart) return [];

  const gS = dayjs(goalStart);
  const gE = dayjs(goalEnd);

  const raw: { s: dayjs.Dayjs; e: dayjs.Dayjs; activeDays: number }[] = [];
  for (const wr of ranges) {
    const effS = dayjsMax(wr.s, gS);
    const effE = dayjsMin(wr.e, gE);
    if (effS.isAfter(effE)) continue;

    const activeDays = effE.diff(effS, 'day') + 1;
    raw.push({ s: effS, e: effE, activeDays });
  }

  if (raw.length === 0) return [];

  while (raw.length > 1 && raw[0].activeDays < targetCount) {
    raw[1] = {
      s: raw[0].s,
      e: raw[1].e,
      activeDays: raw[0].activeDays + raw[1].activeDays,
    };
    raw.splice(0, 1);
  }
  while (raw.length > 1 && raw[raw.length - 1].activeDays < targetCount) {
    const last = raw.length - 1;
    raw[last - 1] = {
      s: raw[last - 1].s,
      e: raw[last].e,
      activeDays: raw[last - 1].activeDays + raw[last].activeDays,
    };
    raw.splice(last, 1);
  }

  return raw.map((r, i) => ({
    s: r.s,
    e: r.e,
    label: `${i + 1}주차`,
    activeDays: r.activeDays,
    isMerged: r.activeDays > 7,
  }));
}

export interface WeekAchievement {
  totalGoals: number;
  failedGoals: number;
  isAllClear: boolean;
  isEnded: boolean;
  isFuture: boolean;
}

export function calcWeekAchievement(
  weekStart: string,
  checkins: { goal_id: string; status: string; date: string }[],
  userGoals: {
    goal_id: string;
    frequency: string;
    target_count: number | null;
    start_date: string | null;
    end_date: string | null;
  }[],
): WeekAchievement {
  const wEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');
  const isEnded = wEnd < today;
  const isFuture = weekStart > today;

  const weekDoneCheckins = checkins.filter(
    (c) => c.status === 'done' && c.date >= weekStart && c.date <= wEnd,
  );

  const activeGoals = userGoals.filter((ug) => {
    if (ug.start_date && ug.start_date > wEnd) return false;
    if (ug.end_date && ug.end_date < weekStart) return false;
    return true;
  });

  let totalGoals = 0;
  let failedGoals = 0;

  activeGoals.forEach((ug) => {
    const isDaily = ug.frequency === 'daily';
    let target = isDaily ? 7 : ug.target_count || 1;

    if (isDaily) {
      const effS = dayjsMax(dayjs(weekStart), dayjs(ug.start_date || weekStart));
      const effE = dayjsMin(dayjs(wEnd), dayjs(ug.end_date || wEnd));
      if (effS.isAfter(effE)) target = 0;
      else target = effE.diff(effS, 'day') + 1;
    }

    if (target > 0) {
      totalGoals++;
      const doneCount = weekDoneCheckins.filter((c) => c.goal_id === ug.goal_id).length;
      if (doneCount < target) failedGoals++;
    }
  });

  const isAllClear = totalGoals > 0 && failedGoals === 0;
  return { totalGoals, failedGoals, isAllClear, isEnded, isFuture };
}

export function getTrendInsight(trendData: WeekData[]): string {
  if (trendData.length < 2) return '아직 첫 주예요! 좋은 시작이에요.';
  const first = trendData[0].rate;
  const last = trendData[trendData.length - 1].rate;
  const diff = last - first;
  if (diff > 5) return `첫 주보다 달성률이 ${diff}% 올랐어요! 페이스가 좋습니다.`;
  if (diff < -5) return '살짝 쉬어가는 주가 있었네요. 다시 힘내봐요!';
  return '꾸준한 페이스를 유지하고 있어요!';
}

/** 오늘부터 역순으로, 그날 목표를 모두 처리(done+pass)한 날을 연속 카운트. 마킹 없음 = 그날 활성 목표 없음(스킵). */
export function computeConsecutiveAchievementDays(markings: CalendarDayMarking): number {
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const ds = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const m = markings[ds];
    if (!m || !m.totalGoals || m.totalGoals < 1) continue;
    const ok = (m.doneCount ?? 0) + (m.passCount ?? 0) >= m.totalGoals;
    if (ok) streak += 1;
    else break;
  }
  return streak;
}
