import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { UserGoal } from '../../types/domain';
import { useAuthStore } from '../../stores/authStore';
import { useGoalStore } from '../../stores/goalStore';
import { useTeamStore } from '../../stores/teamStore';
import { getMonthlyResolution, saveMonthlyResolution } from '../../services/monthlyService';
import { fetchMyGoalsForMonth as fetchMyGoalsForMonthByWindow } from '../../services/goalService';
import dayjs from '../../lib/dayjs';
import { getCalendarWeekRanges, computeConsecutiveAchievementDays } from '../../lib/statsUtils';
import { fetchCalendarMarkings } from '../../services/statsService';
import { colors, ds, radius, spacing, typography } from '../../design/recipes';
import { useStatsStore } from '../../stores/statsStore';

import ScreenBackground from '../../components/ui/ScreenBackground';
import BaseCard from '../../components/ui/BaseCard';
import GoalSetting from '../../components/goal/GoalSetting';
import AddRoutineModal from '../../components/goal/AddRoutineModal';
import TodayStatsCard from '../../components/goal/TodayStatsCard';
import GlassModal from '../../components/ui/GlassModal';
import Input from '../../components/common/Input';

function getOwningMonthForDate(dateStr: string): string {
  const date = dayjs(dateStr);
  const candidates = [
    date.subtract(1, 'month').format('YYYY-MM'),
    date.format('YYYY-MM'),
    date.add(1, 'month').format('YYYY-MM'),
  ];

  for (const monthStr of candidates) {
    const { ranges } = getCalendarWeekRanges(monthStr);
    const isInOwnedRange = ranges.some(
      (range) => range.s.format('YYYY-MM-DD') <= dateStr && range.e.format('YYYY-MM-DD') >= dateStr,
    );
    if (isInOwnedRange) return monthStr;
  }

  return date.format('YYYY-MM');
}

