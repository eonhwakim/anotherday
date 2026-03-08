import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabaseClient';
import { RootStackParamList } from '../../types/navigation';
import { useGoalStore } from '../../stores/goalStore';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';
import {
  GoalStat, WeekData, WeeklyPaceGoal,
  dayjsMax, dayjsMin, isPassCheckin, isDoneCheckin,
  AreaChart, MountainBg, ProgressBar,
  getCalendarWeekRanges, getTrendInsight,
} from '../../components/stats/StatsShared';

const SCREEN_W = Dimensions.get('window').width;

type MemberStatsRouteProp = RouteProp<RootStackParamList, 'MemberStats'>;

export default function MemberStatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<MemberStatsRouteProp>();
  const { userId, teamId, nickname } = route.params;

  const { teamGoals, myGoals, monthlyCheckins, fetchTeamGoals, fetchMyGoals, fetchMonthlyCheckins } = useGoalStore();

  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [resolution, setResolution] = useState('');
  const [retrospective, setRetrospective] = useState('');

  const loadData = useCallback(async () => {
    if (teamId) await fetchTeamGoals(teamId, userId);
    await fetchMyGoals(userId);
    await fetchMonthlyCheckins(userId, yearMonth);
    if (teamId) {
      const { data: r1 } = await supabase.from('monthly_resolutions').select('content')
        .eq('user_id', userId).eq('team_id', teamId).eq('year_month', yearMonth).maybeSingle();
      setResolution(r1?.content || '');
      const { data: r2 } = await supabase.from('monthly_retrospectives').select('content')
        .eq('user_id', userId).eq('team_id', teamId).eq('year_month', yearMonth).maybeSingle();
      setRetrospective(r2?.content || '');
    }
  }, [userId, teamId, yearMonth]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const goToPrev = () => setYearMonth(p => dayjs(`${p}-01`).subtract(1, 'month').format('YYYY-MM'));
  const goToNext = () => {
    const next = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM');
    if (next <= dayjs().format('YYYY-MM')) setYearMonth(next);
  };
  const monthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');
  const canNext = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM') <= dayjs().format('YYYY-MM');
  const isCurrentMonth = yearMonth === dayjs().format('YYYY-MM');

  const startDate = `${yearMonth}-01`;
  const today = dayjs().format('YYYY-MM-DD');
  const monthEnd = dayjs(startDate).endOf('month');

  // ── Filter goals to this team ──
  const goals = useMemo(() => {
    if (!myGoals) return [];
    const monthStart = `${yearMonth}-01`;
    const monthLast = dayjs(monthStart).endOf('month').format('YYYY-MM-DD');
    const filterByMonth = (ug: any) => {
      if (ug.start_date && ug.start_date > monthLast) return false;
      if (ug.end_date && ug.end_date < monthStart) return false;
      return true;
    };
    if (!teamId || !teamGoals?.length) return myGoals.filter(filterByMonth);
    const ids = new Set(teamGoals.map(g => g.id));
    return myGoals.filter(ug => ids.has(ug.goal_id) && filterByMonth(ug));
  }, [teamGoals, myGoals, teamId, yearMonth]);

  const checkins = useMemo(() => {
    const valid = new Set(goals.map(g => g.goal_id));
    return (monthlyCheckins ?? []).filter(c => valid.has(c.goal_id));
  }, [monthlyCheckins, goals]);

  const allGoalMap = useMemo(() => {
    const m = new Map<string, string>();
    (teamGoals ?? []).forEach(g => m.set(g.id, g.name));
    return m;
  }, [teamGoals]);

  // ─── Hero Data ────────────────────────────────────────────
  const heroData = useMemo(() => {
    const totalDone = checkins.filter(isDoneCheckin).length;
    const totalPass = checkins.filter(isPassCheckin).length;
    let autoPass = 0;
    const dailyGoals = goals.filter(g => g.frequency === 'daily');
    const weeklyGoals = goals.filter(g => g.frequency === 'weekly_count');
    const daysInMonth = dayjs(startDate).daysInMonth();

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (ds >= today) break;
      weeklyGoals.forEach(ug => {
        if (ug.start_date && ds < ug.start_date) return;
        if (ug.end_date && ds > ug.end_date) return;
        if (!checkins.some(c => c.goal_id === ug.goal_id && c.date === ds)) autoPass++;
      });
    }

    const allGoalRates: number[] = [];
    dailyGoals.forEach(ug => {
      let active = 0, done = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = dayjs(startDate).date(d).format('YYYY-MM-DD');
        if (ds > today) break;
        if (ug.start_date && ds < ug.start_date) continue;
        if (ug.end_date && ds > ug.end_date) continue;
        active++;
        const c = checkins.find(ci => ci.goal_id === ug.goal_id && ci.date === ds);
        if (c && isDoneCheckin(c)) done++;
      }
      if (active > 0) allGoalRates.push(done / active * 100);
    });

    weeklyGoals.forEach(ug => {
      const target = ug.target_count || 1;
      let totalTarget = 0, totalDoneG = 0;
      let wc = dayjs(startDate).startOf('isoWeek');
      while (wc.isBefore(monthEnd) || wc.isSame(monthEnd, 'day')) {
        const ws = wc, we = wc.endOf('isoWeek');
        const gs = ug.start_date || startDate;
        const effS = dayjsMax(dayjsMax(ws, dayjs(gs)), dayjs(startDate));
        const effE = dayjsMin(dayjsMin(we, monthEnd), dayjs(today));
        if (effS.isAfter(effE)) { wc = wc.add(1, 'week'); continue; }
        const days = effE.diff(effS, 'day') + 1;
        if (days >= 7) {
          totalTarget += target;
          totalDoneG += checkins.filter(c => c.goal_id === ug.goal_id && c.date >= effS.format('YYYY-MM-DD') && c.date <= effE.format('YYYY-MM-DD')).filter(isDoneCheckin).length;
        }
        wc = wc.add(1, 'week');
      }
      if (totalTarget > 0) allGoalRates.push(totalDoneG / totalTarget * 100);
    });

    const avgRate = allGoalRates.length > 0
      ? Math.round(allGoalRates.reduce((a, b) => a + b, 0) / allGoalRates.length) : 0;
    return { avgRate, altitude: Math.round(avgRate * 100), totalDone, totalPass: totalPass + autoPass };
  }, [checkins, goals, startDate, today, monthEnd]);

  // ─── Weekly Pace ──────────────────────────────────────────
  const weeklyPace = useMemo(() => {
    const nowDay = dayjs();
    const weekMon = nowDay.startOf('isoWeek');
    const weekMonStr = weekMon.format('YYYY-MM-DD');
    const todayStr = nowDay.format('YYYY-MM-DD');
    const daysElapsed = nowDay.diff(weekMon, 'day') + 1;

    const paceGoals: WeeklyPaceGoal[] = goals
      .filter(ug => {
        if (ug.start_date && todayStr < ug.start_date) return false;
        if (ug.end_date && todayStr > ug.end_date) return false;
        return true;
      })
      .map(ug => {
        const target = ug.frequency === 'daily' ? daysElapsed : (ug.target_count || 1);
        const done = checkins.filter(c => c.goal_id === ug.goal_id && c.date >= weekMonStr && c.date <= todayStr).filter(isDoneCheckin).length;
        return {
          goalId: ug.goal_id, name: allGoalMap.get(ug.goal_id) ?? '목표',
          frequency: ug.frequency as 'daily' | 'weekly_count', target, done,
          rate: target > 0 ? Math.round(done / target * 100) : 0,
        };
      });

    const overallRate = paceGoals.length > 0 ? Math.round(paceGoals.reduce((s, g) => s + g.rate, 0) / paceGoals.length) : 0;
    return { goals: paceGoals, overallRate, weekLabel: `${weekMon.format('M/D')}~${weekMon.add(6, 'day').format('M/D')}` };
  }, [goals, checkins, allGoalMap, today]);

  // ─── Trend Data ───────────────────────────────────────────
  const trendData = useMemo(() => {
    const weeks: WeekData[] = [];
    const { ranges } = getCalendarWeekRanges(yearMonth);

    ranges.forEach((wr, idx) => {
      const effS = wr.s;
      const effE = dayjsMin(dayjsMin(wr.e, monthEnd), dayjs(today));
      if (effS.isAfter(dayjs(today))) return;

      let weekDone = 0, weekPass = 0;
      const weekRates: number[] = [];

      goals.forEach(ug => {
        const gStartStr = ug.start_date || startDate;
        const gEndStr = ug.end_date || monthEnd.format('YYYY-MM-DD');
        if (effE.format('YYYY-MM-DD') < gStartStr) return;
        if (effS.format('YYYY-MM-DD') > gEndStr) return;
        const gS = dayjsMax(effS, dayjs(gStartStr));
        const gE = dayjsMin(effE, dayjs(gEndStr));
        if (gS.isAfter(gE)) return;

        const wCk = checkins.filter(c => c.goal_id === ug.goal_id && c.date >= gS.format('YYYY-MM-DD') && c.date <= gE.format('YYYY-MM-DD'));
        const done = wCk.filter(isDoneCheckin).length;
        weekDone += done;
        weekPass += wCk.filter(isPassCheckin).length;

        if (ug.frequency === 'daily') {
          const days = gE.diff(gS, 'day') + 1;
          if (days > 0) weekRates.push(done / days * 100);
        } else {
          weekRates.push(done / (ug.target_count || 1) * 100);
        }
      });

      weeks.push({
        label: `${idx + 1}주차`,
        range: `${effS.format('M/D')}~${effE.format('M/D')}`,
        rate: weekRates.length > 0 ? Math.round(weekRates.reduce((a, b) => a + b, 0) / weekRates.length) : 0,
        doneCount: weekDone, passCount: weekPass,
      });
    });
    return weeks;
  }, [goals, checkins, startDate, today, monthEnd, yearMonth]);

  const trendInsight = useMemo(() => getTrendInsight(trendData), [trendData]);

  // ─── Goal Details ─────────────────────────────────────────
  const goalDetails = useMemo(() => {
    const daysInMonth = dayjs(startDate).daysInMonth();
    const calcStats = (ugList: typeof goals): GoalStat[] => ugList.map(ug => {
      let done = 0, pass = 0, fail = 0, activeDays = 0;
      if (ug.frequency === 'daily') {
        for (let d = 1; d <= daysInMonth; d++) {
          const ds = dayjs(startDate).date(d).format('YYYY-MM-DD');
          if (ds > today) break;
          if (ug.start_date && ds < ug.start_date) continue;
          if (ug.end_date && ds > ug.end_date) continue;
          activeDays++;
          const c = checkins.find(ci => ci.goal_id === ug.goal_id && ci.date === ds);
          if (c && isDoneCheckin(c)) done++;
          else if (c && isPassCheckin(c)) { /* legacy */ }
          else fail++;
        }
        const rate = activeDays > 0 ? Math.round(done / activeDays * 100) : 0;
        return { goalId: ug.goal_id, name: allGoalMap.get(ug.goal_id) ?? '목표', frequency: 'daily' as const, targetCount: null, startDate: ug.start_date || null, done, pass: 0, fail, rate };
      } else {
        const target = ug.target_count || 1;
        let totalTarget = 0;
        let wc = dayjs(startDate).startOf('isoWeek');
        while (wc.isBefore(monthEnd) || wc.isSame(monthEnd, 'day')) {
          const ws = wc, we = wc.endOf('isoWeek');
          const gs = ug.start_date || startDate;
          const effS = dayjsMax(dayjsMax(ws, dayjs(gs)), dayjs(startDate));
          const effE = dayjsMin(dayjsMin(we, monthEnd), dayjs(today));
          if (effS.isAfter(effE)) { wc = wc.add(1, 'week'); continue; }
          const wCk = checkins.filter(c => c.goal_id === ug.goal_id && c.date >= effS.format('YYYY-MM-DD') && c.date <= effE.format('YYYY-MM-DD'));
          done += wCk.filter(isDoneCheckin).length;
          const ep = wCk.filter(isPassCheckin).length;
          const wd = effE.diff(effS, 'day') + 1;
          pass += ep + Math.max(0, wd - wCk.filter(isDoneCheckin).length - ep);
          if (wd >= 7) {
            totalTarget += target;
            if (we.format('YYYY-MM-DD') <= today) fail += Math.max(0, target - wCk.filter(isDoneCheckin).length);
          }
          wc = wc.add(1, 'week');
        }
        const rate = totalTarget > 0 ? Math.round(done / totalTarget * 100) : 0;
        return { goalId: ug.goal_id, name: allGoalMap.get(ug.goal_id) ?? '목표', frequency: 'weekly_count' as const, targetCount: ug.target_count, startDate: ug.start_date || null, done, pass, fail, rate };
      }
    });

    const daily = calcStats(goals.filter(g => g.frequency === 'daily'));
    const weekly = calcStats(goals.filter(g => g.frequency === 'weekly_count'));
    const all = [...daily, ...weekly].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
    const best = all.length > 0 ? all.reduce((a, b) => a.rate >= b.rate ? a : b) : null;
    const worst = all.filter(g => g.fail > 0).length > 0 ? all.filter(g => g.fail > 0).reduce((a, b) => a.fail >= b.fail ? a : b) : null;
    return { all, best, worst };
  }, [goals, checkins, allGoalMap, startDate, today, monthEnd]);

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{nickname}님의 기록</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── 월 선택 ── */}
        <View style={s.monthRow}>
          <TouchableOpacity style={s.monthBtn} onPress={goToPrev}>
            <Ionicons name="chevron-back" size={22} color={COLORS.primaryLight} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity style={[s.monthBtn, !canNext && { opacity: 0.4 }]} onPress={goToNext} disabled={!canNext}>
            <Ionicons name="chevron-forward" size={22} color={canNext ? COLORS.primaryLight : 'rgba(26,26,26,0.25)'} />
          </TouchableOpacity>
        </View>

        {/* ═══ Hero Section ═══ */}
        <View style={s.heroCard}>
          <MountainBg width={SCREEN_W - 32} height={150} />
          <Text style={s.heroTitle}>
            {dayjs(`${yearMonth}-01`).format('M')}월, 해발 {heroData.altitude.toLocaleString()}m {heroData.avgRate >= 100 ? '정상 등극!' : heroData.avgRate >= 80 ? '돌파!' : heroData.avgRate >= 50 ? '등반 중' : '출발!'}
          </Text>
          <Text style={s.heroRate}>{heroData.avgRate}%</Text>
          <Text style={s.heroRateLabel}>이달의 평균 달성률</Text>
          <View style={s.heroChips}>
            <View style={s.heroChip}>
              <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
              <Text style={s.heroChipText}>인증 {heroData.totalDone}회</Text>
            </View>
            <View style={s.heroChip}>
              <Ionicons name="pause-circle" size={14} color="#FBBF24" />
              <Text style={s.heroChipText}>휴식 {heroData.totalPass}회</Text>
            </View>
          </View>
        </View>

        {/* ═══ Weekly Pace ═══ */}
        {isCurrentMonth && weeklyPace.goals.length > 0 && (
          <>
            <Text style={s.sectionTitle}>이번 주 페이스</Text>
            <Text style={s.sectionSub}>{weeklyPace.weekLabel}</Text>
            <View style={s.card}>
              <View style={s.paceHeader}>
                <Text style={s.paceRate}>{weeklyPace.overallRate}%</Text>
                <Text style={s.paceLabel}>주간 달성률</Text>
              </View>
              {weeklyPace.goals.map(g => {
                const color = g.rate >= 100 ? '#4ADE80' : g.rate >= 50 ? '#FBBF24' : 'rgba(26,26,26,0.20)';
                const isWeekly = g.frequency === 'weekly_count';
                return (
                  <View key={g.goalId} style={s.paceRow}>
                    <View style={s.paceInfo}>
                      <View style={isWeekly ? s.freqBadge : s.freqBadge}>
                        <Text style={isWeekly ? s.freqBadgeText : s.freqBadgeText}>
                          {isWeekly ? `주${g.target}회` : '매일'}
                        </Text>
                      </View>
                      <Text style={s.paceName} numberOfLines={1}>{g.name}</Text>
                    </View>
                    <View style={s.paceProgress}>
                      <ProgressBar rate={g.rate} height={6} color={color} maxRate={Math.max(100, g.rate)} />
                      <Text style={[s.paceVal, { color }]}>{g.done}/{g.target} {g.rate > 100 ? `(${g.rate}%)` : ''}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ═══ Trend Chart ═══ */}
        {trendData.length >= 1 && (
          <>
            <Text style={s.sectionTitle}>등반 궤적</Text>
            <View style={s.card}>
              <Text style={s.insightText}>{trendInsight}</Text>
              {trendData.length >= 2 ? (
                <View style={{ alignItems: 'center', marginTop: 8 }}>
                  <AreaChart data={trendData.map(w => ({ label: w.label, value: w.rate }))} />
                </View>
              ) : (
                <Text style={s.emptySmall}>주간 데이터가 쌓이면 등반 궤적이 그려져요</Text>
              )}
              <View style={s.trendLegend}>
                {trendData.map(w => (
                  <View key={w.label} style={s.trendLegendItem}>
                    <Text style={s.trendLegendLabel}>{w.label}</Text>
                    <Text style={s.trendLegendRange}>{w.range}</Text>
                    <Text style={s.trendLegendVal}>인증 {w.doneCount} · 휴식 {w.passCount}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ═══ Goal Details ═══ */}
        <Text style={s.sectionTitle}>장비 점검</Text>
        <View style={s.card}>
          {goalDetails.best && (
            <View style={s.spotlightRow}>
              <View style={[s.spotlightCard, { backgroundColor: 'rgba(74,222,128,0.08)' }]}>
                <Text style={s.spotlightEmoji}>🥇</Text>
                <Text style={s.spotlightLabel}>최고의 목표</Text>
                <Text style={s.spotlightName} numberOfLines={1}>{goalDetails.best.name}</Text>
                <Text style={s.spotlightStat}>완료 {goalDetails.best.done}회 · {goalDetails.best.rate}%</Text>
              </View>
              {goalDetails.worst ? (
                <View style={[s.spotlightCard, { backgroundColor: 'rgba(251,191,36,0.08)' }]}>
                  <Text style={s.spotlightEmoji}>💪</Text>
                  <Text style={s.spotlightLabel}>조금 더 힘내볼까요?</Text>
                  <Text style={s.spotlightName} numberOfLines={1}>{goalDetails.worst.name}</Text>
                  <Text style={s.spotlightStat}>미달 {goalDetails.worst.fail}회</Text>
                </View>
              ) : (
                <View style={[s.spotlightCard, { backgroundColor: 'rgba(74,222,128,0.04)' }]}>
                  <Text style={s.spotlightEmoji}>🎉</Text>
                  <Text style={s.spotlightLabel}>대단해요!</Text>
                  <Text style={s.spotlightName}>미달 없음</Text>
                </View>
              )}
            </View>
          )}

          {goalDetails.all.length === 0 ? (
            <Text style={s.emptySmall}>설정된 목표가 없어요</Text>
          ) : (
            goalDetails.all.map(gs => {
              const barColor = gs.rate >= 80 ? '#4ADE80' : gs.rate >= 50 ? '#FBBF24' : '#EF4444';
              const isWeekly = gs.frequency === 'weekly_count';
              return (
                <View key={gs.goalId} style={s.goalItem}>
                  <View style={s.goalItemHead}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <View style={isWeekly ? s.freqBadge : s.freqBadge}>
                        <Text style={isWeekly ? s.freqBadgeText : s.freqBadgeText}>
                          {isWeekly ? `주${gs.targetCount}회` : '매일'}
                        </Text>
                      </View>
                      <Text style={s.goalItemName} numberOfLines={1}>{gs.name}</Text>
                    </View>
                    <Text style={[s.goalItemRate, { color: barColor }]}>{gs.rate}%</Text>
                  </View>
                  {gs.startDate && (
                    <Text style={s.goalStartDate}>{dayjs(gs.startDate).format('M/D')}부터 시작</Text>
                  )}
                  <ProgressBar rate={gs.rate} height={6} color={barColor} maxRate={Math.max(100, gs.rate)} />
                  <View style={s.goalChipRow}>
                    <View style={[s.goalChip, { backgroundColor: 'rgba(74,222,128,0.1)' }]}>
                      <Text style={[s.goalChipText, { color: '#15803d' }]}>완료 {gs.done}</Text>
                    </View>
                    {gs.pass > 0 && (
                      <View style={[s.goalChip, { backgroundColor: 'rgba(251,191,36,0.1)' }]}>
                        <Text style={[s.goalChipText, { color: '#d97706' }]}>패스 {gs.pass}</Text>
                      </View>
                    )}
                    {gs.fail > 0 && (
                      <View style={[s.goalChip, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                        <Text style={[s.goalChipText, { color: '#b91c1c' }]}>미달 {gs.fail}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ═══ Retrospective ═══ */}
        {teamId && (
          <>
            <Text style={s.sectionTitle}>산장 다이어리</Text>
            <View style={s.card}>
              <Text style={s.diaryLabel}>이번 달 한마디</Text>
              <View style={s.diaryBox}>
                <Text style={[s.diaryText, !resolution && s.placeholder]}>
                  {resolution || '등록된 한마디가 없습니다.'}
                </Text>
              </View>
              <View style={{ marginTop: 16 }}>
                <Text style={s.diaryLabel}>월간 회고</Text>
                <View style={s.diaryBox}>
                  <Text style={[s.diaryText, !retrospective && s.placeholder]}>
                    {retrospective || '등록된 회고가 없습니다.'}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F6F4' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,107,61,0.10)' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 16, gap: 16 },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', minWidth: 120, textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginHorizontal: 16, marginBottom: 4, marginTop: 28 },
  sectionSub: { fontSize: 12, color: 'rgba(26,26,26,0.40)', marginHorizontal: 16, marginBottom: 10 },

  card: { backgroundColor: '#FFF', marginHorizontal: 16, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,107,61,0.08)', marginTop: 8, shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },

  heroCard: { backgroundColor: '#FFF', marginHorizontal: 16, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,107,61,0.12)', overflow: 'hidden', alignItems: 'center', shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 5 },
  heroTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  heroRate: { fontSize: 48, fontWeight: '900', color: '#FF6B3D', letterSpacing: -2 },
  heroRateLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(26,26,26,0.40)', marginTop: 2, marginBottom: 16 },
  heroChips: { flexDirection: 'row', gap: 16 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(26,26,26,0.55)' },

  paceHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14 },
  paceRate: { fontSize: 28, fontWeight: '900', color: '#FF6B3D' },
  paceLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(26,26,26,0.40)' },
  paceRow: { marginBottom: 12 },
  paceInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  paceName: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  paceProgress: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paceVal: { fontSize: 11, fontWeight: '700', minWidth: 55, textAlign: 'right' },

  insightText: { fontSize: 13, fontWeight: '600', color: '#FF6B3D', lineHeight: 18, marginBottom: 4 },
  trendLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  trendLegendItem: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: 8, minWidth: '45%', flex: 1 },
  trendLegendLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  trendLegendRange: { fontSize: 10, color: 'rgba(26,26,26,0.35)', marginTop: 2 },
  trendLegendVal: { fontSize: 10, color: 'rgba(26,26,26,0.45)', marginTop: 2 },

  spotlightRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  spotlightCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  spotlightEmoji: { fontSize: 22 },
  spotlightLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(26,26,26,0.45)' },
  spotlightName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  spotlightStat: { fontSize: 11, fontWeight: '600', color: 'rgba(26,26,26,0.50)' },

  goalItem: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  goalItemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalItemName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', flexShrink: 1 },
  goalItemRate: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
  goalStartDate: { fontSize: 10, color: 'rgba(26,26,26,0.35)', marginBottom: 6 },
  goalChipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  goalChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  goalChipText: { fontSize: 10, fontWeight: '700' },
  freqBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  freqBadgeText: { fontSize: 10, fontWeight: '700', color: '#3B82F6' },

  diaryLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(26,26,26,0.50)', marginBottom: 8 },
  diaryBox: { backgroundColor: 'rgba(255,107,61,0.03)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,61,0.08)', flexDirection: 'row', gap: 10 },
  diaryText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20, flex: 1 },
  placeholder: { color: 'rgba(26,26,26,0.30)' },
  emptySmall: { fontSize: 13, color: 'rgba(26,26,26,0.30)', textAlign: 'center', paddingVertical: 16 },
});
