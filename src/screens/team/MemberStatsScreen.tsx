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
    const passReasons: string[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (dateStr > today) break;

      const todayGoals = goals.filter((ug) => {
        if (ug.start_date && dateStr < ug.start_date) return false;
        return true;
      });
      const totalForDay = todayGoals.length;
      if (totalForDay === 0) continue;

      const dayCheckins = checkins.filter((c) => c.date === dateStr);
      const done = dayCheckins.filter(isDone).length;
      const pass = dayCheckins.filter(isPass).length;
      const effectiveTotal = totalForDay - pass;
      const pct = effectiveTotal > 0 ? (done / effectiveTotal) * 100 : (done > 0 ? 100 : 0);
      dailyPercents.push(pct);

      todayGoals.forEach((ug) => {
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

    const reasonCounts: Record<string, number> = {};
    passReasons.forEach((r) => {
      const cleaned = r.replace(/^\[패스\]\s*/, '').trim();
      if (cleaned) reasonCounts[cleaned] = (reasonCounts[cleaned] || 0) + 1;
    });
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const avg = dailyPercents.length > 0
      ? Math.round(dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length)
      : 0;
    const max = dailyPercents.length > 0 ? Math.round(Math.max(...dailyPercents)) : 0;
    const min = dailyPercents.length > 0 ? Math.round(Math.min(...dailyPercents)) : 0;

    const goalStats = goals.map((ug) => {
      const goal = allGoals.find((g) => g.id === ug.goal_id);
      const name = goal?.name ?? myGoalNames[ug.goal_id] ?? '알 수 없음';
      return {
        goalId: ug.goal_id,
        name,
        frequency: ug.frequency,
        targetCount: ug.target_count,
        done: goalDoneMap[ug.goal_id] || 0,
        pass: goalPassMap[ug.goal_id] || 0,
        fail: goalFailMap[ug.goal_id] || 0,
      };
    });

    return { doneTotal, passTotal, avg, max, min, goalStats, topReasons };
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
        {/* Resolution & Retrospective */}
        {teamId && (
          <View style={styles.messageCard}>
            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>이번 달 한마디</Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
    marginTop: 16,
  },
  messageCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
  },
  messageSection: {
    gap: 8,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 16,
  },
});