export default function GoalScreen() {
  const { user } = useAuthStore();
  const { currentTeam, fetchTeams } = useTeamStore();
  const { teamGoals, fetchTeamGoals, endTeamGoal, removeTeamGoal } = useGoalStore();
  const { fetchMemberProgress } = useStatsStore();
  const todayOwnedMonth = React.useMemo(
    () => getOwningMonthForDate(dayjs().format('YYYY-MM-DD')),
    [],
  );
  const [yearMonth, setYearMonth] = useState(todayOwnedMonth);
  const [monthGoals, setMonthGoals] = useState<UserGoal[]>([]);
  const [monthlyResolution, setMonthlyResolution] = useState('');
  const [loading, setLoading] = useState(true);
  const [addRoutineVisible, setAddRoutineVisible] = useState(false);
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [resolutionInput, setResolutionInput] = useState('');
  const [heroStats, setHeroStats] = useState<{
    ratePct: number;
    streak: number;
    doneToday: number;
    totalToday: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    const authUser = useAuthStore.getState().user;
    const fallbackTeamId = currentTeam?.id ?? null;
    if (!authUser) {
      setMonthGoals([]);
      setMonthlyResolution('');
      setHeroStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await fetchTeams(authUser.id);
      const currentSelectedTeam = useTeamStore.getState().currentTeam;
      const teamId = currentSelectedTeam?.id ?? '';

      const streakYm0 = dayjs().format('YYYY-MM');
      const streakYm1 = dayjs().subtract(1, 'month').format('YYYY-MM');
      const streakYm2 = dayjs().subtract(2, 'month').format('YYYY-MM');

      const [goalRows, content, , m0, m1, m2] = await Promise.all([
        fetchMyGoalsForMonthByWindow(authUser.id, yearMonth),
        getMonthlyResolution(authUser.id, yearMonth, currentSelectedTeam?.id ?? fallbackTeamId),
        fetchTeamGoals(teamId, authUser.id),
        fetchCalendarMarkings(authUser.id, streakYm0),
        fetchCalendarMarkings(authUser.id, streakYm1),
        fetchCalendarMarkings(authUser.id, streakYm2),
      ]);

      await fetchMemberProgress(teamId || undefined, authUser.id);
      const me = useStatsStore.getState().memberProgress.find((p) => p.userId === authUser.id);
      const totalToday = me?.totalGoals ?? 0;
      const doneToday = me?.doneGoals ?? 0;
      const ratePct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;
      const mergedMarkings = { ...m2, ...m1, ...m0 };
      const streak = computeConsecutiveAchievementDays(mergedMarkings);

      setMonthGoals(goalRows);
      setMonthlyResolution(content);
      setHeroStats({ ratePct, streak, doneToday, totalToday });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentTeam?.id, fetchMemberProgress, fetchTeamGoals, fetchTeams, yearMonth]);

  const handleUpdateResolution = useCallback(async (text: string): Promise<boolean> => {
    const authUser = useAuthStore.getState().user;
    const team = useTeamStore.getState().currentTeam;
    if (!authUser) return false;
    try {
      const ok = await saveMonthlyResolution({
        userId: authUser.id,
        yearMonth,
        content: text,
        teamId: team?.id ?? null,
      });
      if (!ok) throw new Error('save failed');
      setMonthlyResolution(text);
      setResolutionInput(text);
      return true;
    } catch (e) {
      console.error(e);
      Alert.alert('저장 실패', '한마디 저장 중 오류가 발생했습니다.');
      return false;
    }
  }, [yearMonth]);

  const openResolutionModal = useCallback(() => {
    setResolutionInput(monthlyResolution);
    setResolutionModalVisible(true);
  }, [monthlyResolution]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleEndGoal = useCallback(
    async (goalId: string) => {
      if (!user) return;
      const activeTeam = useTeamStore.getState().currentTeam;
      await endTeamGoal(activeTeam?.id ?? '', user.id, goalId);
      await loadData();
    },
    [endTeamGoal, loadData, user],
  );

  const handleRemoveGoal = useCallback(
    async (goalId: string) => {
      if (!user) return;
      const activeTeam = useTeamStore.getState().currentTeam;
      await removeTeamGoal(activeTeam?.id ?? '', user.id, goalId);
      await loadData();
    },
    [loadData, removeTeamGoal, user],
  );

  const currentTeamUserGoals = useMemo(() => {
    if (!teamGoals || teamGoals.length === 0) return [];
    if (!monthGoals || !user) return [];

    const myOwnedGoalIds = new Set(
      teamGoals.filter((goal) => goal.owner_id === user.id).map((goal) => goal.id),
    );
    return monthGoals.filter((userGoal) => myOwnedGoalIds.has(userGoal.goal_id));
  }, [teamGoals, monthGoals, user]);

  const myVisibleGoals = useMemo(() => {
    if (!teamGoals || !user) return [];

    const activeGoalIds = new Set(currentTeamUserGoals.map((userGoal) => userGoal.goal_id));
    return teamGoals.filter((goal) => goal.owner_id === user.id && activeGoalIds.has(goal.id));
  }, [teamGoals, currentTeamUserGoals, user]);

  const monthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');
  const canNext = yearMonth < todayOwnedMonth;
  const showCurrentChip = yearMonth === todayOwnedMonth;

  const goToPrevMonth = () => {
    setYearMonth((prev) => dayjs(`${prev}-01`).subtract(1, 'month').format('YYYY-MM'));
  };

  const goToNextMonth = () => {
    if (!canNext) return;
    setYearMonth((prev) => dayjs(`${prev}-01`).add(1, 'month').format('YYYY-MM'));
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={ds.pagePadding}>
            <View style={styles.header}>
              <Text style={ds.headerTitle}>내 목표</Text>
              <Text style={styles.subtitle}>매일 꾸준히, 작은 습관이 큰 변화를 만듭니다</Text>
            </View>
            {/* 오늘 통계 카드 */}
            <TodayStatsCard stats={user ? heroStats : null} />

            {/* 달력컨트롤 */}
            <View style={styles.monthSelectorWrap}>
              <View style={styles.monthSelector}>
                <TouchableOpacity onPress={goToPrevMonth} activeOpacity={0.8}>
                  <BaseCard
                    glassOnly
                    style={styles.monthButtonFrame}
                    contentStyle={styles.monthButtonContent}
                  >
                    <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
                  </BaseCard>
                </TouchableOpacity>

                <View style={styles.monthLabelWrap}>
                  <Text style={styles.monthLabel}>{monthLabel}</Text>
                  {showCurrentChip ? (
                    <View style={styles.monthStatusChip}>
                      <Text style={styles.monthStatusChipText}>진행중</Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity onPress={goToNextMonth} activeOpacity={0.8} disabled={!canNext}>
                  <BaseCard
                    glassOnly
                    style={[styles.monthButtonFrame, !canNext && styles.monthButtonFrameDisabled]}
                    contentStyle={styles.monthButtonContent}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={canNext ? colors.textSecondary : colors.textMuted}
                    />
                  </BaseCard>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                * 월초와 월말의 부분주는 4일 미만이면 인접 월에 편입돼요.
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <>
                <GoalSetting
                  yearMonth={yearMonth}
                  teamGoals={myVisibleGoals}
                  myGoals={currentTeamUserGoals}
                  onEnd={handleEndGoal}
                  onRemove={handleRemoveGoal}
                  monthlyResolution={monthlyResolution}
                  onEditResolution={openResolutionModal}
                />
              </>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setAddRoutineVisible(true)}
          activeOpacity={0.8}
        >
          <Image
            source={require('../../../assets/plus-btn.png')}
            style={styles.floatingButtonImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <AddRoutineModal
          visible={addRoutineVisible}
          onClose={() => setAddRoutineVisible(false)}
          onDone={loadData}
        />

        <GlassModal
          visible={resolutionModalVisible}
          title={`${dayjs(`${yearMonth}-01`).format('YYYY년 M월')} 한마디`}
          onClose={() => setResolutionModalVisible(false)}
          onConfirm={async () => {
            const ok = await handleUpdateResolution(resolutionInput);
            if (ok) setResolutionModalVisible(false);
          }}
        >
          <Input
            placeholder="이번 달의 다짐이나 목표를 적어보세요"
            value={resolutionInput}
            onChangeText={setResolutionInput}
            autoFocus
            maxLength={50}
          />
        </GlassModal>
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
  scrollContent: {
    paddingBottom: 132,
  },
  header: {
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing[1],
    lineHeight: 24,
  },
  monthSelectorWrap: {
    marginVertical: spacing[2],
  },
  monthSelector: {
    ...ds.rowCenter,
    justifyContent: 'center',
    gap: spacing[4],
    marginBottom: spacing[3],
  },
  monthLabelWrap: {
    minWidth: 140,
    alignItems: 'center',
    gap: spacing[2],
  },
  monthButtonFrame: {
    width: 48,
    minWidth: 48,
    marginTop: 0,
    borderRadius: radius.lg,
  },
  monthButtonFrameDisabled: {
    opacity: 0.45,
  },
  monthButtonContent: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    minWidth: 140,
    textAlign: 'center',
  },
  monthStatusChip: {
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.brandLight,
    borderWidth: 1,
    borderColor: colors.brandMid,
  },
  monthStatusChipText: {
    ...typography.bodyStrong,
    fontSize: 11,
    color: colors.primary,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  loadingWrap: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonImage: {
    width: '100%',
    height: '100%',
  },
});
