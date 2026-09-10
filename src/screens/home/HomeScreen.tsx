import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
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
import { useHomeTimePeriod } from './hooks/useHomeTimePeriod';
import { useMonthlyGoalPrompt } from './hooks/useMonthlyGoalPrompt';

// 5. Components & UI Tokens
import { colors, radius, typography } from '../../design/tokens';
import BaseCard from '../../components/ui/BaseCard';
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

const HEADER_TOP_GAP = 10;
const HEADER_HEIGHT = 122;

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
  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation, scrollRef });

  const [refreshing, setRefreshing] = React.useState(false);
  const [isStampFinished, setIsStampFinished] = React.useState(false);
  const [checkinModalVisible, setCheckinModalVisible] = React.useState(false);
  const [photoCarouselDragging, setPhotoCarouselDragging] = React.useState(false);

  // 4. Custom Feature Hooks (Business Logic)
  // 4.1 Time & Refresh
  const { isDay, isNight, isSunset, timePeriod, updateTime } = useHomeTimePeriod();
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

      <View style={styles.bgLayer}>
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
      </View>

      <SafeAreaView style={ds.safe} edges={[]}>
        <ScrollView
          ref={scrollRef}
          style={ds.scroll}
          contentContainerStyle={[ds.tabScrollContent, { paddingTop: insets.top + HEADER_HEIGHT }]}
          scrollEnabled={!photoCarouselDragging}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryWarm}
            />
          }
        >
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

          <View style={styles.goalSection}>
            <TodayGoalList
              members={memberProgress}
              currentUserId={user?.id}
              onAnimationFinish={() => setIsStampFinished(true)}
              isNight={isNight}
              onPhotoCarouselDragChange={setPhotoCarouselDragging}
            />
          </View>
        </ScrollView>

        <View
          style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP }]}
          pointerEvents="box-none"
        >
          <BaseCard glassOnly noBorder padded={false} style={styles.heroCard}>
            <BlurView
              intensity={isNight ? 18 : 28}
              tint={isNight ? 'dark' : 'light'}
              style={styles.heroBlur}
            >
              <LinearGradient
                colors={
                  isNight
                    ? ['rgba(10, 14, 22, 0.34)', 'rgba(10, 14, 22, 0.08)']
                    : ['rgba(255, 255, 255, 0.28)', 'rgba(255, 255, 255, 0.08)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <View style={styles.heroTopRow}>
                  <View style={styles.greetingWrap}>
                    <Text style={[styles.dateText, isNight && styles.dateTextLight]}>
                      {todayLabel}
                    </Text>
                    <Text
                      style={[
                        styles.greeting,
                        isDay && styles.greetingDay,
                        isSunset && styles.greetingSunset,
                        isNight && styles.greetingNight,
                      ]}
                      numberOfLines={1}
                    >
                      {displayName}님 좋은 하루에요
                    </Text>
                  </View>

                  <View style={[styles.todayBadge, isNight && styles.todayBadgeNight]}>
                    <Ionicons
                      name={totalGoals > 0 && completedGoals === totalGoals ? 'checkmark' : 'sunny'}
                      size={15}
                      color={isNight ? colors.white90 : colors.primary}
                    />
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  <View style={[styles.summaryPill, isNight && styles.summaryPillNight]}>
                    <Ionicons
                      name="grid-outline"
                      size={13}
                      color={isNight ? colors.white80 : colors.darkGreen}
                    />
                    <Text style={[styles.summaryText, isNight && styles.summaryTextNight]}>
                      내 루틴 {progressLabel}
                    </Text>
                  </View>
                  {memberProgress.length > 1 && (
                    <View style={[styles.summaryPill, isNight && styles.summaryPillNight]}>
                      <Ionicons
                        name="people-outline"
                        size={13}
                        color={isNight ? colors.white80 : colors.darkGreen}
                      />
                      <Text style={[styles.summaryText, isNight && styles.summaryTextNight]}>
                        함께 {memberProgress.length}명
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </BlurView>
          </BaseCard>
        </View>

        <FloatingCameraButton onPress={() => setCheckinModalVisible(true)} />
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
  },
  nightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBackdrop,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    minHeight: 122,
    zIndex: 1000,
    elevation: 1000,
  },
  heroCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
    shadowOpacity: 0.035,
  },
  heroBlur: {
    overflow: 'hidden',
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  greetingWrap: {
    flex: 1,
    minWidth: 0,
  },
  rightColumn: {
    position: 'absolute',
    top: 10,
    right: 20,
    maxWidth: '55%',
    width: '55%',
    gap: 10,
    zIndex: 30,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 24,
    letterSpacing: 0,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0,
    marginBottom: 5,
  },
  dateTextLight: {
    color: colors.white60,
  },
  todayBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadgeNight: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  summaryPill: {
    minHeight: 27,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  summaryPillNight: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  summaryText: {
    ...typography.caption,
    color: colors.darkGreen,
    fontWeight: '700',
    letterSpacing: 0,
  },
  summaryTextNight: {
    color: colors.white80,
  },
  mountainSection: {
    alignItems: 'center',
    zIndex: 10,
    position: 'relative',
  },
  todoSection: {
    width: '100%',
  },
  goalSection: {
    paddingHorizontal: 20,
    paddingTop: 34,
    width: '100%',
    alignItems: 'stretch',
  },
});
