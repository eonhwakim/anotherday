import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/defaults';
import dayjs from '../../lib/dayjs';
import CyberFrame from '../ui/CyberFrame';
import { dayjsMax, dayjsMin, getCalendarWeekRanges } from './StatsShared';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';

export default function WeeklyStatsTab() {
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const { teamGoals, myGoals } = useGoalStore();

  const [weekStart, setWeekStart] = useState(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));
  const [weeklyTeamData, setWeeklyTeamData] = useState<any[]>([]);
  const [weeklyCheckins, setWeeklyCheckins] = useState<any[]>([]);

  const allGoalMap = useMemo(() => {
    const m = new Map<string, string>();
    (teamGoals ?? []).forEach(g => m.set(g.id, g.name));
    return m;
  }, [teamGoals]);

  const fetchWeeklyData = useCallback(async () => {
    if (!user || !currentTeam) return;
    try {
      const wEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');

      // 1. 팀 멤버 가져오기
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, users(nickname, profile_image_url)')
        .eq('team_id', currentTeam.id);
      
      const memberIds = (members ?? []).map((m: any) => m.user_id);

      if (memberIds.length > 0) {
        // 2. 이번 주 팀원들의 체크인 가져오기
        const { data: teamCheckins } = await supabase
          .from('checkins')
          .select('user_id, goal_id, status, date')
          .in('user_id', memberIds)
          .gte('date', weekStart)
          .lte('date', wEnd);
        
        setWeeklyCheckins(teamCheckins ?? []);

        // 3. 팀원들의 목표(user_goals) 가져오기
        const { data: teamUserGoals } = await supabase
          .from('user_goals')
          .select('user_id, goal_id, frequency, target_count, start_date, end_date')
          .in('user_id', memberIds)
          .eq('is_active', true);

        // 4. 팀원별 올클리어 / 미달 계산
        const processed = (members ?? []).map((m: any) => {
          const uid = m.user_id;
          const uCheckins = (teamCheckins ?? []).filter((c: any) => c.user_id === uid && c.status === 'done');
          const uGoals = (teamUserGoals ?? []).filter((g: any) => g.user_id === uid);

          // 유효한 목표 필터링 (이번 주에 겹치는지)
          const activeGoals = uGoals.filter((ug: any) => {
            if (ug.start_date && ug.start_date > wEnd) return false;
            if (ug.end_date && ug.end_date < weekStart) return false;
            return true;
          });

          let totalGoals = 0;
          let failedGoals = 0;

          activeGoals.forEach((ug: any) => {
            const isDaily = ug.frequency === 'daily';
            let target = isDaily ? 7 : (ug.target_count || 1);
            
            if (isDaily) {
              let effS = dayjsMax(dayjs(weekStart), dayjs(ug.start_date || weekStart));
              let effE = dayjsMin(dayjs(wEnd), dayjs(ug.end_date || wEnd));
              if (effS.isAfter(effE)) target = 0;
              else target = effE.diff(effS, 'day') + 1;
            }

            if (target > 0) {
              totalGoals++;
              const doneCount = uCheckins.filter((c: any) => c.goal_id === ug.goal_id).length;
              if (doneCount < target) {
                failedGoals++;
              }
            }
          });

          const isAllClear = totalGoals > 0 && failedGoals === 0;

          return {
            userId: uid,
            nickname: m.users?.nickname || '알 수 없음',
            doneCount: uCheckins.length,
            isMe: uid === user.id,
            totalGoals,
            failedGoals,
            isAllClear
          };
        }).sort((a, b) => {
          // 1순위: 올클리어 여부
          if (a.isAllClear && !b.isAllClear) return -1;
          if (!a.isAllClear && b.isAllClear) return 1;
          // 2순위: 미달 개수 적은 순
          if (a.failedGoals !== b.failedGoals) return a.failedGoals - b.failedGoals;
          // 3순위: 인증 횟수 많은 순
          if (b.doneCount !== a.doneCount) return b.doneCount - a.doneCount;
          // 4순위: 나를 위로
          if (a.isMe) return -1;
          if (b.isMe) return 1;
          return 0;
        });

        setWeeklyTeamData(processed);
      } else {
        setWeeklyTeamData([]);
        setWeeklyCheckins([]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user, currentTeam, weekStart]);

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
    const idx = ranges.findIndex(r => r.s.format('YYYY-MM-DD') === weekStart);
    const weekOfMonth = idx >= 0 ? idx + 1 : 1;

    const monthNum = ownerMonth.month() + 1;
    return {
      week: `${monthNum}월 ${weekOfMonth}주차`,
      range: `${s.format('M.D')} ~ ${e.format('M.D')}`,
    };
  }, [weekStart]);

  const myWeeklyGoals = useMemo(() => {
    if (!myGoals || !user) return [];
    const wEnd = dayjs(weekStart).endOf('isoWeek').format('YYYY-MM-DD');
    
    const activeGoals = myGoals.filter(ug => {
      if (ug.start_date && ug.start_date > wEnd) return false;
      if (ug.end_date && ug.end_date < weekStart) return false;
      return true;
    });

    const myCks = weeklyCheckins.filter(c => c.user_id === user.id);

    return activeGoals.map(ug => {
      const isDaily = ug.frequency === 'daily';
      let target = isDaily ? 7 : (ug.target_count || 1);
      
      if (isDaily) {
        let effS = dayjsMax(dayjs(weekStart), dayjs(ug.start_date || weekStart));
        let effE = dayjsMin(dayjs(wEnd), dayjs(ug.end_date || wEnd));
        if (effS.isAfter(effE)) target = 0;
        else target = effE.diff(effS, 'day') + 1;
      }

      const doneCks = myCks.filter(c => c.goal_id === ug.goal_id && c.status === 'done');
      const doneCount = doneCks.length;
      const isAchieved = target > 0 && doneCount >= target;

      return {
        goalId: ug.goal_id,
        name: allGoalMap.get(ug.goal_id) ?? '목표',
        target,
        doneCount,
        isAchieved,
        isDaily
      };
    }).filter(g => g.target > 0);
  }, [myGoals, user, weekStart, weeklyCheckins, allGoalMap]);

  const isAllClear = myWeeklyGoals.length > 0 && myWeeklyGoals.every(g => g.isAchieved);

  const isWeekEnded = dayjs(weekStart).endOf('isoWeek').isBefore(dayjs(), 'day');

  return (
    <View style={s.container}>
      {/* ── 주 선택 ── */}
      <View style={s.monthRow}>
        <TouchableOpacity style={s.monthBtn} onPress={() => setWeekStart(p => dayjs(p).subtract(1, 'week').format('YYYY-MM-DD'))}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primaryLight} />
        </TouchableOpacity>
        <View style={s.weekLabelBox}>
          <Text style={s.weekLabelMain}>{weekLabelParts.week}</Text>
          <Text style={s.weekLabelSub}>{weekLabelParts.range}</Text>
        </View>
        <TouchableOpacity style={s.monthBtn} onPress={() => setWeekStart(p => dayjs(p).add(1, 'week').format('YYYY-MM-DD'))}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.primaryLight} />
        </TouchableOpacity>
      </View>

      {/* ═══ 나의 주간 목표 ═══ */}
      <Text style={s.sectionTitle}>나의 주간 목표</Text>
      <View style={s.weeklyGoalsContainer}>
        {isAllClear ? (
          <CyberFrame glassOnly={true} style={s.allClearBox} contentStyle={s.allClearBoxContent}>
            <Text style={s.allClearEmoji}>🏆</Text>
            <Text style={s.allClearTitle}>이번 주 올클리어 달성!</Text>
            <Text style={s.allClearSub}>모든 목표를 완벽하게 해냈어요</Text>
          </CyberFrame>
        ) : null}

        {myWeeklyGoals.length === 0 ? (
          <CyberFrame style={s.cardFrame} contentStyle={s.cardContent}>
            <Text style={s.emptySmall}>이번 주 진행 중인 목표가 없어요</Text>
          </CyberFrame>
        ) : (
          <CyberFrame style={s.weeklyGoalList}>
            {myWeeklyGoals.map(g => (
              <CyberFrame key={g.goalId} glassOnly={true} style={s.weeklyGoalItemFrame} contentStyle={s.weeklyGoalItemContent}>
                <View>
                  <Text style={s.weeklyGoalName}>{g.name}</Text>
                  <Text style={s.weeklyGoalTarget}>{g.isDaily ? '매일' : `주 ${g.target}회`}</Text>
                </View>
                <View style={s.weeklyGoalStatus}>
                  <Text style={s.weeklyGoalCount}>
                    <Text style={ g.isAchieved ? { color: '#15803d' } : { color: '#EF4444' }}>{g.doneCount}</Text>
                    <Text style={{ color: '#888' }}> / {g.target}</Text>
                  </Text>
                  {g.isAchieved
                    ? <Ionicons name="checkmark-circle" size={20} color={'#4ADE80'} />
                    : isWeekEnded
                      ? <Ionicons name="close-circle" size={20} color={'#EF4444'} />
                      : ''
                  }
                </View>
              </CyberFrame>
            ))}
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
                    <View style={s.teamMemberRank}>
                      <Text style={s.teamMemberRankText}>{idx + 1}</Text>
                    </View>
                    <View style={s.teamMemberNameBox}>
                      <Text style={[s.teamMemberName, m.isMe && s.teamMemberNameMe]}>
                        {m.nickname} {m.isMe && '(나)'}
                      </Text>
                      <Text style={s.teamMemberSubText}>총 목표 {m.totalGoals}개</Text>
                    </View>
                    <View style={s.teamMemberScore}>
                      {m.totalGoals === 0 ? (
                        <Text style={s.teamMemberScoreTextGray}>목표 없음</Text>
                      ) : m.isAllClear ? (
                        <View style={s.teamMemberBadgeClear}>
                          <Text style={s.teamMemberBadgeTextClear}>🏆 올클리어</Text>
                        </View>
                      ) : !isWeekEnded ? (
                        <View style={s.teamMemberBadgeProgress}>
                          <Text style={[s.teamMemberBadgeTextProgress, { color: 'rgba(26,26,26,0.45)' }]}>아직 진행중</Text>
                        </View>
                      ) : (
                        <View style={s.teamMemberBadgeProgress}>
                          <Text style={s.teamMemberBadgeTextProgress}>
                            <Text style={{ color: '#15803d' }}>{m.totalGoals - m.failedGoals}개 완료</Text>
                            <Text style={{ color: 'rgba(26,26,26,0.2)' }}> | </Text>
                            <Text style={{ color: '#EF4444' }}>{m.failedGoals}개 미달</Text>
                          </Text>
                        </View>
                      )}
                    </View>
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
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 16 },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', minWidth: 120, textAlign: 'center' },
  weekLabelBox: { alignItems: 'center', minWidth: 140 },
  weekLabelMain: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  weekLabelSub: { fontSize: 12, color: '#888', marginTop: 2 },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginHorizontal: 16, marginBottom: 4, marginTop: 28 },

  // Card
  cardFrame: { marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  cardContent: { padding: 14 },

  // Empty
  emptySmall: { fontSize: 13, color: 'rgba(26,26,26,0.30)', textAlign: 'center', paddingVertical: 16 },

  // Weekly UI
  allClearBox: { backgroundColor: 'rgba(74, 222, 128, 0.15)', borderRadius: 12, marginBottom: 16 },
  allClearBoxContent: { padding: 16, alignItems: 'center' },
  allClearEmoji: { fontSize: 32, marginBottom: 8 },
  allClearTitle: { fontSize: 18, fontWeight: '800', color: '#15803d', marginBottom: 4 },
  allClearSub: { fontSize: 13, color: '#166534' },

  weeklyGoalsContainer: { marginHorizontal: 16, marginTop: 8 },
  weeklyGoalList: { padding: 0 },
  weeklyGoalItemFrame: { borderRadius: 12, marginBottom: 12 },
  weeklyGoalItemContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  weeklyGoalName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  weeklyGoalTarget: { fontSize: 12, color: 'rgba(26,26,26,0.5)' },
  weeklyGoalStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weeklyGoalCount: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

  teamMemberList: { gap: 4 },
  teamMemberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  teamMemberRank: { width: 28, alignItems: 'center' },
  teamMemberRankText: { fontSize: 14, fontWeight: '700', color: 'rgba(26,26,26,0.4)' },
  teamMemberNameBox: { flex: 1, paddingHorizontal: 8 },
  teamMemberName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  teamMemberNameMe: { color: '#FF6B3D', fontWeight: '800' },
  teamMemberSubText: { fontSize: 12, color: 'rgba(26,26,26,0.45)' },
  teamMemberScore: { alignItems: 'flex-end' },
  teamMemberBadgeClear: { backgroundColor: 'rgba(74,222,128,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  teamMemberBadgeTextClear: { fontSize: 13, fontWeight: '700', color: '#15803d' },
  teamMemberBadgeProgress: { backgroundColor: 'rgba(26,26,26,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  teamMemberBadgeTextProgress: { fontSize: 12, fontWeight: '600' },
  teamMemberScoreTextGray: { fontSize: 12, fontWeight: '500', color: 'rgba(26,26,26,0.4)' },
});
