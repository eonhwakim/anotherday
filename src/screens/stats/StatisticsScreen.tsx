import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import dayjs from '../../lib/dayjs';
import WeeklyStatsTab from '../../components/stats/WeeklyStatsTab';
import CyberFrame from '../../components/ui/CyberFrame';
import ReviewModal from '../../components/stats/ReviewModal';
import { fetchMonthlyStatisticsSummary } from '../../services/statsService';
import { saveMonthlyRetrospective } from '../../services/monthlyService';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import FrameCard from '../../components/ui/FrameCard';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import { colors, ds, radius, spacing, typography } from '../../design/recipes';

interface GoalItem {
  goalId: string;
  name: string;
  frequency: string;
  targetCount: number | null;
  isEnded?: boolean;
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

function freqLabel(frequency: string, targetCount: number | null): string {
  return frequency === 'daily' ? '매일' : `주 ${targetCount ?? 1}회`;
}

export default function StatisticsScreen() {
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { user } = useAuthStore();
  const { currentTeam, fetchTeams } = useTeamStore();
  const { fetchTeamGoals, fetchMyGoals } = useGoalStore();

  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation: tabNavigation, scrollRef });

  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly'>('weekly');
  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));

  const [myRate, setMyRate] = useState<number | null>(null);
  const [myGoalDetails, setMyGoalDetails] = useState<MyGoalDetail[]>([]);
  const [memberDetails, setMemberDetails] = useState<MemberDetail[]>([]);

  const [editReviewModalVisible, setEditReviewModalVisible] = useState(false);
  const [tempText, setTempText] = useState('');

  // ── Month navigation ──
  const goToPrev = () =>
    setYearMonth((p) => dayjs(`${p}-01`).subtract(1, 'month').format('YYYY-MM'));
  const goToNext = () => {
    const next = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM');
    if (next <= dayjs().format('YYYY-MM')) setYearMonth(next);
  };
  const canNext =
    dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM') <= dayjs().format('YYYY-MM');
  const monthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');
  const monthNum = dayjs(`${yearMonth}-01`).month() + 1;

  // ── Store fetch on focus (WeeklyStatsTab deps) ──
  const loadStoreData = useCallback(async () => {
    if (!user) return;
    await fetchTeams(user.id);
    const team = useTeamStore.getState().currentTeam;
    if (!team) return;
    await Promise.all([fetchTeamGoals(team.id, user.id), fetchMyGoals(user.id)]);
  }, [user, fetchTeams, fetchTeamGoals, fetchMyGoals]);

  useFocusEffect(
    useCallback(() => {
      loadStoreData();
    }, [loadStoreData]),
  );

  // ── Fetch monthly stats ──
  const fetchMonthlyStats = useCallback(async () => {
    if (!user) return;

    try {
      const summary = await fetchMonthlyStatisticsSummary({
        userId: user.id,
        yearMonth,
        teamId: currentTeam?.id,
      });
      setMyRate(summary.myRate);
      setMyGoalDetails(summary.myGoalDetails as MyGoalDetail[]);
      setMemberDetails(summary.memberDetails as MemberDetail[]);
    } catch (e) {
      console.error(e);
    }
  }, [user, currentTeam, yearMonth]);

  const saveReview = async () => {
    if (!user || !currentTeam) return;
    try {
      const ok = await saveMonthlyRetrospective({
        userId: user.id,
        teamId: currentTeam.id,
        yearMonth,
        content: tempText,
      });
      if (!ok) throw new Error('save failed');
      setMemberDetails((prev) => prev.map((m) => (m.isMe ? { ...m, hoego: tempText } : m)));
      setEditReviewModalVisible(false);
    } catch {
      Alert.alert('저장 실패', '회고 저장 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchMonthlyStats();
  }, [fetchMonthlyStats]);

  const myMember = memberDetails.find((m) => m.isMe);
  const otherMembers = memberDetails.filter((m) => !m.isMe);

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScreenHeader
          title="통계"
          subtitle="월초와 월말의 부분주는 4일 미만이면 인접 월에 편입되어 현재 달 집계에서 제외돼요."
        />
        <ScrollView ref={scrollRef} style={s.scroll} showsVerticalScrollIndicator={false}>
          {/* ── 탭 전환 ── */}
          <CyberFrame style={s.tabFrame} contentStyle={s.tabContent} glassOnly={true}>
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
          </CyberFrame>

          {activeTab === 'monthly' ? (
            <>
              {/* ── 월 선택 ── */}
              <View style={s.monthRow}>
                <TouchableOpacity style={s.monthBtn} onPress={goToPrev}>
                  <Ionicons name="chevron-back" size={22} color={colors.primaryLight} />
                </TouchableOpacity>
                <Text style={s.monthLabel}>{monthLabel}</Text>
                <TouchableOpacity
                  style={[s.monthBtn, !canNext && { opacity: 0.4 }]}
                  onPress={goToNext}
                  disabled={!canNext}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={canNext ? colors.primaryLight : 'rgba(26,26,26,0.25)'}
                  />
                </TouchableOpacity>
              </View>

              {/* ═══ 우리 팀 달성률 차트 ═══ */}
              {currentTeam && memberDetails.length > 0 && (
                <>
                  <SectionHeader title="우리 팀 달성률" inset />
                  <FrameCard style={s.chartFrame} contentStyle={s.chartContent} padded={false}>
                    {memberDetails.map((m, idx) => {
                      const validRate = m.rate ?? 0;
                      return (
                        <View key={m.userId} style={s.chartRow}>
                          <View style={s.chartLabelBox}>
                            <Text style={s.chartRank}>
                              {m.rate === null
                                ? idx + 1
                                : idx === 0
                                  ? '🥇'
                                  : idx === 1
                                    ? '🥈'
                                    : idx === 2
                                      ? '🥉'
                                      : idx + 1}
                            </Text>
                            <Text style={[s.chartName, m.isMe && s.chartNameMe]} numberOfLines={1}>
                              {m.nickname}
                            </Text>
                          </View>
                          <View style={s.chartBarBg}>
                            <View
                              style={[
                                s.chartBarFill,
                                { width: `${validRate}%` },
                                m.isMe
                                  ? { backgroundColor: colors.primary }
                                  : { backgroundColor: 'rgba(26,26,26,0.15)' },
                              ]}
                            />
                          </View>
                          <Text style={[s.chartRateText, m.isMe && s.chartRateTextMe]}>
                            {m.rate === null ? '-' : `${m.rate}%`}
                          </Text>
                        </View>
                      );
                    })}
                  </FrameCard>
                </>
              )}

              {/* ═══ 나의 N월 ═══ */}
              <SectionHeader title={`나의 ${monthNum}월`} inset />
              <FrameCard style={s.memberCardFrame} contentStyle={s.memberCardContent} padded={false}>
                {/* 달성률 */}
                <View style={s.cardRateRow}>
                  <Text style={s.cardRateLabel}>{monthNum}월 달성률</Text>
                  {myRate === null ? (
                    <Text style={s.rateEmpty}>집계 중</Text>
                  ) : (
                    <Text style={[s.rateBig, { color: '#1A1A1A' }]}>
                      {myRate}%{myRate === 100 ? ' 🏆' : ''}
                    </Text>
                  )}
                </View>

                {/* 목표 */}
                {myGoalDetails.length > 0 && (
                  <View style={s.dividerSection}>
                    <Text style={s.subLabel}>목표</Text>
                    {myGoalDetails.map((g) => (
                      <View key={g.goalId} style={s.goalRow}>
                        <View style={s.goalInfo}>
                          <View style={s.myGoalChip}>
                            <Text style={s.myGoalChipText}>{g.name}</Text>
                            <Text style={s.myGoalChipFreq}>
                              {' '}
                              · {freqLabel(g.frequency, g.targetCount)}
                            </Text>
                            {g.isEnded ? (
                              <View style={s.goalEndedBadge}>
                                <Text style={s.goalEndedBadgeText}>종료됨</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        {g.rate === null ? (
                          <Text style={s.goalRateGray}>진행 중</Text>
                        ) : (
                          <View style={s.goalRateWrap}>
                            <Text
                              style={[
                                s.goalRate,
                                { color: g.rate >= 100 ? colors.primary : colors.text },
                              ]}
                            >
                              {g.rate}%
                            </Text>
                            {g.rate >= 100 && (
                              <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                            )}
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
                        onPress={() => {
                          setTempText(myMember?.hoego ?? '');
                          setEditReviewModalVisible(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.reviewText, !myMember?.hoego && s.placeholder]}>
                      {myMember?.hoego || '이번 달은 어떠셨나요? 다음 달을 위한 다짐을 남겨보세요.'}
                    </Text>
                  </View>
                )}
              </FrameCard>

              {/* ═══ 팀원들의 N월 ═══ */}
              {currentTeam && otherMembers.length > 0 && (
                <>
                  <SectionHeader title={`팀원들의 ${monthNum}월`} inset />
                  {otherMembers.map((m, idx) => (
                    <FrameCard
                      key={m.userId}
                      style={s.memberCardFrame}
                      contentStyle={s.memberCardContent}
                      padded={false}
                    >
                      {/* 이름 + 달성률 */}
                      <View style={s.cardRateRow}>
                        <View style={s.memberNameRow}>
                          <Text style={s.memberRankText}>
                            {m.rate === null
                              ? idx + 1
                              : idx === 0
                                ? '🥇'
                                : idx === 1
                                  ? '🥈'
                                  : idx === 2
                                    ? '🥉'
                                    : idx + 1}
                          </Text>
                          <Text style={s.memberNickname}>{m.nickname}</Text>
                        </View>
                        {m.rate === null ? (
                          <Text style={s.rateEmpty}>집계 중</Text>
                        ) : (
                          <Text style={[s.rateMedium, { color: '#1A1A1A' }]}>
                            {m.rate}%{m.rate === 100 ? ' 🏆' : ''}
                          </Text>
                        )}
                      </View>

                      {/* 목표 chips */}
                      {m.goals.length > 0 && (
                        <View style={s.dividerSection}>
                          <Text style={s.subLabel}>목표</Text>
                          <View style={s.goalChipsWrap}>
                            {m.goals.map((g) => (
                              <View key={g.goalId} style={s.goalChip}>
                                <Text style={s.goalChipText}>{g.name}</Text>
                                <Text style={s.goalChipFreq}>
                                  {' '}
                                  · {freqLabel(g.frequency, g.targetCount)}
                                </Text>
                                {g.isEnded ? (
                                  <View style={s.goalEndedBadge}>
                                    <Text style={s.goalEndedBadgeText}>종료됨</Text>
                                  </View>
                                ) : null}
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
                    </FrameCard>
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
        <ReviewModal
          visible={editReviewModalVisible}
          value={tempText}
          onChangeText={setTempText}
          onClose={() => setEditReviewModalVisible(false)}
          onSave={saveReview}
        />
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screen },
  safe: { flex: 1 },
  scroll: { flex: 1 },

  // Tabs
  tabFrame: { marginHorizontal: spacing[4], marginBottom: spacing[4], borderRadius: radius.md },
  tabContent: { flexDirection: 'row', padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: { ...typography.bodyStrong, color: colors.textSecondary },
  tabTextActive: { color: colors.text, fontWeight: '700' },

  // Month selector
  monthRow: {
    ...ds.rowCenter,
    justifyContent: 'center',
    marginBottom: 8,
    gap: spacing[4],
  },
  monthBtn: { padding: spacing[2] },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    minWidth: 130,
    textAlign: 'center',
  },

  // Team Chart
  chartFrame: { marginHorizontal: spacing[4], marginTop: 8, marginBottom: 8 },
  chartContent: { paddingVertical: spacing[4], paddingHorizontal: spacing[4], gap: spacing[3] },
  chartRow: ds.rowCenter,
  chartLabelBox: { width: 70, ...ds.rowCenter, gap: spacing[1] + 2 },
  chartRank: { fontSize: 20, fontWeight: '700', color: colors.textFaint, width: 20 },
  chartName: { ...typography.label, color: colors.text, textTransform: 'none', flex: 1 },
  chartNameMe: { color: colors.primary, fontWeight: '800' },
  chartBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  chartBarFill: { height: '100%', borderRadius: 6 },
  chartRateText: {
    width: 36,
    textAlign: 'right',
    ...typography.label,
    color: colors.text,
    textTransform: 'none',
  },
  chartRateTextMe: { color: colors.primary, fontWeight: '800' },

  // Member card (shared for me + each team member)
  memberCardFrame: { marginHorizontal: spacing[4], marginTop: 8, marginBottom: 8 },
  memberCardContent: { paddingHorizontal: 0, paddingVertical: 0 },

  // Rate row at top of each card
  cardRateRow: {
    ...ds.rowBetween,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardRateLabel: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  rateBig: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  rateMedium: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  rateEmpty: {
    ...typography.label,
    color: colors.textFaint,
    fontWeight: '500',
    textTransform: 'none',
  },
  ratePerfect: { fontSize: 14, fontWeight: '700', color: '#15803d' },

  // Member name row
  memberNameRow: { ...ds.rowCenter, gap: spacing[1] + 2 },
  memberRankText: { fontSize: 20, fontWeight: '700', color: colors.textFaint, width: 20 },
  memberNickname: { fontSize: 15, fontWeight: '700', color: colors.text },

  // Sub-sections within a card
  dividerSection: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  subLabel: {
    ...typography.label,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.40)',
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  // Goal rows (my detailed view)
  goalRow: { ...ds.rowCenter, marginBottom: 8 },
  goalInfo: { flex: 1, ...ds.rowCenter },
  myGoalChip: {
    ...ds.rowCenter,
    backgroundColor: colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexWrap: 'wrap',
    gap: 4,
  },
  myGoalChipText: { ...typography.label, color: colors.text, textTransform: 'none' },
  myGoalChipFreq: { ...typography.caption, color: colors.textSecondary },
  goalRateWrap: { ...ds.rowCenter, gap: 4 },
  goalRate: { fontSize: 14, fontWeight: '800' },
  goalRateGray: { ...typography.caption, color: colors.textFaint, fontWeight: '500' },

  // Goal chips (team member compact view)
  goalChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goalChip: {
    ...ds.rowCenter,
    backgroundColor: colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexWrap: 'wrap',
    gap: 4,
  },
  goalChipText: { ...typography.caption, fontWeight: '600', color: colors.text },
  goalChipFreq: { fontSize: 11, color: colors.textSecondary },
  goalChipRate: { fontSize: 11, fontWeight: '700' },
  goalEndedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surface,
  },
  goalEndedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Review (한마디 / 회고)
  reviewHeaderRow: {
    ...ds.rowBetween,
    marginBottom: 8,
  },
  reviewText: { ...typography.body, color: colors.text, lineHeight: 20 },
  placeholder: { color: colors.textMuted },
});
