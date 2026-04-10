import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import BaseCard from '../../components/ui/BaseCard';
import dayjs from '../../lib/dayjs';
import { handleServiceError } from '../../lib/serviceError';
import { colors } from '../../design/tokens';
import { scheduleGoalReminderNotification } from '../../utils/notifications';
import { getCalendarWeekRanges } from '../../lib/statsUtils';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import {
  fetchExtendableGoalsForMonth,
} from '../../services/goalService';
import {
  useMyGoalsQuery,
  useTeamGoalsQuery,
  useTodayCheckinsQuery,
  useWeeklyDoneCountsQuery,
} from '../../queries/goalQueries';
import { useExtendGoalsForNewMonthMutation } from '../../queries/goalMutations';
import { useMemberProgressQuery } from '../../queries/statsQueries';

import MountainProgress from '../../components/home/MountainProgress';
import TodayGoalList from '../../components/home/TodayGoalListFeed';

import MonthlyGoalPromptModal from '../../components/home/MonthlyGoalPromptModal';
import CheckinModal from '../../components/mypage/CheckinModal';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const extendGoalsForNewMonthMutation = useExtendGoalsForNewMonthMutation({
    userId: user?.id,
    teamId: currentTeam?.id,
  });
  const todayStr = dayjs().format('YYYY-MM-DD');

  const { data: myGoals = [], refetch: refetchMyGoals } = useMyGoalsQuery(user?.id);
  const { data: teamGoals = [], refetch: refetchTeamGoals } = useTeamGoalsQuery(
    currentTeam?.id ?? '',
    user?.id,
  );
  const { data: todayCheckins = [], refetch: refetchTodayCheckins } = useTodayCheckinsQuery(
    user?.id,
    todayStr,
  );
  const { data: memberProgress = [], refetch: refetchMemberProgress } = useMemberProgressQuery(
    currentTeam?.id,
    user?.id,
    todayStr,
  );

  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation, scrollRef });

  const [refreshing, setRefreshing] = React.useState(false);
  const [isStampFinished, setIsStampFinished] = React.useState(false);
  const [timePeriod, setTimePeriod] = React.useState<'DAY' | 'SUNSET' | 'NIGHT'>('DAY');
  const [isManualOverride] = React.useState(false);
  // const [showGuideModal, setShowGuideModal] = React.useState(false);
  const [showMonthlyPrompt, setShowMonthlyPrompt] = React.useState(false);
  const [promptNewMonth, setPromptNewMonth] = React.useState<string>('');
  const [extendableGoals, setExtendableGoals] = React.useState<typeof myGoals>([]);
  const [checkinModalVisible, setCheckinModalVisible] = React.useState(false);
  const [photoCarouselDragging, setPhotoCarouselDragging] = React.useState(false);

  const getMonthlyPromptStorageKey = useCallback(
    (monthStr: string) => `monthly_goal_prompt_v1_${monthStr}`,
    [],
  );

  // ── 현재 팀에 해당하는 나의 목표만 필터링 (인증 모달용) ──
  const currentTeamUserGoals = React.useMemo(() => {
    if (!teamGoals || teamGoals.length === 0) return [];
    if (!myGoals || !user) return [];
    const myOwnedGoalIds = new Set(
      teamGoals.filter((g) => g.owner_id === user.id).map((g) => g.id),
    );
    return myGoals.filter((ug) => myOwnedGoalIds.has(ug.goal_id));
  }, [teamGoals, myGoals, user]);

  const weeklyGoalIds = React.useMemo(() => {
    if (!user || teamGoals.length === 0 || myGoals.length === 0) {
      return [];
    }

    const myOwnedGoalIds = new Set(teamGoals.filter((g) => g.owner_id === user.id).map((g) => g.id));
    return myGoals
      .filter((ug) => ug.frequency === 'weekly_count')
      .filter((ug) => myOwnedGoalIds.has(ug.goal_id))
      .filter((ug) => {
        if (ug.start_date && todayStr < ug.start_date) return false;
        if (ug.end_date && todayStr > ug.end_date) return false;
        return true;
      })
      .map((ug) => ug.goal_id);
  }, [myGoals, teamGoals, todayStr, user]);

  const { data: weeklyDoneCounts = {}, refetch: refetchWeeklyDoneCounts } = useWeeklyDoneCountsQuery({
    userId: user?.id,
    goalIds: weeklyGoalIds,
  });

  // ── 인증 모달용: 활성+비활성 모두 포함 (패스 토글 가능)
  const goalsForCheckinModal = React.useMemo(() => {
    const ugSource = currentTeamUserGoals;
    const myOwnedGoalIds = new Set(
      teamGoals.filter((g) => g.owner_id === user?.id).map((g) => g.id),
    );

    return teamGoals
      .filter((g) => myOwnedGoalIds.has(g.id))
      .filter((g) => {
        const ug = ugSource.find((u) => u.goal_id === g.id);
        if (!ug) return false;
        if (ug.start_date && todayStr < ug.start_date) return false;
        if (ug.end_date && todayStr > ug.end_date) return false;
        return true;
      })
      .map((g) => {
        const ug = ugSource.find((u) => u.goal_id === g.id);
        return {
          goal: g,
          frequency: (ug?.frequency ?? 'daily') as 'daily' | 'weekly_count',
          targetCount: ug?.target_count ?? null,
          weeklyDoneCount: weeklyDoneCounts[g.id] ?? 0,
        };
      });
  }, [currentTeamUserGoals, teamGoals, todayStr, user, weeklyDoneCounts]);

  // ── 안내 모달 체크 (유저 정보 로드 완료 시) ──
  // React.useEffect(() => {
  //   if (!user) return;

  //   const checkGuide = async () => {
  //     try {
  //       const key = 'hasSeenDevGuide_v2';
  //       const hasSeen = await AsyncStorage.getItem(key);

  //       if (!hasSeen) {
  //         // 약간의 지연을 주어 화면 전환 후 뜨게 함
  //         setTimeout(() => {
  //           setShowGuideModal(true);
  //         }, 500);
  //       }
  //     } catch (e) {
  //       console.error('[GuideCheck] Error:', e);
  //     }
  //   };

  //   checkGuide();
  // }, [user]);

  // ── 새 달 1주차 시작일 감지 ──
  React.useEffect(() => {
    if (!user) return;

    const checkMonthlyPrompt = async () => {
      try {
        const today = dayjs();
        const todayStr = today.format('YYYY-MM-DD');

        // 이번 달과 다음 달의 1주차 시작일 확인 (주차 편입 규칙 적용)
        const candidates = [today.format('YYYY-MM'), today.add(1, 'month').format('YYYY-MM')];

        let matchedMonth: string | null = null;
        for (const monthStr of candidates) {
          const { ranges } = getCalendarWeekRanges(monthStr);
          if (ranges.length > 0 && ranges[0].s.format('YYYY-MM-DD') === todayStr) {
            matchedMonth = monthStr;
            break;
          }
        }

        if (!matchedMonth) return;

        const storageKey = getMonthlyPromptStorageKey(matchedMonth);
        const alreadyShown = await AsyncStorage.getItem(storageKey);
        if (alreadyShown) return;

        const targets = await fetchExtendableGoalsForMonth(user.id, matchedMonth);
        if (targets.length === 0) return;

        setExtendableGoals(targets);
        setPromptNewMonth(matchedMonth);
        setTimeout(() => setShowMonthlyPrompt(true), 800);
      } catch (e) {
        console.error('[MonthlyPrompt] Error:', e);
      }
    };

    checkMonthlyPrompt();
  }, [getMonthlyPromptStorageKey, user]);

  const handleMonthlyPromptContinue = async () => {
    if (!user || !promptNewMonth) return;
    try {
      const ok = await extendGoalsForNewMonthMutation.mutateAsync({
        newMonthStr: promptNewMonth,
      });
      if (!ok) return;

      await AsyncStorage.setItem(getMonthlyPromptStorageKey(promptNewMonth), 'shown');
      setShowMonthlyPrompt(false);
      setExtendableGoals([]);
    } catch (e) {
      handleServiceError(e);
    }
  };

  const handleMonthlyPromptNewPlan = async () => {
    if (promptNewMonth) {
      await AsyncStorage.setItem(getMonthlyPromptStorageKey(promptNewMonth), 'shown');
    }
    setShowMonthlyPrompt(false);
    setExtendableGoals([]);
  };

  // const handleCloseGuide = async (savePreference: boolean) => {
  //   try {
  //     if (savePreference) {
  //       await AsyncStorage.setItem('hasSeenDevGuide_v1', 'true');
  //     }
  //   } catch (e) {
  //     console.error(e);
  //   } finally {
  //     setShowGuideModal(false);
  //   }
  // };

  const updateTime = useCallback(() => {
    if (isManualOverride) return;
    const hour = dayjs().hour();
    if (hour >= 5 && hour < 16) setTimePeriod('DAY');
    else if (hour >= 16 && hour < 19) setTimePeriod('SUNSET');
    else setTimePeriod('NIGHT');
  }, [isManualOverride]);

  React.useEffect(() => {
    updateTime();
    const timer = setInterval(updateTime, 60000);
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateTime();
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [updateTime]);

  React.useEffect(() => {
    if (!user) return;
    const myProgress = memberProgress.find((p) => p.userId === user.id);
    if (myProgress) {
      const uncompleted = myProgress.goalDetails
        .filter((g) => g.isActive && !g.isDone && !g.isPass)
        .map((g) => g.goalName);
      scheduleGoalReminderNotification(uncompleted).catch(() => {});
    }
  }, [memberProgress, user]);

  const loadData = useCallback(async () => {
    if (!user) return;

    await Promise.all([
      refetchTeamGoals(),
      refetchTodayCheckins(),
      refetchMyGoals(),
      refetchMemberProgress(),
      refetchWeeklyDoneCounts(),
    ]);
  }, [
    refetchMemberProgress,
    refetchMyGoals,
    refetchTeamGoals,
    refetchTodayCheckins,
    refetchWeeklyDoneCounts,
    user,
  ]);

  useFocusEffect(
    useCallback(() => {
      setIsStampFinished(false);
      updateTime();
      loadData();
    }, [loadData, updateTime]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const today = dayjs().format('YY년 M월 D일');
  const isDay = timePeriod === 'DAY';
  const isSunset = timePeriod === 'SUNSET';
  const isNight = timePeriod === 'NIGHT';

  return (
    <View style={styles.container}>
      {/* <DevGuideModal
        visible={showGuideModal}
        onClose={handleCloseGuide}
      /> */}

      <MonthlyGoalPromptModal
        visible={showMonthlyPrompt}
        newMonthStr={promptNewMonth}
        activeGoals={extendableGoals}
        goalNames={new Map(teamGoals.map((g) => [g.id, g.name]))}
        onContinue={handleMonthlyPromptContinue}
        onNewPlan={handleMonthlyPromptNewPlan}
      />

      {/* ── 배경 ── */}
      <View style={styles.bgLayer}>
        <Image
          source={
            timePeriod === 'DAY'
              ? require('../../../assets/bg-m.png')
              : timePeriod === 'SUNSET'
                ? require('../../../assets/bg-d.png')
                : require('../../../assets/bg-n.png')
          }
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        {/* 밤: 전체 어둠 오버레이 */}
        {timePeriod === 'NIGHT' && <View style={styles.nightOverlay} pointerEvents="none" />}
      </View>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          scrollEnabled={!photoCarouselDragging}
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brandWarm}
            />
          }
        >
          {/* 시간대 테스트 */}
          {/* <View style={styles.testRow}>
            {(['DAY', 'SUNSET', 'NIGHT'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => handleManualTimeChange(p)}
                style={[styles.testBtn, timePeriod === p && styles.testBtnActive]}
              >
                <Text style={styles.testBtnText}>
                  {p === 'DAY' ? '☀️' : p === 'SUNSET' ? '🌅' : '🌙'}
                </Text>
              </TouchableOpacity>
            ))}
          </View> */}

          {/* 헤더 */}
          <View style={styles.header}>
            <Text
              style={[
                styles.greeting,
                isDay && styles.greetingDay,
                isSunset && styles.greetingSunset,
              ]}
            >
              반가워요, {user?.nickname ?? ''}님
            </Text>
            <View style={styles.frameRow}>
              <BaseCard glassOnly style={{ alignSelf: 'flex-start' }}>
                <Text style={[styles.dateText, isNight && styles.dateTextLight]}>{today}</Text>
                <Text style={[styles.teamName, isNight && styles.teamNameLight]}>
                  {currentTeam?.name ? `${currentTeam?.name}` : '오늘의 목표'}
                </Text>
              </BaseCard>
            </View>
          </View>

          {/* 산 */}
          <View style={styles.mountainSection}>
            <MountainProgress
              members={memberProgress}
              currentUserId={user?.id}
              startAnimation={isStampFinished}
            />
          </View>

          {/* 목표 — 사이버 프레임 카드 */}
          <View style={styles.goalSection}>
            <TodayGoalList
              members={memberProgress}
              currentUserId={user?.id}
              onAnimationFinish={() => setIsStampFinished(true)}
              isNight={isNight}
              onPhotoCarouselDragChange={setPhotoCarouselDragging}
            />
            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* ── 플로팅 인증하기 버튼 ── */}
        <TouchableOpacity
          style={styles.floatingButtonWrapper}
          onPress={() => setCheckinModalVisible(true)}
          activeOpacity={0.78}
        >
          <Image
            source={require('../../../assets/camera-btn.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── 인증 체크인 모달 ── */}
      <CheckinModal
        visible={checkinModalVisible}
        goalsWithFrequency={goalsForCheckinModal}
        checkins={todayCheckins}
        onClose={() => setCheckinModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  nightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)', // 밤일 때 화면을 충분히 어둡게 덮어주는 오버레이
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  decorItem: {
    position: 'absolute',
  },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  testRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  testBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  testBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.20)',
  },
  testBtnText: {
    fontSize: 14,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    // paddingBottom: 12,
  },
  frameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  greeting: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 10,
  },
  greetingDay: {
    color: colors.text,
  },
  greetingSunset: {
    color: colors.text,
  },
  dateText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateTextLight: {
    color: '#E0E0E0',
  },
  teamName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#282828',
    letterSpacing: 0.5,
  },
  teamNameLight: {
    color: '#FFFAF7',
  },
  mountainSection: {
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 10,
    position: 'relative',
    top: 6,
  },
  goalSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    width: '100%',
    alignItems: 'stretch',
  },

  // ── 플로팅 버튼 (이미지) ──
  floatingButtonWrapper: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
