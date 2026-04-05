import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import { useStatsStore } from '../../stores/statsStore';
import CyberFrame from '../../components/ui/CyberFrame';

import dayjs from '../../lib/dayjs';
import { colors } from '../../design/tokens';
import { scheduleGoalReminderNotification } from '../../utils/notifications';
import { getCalendarWeekRanges } from '../../lib/statsUtils';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import {
  fetchExtendableGoalsForMonth,
  fetchWeeklyDoneCountsForGoals,
} from '../../services/goalService';

import MountainProgress from '../../components/home/MountainProgress';
// import TodayGoalList from '../../components/home/TodayGoalList';
import TodayGoalList from '../../components/home/TodayGoalListFeed';

import MonthlyGoalPromptModal from '../../components/home/MonthlyGoalPromptModal';
import CheckinModal from '../../components/mypage/CheckinModal';
// import DevGuideModal from '../../components/home/DevGuideModal';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam, fetchTeams, fetchMembers } = useTeamStore();
  const {
    myGoals,
    teamGoals,
    todayCheckins,
    fetchTeamGoals,
    fetchTodayCheckins,
    fetchMyGoals,
    extendGoalsForNewMonth,
  } = useGoalStore();
  const { memberProgress, fetchMemberProgress } = useStatsStore();

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
  const [weeklyDoneCounts, setWeeklyDoneCounts] = React.useState<Record<string, number>>({});
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

  // ── 인증 모달용: 활성+비활성 모두 포함 (패스 토글 가능)
  const goalsForCheckinModal = React.useMemo(() => {
    const ugSource = currentTeamUserGoals;
    const myOwnedGoalIds = new Set(
      (teamGoals || []).filter((g) => g.owner_id === user?.id).map((g) => g.id),
    );
    const todayStr = dayjs().format('YYYY-MM-DD');

    return (teamGoals || [])
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
  }, [teamGoals, currentTeamUserGoals, user, weeklyDoneCounts]);

  const handleCheckinDone = async () => {
    if (!user) return;
    await loadData();
  };

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
    const ok = await extendGoalsForNewMonth(user.id, promptNewMonth);
    if (!ok) return;

    await AsyncStorage.setItem(getMonthlyPromptStorageKey(promptNewMonth), 'shown');
    setShowMonthlyPrompt(false);
    setExtendableGoals([]);
    await loadData();
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

  React.useEffect(() => {
    const updateTime = () => {
      if (isManualOverride) return;
      const hour = dayjs().hour();
      if (hour >= 5 && hour < 16) setTimePeriod('DAY');
      else if (hour >= 16 && hour < 19) setTimePeriod('SUNSET');
      else setTimePeriod('NIGHT');
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, [isManualOverride]);

  const loadData = useCallback(async () => {
    if (!user) return;
    await fetchTeams(user.id);
    const team = useTeamStore.getState().currentTeam;
    const teamId = team?.id;
    const promises = [
      fetchTeamGoals(teamId ?? '', user.id),
      fetchTodayCheckins(user.id),
      fetchMyGoals(user.id),
      fetchMemberProgress(teamId, user.id),
    ];
    if (teamId) promises.push(fetchMembers(teamId));
    await Promise.all(promises);

    const latestTeamGoals = useGoalStore.getState().teamGoals;
    const latestMyGoals = useGoalStore.getState().myGoals;
    const myOwnedGoalIds = new Set(
      latestTeamGoals.filter((g) => g.owner_id === user.id).map((g) => g.id),
    );
    const todayStr = dayjs().format('YYYY-MM-DD');
    const weeklyGoalIds = latestMyGoals
      .filter((ug) => ug.frequency === 'weekly_count')
      .filter((ug) => myOwnedGoalIds.has(ug.goal_id))
      .filter((ug) => {
        if (ug.start_date && todayStr < ug.start_date) return false;
        if (ug.end_date && todayStr > ug.end_date) return false;
        return true;
      })
      .map((ug) => ug.goal_id);

    const counts = await fetchWeeklyDoneCountsForGoals({
      userId: user.id,
      goalIds: weeklyGoalIds,
    });
    setWeeklyDoneCounts(counts);

    const progress = useStatsStore.getState().memberProgress;
    const myProgress = progress.find((p) => p.userId === user.id);
    if (myProgress) {
      const uncompleted = myProgress.goalDetails
        .filter((g) => g.isActive && !g.isDone && !g.isPass)
        .map((g) => g.goalName);
      scheduleGoalReminderNotification(uncompleted).catch(() => {});
    }
  }, [
    user,
    fetchTeams,
    fetchTeamGoals,
    fetchTodayCheckins,
    fetchMyGoals,
    fetchMemberProgress,
    fetchMembers,
  ]);

  useFocusEffect(
    useCallback(() => {
      setIsStampFinished(false);
      loadData();
    }, [loadData]),
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
          contentContainerStyle={styles.scrollContent}
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
              <CyberFrame style={{ alignSelf: 'flex-start' }}>
                <Text style={[styles.dateText, isNight && styles.dateTextLight]}>{today}</Text>
                <Text style={[styles.teamName, isNight && styles.teamNameLight]}>
                  {currentTeam?.name ? `${currentTeam?.name}` : '오늘의 목표'}
                </Text>
              </CyberFrame>
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
        onCheckinDone={handleCheckinDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
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
    marginBottom: 0,
    zIndex: 10,
    position: 'relative',
    top: -32,
    // marginTop: 12,
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
