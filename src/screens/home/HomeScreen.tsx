import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Animated,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// 1. Types & Stores
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';

// 2. Libs & Utils
import dayjs from '../../lib/dayjs';
import { scheduleGoalReminderNotification } from '../../utils/notifications';

// 3. Queries (Data Fetching)
// import { useDailyTodosQuery } from '../../queries/todoQueries';
import {
  useMyGoalsQuery,
  useTeamGoalsQuery,
  useTodayCheckinsQuery,
} from '../../queries/goalQueries';
import { useMemberProgressQuery } from '../../queries/statsQueries';

// 4. Custom Hooks (Business Logic)
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import { useCheckinGoals } from './hooks/useCheckinGoals';
// import { useDailyTodoActions } from './hooks/useDailyTodoActions';
import { useHomeRefresh } from './hooks/useHomeRefresh';
import { useHomeTimePeriod, type HomeTimePeriod } from './hooks/useHomeTimePeriod';
import { useMonthlyGoalPrompt } from './hooks/useMonthlyGoalPrompt';

// 5. Components & UI Tokens
import { colors, numericFont, typography } from '../../design/tokens';
import MountainProgress from '../../components/home/MountainProgress';
import RacingProgress from '../../components/home/RacingProgress';
import ClimbingProgress from '../../components/home/ClimbingProgress';
import TodayGoalList from '../../components/home/TodayGoalListFeed';
// import TodayTodoSection from '../../components/home/TodayTodoSection';
import MonthlyGoalPromptModal from '../../components/home/MonthlyGoalPromptModal';
import CheckinModal from '../../components/mypage/CheckinModal';
import FloatingCameraButton from '../../components/home/FloatingCameraButton';
import { useSettingsStore } from '../../stores/settingsStore';
import { ds } from '@/design/recipes';

const HERO_TOP_GAP = 10;
/** 상단 고정 컴팩트 바 높이 (safe area 제외) */
const COMPACT_BAR_HEIGHT = 46;
/** 컴팩트 바와 콘텐츠 시트가 공유하는 블러 강도 — 같은 재질로 보이게 */
const SHEET_BLUR_INTENSITY = 30;
/** 히어로가 사라지고 컴팩트 바가 나타나는 스크롤 구간 */
const HERO_FADE_END = 90;
const COMPACT_FADE_START = 70;
const COMPACT_FADE_END = 130;

// TODO: 임시 개발용 시간대 토글 — 디자인 확인 후 제거
const DEV_TIME_PERIODS: { label: string; value: HomeTimePeriod }[] = [
  { label: '낮', value: 'DAY' },
  { label: '오후', value: 'SUNSET' },
  { label: '밤', value: 'NIGHT' },
];

