import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabaseClient';
import { RootStackParamList } from '../../types/navigation';
import { useGoalStore } from '../../stores/goalStore';
import MonthlyStatsCard from '../../components/common/MonthlyStatsCard';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

type MemberStatsRouteProp = RouteProp<RootStackParamList, 'MemberStats'>;

export default function MemberStatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<MemberStatsRouteProp>();
  const { userId, teamId, nickname } = route.params;

  const {
    teamGoals,
    myGoals, 
    monthlyCheckins,
    fetchTeamGoals,
    fetchMyGoals,
    fetchMonthlyCheckins,
  } = useGoalStore();

  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [resolution, setResolution] = useState<string>('');
  const [retrospective, setRetrospective] = useState<string>('');

  const [myGoalNames, setMyGoalNames] = useState<Record<string, string>>({});

  // Load data for the specific user
  const loadData = useCallback(async () => {
    // Fetch goals for the team
    if (teamId) {
      await fetchTeamGoals(teamId, userId);
    }
    // Fetch the specific user's personal goal settings
    await fetchMyGoals(userId);
    // Fetch checkins for that user
    await fetchMonthlyCheckins(userId, yearMonth);

    // If no team, fetch goal names for myGoals
    if (!teamId) {
      const { data: userGoals } = await supabase
        .from('user_goals')
        .select('goal_id, goals(name)')
        .eq('user_id', userId);
      
      const names: Record<string, string> = {};
      userGoals?.forEach((ug: any) => {
        if (ug.goals?.name) {
          names[ug.goal_id] = ug.goals.name;
        }
      });
      setMyGoalNames(names);
    }

    // Fetch Resolution & Retrospective (Only if teamId exists)
    if (teamId) {
      const { data: resData } = await supabase
        .from('monthly_resolutions')
        .select('content')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('year_month', yearMonth)
        .single();
      
      setResolution(resData?.content || '');

      const { data: retroData } = await supabase
        .from('monthly_retrospectives')
        .select('content')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('year_month', yearMonth)
        .single();
      
      setRetrospective(retroData?.content || '');
    } else {
      setResolution('');
      setRetrospective('');
    }

  }, [userId, teamId, yearMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const goToPrevMonth = () => {
    setYearMonth((prev) =>
      dayjs(`${prev}-01`).subtract(1, 'month').format('YYYY-MM'),
    );
  };
  const goToNextMonth = () => {
    setYearMonth((prev) =>
      dayjs(`${prev}-01`).add(1, 'month').format('YYYY-MM'),
    );
  };

  const currentMonthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');

  // Filter goals relevant to this team
  const currentTeamUserGoals = useMemo(() => {
    if (!myGoals) return [];
    
    // If no team, show all active goals (or handle as needed)
    // For now, if no teamId, we might want to show all personal goals?
    // But the original logic was filtering by teamGoals.
    // If teamId is undefined, teamGoals might be empty or from previous state.
    
    if (!teamId) {
      // If no team context, show all user goals
      return myGoals;
    }

    if (!teamGoals || teamGoals.length === 0) return [];

    const teamGoalIds = new Set(teamGoals.map((g) => g.id));
    return myGoals.filter((ug) => teamGoalIds.has(ug.goal_id));
  }, [teamGoals, myGoals, teamId]);

  // Calculate Stats (Reused logic)
  const monthlyStats = useMemo(() => {
    const goals = currentTeamUserGoals;
    // If no team, allGoals is empty, so names will be '알 수 없음' unless we fetch goal details differently.
    // In current structure, goal details (name) are in 'goals' table, fetched via fetchTeamGoals.
    // If no teamId, we can't fetch team goals easily unless we fetch all goals for user's goal_ids.
    // However, myGoals (UserGoal) doesn't have name.
    // We need to fetch goal names for personal goals if not in team context.
    
    // For now, let's assume teamGoals might be populated if we fetch all user's goals?
    // Or we need to fetch goal details for the user's goals.
    
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

    const dailyPercents: number[] = [];
    const goalDoneMap: Record<string, number> = {};
    const goalPassMap: Record<string, number> = {};
    const goalFailMap: Record<string, number> = {};
    const goalCalculableDoneMap: Record<string, number> = {};
    const goalCalculableTargetMap: Record<string, number> = {};
    const passReasons: string[] = [];

    const dailyGoals = goals.filter(ug => ug.frequency === 'daily');
    const weeklyGoals = goals.filter(ug => ug.frequency === 'weekly_count');

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (dateStr > today) break;

      const todayAllGoals = goals.filter((ug) => {
        if (ug.start_date && dateStr < ug.start_date) return false;
        return true;
      });
      if (todayAllGoals.length === 0) continue;

      const dayCheckins = checkins.filter((c) => c.date === dateStr);
      const done = dayCheckins.filter(isDone).length;
      const pass = dayCheckins.filter(isPass).length;
      const effectiveTotal = todayAllGoals.length - pass;
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
      if (todayDailyGoals.length === 0) continue;

      const dayCheckins = checkins.filter((c) => c.date === dateStr);

      todayDailyGoals.forEach((ug) => {
        const gid = ug.goal_id;
        const c = dayCheckins.find((ci) => ci.goal_id === gid);
        if (!c) {
          goalFailMap[gid] = (goalFailMap[gid] || 0) + 1;
          goalCalculableTargetMap[gid] = (goalCalculableTargetMap[gid] || 0) + 1;
        } else if (isPass(c)) {
          goalPassMap[gid] = (goalPassMap[gid] || 0) + 1;
          if (c.memo) passReasons.push(c.memo);
        } else {
          goalDoneMap[gid] = (goalDoneMap[gid] || 0) + 1;
          goalCalculableDoneMap[gid] = (goalCalculableDoneMap[gid] || 0) + 1;
          goalCalculableTargetMap[gid] = (goalCalculableTargetMap[gid] || 0) + 1;
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
        const weekStart = weekCursor;
        const weekEnd = weekCursor.endOf('isoWeek');

        const potentialStart = dayjs(Math.max(weekStart.valueOf(), dayjs(goalStart).valueOf(), dayjs(startDate).valueOf()));
        const potentialEnd = dayjs(Math.min(weekEnd.valueOf(), dayjs(monthEnd).valueOf()));
        
        const potentialDays = potentialEnd.diff(potentialStart, 'day') + 1;
        const isPartialWeek = potentialDays < 7;

        const validStart = potentialStart;
        const validEnd = dayjs(Math.min(potentialEnd.valueOf(), dayjs(today).valueOf()));
        
        const effStartStr = validStart.format('YYYY-MM-DD');
        const effEndStr = validEnd.format('YYYY-MM-DD');

        if (effStartStr <= effEndStr) {
          const weekCheckins = checkins.filter(
            (c) => c.goal_id === gid && c.date >= effStartStr && c.date <= effEndStr
          );
          const done = weekCheckins.filter(isDone).length;
          const explicitPass = weekCheckins.filter(isPass).length;
          // 주N회 목표: 체크인 없는 날 = 자동 패스
          const weekDays = dayjs(effEndStr).diff(dayjs(effStartStr), 'day') + 1;
          const autoPass = Math.max(0, weekDays - done - explicitPass);
          const totalPass = explicitPass + autoPass;

          goalDoneMap[gid] = (goalDoneMap[gid] || 0) + done;
          goalPassMap[gid] = (goalPassMap[gid] || 0) + totalPass;
          
          weekCheckins.filter(isPass).forEach((c) => {
            if (c.memo) passReasons.push(c.memo);
          });

          if (!isPartialWeek) {
            const isWeekOver = weekEnd.format('YYYY-MM-DD') <= today;
            
            if (isWeekOver) {
              const deficit = Math.max(0, target - done);
              goalFailMap[gid] = (goalFailMap[gid] || 0) + deficit;
            }

            goalCalculableTargetMap[gid] = (goalCalculableTargetMap[gid] || 0) + target;
            goalCalculableDoneMap[gid] = (goalCalculableDoneMap[gid] || 0) + done;
          }
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

    const mapGoalStats = (targetGoals: any[]) => targetGoals.map((ug) => {
      const goal = allGoals.find((g) => g.id === ug.goal_id);
      const name = goal?.name ?? myGoalNames[ug.goal_id] ?? '알 수 없음';
      const cDone = goalCalculableDoneMap[ug.goal_id] || 0;
      const cTarget = goalCalculableTargetMap[ug.goal_id] || 0;
      const rate = cTarget > 0 ? Math.round((cDone / cTarget) * 100) : 0;
      return {
        goalId: ug.goal_id,
        name,
        frequency: ug.frequency,
        targetCount: ug.target_count,
        startDate: ug.start_date, // 시작일 추가
        done: goalDoneMap[ug.goal_id] || 0,
        pass: goalPassMap[ug.goal_id] || 0,
        fail: goalFailMap[ug.goal_id] || 0,
        rate,
      };
    });

    const dailyStats = mapGoalStats(dailyGoals);
    const weeklyStats = mapGoalStats(weeklyGoals);

    const dailyAvg = dailyPercents.length > 0
      ? Math.round(dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length)
      : 0;
    
    const weeklyAvg = weeklyStats.length > 0
      ? Math.round(weeklyStats.reduce((sum, g) => sum + (g.rate || 0), 0) / weeklyStats.length)
      : 0;

    return {
      daily: {
        avgRate: dailyAvg,
        goals: dailyStats,
        doneTotal: dailyStats.reduce((sum, g) => sum + g.done, 0),
        passTotal: dailyStats.reduce((sum, g) => sum + g.pass, 0),
        failTotal: dailyStats.reduce((sum, g) => sum + g.fail, 0),
      },
      weekly: {
        avgRate: weeklyAvg,
        goals: weeklyStats,
        doneTotal: weeklyStats.reduce((sum, g) => sum + g.done, 0),
        passTotal: weeklyStats.reduce((sum, g) => sum + g.pass, 0),
        failTotal: weeklyStats.reduce((sum, g) => sum + g.fail, 0),
      },
      topReasons,
    };
  }, [monthlyCheckins, myGoals, teamGoals, yearMonth, myGoalNames]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{nickname}님의 기록</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{currentMonthLabel}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll}>
        {/* Resolution & Retrospective - 팀 상세 페이지에서 작성 기능 제거되었으므로 읽기 전용으로 표시 */}
        {teamId && (
          <View style={styles.messageCard}>
            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>이번 달 한마디(목표)</Text>
              <Text style={[styles.messageText, !resolution && styles.placeholderText]}>
                {resolution || '등록된 한마디가 없습니다.'}
              </Text>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>월간 회고</Text>
              <Text style={[styles.messageText, !retrospective && styles.placeholderText]}>
                {retrospective || '등록된 회고가 없습니다.'}
              </Text>
            </View>
          </View>
        )}

        {/* Stats Card */}
        <MonthlyStatsCard 
          monthLabel={currentMonthLabel}
          stats={monthlyStats}
        />
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFAF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 61, 0.10)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 20,
    backgroundColor: '#FFFAF7',
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.15)',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  scroll: {
    flex: 1,
    marginTop: 16,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
    padding: 20,
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  messageSection: {
    gap: 8,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.45)',
  },
  messageText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  placeholderText: {
    color: 'rgba(26,26,26,0.30)',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    marginVertical: 16,
  },
});
