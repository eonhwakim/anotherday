import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import dayjs from '../../lib/dayjs';
import BaseCard from '../../components/ui/BaseCard';
import ReviewModal from '../../components/stats/ReviewModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  fetchMonthlyStatisticsSummary,
  fetchWeeklyStats,
  type MemberDetail,
  type MyGoalDetail,
  type WeeklyStatsResult,
  type WeeklyTeamMember,
} from '../../services/statsService';
import { fetchMyGoalsForRange } from '../../services/goalService';
import { saveMonthlyRetrospective } from '../../services/monthlyService';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import ScreenBackground from '../../components/ui/ScreenBackground';
import { colors, ds, radius, spacing, typography } from '../../design/recipes';
import type { UserGoal } from '../../types/domain';
import MyWeeklyStatistics from './MyWeeklyStatistics';
import TeamWeeklyStatistics from './TeamWeeklyStatistics';
import MyMonthlyStatistics from './MyMonthlyStatistics';
import TeamMonthlyStatistics from './TeamMonthlyStatistics';

type StatsScope = 'my' | 'team';
type StatsPeriod = 'monthly' | 'weekly';

export default function StatisticsScreen() {
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { user } = useAuthStore();
  const { currentTeam, fetchTeams } = useTeamStore();
  const { fetchTeamGoals, fetchMyGoals, teamGoals } = useGoalStore();

  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation: tabNavigation, scrollRef });

  const [activeScope, setActiveScope] = useState<StatsScope>('my');
  const [activeTab, setActiveTab] = useState<StatsPeriod>('weekly');
  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [weekStart, setWeekStart] = useState(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));

  const [myRate, setMyRate] = useState<number | null>(null);
  const [myPrevMonthRate, setMyPrevMonthRate] = useState<number | null>(null);
  const [myWeeklyRates, setMyWeeklyRates] = useState<{ week: number; rate: number | null; startDate: string; endDate: string }[]>([]);
  const [myGoalDetails, setMyGoalDetails] = useState<MyGoalDetail[]>([]);
  const [memberDetails, setMemberDetails] = useState<MemberDetail[]>([]);
  const [monthTotalDays, setMonthTotalDays] = useState<number>(0);
  const [teamRate, setTeamRate] = useState<number | null>(null);
  const [teamPrevRate, setTeamPrevRate] = useState<number | null>(null);
  const [mvpName, setMvpName] = useState<string | null>(null);

  const [weeklyTeamData, setWeeklyTeamData] = useState<WeeklyTeamMember[]>([]);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklyStatsResult['weeklyCheckins']>([]);
  const [myWeeklyGoalPeriods, setMyWeeklyGoalPeriods] = useState<UserGoal[]>([]);
  const [chartAnimationKey, setChartAnimationKey] = useState(0);
  const prevWeeklyScopeRef = useRef<StatsScope>(activeScope);
  const isFocused = useIsFocused();
  const weekStartRef = useRef(weekStart);

  useEffect(() => {
    weekStartRef.current = weekStart;
  }, [weekStart]);

  const [editReviewModalVisible, setEditReviewModalVisible] = useState(false);
  const [tempText, setTempText] = useState('');

  const goalNameMap = useMemo(
    () => new Map((teamGoals ?? []).map((goal) => [goal.id, goal.name])),
    [teamGoals],
  );

  const goToPrevMonth = () => {
    if (isMonthlyLoading) return;
    fetchMonthlyStats(dayjs(`${yearMonth}-01`).subtract(1, 'month').format('YYYY-MM'));
  };

  const goToNextMonth = () => {
    if (isMonthlyLoading) return;
    const nextMonth = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM');
    if (nextMonth <= dayjs().format('YYYY-MM')) fetchMonthlyStats(nextMonth);
  };

  const goToPrevWeek = () => {
    if (isWeeklyLoading) return;
    fetchWeeklyData(dayjs(weekStart).subtract(1, 'week').format('YYYY-MM-DD'));
  };
  const goToNextWeek = () => {
    if (isWeeklyLoading) return;
    fetchWeeklyData(dayjs(weekStart).add(1, 'week').format('YYYY-MM-DD'));
  };

  const canNext =
    dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM') <= dayjs().format('YYYY-MM');
  const monthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');
  const monthNum = dayjs(`${yearMonth}-01`).month() + 1;

  const loadStoreData = useCallback(async () => {
    if (!user) return;

    await fetchTeams(user.id);
    const team = useTeamStore.getState().currentTeam;

    if (team) {
      await Promise.all([fetchTeamGoals(team.id, user.id), fetchMyGoals(user.id)]);
      return;
    }

    await fetchMyGoals(user.id);
  }, [fetchMyGoals, fetchTeamGoals, fetchTeams, user]);

  const [isWeeklyLoading, setIsWeeklyLoading] = useState(false);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

  const fetchMonthlyStats = useCallback(async (targetYearMonth: string) => {
    if (!user) return;
    setIsMonthlyLoading(true);
    try {
      const summary = await fetchMonthlyStatisticsSummary({
        userId: user.id,
        yearMonth: targetYearMonth,
        teamId: useTeamStore.getState().currentTeam?.id,
      });

      setYearMonth(targetYearMonth);
      setMyRate(summary.myRate);
      setMyPrevMonthRate(summary.myPrevMonthRate);
      setMyWeeklyRates(summary.myWeeklyRates);
      setMyGoalDetails(summary.myGoalDetails as MyGoalDetail[]);
      setMemberDetails(summary.memberDetails as MemberDetail[]);
      setMonthTotalDays(summary.monthTotalDays);
      setTeamRate(summary.teamRate);
      setTeamPrevRate(summary.teamPrevRate);
      setMvpName(summary.mvpName);
    } catch (error) {
      console.error(error);
    } finally {
      setIsMonthlyLoading(false);
    }
  }, [user]);

  const fetchWeeklyData = useCallback(async (targetWeekStart: string) => {
    if (!user) return;
    setIsWeeklyLoading(true);

    const teamId = useTeamStore.getState().currentTeam?.id;
    if (!teamId) {
      setWeekStart(targetWeekStart);
      setWeeklyTeamData([]);
      setWeeklyCheckins([]);
      setMyWeeklyGoalPeriods([]);
      setIsWeeklyLoading(false);
      return;
    }

    try {
      const weekEnd = dayjs(targetWeekStart).endOf('isoWeek').format('YYYY-MM-DD');
      const liveGoalNameMap = new Map(
        (useGoalStore.getState().teamGoals ?? []).map((goal) => [goal.id, goal.name]),
      );
      const [weeklyStats, myGoalPeriods] = await Promise.all([
        fetchWeeklyStats({
          teamId,
          userId: user.id,
          weekStart: targetWeekStart,
          goalNameMap: liveGoalNameMap,
        }),
        fetchMyGoalsForRange(user.id, targetWeekStart, weekEnd),
      ]);

      setWeekStart(targetWeekStart);
      setWeeklyTeamData(weeklyStats.weeklyTeamData);
      setWeeklyCheckins(weeklyStats.weeklyCheckins);
      setMyWeeklyGoalPeriods(myGoalPeriods);
      setChartAnimationKey((prev) => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsWeeklyLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        await loadStoreData();
        if (!isActive) return;
        await Promise.all([fetchWeeklyData(weekStart), fetchMonthlyStats(yearMonth)]);
      };

      void load();

      return () => {
        isActive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadStoreData, fetchWeeklyData, fetchMonthlyStats]),
  );

  /** 통계 페이지 “진입 순간”에만 나의통계/주간/오늘 주차로 초기화 */
  useEffect(() => {
    if (!isFocused) return;

    // 팀/나의 전환이나 탭 전환 중에는 유지되어야 하므로 focus 될 때만 강제 리셋
    prevWeeklyScopeRef.current = 'my';
    setActiveScope('my');
    setActiveTab('weekly');
    const thisWeek = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
    if (weekStartRef.current !== thisWeek) {
      fetchWeeklyData(thisWeek);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  /** 나의 통계 ↔ 팀 통계 전환 시 같은 animationKey면 멤버 차트가 묻힌 느낌이 나서 키를 올려 재생 */
  useEffect(() => {
    if (activeTab !== 'weekly') {
      prevWeeklyScopeRef.current = activeScope;
      return;
    }
    if (prevWeeklyScopeRef.current !== activeScope) {
      setChartAnimationKey((k) => k + 1);
    }
    prevWeeklyScopeRef.current = activeScope;
  }, [activeScope, activeTab]);

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

      setMemberDetails((prev) =>
        prev.map((member) => (member.isMe ? { ...member, hoego: tempText } : member)),
      );
      setEditReviewModalVisible(false);
    } catch {
      Alert.alert('저장 실패', '회고 저장 중 오류가 발생했습니다.');
    }
  };

  const myMember = memberDetails.find((member) => member.isMe);

  const openEditReviewModal = useCallback(() => {
    setTempText(myMember?.hoego ?? '');
    setEditReviewModalVisible(true);
  }, [myMember]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={ds.pagePadding}>
            <View style={styles.header}>
              <Text style={ds.headerTitle}>통계</Text>
              <Text style={styles.subtitle}>
                월초와 월말의 부분주는 4일 미만이면 인접 월에 편입돼요.
              </Text>
            </View>

            <View style={styles.scopeTabRow}>
              <TouchableOpacity
                style={[styles.scopeTabButton, activeScope === 'my' && styles.scopeTabButtonActive]}
                onPress={() => setActiveScope('my')}
              >
                <Ionicons name="fitness-outline" size={18} color={colors.textSecondary} />
                <Text
                  style={[styles.scopeTabText, activeScope === 'my' && styles.scopeTabTextActive]}
                >
                  나의 통계
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scopeTabButton,
                  activeScope === 'team' && styles.scopeTabButtonActive,
                ]}
                onPress={() => setActiveScope('team')}
              >
                <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
                <Text
                  style={[styles.scopeTabText, activeScope === 'team' && styles.scopeTabTextActive]}
                >
                  팀 통계
                </Text>
              </TouchableOpacity>
            </View>

            <BaseCard
              style={styles.tabFrame}
              contentStyle={styles.tabContent}
              glassOnly
              padded={false}
            >
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'weekly' && styles.tabBtnActive]}
                onPress={() => setActiveTab('weekly')}
              >
                <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
                  주간
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'monthly' && styles.tabBtnActive]}
                onPress={() => setActiveTab('monthly')}
              >
                <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
                  월간
                </Text>
              </TouchableOpacity>
            </BaseCard>

            {activeScope === 'my' && activeTab === 'weekly' ? (
              <MyWeeklyStatistics
                userId={user?.id}
                weekStart={weekStart}
                onPrevWeek={goToPrevWeek}
                onNextWeek={goToNextWeek}
                chartAnimationKey={chartAnimationKey}
                weeklyCheckins={weeklyCheckins}
                myWeeklyGoalPeriods={myWeeklyGoalPeriods}
                goalNameMap={goalNameMap}
              />
            ) : null}

            {activeScope === 'my' && activeTab === 'monthly' ? (
              <MyMonthlyStatistics
                monthLabel={monthLabel}
                _monthNum={monthNum}
                canNext={canNext}
                onPrevMonth={goToPrevMonth}
                onNextMonth={goToNextMonth}
                _hasTeam={!!currentTeam}
                myRate={myRate}
                myPrevMonthRate={myPrevMonthRate}
                myWeeklyRates={myWeeklyRates}
                myGoalDetails={myGoalDetails}
                myMember={myMember}
                _onEditReview={openEditReviewModal}
                monthTotalDays={monthTotalDays}
              />
            ) : null}

            {activeScope === 'team' && activeTab === 'weekly' ? (
              <TeamWeeklyStatistics
                _userId={user?.id}
                myNickname={user?.nickname ?? undefined}
                _myProfileImageUrl={user?.profile_image_url ?? null}
                weekStart={weekStart}
                onPrevWeek={goToPrevWeek}
                onNextWeek={goToNextWeek}
                chartAnimationKey={chartAnimationKey}
                weeklyTeamData={weeklyTeamData}
                weeklyCheckins={weeklyCheckins}
                _myWeeklyGoalPeriods={myWeeklyGoalPeriods}
                _goalNameMap={goalNameMap}
                hasTeam={!!currentTeam}
              />
            ) : null}

            {activeScope === 'team' && activeTab === 'monthly' ? (
              <TeamMonthlyStatistics
                monthLabel={monthLabel}
                monthNum={monthNum}
                canNext={canNext}
                onPrevMonth={goToPrevMonth}
                onNextMonth={goToNextMonth}
                hasTeam={!!currentTeam}
                memberDetails={memberDetails}
                teamRate={teamRate}
                teamPrevRate={teamPrevRate}
                mvpName={mvpName}
                monthTotalDays={monthTotalDays}
              />
            ) : null}

            <View style={styles.bottomSpace} />
          </View>
        </ScrollView>

        <ReviewModal
          visible={editReviewModalVisible}
          value={tempText}
          onChangeText={setTempText}
          onClose={() => setEditReviewModalVisible(false)}
          onSave={saveReview}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },

  scopeTabRow: {
    flexDirection: 'row',
    gap: spacing[5],
    marginBottom: spacing[4],
    paddingHorizontal: spacing[1],
  },
  scopeTabButton: {
    paddingBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  scopeTabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  scopeTabText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  scopeTabTextActive: {
    color: colors.text,
    fontWeight: '800',
  },

  tabFrame: {
    marginBottom: spacing[4],
    borderRadius: radius.xxl,
  },
  tabContent: {
    flexDirection: 'row',
    padding: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.xxl,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 40,
  },
});