export default function HomeScreen() {
  // 1. Global State & Base Context
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const currentTeamId = currentTeam?.id;
  const userId = user?.id;

  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayLabel = dayjs().format('M월 D일 dddd');

  // 2. Data Fetching (React Query)
  const { data: myGoals = [] } = useMyGoalsQuery(userId);
  const { data: teamGoals = [] } = useTeamGoalsQuery(currentTeamId ?? '', userId);
  const { data: todayCheckins = [] } = useTodayCheckinsQuery(userId, todayStr);
  // const { data: dailyTodos = [], isLoading: isDailyTodosLoading } = useDailyTodosQuery(
  //   userId,
  //   todayStr,
  // );
  const { data: memberProgress = [] } = useMemberProgressQuery(currentTeamId, userId, todayStr);
  const myProgress = React.useMemo(
    () => memberProgress.find((member) => member.userId === userId),
    [memberProgress, userId],
  );
  const completedGoals = myProgress?.completedGoals ?? 0;
  const totalGoals = myProgress?.totalGoals ?? 0;
  const progressLabel = totalGoals > 0 ? `${completedGoals}/${totalGoals}` : '0/0';

  // 3. UI State & Navigation
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // 콘텐츠가 짧아도 시트가 화면 아래까지 덮도록 최소 높이를 잡는다
  const sheetMinHeight = Math.max(420, Math.round(windowHeight * 0.5));
  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation, scrollRef });

  const [refreshing, setRefreshing] = React.useState(false);
  const [isStampFinished, setIsStampFinished] = React.useState(false);
  const [checkinModalVisible, setCheckinModalVisible] = React.useState(false);
  const [photoCarouselDragging, setPhotoCarouselDragging] = React.useState(false);

  // 3.1 스크롤 연동 헤더 (sheet-over-hero)
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_FADE_END],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_FADE_END],
    outputRange: [0, -18],
    extrapolate: 'clamp',
  });
  const compactOpacity = scrollY.interpolate({
    inputRange: [COMPACT_FADE_START, COMPACT_FADE_END],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // 배경 사진 패럴랙스 — 콘텐츠보다 훨씬 천천히 위로 밀려 깊이를 만든다
  const backgroundTranslateY = scrollY.interpolate({
    inputRange: [0, 400],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });
  const onScroll = React.useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  // 4. Custom Feature Hooks (Business Logic)
  // 4.1 Time & Refresh
  const { timePeriod: autoTimePeriod, updateTime } = useHomeTimePeriod();
  // TODO: 임시 개발용 시간대 토글 — 디자인 확인 후 devTimePeriod 관련 코드 제거
  const [devTimePeriod, setDevTimePeriod] = React.useState<HomeTimePeriod | null>(null);
  const timePeriod = devTimePeriod ?? autoTimePeriod;
  const isDay = timePeriod === 'DAY';
  const isSunset = timePeriod === 'SUNSET';
  const isNight = timePeriod === 'NIGHT';
  const refreshHomeQueries = useHomeRefresh({ currentTeamId, todayStr, userId });
  const backgroundTheme = useSettingsStore((s) => s.backgroundTheme);
  const updateTimeRef = useRef(updateTime);
  const refreshHomeQueriesRef = useRef(refreshHomeQueries);

  updateTimeRef.current = updateTime;
  refreshHomeQueriesRef.current = refreshHomeQueries;

  // 4.2 Todo Actions
  // const {
  //   handleAddDailyTodo,
  //   handleDeleteDailyTodo,
  //   handleToggleDailyTodo,
  //   handleUpdateDailyTodo,
  // } = useDailyTodoActions({ todayStr, userId });

  // 4.3 Goal Prompts & Modals
  const {
    extendableGoals,
    handleMonthlyPromptContinue,
    handleMonthlyPromptNewPlan,
    isContinuingMonthlyPrompt,
    promptNewMonth,
    showMonthlyPrompt,
  } = useMonthlyGoalPrompt({ currentTeamId, userId });
  const goalsForCheckinModal = useCheckinGoals({ myGoals, teamGoals, todayStr, userId });
  const displayName =
    user?.nickname ?? (currentTeam?.name ? `${currentTeam.name} 팀원` : '오늘의 나');

  // 5. Effects & Event Handlers
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

  useFocusEffect(
    useCallback(() => {
      setIsStampFinished(false);
      updateTimeRef.current();
      void refreshHomeQueriesRef.current();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHomeQueries();
    setRefreshing(false);
  };

  const openCheckinModal = useCallback(() => setCheckinModalVisible(true), []);

  /** 시트 핸들 탭 — 맨 위로 */
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // 6. Render
  return (
    <View style={ds.screen}>
      <MonthlyGoalPromptModal
        visible={showMonthlyPrompt}
        newMonthStr={promptNewMonth}
        activeGoals={extendableGoals}
        goalNames={new Map(teamGoals.map((g) => [g.id, g.name]))}
        onContinue={handleMonthlyPromptContinue}
        onNewPlan={handleMonthlyPromptNewPlan}
        isSubmitting={isContinuingMonthlyPrompt}
      />

      <Animated.View
        style={[styles.bgLayer, { transform: [{ translateY: backgroundTranslateY }] }]}
        pointerEvents="none"
      >
        <Image
          source={
            timePeriod === 'DAY'
              ? require('../../../assets/bg-m.png')
              : timePeriod === 'SUNSET'
                ? require('../../../assets/bg-d.png')
                : require('../../../assets/bg-n.png')
          }
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="cover"
        />
        {timePeriod === 'NIGHT' && <View style={styles.nightOverlay} pointerEvents="none" />}
        {/* 히어로 텍스트 가독성용 스크림 — 배경 사진이 무엇이든 대비를 보장한다 */}
        <LinearGradient
          colors={
            isNight
              ? ['rgba(6, 10, 18, 0.55)', 'rgba(6, 10, 18, 0)']
              : ['rgba(255, 255, 255, 0.62)', 'rgba(255, 255, 255, 0)']
          }
          style={styles.heroScrim}
          pointerEvents="none"
        />
      </Animated.View>

      <SafeAreaView style={ds.safe} edges={[]}>
        <Animated.ScrollView
          ref={scrollRef}
          style={ds.scroll}
          contentContainerStyle={[
            ds.tabScrollContent,
            // 하단 여백은 시트 안쪽에서 처리한다 (시트 아래로 배경이 다시 보이지 않도록)
            { paddingTop: insets.top + HERO_TOP_GAP, paddingBottom: 0 },
          ]}
          scrollEnabled={!photoCarouselDragging}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryWarm}
            />
          }
        >
          {/* 히어로 — 카드 없이 배경 위에 큰 타이포로 */}
          <Animated.View
            style={[
              styles.heroBlock,
              { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
            ]}
          >
            <Text style={[styles.dateText, isNight && styles.dateTextNight]}>{todayLabel}</Text>
            <Text
              numberOfLines={1}
              style={[
                styles.greeting,
                isDay && styles.greetingDay,
                isSunset && styles.greetingSunset,
                isNight && styles.greetingNight,
              ]}
            >
              {displayName}, Have a good day!
            </Text>
          </Animated.View>

          <View style={styles.mountainSection}>
            {backgroundTheme === 'racing' ? (
              <RacingProgress
                members={memberProgress}
                currentUserId={user?.id}
                startAnimation={isStampFinished}
              />
            ) : backgroundTheme === 'climbing' ? (
              <ClimbingProgress
                members={memberProgress}
                currentUserId={user?.id}
                startAnimation={isStampFinished}
              />
            ) : (
              <MountainProgress
                members={memberProgress}
                currentUserId={user?.id}
                startAnimation={isStampFinished}
              />
            )}
          </View>

          {/* 콘텐츠 시트 — 상단 컴팩트 바와 같은 블러 재질 */}
          <View style={[styles.sheetClip, { minHeight: sheetMinHeight }]}>
            <BlurView
              intensity={SHEET_BLUR_INTENSITY}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
            <View style={[ds.sheet, styles.sheet]}>
              <Pressable
                onPress={scrollToTop}
                hitSlop={{ top: 14, bottom: 14, left: 40, right: 40 }}
                accessibilityRole="button"
                accessibilityLabel="맨 위로 이동"
                style={({ pressed }) => [
                  styles.sheetHandleHit,
                  pressed && styles.sheetHandlePressed,
                ]}
              >
                <View style={styles.sheetHandle} />
              </Pressable>
              <TodayGoalList
                members={memberProgress}
                currentUserId={user?.id}
                onAnimationFinish={() => setIsStampFinished(true)}
                onPhotoCarouselDragChange={setPhotoCarouselDragging}
              />
            </View>
          </View>
        </Animated.ScrollView>

        {/* 스크롤 시 나타나는 컴팩트 바 */}
        <Animated.View
          style={[styles.compactBar, { paddingTop: insets.top, opacity: compactOpacity }]}
          pointerEvents="none"
        >
          <BlurView intensity={SHEET_BLUR_INTENSITY} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.compactInner}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {todayLabel}
            </Text>
            <View style={styles.compactPill}>
              <Text style={styles.compactPillText}>내 루틴 {progressLabel}</Text>
            </View>
          </View>
        </Animated.View>

        {/* TODO: 임시 개발용 시간대 토글 — 디자인 확인 후 제거 */}
        {__DEV__ ? (
          <View style={[styles.devToggle, { bottom: insets.bottom + 96 }]}>
            {DEV_TIME_PERIODS.map(({ label, value }) => {
              const active = timePeriod === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setDevTimePeriod(value)}
                  style={[styles.devToggleItem, active && styles.devToggleItemActive]}
                >
                  <Text style={[styles.devToggleText, active && styles.devToggleTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setDevTimePeriod(null)} style={styles.devToggleItem}>
              <Text style={styles.devToggleText}>자동</Text>
            </Pressable>
          </View>
        ) : null}

        <FloatingCameraButton onPress={openCheckinModal} />
      </SafeAreaView>

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
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    // 패럴랙스로 위로 밀렸을 때 아래쪽이 비지 않도록 여유를 둔다
    bottom: -80,
  },
  nightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBackdrop,
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  heroBlock: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.text,
  },
  greetingDay: {
    color: colors.text,
  },
  greetingSunset: {
    color: colors.text,
  },
  greetingNight: {
    color: colors.white,
  },
  dateText: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dateTextNight: {
    color: colors.white60,
  },
  compactBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    zIndex: 1000,
    elevation: 1000,
  },
  compactInner: {
    height: COMPACT_BAR_HEIGHT,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compactTitle: {
    ...typography.titleSm,
    color: colors.text,
    flexShrink: 1,
  },
  compactPill: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
  },
  compactPillText: {
    ...typography.caption,
    ...numericFont,
    color: colors.darkGreen,
    fontWeight: '700',
  },
  mountainSection: {
    alignItems: 'center',
    zIndex: 10,
    position: 'relative',
  },
  todoSection: {
    width: '100%',
  },
  /** 블러를 담는 컨테이너 — 라운드 클리핑 담당 */
  sheetClip: {
    marginTop: -12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
    zIndex: 20,
  },
  /** 블러 위에 얹는 틴트 + 여백 (탭바에 가리지 않도록 하단 여백을 직접 갖는다) */
  sheet: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingBottom: 140,
  },
  // TODO: 임시 개발용 시간대 토글 스타일 — 디자인 확인 후 제거
  devToggle: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 2000,
  },
  devToggleItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  devToggleItemActive: {
    backgroundColor: colors.white,
  },
  devToggleText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white80,
  },
  devToggleTextActive: {
    color: colors.text,
  },
  sheetHandleHit: {
    alignSelf: 'center',
    paddingVertical: 6,
    marginTop: -16,
    marginBottom: 12,
  },
  sheetHandlePressed: {
    opacity: 0.5,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(26, 26, 26, 0.18)',
  },
});
