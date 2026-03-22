import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/defaults';
import dayjs from '../../lib/dayjs';
import Button from '../../components/common/Button';
import WeeklyStatsTab from '../../components/stats/WeeklyStatsTab';
import { getCalendarWeekRanges, calcWeekAchievement } from '../../components/stats/StatsShared';

// ─── Types ───────────────────────────────────────────────────

interface GoalItem {
  goalId: string;
  name: string;
  frequency: string;
  targetCount: number | null;
}

interface MyGoalDetail extends GoalItem {
  achievedWeeks: number;
  totalActiveWeeks: number;
  rate: number | null;
}

interface MemberDetail {
  userId: string;
  nickname: string;
  isMe: boolean;
  rate: number | null;
  goals: GoalItem[];
  hanmadi: string;
  hoego: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function rateColor(rate: number | null): string {
  if (rate === null) return 'rgba(26,26,26,0.35)';
  if (rate >= 100) return '#15803d';
  if (rate >= 70) return '#FF6B3D';
  if (rate >= 40) return '#d97706';
  return '#b91c1c';
}

function freqLabel(frequency: string, targetCount: number | null): string {
  return frequency === 'daily' ? '매일' : `주 ${targetCount ?? 1}회`;
}

// ─── Main Component ──────────────────────────────────────────

export default function StatisticsScreen() {
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { user } = useAuthStore();
  const { currentTeam, fetchTeams } = useTeamStore();
  const { fetchTeamGoals, fetchMyGoals } = useGoalStore();

  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);

  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly'>('weekly');
  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));

  const [myRate, setMyRate] = useState<number | null>(null);
  const [myGoalDetails, setMyGoalDetails] = useState<MyGoalDetail[]>([]);
  const [memberDetails, setMemberDetails] = useState<MemberDetail[]>([]);

  const [editReviewModalVisible, setEditReviewModalVisible] = useState(false);
  const [tempText, setTempText] = useState('');

  // ── Double-tap tab → scroll to top ──
  React.useEffect(() => {
    const unsub = tabNavigation.addListener('tabPress', () => {
      if (tabNavigation.isFocused()) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) scrollRef.current?.scrollTo({ y: 0, animated: true });
        lastTapRef.current = now;
      }
    });
    return unsub;
  }, [tabNavigation]);

  // ── Month navigation ──
  const goToPrev = () => setYearMonth(p => dayjs(`${p}-01`).subtract(1, 'month').format('YYYY-MM'));
  const goToNext = () => {
    const next = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM');
    if (next <= dayjs().format('YYYY-MM')) setYearMonth(next);
  };
  const canNext = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM') <= dayjs().format('YYYY-MM');
  const monthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');
  const monthNum = dayjs(`${yearMonth}-01`).month() + 1;

  // ── Store fetch on focus (WeeklyStatsTab deps) ──
  const loadStoreData = useCallback(async () => {
    if (!user) return;
    await fetchTeams(user.id);
    const team = useTeamStore.getState().currentTeam;
    if (!team) return;
    await Promise.all([fetchTeamGoals(team.id, user.id), fetchMyGoals(user.id)]);
  }, [user]);

  useFocusEffect(useCallback(() => { loadStoreData(); }, [loadStoreData]));

  // ── Fetch monthly stats ──
  const fetchMonthlyStats = useCallback(async () => {
    if (!user) return;
    const { ranges } = getCalendarWeekRanges(yearMonth);
    if (ranges.length === 0) return;

    const dataStart = ranges[0].s.format('YYYY-MM-DD');
    const dataEnd = ranges[ranges.length - 1].e.format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');
    const endedRanges = ranges.filter(wr => wr.e.format('YYYY-MM-DD') < today);

    try {
      // ── 1. 나의 체크인 + 목표 ──
      const [{ data: myCheckins }, { data: myUserGoalsRaw }] = await Promise.all([
        supabase.from('checkins').select('goal_id, status, date')
          .eq('user_id', user.id).gte('date', dataStart).lte('date', dataEnd),
        supabase.from('user_goals')
          .select('goal_id, frequency, target_count, start_date, end_date, goals(name)')
          .eq('user_id', user.id).eq('is_active', true),
      ]);

      const myGoalsFiltered = (myUserGoalsRaw ?? []).filter((ug: any) => {
        if (ug.start_date && ug.start_date > dataEnd) return false;
        if (ug.end_date && ug.end_date < dataStart) return false;
        return true;
      });

      // 월간 달성률
      let myTotal = 0, myFailed = 0;
      endedRanges.forEach(wr => {
        const r = calcWeekAchievement(wr.s.format('YYYY-MM-DD'), myCheckins ?? [], myGoalsFiltered);
        myTotal += r.totalGoals;
        myFailed += r.failedGoals;
      });
      setMyRate(myTotal > 0 ? Math.round((myTotal - myFailed) / myTotal * 100) : null);

      // 목표별 달성률
      const goalDetailsList: MyGoalDetail[] = myGoalsFiltered.map((ug: any) => {
        const singleGoal = [{
          goal_id: ug.goal_id, frequency: ug.frequency,
          target_count: ug.target_count, start_date: ug.start_date, end_date: ug.end_date,
        }];
        let achievedWeeks = 0, totalActiveWeeks = 0;
        endedRanges.forEach(wr => {
          const r = calcWeekAchievement(wr.s.format('YYYY-MM-DD'), myCheckins ?? [], singleGoal);
          if (r.totalGoals > 0) {
            totalActiveWeeks++;
            if (r.isAllClear) achievedWeeks++;
          }
        });
        return {
          goalId: ug.goal_id,
          name: ug.goals?.name ?? '목표',
          frequency: ug.frequency,
          targetCount: ug.target_count,
          achievedWeeks,
          totalActiveWeeks,
          rate: totalActiveWeeks > 0 ? Math.round(achievedWeeks / totalActiveWeeks * 100) : null,
        };
      });
      setMyGoalDetails(goalDetailsList);

      // ── 2. 팀원 데이터 ──
      if (!currentTeam) { setMemberDetails([]); return; }

      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, users(nickname)')
        .eq('team_id', currentTeam.id);

      const memberIds = (members ?? []).map((m: any) => m.user_id);
      if (memberIds.length === 0) { setMemberDetails([]); return; }

      const [
        { data: teamCheckins },
        { data: teamUserGoalsRaw },
        { data: allResolutions },
        { data: allRetrospectives },
      ] = await Promise.all([
        supabase.from('checkins').select('user_id, goal_id, status, date')
          .in('user_id', memberIds).gte('date', dataStart).lte('date', dataEnd),
        supabase.from('user_goals')
          .select('user_id, goal_id, frequency, target_count, start_date, end_date, goals(name)')
          .in('user_id', memberIds).eq('is_active', true),
        supabase.from('monthly_resolutions').select('user_id, content')
          .in('user_id', memberIds).eq('team_id', currentTeam.id).eq('year_month', yearMonth),
        supabase.from('monthly_retrospectives').select('user_id, content')
          .in('user_id', memberIds).eq('team_id', currentTeam.id).eq('year_month', yearMonth),
      ]);

      const processed: MemberDetail[] = (members ?? []).map((m: any) => {
        const uid = m.user_id;
        const uCheckins = (teamCheckins ?? [])
          .filter((c: any) => c.user_id === uid)
          .map((c: any) => ({ goal_id: c.goal_id, status: c.status, date: c.date }));
        const uGoalsRaw = (teamUserGoalsRaw ?? []).filter((g: any) => g.user_id === uid);
        const uGoals = uGoalsRaw
          .filter((ug: any) => {
            if (ug.start_date && ug.start_date > dataEnd) return false;
            if (ug.end_date && ug.end_date < dataStart) return false;
            return true;
          })
          .map((g: any) => ({
            goal_id: g.goal_id, frequency: g.frequency,
            target_count: g.target_count, start_date: g.start_date, end_date: g.end_date,
          }));

        let mTotal = 0, mFailed = 0;
        endedRanges.forEach(wr => {
          const r = calcWeekAchievement(wr.s.format('YYYY-MM-DD'), uCheckins, uGoals);
          mTotal += r.totalGoals;
          mFailed += r.failedGoals;
        });

        const goalItems: GoalItem[] = uGoalsRaw
          .filter((ug: any) => {
            if (ug.start_date && ug.start_date > dataEnd) return false;
            if (ug.end_date && ug.end_date < dataStart) return false;
            return true;
          })
          .map((g: any) => ({
            goalId: g.goal_id,
            name: g.goals?.name ?? '목표',
            frequency: g.frequency,
            targetCount: g.target_count,
          }));

        return {
          userId: uid,
          nickname: m.users?.nickname || '알 수 없음',
          isMe: uid === user.id,
          rate: mTotal > 0 ? Math.round((mTotal - mFailed) / mTotal * 100) : null,
          goals: goalItems,
          hanmadi: (allResolutions ?? []).find((r: any) => r.user_id === uid)?.content || '',
          hoego: (allRetrospectives ?? []).find((r: any) => r.user_id === uid)?.content || '',
        };
      }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

      setMemberDetails(processed);
    } catch (e) { console.error(e); }
  }, [user, currentTeam, yearMonth]);

  const saveReview = async () => {
    if (!user || !currentTeam) return;
    try {
      const { error } = await supabase.from('monthly_retrospectives').upsert(
        { user_id: user.id, team_id: currentTeam.id, year_month: yearMonth, content: tempText },
        { onConflict: 'user_id, team_id, year_month' },
      );
      if (error) throw error;
      setMemberDetails(prev => prev.map(m => m.isMe ? { ...m, hoego: tempText } : m));
      setEditReviewModalVisible(false);
    } catch (e) { Alert.alert('저장 실패', '회고 저장 중 오류가 발생했습니다.'); }
  };

  useEffect(() => {
    fetchMonthlyStats();
  }, [fetchMonthlyStats]);

  const myMember = memberDetails.find(m => m.isMe);
  const otherMembers = memberDetails.filter(m => !m.isMe);

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView ref={scrollRef} style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.screenTitle}>통계</Text>

        {/* ── 탭 전환 ── */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'weekly' && s.tabBtnActive]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[s.tabText, activeTab === 'weekly' && s.tabTextActive]}>주간 현황</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'monthly' && s.tabBtnActive]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text style={[s.tabText, activeTab === 'monthly' && s.tabTextActive]}>월간 요약</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'monthly' ? (
          <>
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

            {/* ═══ 나의 N월 ═══ */}
            <Text style={s.sectionTitle}>나의 {monthNum}월</Text>
            <View style={s.memberCard}>
              {/* 달성률 */}
              <View style={s.cardRateRow}>
                <Text style={s.cardRateLabel}>{monthNum}월 달성률</Text>
                {myRate === null ? (
                  <Text style={s.rateEmpty}>집계 중</Text>
                ) : (
                  <Text style={[s.rateBig, { color: rateColor(myRate) }]}>
                    {myRate}%{myRate === 100 ? ' 🏆' : ''}
                  </Text>
                )}
              </View>

              {/* 목표 */}
              {myGoalDetails.length > 0 && (
                <View style={s.dividerSection}>
                  <Text style={s.subLabel}>목표</Text>
                  {myGoalDetails.map(g => (
                    <View key={g.goalId} style={s.goalRow}>
                      <View style={s.goalInfo}>
                        <Text style={s.goalName}>{g.name}</Text>
                        <Text style={s.goalFreq}>{freqLabel(g.frequency, g.targetCount)}</Text>
                      </View>
                      {g.rate === null ? (
                        <Text style={s.goalRateGray}>진행 중</Text>
                      ) : (
                        <View style={s.goalRateWrap}>
                          <Text style={[s.goalRate, { color: rateColor(g.rate) }]}>{g.rate}%</Text>
                          {g.rate >= 100 && <Ionicons name="checkmark-circle" size={15} color="#15803d" />}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* 한마디 */}
              {currentTeam && myMember?.hanmadi ? (
                <View style={s.dividerSection}>
                  <Text style={s.subLabel}>한마디</Text>
                  <Text style={s.reviewText}>{myMember.hanmadi}</Text>
                </View>
              ) : null}

              {/* 회고 */}
              {currentTeam && (
                <View style={s.dividerSection}>
                  <View style={s.reviewHeaderRow}>
                    <Text style={s.subLabel}>회고</Text>
                    <TouchableOpacity
                      onPress={() => { setTempText(myMember?.hoego ?? ''); setEditReviewModalVisible(true); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil" size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[s.reviewText, !(myMember?.hoego) && s.placeholder]}>
                    {myMember?.hoego || '이번 달은 어떠셨나요? 다음 달을 위한 다짐을 남겨보세요.'}
                  </Text>
                </View>
              )}
            </View>

            {/* ═══ 팀원들의 N월 ═══ */}
            {currentTeam && otherMembers.length > 0 && (
              <>
                <Text style={s.sectionTitle}>팀원들의 {monthNum}월</Text>
                {otherMembers.map((m, idx) => (
                  <View key={m.userId} style={s.memberCard}>
                    {/* 이름 + 달성률 */}
                    <View style={s.cardRateRow}>
                      <View style={s.memberNameRow}>
                        <Text style={s.memberRankText}>{idx + 1}</Text>
                        <Text style={s.memberNickname}>{m.nickname}</Text>
                      </View>
                      {m.rate === null ? (
                        <Text style={s.rateEmpty}>집계 중</Text>
                      ) : (
                        <Text style={[s.rateMedium, { color: rateColor(m.rate) }]}>
                          {m.rate}%{m.rate === 100 ? ' 🏆' : ''}
                        </Text>
                      )}
                    </View>

                    {/* 목표 chips */}
                    {m.goals.length > 0 && (
                      <View style={s.dividerSection}>
                        <Text style={s.subLabel}>목표</Text>
                        <View style={s.goalChipsWrap}>
                          {m.goals.map(g => (
                            <View key={g.goalId} style={s.goalChip}>
                              <Text style={s.goalChipText}>{g.name}</Text>
                              <Text style={s.goalChipFreq}> · {freqLabel(g.frequency, g.targetCount)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* 한마디 */}
                    {m.hanmadi ? (
                      <View style={s.dividerSection}>
                        <Text style={s.subLabel}>한마디</Text>
                        <Text style={s.reviewText}>{m.hanmadi}</Text>
                      </View>
                    ) : null}

                    {/* 회고 */}
                    {m.hoego ? (
                      <View style={s.dividerSection}>
                        <Text style={s.subLabel}>회고</Text>
                        <Text style={s.reviewText}>{m.hoego}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          <WeeklyStatsTab />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Review Modal ── */}
      <Modal
        visible={editReviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>월간 회고</Text>
            <TextInput
              style={s.modalInput}
              value={tempText}
              onChangeText={setTempText}
              placeholder="잘한 점, 아쉬운 점 등을 자유롭게 기록해보세요"
              multiline
              textAlignVertical="top"
            />
            <View style={s.modalBtns}>
              <Button title="취소" variant="secondary" onPress={() => setEditReviewModalVisible(false)} style={{ flex: 1 }} />
              <Button title="저장" onPress={saveReview} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F6F4' },
  scroll: { flex: 1 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginHorizontal: 16, marginTop: 8, marginBottom: 16 },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(26,26,26,0.5)' },
  tabTextActive: { color: '#1A1A1A', fontWeight: '700' },

  // Month selector
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 16 },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', minWidth: 130, textAlign: 'center' },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginHorizontal: 16, marginBottom: 4, marginTop: 28 },

  // Member card (shared for me + each team member)
  memberCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,107,61,0.08)', shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, overflow: 'hidden' },

  // Rate row at top of each card
  cardRateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 18 },
  cardRateLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(26,26,26,0.45)' },
  rateBig: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  rateMedium: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  rateEmpty: { fontSize: 13, color: 'rgba(26,26,26,0.35)', fontWeight: '500' },
  ratePerfect: { fontSize: 14, fontWeight: '700', color: '#15803d' },

  // Member name row
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberRankText: { fontSize: 13, fontWeight: '700', color: 'rgba(26,26,26,0.35)', width: 18 },
  memberNickname: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  // Sub-sections within a card
  dividerSection: { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  subLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(26,26,26,0.40)', marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase' },

  // Goal rows (my detailed view)
  goalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  goalFreq: { fontSize: 11, color: 'rgba(26,26,26,0.45)', marginTop: 1 },
  goalRateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalRate: { fontSize: 14, fontWeight: '800' },
  goalRateGray: { fontSize: 12, color: 'rgba(26,26,26,0.35)', fontWeight: '500' },

  // Goal chips (team member compact view)
  goalChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goalChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,107,61,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  goalChipText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  goalChipFreq: { fontSize: 11, color: 'rgba(26,26,26,0.45)' },

  // Review (한마디 / 회고)
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  reviewText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
  placeholder: { color: 'rgba(26,26,26,0.30)' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  modalInput: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, fontSize: 15, color: '#1A1A1A', minHeight: 120, marginBottom: 20, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12 },
});
