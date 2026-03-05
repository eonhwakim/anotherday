import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppTabParamList } from '../../types/navigation';
import { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import MonthlyStatsCard from '../../components/common/MonthlyStatsCard';
import dayjs from '../../lib/dayjs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/defaults';

export default function StatisticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { user } = useAuthStore();
  const { teams, currentTeam, fetchTeams, selectTeam } = useTeamStore();
  const {
    teamGoals,
    myGoals,
    monthlyCheckins,
    fetchTeamGoals,
    fetchMyGoals,
    fetchMonthlyCheckins,
  } = useGoalStore();

  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);

  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));

  React.useEffect(() => {
    const unsubscribe = tabNavigation.addListener('tabPress', () => {
      if (tabNavigation.isFocused()) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
        lastTapRef.current = now;
      }
    });
    return unsubscribe;
  }, [tabNavigation]);

  const loadData = useCallback(async () => {
    if (!user) return;
    await fetchTeams(user.id);
    const team = useTeamStore.getState().currentTeam;
    const teamId = team?.id ?? '';
    await Promise.all([
      fetchTeamGoals(teamId, user.id),
      fetchMyGoals(user.id),
      fetchMonthlyCheckins(user.id, yearMonth),
    ]);
  }, [user, yearMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const goToPrevMonth = () => {
    setYearMonth((prev) =>
      dayjs(`${prev}-01`).subtract(1, 'month').format('YYYY-MM'),
    );
  };

  const goToNextMonth = () => {
    const next = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM');
    const now = dayjs().format('YYYY-MM');
    if (next <= now) {
      setYearMonth(next);
    }
  };

  const currentMonthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');
  const canGoNext = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM') <= dayjs().format('YYYY-MM');

  const currentTeamUserGoals = useMemo(() => {
    if (!teamGoals || teamGoals.length === 0) return [];
    if (!myGoals || !user) return [];
    const myOwnedGoalIds = new Set(
      teamGoals.filter((g) => g.owner_id === user.id).map((g) => g.id),
    );
    return myGoals.filter((ug) => myOwnedGoalIds.has(ug.goal_id));
  }, [teamGoals, myGoals, user]);

  const monthlyStats = useMemo(() => {
    const goals = currentTeamUserGoals;
    const allGoals = teamGoals ?? [];
    const validGoalIds = new Set(goals.map(g => g.goal_id));
    const checkins = (monthlyCheckins ?? []).filter(c => validGoalIds.has(c.goal_id));

    const startDate = `${yearMonth}-01`;
    const today = dayjs().format('YYYY-MM-DD');
    const daysInMonth = dayjs(startDate).daysInMonth();

    const isPass = (c: any) => c.status === 'pass' || (c.memo && c.memo.startsWith('[패스]'));
    const isDone = (c: any) => !isPass(c);

    const doneTotal = checkins.filter(isDone).length;
    const passTotal = checkins.filter(isPass).length;

    const goalDoneMap: Record<string, number> = {};
    const goalPassMap: Record<string, number> = {};
    const goalFailMap: Record<string, number> = {};
    const passReasons: string[] = [];
    const dailyPercents: number[] = [];

    const dailyGoals = goals.filter(ug => ug.frequency === 'daily');
    const weeklyGoals = goals.filter(ug => ug.frequency === 'weekly_count');

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (dateStr > today) break;

      const todayAllGoals = goals.filter((ug) => {
        if (ug.start_date && dateStr < ug.start_date) return false;
        return true;
      });
      const totalForDay = todayAllGoals.length;
      if (totalForDay === 0) continue;

      const dayCheckins = checkins.filter((c) => c.date === dateStr);
      const done = dayCheckins.filter(isDone).length;
      const pass = dayCheckins.filter(isPass).length;
      const effectiveTotal = totalForDay - pass;
      const pct = effectiveTotal > 0 ? (done / effectiveTotal) * 100 : (done > 0 ? 100 : 0);
      dailyPercents.push(pct);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (dateStr > today) break;

      const todayDailyGoals = dailyGoals.filter((ug) => {
        if (ug.start_date && dateStr < ug.start_date) return false;
        return true;
      });
      const totalForDay = todayDailyGoals.length;
      if (totalForDay === 0) continue;

      const dayCheckins = checkins.filter((c) => c.date === dateStr);

      todayDailyGoals.forEach((ug) => {
        const gid = ug.goal_id;
        const c = dayCheckins.find((ci) => ci.goal_id === gid);
        if (!c) {
          goalFailMap[gid] = (goalFailMap[gid] || 0) + 1;
        } else if (isPass(c)) {
          goalPassMap[gid] = (goalPassMap[gid] || 0) + 1;
          if (c.memo) passReasons.push(c.memo);
        } else {
          goalDoneMap[gid] = (goalDoneMap[gid] || 0) + 1;
        }
      });
    }

    weeklyGoals.forEach((ug) => {
      const gid = ug.goal_id;
      const target = ug.target_count || 1;
      const goalStart = ug.start_date || startDate;

      let weekCursor = dayjs(startDate).startOf('isoWeek');
      const monthEnd = dayjs(startDate).endOf('month');

      while (weekCursor.isBefore(monthEnd) || weekCursor.isSame(monthEnd, 'day')) {
        const weekEnd = weekCursor.endOf('isoWeek');

        const effStart = weekCursor.format('YYYY-MM-DD') < goalStart
          ? goalStart
          : weekCursor.format('YYYY-MM-DD') < startDate
            ? startDate
            : weekCursor.format('YYYY-MM-DD');
        const effEnd = weekEnd.format('YYYY-MM-DD') > monthEnd.format('YYYY-MM-DD')
          ? monthEnd.format('YYYY-MM-DD')
          : weekEnd.format('YYYY-MM-DD');

        if (effStart > effEnd || effStart > today) {
          weekCursor = weekCursor.add(1, 'week');
          continue;
        }

        const weekCheckins = checkins.filter(
          (c) => c.goal_id === gid && c.date >= effStart && c.date <= effEnd && c.date <= today,
        );
        const done = weekCheckins.filter(isDone).length;
        const pass = weekCheckins.filter(isPass).length;

        goalDoneMap[gid] = (goalDoneMap[gid] || 0) + done;
        goalPassMap[gid] = (goalPassMap[gid] || 0) + pass;
        weekCheckins.filter(isPass).forEach((c) => {
          if (c.memo) passReasons.push(c.memo);
        });

        const isWeekComplete = weekEnd.format('YYYY-MM-DD') <= today;
        if (isWeekComplete) {
          const effectiveTarget = Math.max(0, target - pass);
          const shortfall = Math.max(0, effectiveTarget - done);
          goalFailMap[gid] = (goalFailMap[gid] || 0) + shortfall;
        }

        weekCursor = weekCursor.add(1, 'week');
      }
    });

    const reasonCounts: Record<string, number> = {};
    passReasons.forEach((r) => {
      const cleaned = r.replace(/^\[패스\]\s*/, '').trim();
      if (cleaned) reasonCounts[cleaned] = (reasonCounts[cleaned] || 0) + 1;
    });
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const goalStats = goals.map((ug) => {
      const goal = allGoals.find((g) => g.id === ug.goal_id);
      return {
        goalId: ug.goal_id,
        name: goal?.name ?? '알 수 없음',
        frequency: ug.frequency,
        targetCount: ug.target_count,
        done: goalDoneMap[ug.goal_id] || 0,
        pass: goalPassMap[ug.goal_id] || 0,
        fail: goalFailMap[ug.goal_id] || 0,
      };
    });

    const failTotal = goalStats.reduce((sum, gs) => sum + gs.fail, 0);

    const avg = dailyPercents.length > 0
      ? Math.round(dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length)
      : 0;

    let bestGoal: { name: string; rate: number; doneCount: number } | null = null;
    let worstGoal: { name: string; rate: number; failCount: number } | null = null;
    if (goalStats.length > 0) {
      const withRate = goalStats.map(gs => {
        const total = gs.done + gs.fail;
        return { ...gs, rate: total > 0 ? Math.round((gs.done / total) * 100) : (gs.done > 0 ? 100 : 0) };
      });
      const best = withRate.reduce((a, b) => a.rate >= b.rate ? a : b);
      bestGoal = { name: best.name, rate: best.rate, doneCount: best.done };
      const worstWithRate = withRate.reduce((a, b) => a.fail >= b.fail ? a : b);
      if (worstWithRate.fail > 0) worstGoal = { name: worstWithRate.name, rate: worstWithRate.rate, failCount: worstWithRate.fail };
    }

    return { doneTotal, passTotal, failTotal, avg, bestGoal, worstGoal, goalStats, topReasons };
  }, [monthlyCheckins, myGoals, teamGoals, yearMonth, currentTeamUserGoals]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView ref={scrollRef} style={styles.scroll}>
        <Text style={styles.screenTitle}>통계</Text>

        {/* 월 선택 */}
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthBtn} onPress={goToPrevMonth}>
            <Ionicons name="chevron-back" size={22} color={COLORS.primaryLight} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{currentMonthLabel}</Text>
          <TouchableOpacity
            style={[styles.monthBtn, !canGoNext && styles.monthBtnDisabled]}
            onPress={goToNextMonth}
            disabled={!canGoNext}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={canGoNext ? COLORS.primaryLight : 'rgba(26,26,26,0.25)'}
            />
          </TouchableOpacity>
        </View>

        {/* 나의 통계 */}
        <Text style={styles.sectionLabel}>나의 통계</Text>
        <TouchableOpacity
          onPress={() => {
            if (!user) return;
            navigation.navigate('MemberStats', {
              userId: user.id,
              teamId: currentTeam?.id,
              nickname: user.nickname,
            });
          }}
          activeOpacity={0.8}
        >
          <MonthlyStatsCard
            monthLabel={currentMonthLabel}
            stats={monthlyStats}
            teamCount={teams?.length}
            showArrow
          />
        </TouchableOpacity>

        {/* 소속팀 */}
        <Text style={styles.sectionLabel}>소속팀</Text>
        {(teams || []).length === 0 ? (
          <View style={styles.emptyTeamBox}>
            <Ionicons name="people-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.emptyTeamText}>
              소속된 팀이 없어요{'\n'}마이페이지에서 팀을 만들거나 참가해보세요!
            </Text>
          </View>
        ) : (
          <View style={styles.teamCardList}>
            {(teams || []).map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[
                  styles.teamCard,
                  currentTeam?.id === team.id && styles.teamCardActive,
                ]}
                onPress={() => {
                  selectTeam(team);
                  navigation.navigate('TeamDetail', { teamId: team.id });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.teamCardContent}>
                  <Text style={styles.teamCardName}>{team.name}</Text>
                  <View style={styles.teamCardMeta}>
                    {team.role === 'leader' ? (
                      <View style={styles.leaderBadge}>
                        <Text style={styles.leaderText}>LEADER</Text>
                      </View>
                    ) : (
                      <View style={styles.memberBadge}>
                        <Text style={styles.memberText}>MEMBER</Text>
                      </View>
                    )}
                    <Text style={styles.teamCardHint}>탭하여 팀 통계 보기</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F6F4' },
  scroll: { flex: 1 },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  monthBtn: {
    padding: 8,
  },
  monthBtnDisabled: {
    opacity: 0.5,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 120,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.55)',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  emptyTeamBox: {
    marginHorizontal: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center',
    gap: 12,
  },
  emptyTeamText: {
    fontSize: 14,
    color: 'rgba(26,26,26,0.45)',
    textAlign: 'center',
    lineHeight: 22,
  },
  teamCardList: {
    marginHorizontal: 16,
    gap: 10,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
  },
  teamCardActive: {
    borderColor: 'rgba(255, 107, 61, 0.30)',
    backgroundColor: 'rgba(255, 107, 61, 0.04)',
  },
  teamCardContent: {
    flex: 1,
  },
  teamCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  teamCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamCardHint: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.40)',
  },
  leaderBadge: {
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B3D',
  },
  memberBadge: {
    backgroundColor: 'rgba(26,26,26,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.50)',
  },
});
