import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { supabase } from '../../lib/supabaseClient';
import Button from '../../components/common/Button';

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
  const [monthlyComment, setMonthlyComment] = useState('');
  const [monthlyReview, setMonthlyReview] = useState('');
  
  const [editCommentModalVisible, setEditCommentModalVisible] = useState(false);
  const [editReviewModalVisible, setEditReviewModalVisible] = useState(false);
  const [tempText, setTempText] = useState('');

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

  const loadReviews = async () => {
    if (!user || !currentTeam) {
      setMonthlyComment('');
      setMonthlyReview('');
      return;
    }

    try {
      const { data: resData } = await supabase
        .from('monthly_resolutions')
        .select('content')
        .eq('user_id', user.id)
        .eq('team_id', currentTeam.id)
        .eq('year_month', yearMonth)
        .maybeSingle();
      setMonthlyComment(resData?.content || '');

      const { data: retroData } = await supabase
        .from('monthly_retrospectives')
        .select('content')
        .eq('user_id', user.id)
        .eq('team_id', currentTeam.id)
        .eq('year_month', yearMonth)
        .maybeSingle();
      setMonthlyReview(retroData?.content || '');
    } catch (e) {
      console.error('Failed to load reviews:', e);
    }
  };

  const saveComment = async () => {
    if (!user || !currentTeam) return;
    try {
      const { error } = await supabase
        .from('monthly_resolutions')
        .upsert({
          user_id: user.id,
          team_id: currentTeam.id,
          year_month: yearMonth,
          content: tempText,
        }, { onConflict: 'user_id, team_id, year_month' });
        
      if (error) throw error;
      setMonthlyComment(tempText);
      setEditCommentModalVisible(false);
    } catch (e) {
      Alert.alert('저장 실패', '이번 달 한마디(목표) 저장 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  const saveReview = async () => {
    if (!user || !currentTeam) return;
    try {
      const { error } = await supabase
        .from('monthly_retrospectives')
        .upsert({
          user_id: user.id,
          team_id: currentTeam.id,
          year_month: yearMonth,
          content: tempText,
        }, { onConflict: 'user_id, team_id, year_month' });

      if (error) throw error;
      setMonthlyReview(tempText);
      setEditReviewModalVisible(false);
    } catch (e) {
      Alert.alert('저장 실패', '월간 회고 저장 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    await fetchTeams(user.id);
    const team = useTeamStore.getState().currentTeam;
    
    // 팀이 없으면 로드 중단 (또는 개인 데이터만?)
    // 현재 구조상 팀 기반 데이터가 많으므로 팀이 있어야 함
    if (!team) return;

    await Promise.all([
      fetchTeamGoals(team.id, user.id),
      fetchMyGoals(user.id),
      fetchMonthlyCheckins(user.id, yearMonth),
    ]);
    
    // Load reviews after team is confirmed
    loadReviews();
  }, [user, yearMonth, currentTeam?.id]); // Depend on currentTeam.id to reload when team changes

  // currentTeam 변경 시 loadReviews 호출 (useEffect 추가)
  React.useEffect(() => {
    loadReviews();
  }, [currentTeam?.id, yearMonth]);

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
    const dailyPercents: number[] = [];

    const goalCalculableDoneMap: Record<string, number> = {};
    const goalCalculableTargetMap: Record<string, number> = {};

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
      if (todayDailyGoals.length === 0) continue;

      const dayCheckins = checkins.filter((c) => c.date === dateStr);

      todayDailyGoals.forEach((ug) => {
        const gid = ug.goal_id;
        const c = dayCheckins.find((ci) => ci.goal_id === gid);
        if (!c) {
          goalFailMap[gid] = (goalFailMap[gid] || 0) + 1;
          goalCalculableTargetMap[gid] = (goalCalculableTargetMap[gid] || 0) + 1;
        } else if (isPass(c)) {
          // 매일 목표는 패스가 없음 -> 미달로 처리하거나 무시? 
          // "매일 목표에서 패스는 없는거기 때문에 없애" -> 카운팅 제외 (무시)
          // 다만 기존 데이터가 있을 수 있으므로 done에는 포함 안 됨.
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

        // 부분 주차 확인 (Partial Week Check)
        // 1. 목표 시작일이 주차 시작일보다 늦음 (가입/생성 주차)
        // 2. 월 말이 주차 종료일보다 빠름 (월말 주차)
        // 3. 월 시작이 주차 시작일보다 늦음 (월초 주차) -> startDate 기준 처리
        
        const potentialStart = dayjs(Math.max(weekStart.valueOf(), dayjs(goalStart).valueOf(), dayjs(startDate).valueOf()));
        const potentialEnd = dayjs(Math.min(weekEnd.valueOf(), dayjs(monthEnd).valueOf()));
        
        const potentialDays = potentialEnd.diff(potentialStart, 'day') + 1;
        const isPartialWeek = potentialDays < 7;

        // 실제 유효 범위 (체크인 카운팅용 - 오늘 날짜 제한 등)
        const validStart = potentialStart;
        const validEnd = dayjs(Math.min(potentialEnd.valueOf(), dayjs(today).valueOf()));
        
        const effStartStr = validStart.format('YYYY-MM-DD');
        const effEndStr = validEnd.format('YYYY-MM-DD');

        if (effStartStr <= effEndStr) {
          const weekCheckins = checkins.filter(
            (c) => c.goal_id === gid && c.date >= effStartStr && c.date <= effEndStr
          );
          const done = weekCheckins.filter(isDone).length;
          const pass = weekCheckins.filter(isPass).length;

          goalDoneMap[gid] = (goalDoneMap[gid] || 0) + done;
          goalPassMap[gid] = (goalPassMap[gid] || 0) + pass;
          
          // weekCheckins.filter(isPass).forEach((c) => {
          //   if (c.memo) passReasons.push(c.memo);
          // });

          // 부분 주차가 아닐 때만 미달/달성률 계산
           if (!isPartialWeek) {
             const isWeekOver = weekEnd.format('YYYY-MM-DD') <= today;
             
             // 미달은 주차가 완전히 끝났을 때만 계산
            if (isWeekOver) {
              const deficit = Math.max(0, target - done);
              goalFailMap[gid] = (goalFailMap[gid] || 0) + deficit;
            }

            // 달성률을 위한 모수 누적 (진행 중인 주차도 포함하여 현재 달성률 반영)
            goalCalculableTargetMap[gid] = (goalCalculableTargetMap[gid] || 0) + target;
            goalCalculableDoneMap[gid] = (goalCalculableDoneMap[gid] || 0) + done;
          }
        }

        weekCursor = weekCursor.add(1, 'week');
      }
    });

    // const reasonCounts: Record<string, number> = {};
    // passReasons.forEach((r) => {
    //   const cleaned = r.replace(/^\[패스\]\s*/, '').trim();
    //   if (cleaned) reasonCounts[cleaned] = (reasonCounts[cleaned] || 0) + 1;
    // });
    // const topReasons = Object.entries(reasonCounts)
    //   .sort((a, b) => b[1] - a[1])
    //   .slice(0, 3);

    const mapGoalStats = (targetGoals: any[]) => targetGoals.map((ug) => {
      const goal = allGoals.find((g) => g.id === ug.goal_id);
      const cDone = goalCalculableDoneMap[ug.goal_id] || 0;
      const cTarget = goalCalculableTargetMap[ug.goal_id] || 0;
      const rate = cTarget > 0 ? Math.round((cDone / cTarget) * 100) : 0;
      return {
        goalId: ug.goal_id,
        name: goal?.name ?? '알 수 없음',
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
    
    // 주간 목표 전체 평균 달성률 (각 목표 달성률의 평균)
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
      // topReasons,
    };
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

        {/* 이번 달 한마디(목표) & 월간 회고 (통계 위로 이동) */}
        {currentTeam && (
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewTitle}>이번 달 한마디(목표)</Text>
            </View>
            <TouchableOpacity 
              style={styles.reviewBox}
              onPress={() => {
                setTempText(monthlyComment);
                setEditCommentModalVisible(true);
              }}
            >
              <Text style={[styles.reviewText, !monthlyComment && styles.placeholderText]}>
                {monthlyComment || '이번 달의 다짐이나 목표를 적어보세요.'}
              </Text>
              <Ionicons name="pencil" size={14} color={COLORS.textSecondary} style={styles.reviewIcon} />
            </TouchableOpacity>

            <View style={[styles.reviewHeader, { marginTop: 20 }]}>
              <Text style={styles.reviewTitle}>월간 회고</Text>
            </View>
            <TouchableOpacity 
              style={styles.reviewBox}
              onPress={() => {
                setTempText(monthlyReview);
                setEditReviewModalVisible(true);
              }}
            >
              <Text style={[styles.reviewText, !monthlyReview && styles.placeholderText]}>
                {monthlyReview || '이번 달을 돌아보며 회고를 작성해보세요.'}
              </Text>
              <Ionicons name="pencil" size={14} color={COLORS.textSecondary} style={styles.reviewIcon} />
            </TouchableOpacity>
          </View>
        )}

        {/* 나의 통계 */}
        <Text style={styles.sectionLabel}>나의 통계</Text>
        <MonthlyStatsCard
          monthLabel={currentMonthLabel}
          stats={monthlyStats}
          teamCount={teams?.length}
          showArrow={false} // 화살표 제거 (클릭 이동 X)
        />

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

      {/* 한마디 수정 모달 */}
      <Modal visible={editCommentModalVisible} transparent animationType="fade" onRequestClose={() => setEditCommentModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>이번 달 한마디(목표)</Text>
            <TextInput
              style={styles.modalInput}
              value={tempText}
              onChangeText={setTempText}
              placeholder="이번 달의 다짐이나 목표를 적어보세요"
              multiline
              maxLength={100}
            />
            <View style={styles.modalButtons}>
              <Button title="취소" variant="secondary" onPress={() => setEditCommentModalVisible(false)} style={{ flex: 1 }} />
              <Button title="저장" onPress={saveComment} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 회고 수정 모달 */}
      <Modal visible={editReviewModalVisible} transparent animationType="fade" onRequestClose={() => setEditReviewModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>월간 회고</Text>
            <TextInput
              style={[styles.modalInput, { height: 120 }]}
              value={tempText}
              onChangeText={setTempText}
              placeholder="이번 달을 돌아보며 잘한 점, 아쉬운 점 등을 자유롭게 기록해보세요"
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <Button title="취소" variant="secondary" onPress={() => setEditReviewModalVisible(false)} style={{ flex: 1 }} />
              <Button title="저장" onPress={saveReview} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    fontSize: 16, // 크기 키움
    fontWeight: '800',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 24,
  },
  reviewSection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.6)',
  },
  reviewBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  reviewText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
    flex: 1,
  },
  reviewIcon: {
    marginTop: 2,
    opacity: 0.5,
  },
  placeholderText: {
    color: 'rgba(26,26,26,0.3)',
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 80,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
