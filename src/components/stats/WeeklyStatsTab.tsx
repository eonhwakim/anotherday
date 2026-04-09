import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import CyberFrame from '../ui/CyberFrame';
import { dayjsMax, dayjsMin, getCalendarWeekRanges } from '../../lib/statsUtils';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import type { UserGoal } from '../../types/domain';
import {
  fetchWeeklyStats,
  type WeeklyTeamMember,
  type WeeklyStatsResult,
} from '../../services/statsService';
import { fetchMyGoalsForRange } from '../../services/goalService';

function endedDateLabel(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).format('M.D')} ~ ${dayjs(endDate).format('M.D')}`;
}

export default function WeeklyStatsTab() {
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const { teamGoals } = useGoalStore();

  const [weekStart, setWeekStart] = useState(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));
  const [weeklyTeamData, setWeeklyTeamData] = useState<WeeklyTeamMember[]>([]);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklyStatsResult['weeklyCheckins']>([]);
  const [myWeeklyGoalPeriods, setMyWeeklyGoalPeriods] = useState<UserGoal[]>([]);

  const allGoalMap = useMemo(() => {
    const m = new Map<string, string>();
    (teamGoals ?? []).forEach((g) => m.set(g.id, g.name));
    return m;
  }, [teamGoals]);

  const fetchWeeklyData = useCallback(async () => {
    if (!user || !currentTeam) return;
    try {
      const weekEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');
      const result = await fetchWeeklyStats({
        teamId: currentTeam.id,
        userId: user.id,
        weekStart,
        goalNameMap: allGoalMap,
      });
      const myGoalPeriods = await fetchMyGoalsForRange(user.id, weekStart, weekEnd);
      setWeeklyTeamData(result.weeklyTeamData);
      setWeeklyCheckins(result.weeklyCheckins);
      setMyWeeklyGoalPeriods(myGoalPeriods);
    } catch (e) {
      console.error(e);
    }
  }, [user, currentTeam, weekStart, allGoalMap]);

  React.useEffect(() => {
    fetchWeeklyData();
  }, [weekStart, fetchWeeklyData]);

  const weekLabelParts = useMemo(() => {
    const s = dayjs(weekStart);
    const e = s.add(6, 'day');

    // 이 주가 속한 월 결정: 주 내 시작월 날짜가 4일 미만이면 다음 달에 편입
    const endOfStartMonth = s.endOf('month');
    const daysInStartMonth = Math.min(endOfStartMonth.diff(s, 'day') + 1, 7);
    const ownerMonth = daysInStartMonth >= 4 ? s : e;
    const monthStr = ownerMonth.format('YYYY-MM');

    // 해당 월의 캘린더 주차 배열에서 이 weekStart의 인덱스를 찾음
    const { ranges } = getCalendarWeekRanges(monthStr);
    const idx = ranges.findIndex((r) => r.s.format('YYYY-MM-DD') === weekStart);
    const weekOfMonth = idx >= 0 ? idx + 1 : 1;

    const monthNum = ownerMonth.month() + 1;
    return {
      week: `${monthNum}월 ${weekOfMonth}주차`,
      range: `${s.format('M.D')} ~ ${e.format('M.D')}`,
    };
  }, [weekStart]);

  const myWeeklyGoals = useMemo(() => {
    if (!myWeeklyGoalPeriods || !user) return [];
    const wEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');

    const activeGoals = myWeeklyGoalPeriods.filter((ug) => {
      if (ug.start_date && ug.start_date > wEnd) return false;
      if (ug.end_date && ug.end_date < weekStart) return false;
      return true;
    });

    const myCks = weeklyCheckins.filter((c) => c.user_id === user.id);

    return activeGoals
      .map((ug) => {
        const isDaily = ug.frequency === 'daily';
        let target = isDaily ? 7 : ug.target_count || 1;

        if (isDaily) {
          let effS = dayjsMax(dayjs(weekStart), dayjs(ug.start_date || weekStart));

          let effE = dayjsMin(dayjs(wEnd), dayjs(ug.end_date || wEnd));
          if (effS.isAfter(effE)) target = 0;
          else target = effE.diff(effS, 'day') + 1;
        }

        const doneCks = myCks.filter((c) => c.goal_id === ug.goal_id && c.status === 'done');
        const doneCount = doneCks.length;
        const isAchieved = target > 0 && doneCount >= target;

        return {
          goalId: ug.goal_id,
          name: allGoalMap.get(ug.goal_id) ?? '루틴',
          target,
          doneCount,
          isAchieved,
          isDaily,
          isEnded: ug.is_active === false || (!!ug.end_date && ug.end_date <= wEnd),
          startDate: ug.start_date ?? null,
          endDate: ug.end_date ?? null,
        };
      })
      .filter((g) => g.target > 0);
  }, [myWeeklyGoalPeriods, user, weekStart, weeklyCheckins, allGoalMap]);

  const isAllClear = myWeeklyGoals.length > 0 && myWeeklyGoals.every((g) => g.isAchieved);
  const myTotalGoals = myWeeklyGoals.length;
  const myFailedGoals = myWeeklyGoals.filter((g) => !g.isAchieved).length;

  const isWeekEnded = dayjs(weekStart).endOf('isoWeek').isBefore(dayjs(), 'day');

  return (
    <View style={s.container}>
      {/* ── 주 선택 ── */}
      <View style={s.monthRow}>
        <TouchableOpacity
          style={s.monthBtn}
          onPress={() => setWeekStart((p) => dayjs(p).subtract(1, 'week').format('YYYY-MM-DD'))}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={s.weekLabelBox}>
          <Text style={s.weekLabelMain}>{weekLabelParts.week}</Text>
          <Text style={s.weekLabelSub}>{weekLabelParts.range}</Text>
        </View>
        <TouchableOpacity
          style={s.monthBtn}
          onPress={() => setWeekStart((p) => dayjs(p).add(1, 'week').format('YYYY-MM-DD'))}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {/* ═══ 나의 주간 목표 ═══ */}
      <Text style={s.sectionTitle}>나의 주간 루틴</Text>
      <View style={s.weeklyGoalsContainer}>
        {isAllClear ? (
          <CyberFrame glassOnly={true} style={s.allClearBox} contentStyle={s.allClearBoxContent}>
            <Text style={s.allClearEmoji}>🏆</Text>
            <Text style={s.allClearTitle}>이번 주 올클리어 달성!</Text>
            <Text style={s.allClearSub}>모든 루틴을 완벽하게 해냈어요</Text>
          </CyberFrame>
        ) : null}

        {myWeeklyGoals.length === 0 ? (
          <CyberFrame style={s.myCardFrame} contentStyle={s.cardContent}>
            <Text style={s.emptySmall}>이번 주 진행 중인 루틴이 없어요</Text>
          </CyberFrame>
        ) : (
          <CyberFrame style={s.myCardFrame} contentStyle={s.cardContent}>
            <View style={s.teamMemberItem}>
              {/* 상단: 요약 정보 (나) */}
              <View style={s.teamMemberHeaderRow}>
                <View style={s.teamMemberNameBox}>
                  <Text style={[s.teamMemberName, s.teamMemberNameMe]}>나의 달성 현황</Text>
                  <Text style={s.teamMemberSubText}>총 루틴 {myTotalGoals}개</Text>
                </View>
                <View style={s.teamMemberScore}>
                  {isAllClear ? (
                    <View style={s.teamMemberBadgeClear}>
                      <Text style={s.teamMemberBadgeTextClear}>🏆 올클리어</Text>
                    </View>
                  ) : !isWeekEnded ? (
                    <View style={s.teamMemberBadgeProgress}>
                      <Text
                        style={[s.teamMemberBadgeTextProgress, { color: 'rgba(26,26,26,0.45)' }]}
                      >
                        아직 진행중
                      </Text>
                    </View>
                  ) : (
                    <View style={s.teamMemberBadgeProgress}>
                      <Text style={s.teamMemberBadgeTextProgress}>
                        <Text style={{ color: '#15803d' }}>
                          {myTotalGoals - myFailedGoals}개 완료
                        </Text>
                        <Text style={{ color: 'rgba(26,26,26,0.2)' }}> | </Text>
                        <Text style={{ color: '#EF4444' }}>{myFailedGoals}개 미달</Text>
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 하단: 나의 상세 목표 리스트 */}
              <View style={[s.teamMemberGoalList, { paddingLeft: 0 }]}>
                {myWeeklyGoals.map((g) => (
                  <View key={g.goalId} style={s.teamMemberGoalRow}>
                    <View style={s.teamMemberGoalInfo}>
                      <Text style={s.teamMemberGoalName} numberOfLines={1}>
                        ∙ {g.name}
                      </Text>
                      <Text style={s.teamMemberGoalTarget}>
                        {g.isDaily ? '매일' : `주 ${g.target}회`}
                      </Text>
                    </View>
                    <View style={s.teamMemberGoalStatus}>
                      {g.isEnded ? (
                        <>
                          <Text style={s.teamMemberGoalEndedDate}>
                            {endedDateLabel(g.startDate, g.endDate)}
                          </Text>
                          <View style={[s.badge, s.badgeEnded]}>
                            <Text style={[s.badgeText, s.badgeTextEnded]}>종료됨</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={s.teamMemberGoalCount}>
                            <Text
                              style={g.isAchieved ? { color: '#15803d' } : { color: '#EF4444' }}
                            >
                              {g.doneCount}
                            </Text>
                            <Text style={{ color: '#888' }}> / {g.target}</Text>
                          </Text>
                          {g.isAchieved ? (
                            <View style={[s.badge, s.badgeSuccess]}>
                              <Text style={s.badgeText}>완료</Text>
                            </View>
                          ) : isWeekEnded ? (
                            <View style={[s.badge, s.badgeMissed]}>
                              <Text style={s.badgeText}>미달</Text>
                            </View>
                          ) : (
                            <View style={[s.badge, s.badgeInProgress]}>
                              <Text style={[s.badgeText, { color: 'rgba(26,26,26,0.45)' }]}>
                                집계중
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </CyberFrame>
        )}
      </View>

      {/* ═══ 팀원들의 주간 현황 ═══ */}
      {currentTeam && (
        <>
          <Text style={s.sectionTitle}>팀원들의 주간 현황</Text>
          <CyberFrame style={s.cardFrame} contentStyle={s.cardContent}>
            {weeklyTeamData.length === 0 ? (
              <Text style={s.emptySmall}>팀원 데이터가 없습니다</Text>
            ) : (
              <View style={s.teamMemberList}>
                {weeklyTeamData.map((m, idx) => (
                  <View key={m.userId} style={s.teamMemberItem}>
                    {/* 상단: 랭킹 및 요약 정보 */}
                    <View style={s.teamMemberHeaderRow}>
                      <View style={s.teamMemberRank}>
                        <Text style={s.teamMemberRankText}>{idx + 1}</Text>
                      </View>
                      <View style={s.teamMemberNameBox}>
                        <Text style={[s.teamMemberName, m.isMe && s.teamMemberNameMe]}>
                          {m.nickname} {m.isMe && '(나)'}
                        </Text>
                        <Text style={s.teamMemberSubText}>총 루틴 {m.totalGoals}개</Text>
                      </View>
                      <View style={s.teamMemberScore}>
                        {m.totalGoals === 0 ? (
                          <Text style={s.teamMemberScoreTextGray}>루틴 없음</Text>
                        ) : m.isAllClear ? (
                          <View style={s.teamMemberBadgeClear}>
                            <Text style={s.teamMemberBadgeTextClear}>🏆 올클리어</Text>
                          </View>
                        ) : !isWeekEnded ? (
                          <View style={s.teamMemberBadgeProgress}>
                            <Text
                              style={[
                                s.teamMemberBadgeTextProgress,
                                { color: 'rgba(26,26,26,0.45)' },
                              ]}
                            >
                              아직 진행중
                            </Text>
                          </View>
                        ) : (
                          <View style={s.teamMemberBadgeProgress}>
                            <Text style={s.teamMemberBadgeTextProgress}>
                              <Text style={{ color: '#15803d' }}>
                                {m.totalGoals - m.failedGoals}개 완료
                              </Text>
                              <Text style={{ color: 'rgba(26,26,26,0.2)' }}> | </Text>
                              <Text style={{ color: '#EF4444' }}>{m.failedGoals}개 미달</Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* 하단: 팀원의 상세 목표 리스트 */}
                    {m.goals && m.goals.length > 0 && (
                      <View style={s.teamMemberGoalList}>
                        {m.goals.map((g) => (
                          <View key={g.goalId} style={s.teamMemberGoalRow}>
                            <View style={s.teamMemberGoalInfo}>
                              <Text style={s.teamMemberGoalName} numberOfLines={1}>
                                ∙ {g.name}
                              </Text>
                              <Text style={s.teamMemberGoalTarget}>
                                {g.isDaily ? '매일' : `주 ${g.target}회`}
                              </Text>
                            </View>
                            <View style={s.teamMemberGoalStatus}>
                              {g.isEnded ? (
                                <>
                                  <Text style={s.teamMemberGoalEndedDate}>
                                    {endedDateLabel(g.startDate, g.endDate)}
                                  </Text>
                                  <View style={[s.badge, s.badgeEnded]}>
                                    <Text style={[s.badgeText, s.badgeTextEnded]}>종료됨</Text>
                                  </View>
                                </>
                              ) : (
                                <>
                                  <Text style={s.teamMemberGoalCount}>
                                    <Text
                                      style={
                                        g.isAchieved ? { color: '#15803d' } : { color: '#888' }
                                      }
                                    >
                                      {g.doneCount}
                                    </Text>
                                    <Text style={{ color: '#888' }}> / {g.target}</Text>
                                  </Text>
                                  {g.isAchieved ? (
                                    <View style={[s.badge, s.badgeSuccess]}>
                                      <Text style={s.badgeText}>완료</Text>
                                    </View>
                                  ) : isWeekEnded ? (
                                    <View style={[s.badge, s.badgeMissed]}>
                                      <Text style={s.badgeText}>미달</Text>
                                    </View>
                                  ) : (
                                    <View style={[s.badge, s.badgeInProgress]}>
                                      <Text style={[s.badgeText, { color: 'rgba(26,26,26,0.45)' }]}>
                                        집계중
                                      </Text>
                                    </View>
                                  )}
                                </>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </CyberFrame>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  // Month Selector (reused for Week Selector)
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  monthBtn: { padding: 8 },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 120,
    textAlign: 'center',
  },
  weekLabelBox: { alignItems: 'center', minWidth: 140 },
  weekLabelMain: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  weekLabelSub: { fontSize: 12, color: '#888', marginTop: 2 },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 28,
  },

  // Card
  myCardFrame: { borderRadius: 12 },
  cardFrame: { marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  cardContent: { padding: 14 },

  // Empty
  emptySmall: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.30)',
    textAlign: 'center',
    paddingVertical: 16,
  },

  // Weekly UI
  allClearBox: { backgroundColor: 'rgba(74, 222, 128, 0.15)', borderRadius: 12, marginBottom: 4 },
  allClearBoxContent: { padding: 16, alignItems: 'center' },
  allClearEmoji: { fontSize: 32, marginBottom: 8 },
  allClearTitle: { fontSize: 18, fontWeight: '800', color: '#15803d', marginBottom: 4 },
  allClearSub: { fontSize: 13, color: '#166534' },

  weeklyGoalsContainer: { marginHorizontal: 16, marginTop: 8 },
  weeklyGoalList: { padding: 0 },
  weeklyGoalItemFrame: { borderRadius: 12, marginBottom: 12 },
  weeklyGoalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  weeklyGoalName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  weeklyGoalTarget: { fontSize: 12, color: 'rgba(26,26,26,0.5)' },
  weeklyGoalStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weeklyGoalCount: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

  teamMemberList: { gap: 12 },
  teamMemberItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  teamMemberHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  teamMemberRank: { width: 28, alignItems: 'center' },
  teamMemberRankText: { fontSize: 14, fontWeight: '700', color: 'rgba(26,26,26,0.4)' },
  teamMemberNameBox: { flex: 1, paddingHorizontal: 8 },
  teamMemberName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  teamMemberNameMe: { color: '#FF6B3D', fontWeight: '800' },
  teamMemberSubText: { fontSize: 12, color: 'rgba(26,26,26,0.45)' },
  teamMemberScore: { alignItems: 'flex-end' },
  teamMemberBadgeClear: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  teamMemberBadgeTextClear: { fontSize: 13, fontWeight: '700', color: '#15803d' },
  teamMemberBadgeProgress: {
    backgroundColor: 'rgba(26,26,26,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  teamMemberBadgeTextProgress: { fontSize: 12, fontWeight: '600' },
  teamMemberScoreTextGray: { fontSize: 12, fontWeight: '500', color: 'rgba(26,26,26,0.4)' },
  teamMemberGoalList: {
    paddingLeft: 36, // 랭크 너비만큼 들여쓰기
    marginTop: 4,
    gap: 8,
  },
  teamMemberGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', // 살짝 밝은 회색으로 변경 (리스트 내부)
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    padding: 10,
    borderRadius: 8,
  },
  teamMemberGoalInfo: {
    flex: 1,
    paddingRight: 8,
  },
  teamMemberGoalName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  teamMemberGoalTarget: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.5)',
    marginLeft: 8,
  },
  teamMemberGoalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamMemberGoalCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  teamMemberGoalEndedDate: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.45)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.43)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  badgeMissed: {
    backgroundColor: 'rgba(255, 68, 58, 0.35)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  badgeInProgress: {
    backgroundColor: 'rgba(26,26,26,0.03)',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  badgeEnded: {
    backgroundColor: 'rgba(26,26,26,0.03)',
    borderColor: 'rgba(0,0,0,0.08)',
  },
  badgeTextEnded: {
    color: 'rgba(26,26,26,0.55)',
  },
});
