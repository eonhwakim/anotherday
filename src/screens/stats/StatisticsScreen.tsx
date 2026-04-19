import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { handleServiceError } from '../../lib/serviceError';
import dayjs from '../../lib/dayjs';
import BaseCard from '../../components/ui/BaseCard';
import ReviewModal from '../../components/stats/ReviewModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import ScreenBackground from '../../components/ui/ScreenBackground';
import { colors, ds, radius, spacing, typography } from '../../design/recipes';
import { useTeamGoalsQuery } from '../../queries/goalQueries';
import { useSaveMonthlyRetrospectiveMutation } from '../../queries/monthlyMutations';
import {
  useMonthlyStatisticsSummaryQuery,
  useWeeklyStatisticsBundleQuery,
} from '../../queries/statsQueries';
import MyWeeklyStatistics from './MyWeeklyStatistics';
import TeamWeeklyStatistics from './TeamWeeklyStatistics';
import MyMonthlyStatistics from './MyMonthlyStatistics';
import TeamMonthlyStatistics from './TeamMonthlyStatistics';

type StatsScope = 'my' | 'team';
type StatsPeriod = 'monthly' | 'weekly';

export default function StatisticsScreen() {
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const saveMonthlyRetrospectiveMutation = useSaveMonthlyRetrospectiveMutation();
  const { data: teamGoals = [], refetch: refetchTeamGoals } = useTeamGoalsQuery(
    currentTeam?.id ?? '',
    user?.id,
  );

  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation: tabNavigation, scrollRef });

  const [activeScope, setActiveScope] = useState<StatsScope>('my');
  const [activeTab, setActiveTab] = useState<StatsPeriod>('weekly');
  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [weekStart, setWeekStart] = useState(dayjs().startOf('isoWeek').format('YYYY-MM-DD'));
  const isFocused = useIsFocused();
  const weekStartRef = useRef(weekStart);

  useEffect(() => {
    weekStartRef.current = weekStart;
  }, [weekStart]);

  const [editReviewModalVisible, setEditReviewModalVisible] = useState(false);
  const [tempText, setTempText] = useState('');

  const monthlySummaryQuery = useMonthlyStatisticsSummaryQuery(
    user?.id,
    yearMonth,
    currentTeam?.id,
  );
  const weeklyBundleQuery = useWeeklyStatisticsBundleQuery({
    userId: user?.id,
    teamId: currentTeam?.id,
    weekStart,
    teamGoals,
  });

  const myRate = monthlySummaryQuery.data?.myRate ?? null;
  const myPrevMonthRate = monthlySummaryQuery.data?.myPrevMonthRate ?? null;
  const myWeeklyRates = monthlySummaryQuery.data?.myWeeklyRates ?? [];
  const myGoalDetails = monthlySummaryQuery.data?.myGoalDetails ?? [];
  const memberDetails = monthlySummaryQuery.data?.memberDetails ?? [];
  const monthTotalDays = monthlySummaryQuery.data?.monthTotalDays ?? 0;
  const teamRate = monthlySummaryQuery.data?.teamRate ?? null;
  const teamPrevRate = monthlySummaryQuery.data?.teamPrevRate ?? null;
  const mvpName = monthlySummaryQuery.data?.mvpName ?? null;
  const weeklyTeamData = weeklyBundleQuery.data?.weeklyTeamData ?? [];
  const weeklyCheckins = weeklyBundleQuery.data?.weeklyCheckins ?? [];
  const myWeeklyGoalPeriods = weeklyBundleQuery.data?.myWeeklyGoalPeriods ?? [];

  const goalNameMap = useMemo(
    () => new Map((teamGoals ?? []).map((goal) => [goal.id, goal.name])),
    [teamGoals],
  );

  const goToPrevMonth = () => {
    if (monthlySummaryQuery.isFetching) return;
    setYearMonth(dayjs(`${yearMonth}-01`).subtract(1, 'month').format('YYYY-MM'));
  };

  const goToNextMonth = () => {
    if (monthlySummaryQuery.isFetching) return;
    const nextMonth = dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM');
    if (nextMonth <= dayjs().format('YYYY-MM')) setYearMonth(nextMonth);
  };

  const goToPrevWeek = () => {
    if (weeklyBundleQuery.isFetching) return;
    setWeekStart(dayjs(weekStart).subtract(1, 'week').format('YYYY-MM-DD'));
  };
  const goToNextWeek = () => {
    if (weeklyBundleQuery.isFetching) return;
    setWeekStart(dayjs(weekStart).add(1, 'week').format('YYYY-MM-DD'));
  };

  const canNext =
    dayjs(`${yearMonth}-01`).add(1, 'month').format('YYYY-MM') <= dayjs().format('YYYY-MM');
  const monthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');
  const monthNum = dayjs(`${yearMonth}-01`).month() + 1;

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        refetchTeamGoals(),
        monthlySummaryQuery.refetch(),
        weeklyBundleQuery.refetch(),
      ]);
    }, [monthlySummaryQuery, refetchTeamGoals, weeklyBundleQuery]),
  );

  /** 통계 페이지 “진입 순간”에만 나의통계/주간/오늘 주차로 초기화 */
  useEffect(() => {
    if (!isFocused) return;

    // 팀/나의 전환이나 탭 전환 중에는 유지되어야 하므로 focus 될 때만 강제 리셋
    setActiveScope('my');
    setActiveTab('weekly');
    const thisWeek = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
    if (weekStartRef.current !== thisWeek) {
      setWeekStart(thisWeek);
    }
  }, [isFocused]);

  const saveReview = async () => {
    if (!user || !currentTeam) return;

    try {
      const ok = await saveMonthlyRetrospectiveMutation.mutateAsync({
        userId: user.id,
        teamId: currentTeam.id,
        yearMonth,
        content: tempText,
      });

      if (!ok) throw new Error('save failed');

      setEditReviewModalVisible(false);
    } catch (e) {
      handleServiceError(e);
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
          ref={scrollRef}
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={ds.pagePadding as ViewStyle}>
            <View style={styles.header}>
              <Text style={ds.headerTitle as TextStyle}>통계</Text>
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
                weeklyTeamData={weeklyTeamData}
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
