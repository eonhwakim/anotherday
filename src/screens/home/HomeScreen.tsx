import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

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

export default function HomeScreen() {
  // 1. Global State & Base Context
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const currentTeamId = currentTeam?.id;
  const userId = user?.id;

  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayLabel = dayjs().format('YY년 M월 D일');

  // 2. Data Fetching (React Query)
  const { data: myGoals = [] } = useMyGoalsQuery(userId);
  const { data: teamGoals = [] } = useTeamGoalsQuery(currentTeamId ?? '', userId);
  const { data: todayCheckins = [] } = useTodayCheckinsQuery(userId, todayStr);
  // const { data: dailyTodos = [], isLoading: isDailyTodosLoading } = useDailyTodosQuery(
  //   userId,
  //   todayStr,
  // );
  const { data: memberProgress = [] } = useMemberProgressQuery(currentTeamId, userId, todayStr);

  // 3. UI State & Navigation
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
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
      updateTime();
      void refreshHomeQueries();
    }, [refreshHomeQueries, setIsStampFinished, updateTime]),
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

      <SafeAreaView style={ds.safe} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          style={ds.scroll}
          contentContainerStyle={ds.tabScrollContent}
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
          <View style={styles.header}>
            <View style={styles.heroTopRow}>
              <View style={styles.greetingWrap}>
                <Text
                  style={[
                    styles.greeting,
                    isDay && styles.greetingDay,
                    isSunset && styles.greetingSunset,
                  ]}
                >
                  HELLO,
                  {user?.nickname
                    ? ` ${user?.nickname}`
                    : currentTeam?.name
                      ? ` ${currentTeam?.name} 팀원`
                      : ''}
                </Text>
                <View style={styles.frameRow}>
                  <BaseCard glassOnly noBorder padded={false} style={styles.teamCard}>
                    <Text style={[styles.dateText, isNight && styles.dateTextLight]}>
                      {todayLabel}
                    </Text>
                    <Text style={[styles.teamName, isNight && styles.teamNameLight]}>
                      {currentTeam?.name ? `${currentTeam?.name}` : '오늘의 목표'}
                    </Text>
                  </BaseCard>
                </View>
              </View>
            </View>

            {/* <View style={styles.rightColumn}>
              <View style={styles.todoSection}>
                <TodayTodoSection
                  todos={dailyTodos}
                  isLoading={isDailyTodosLoading}
                  onAddTodo={handleAddDailyTodo}
                  onUpdateTodo={handleUpdateDailyTodo}
                  onToggleTodo={handleToggleDailyTodo}
                  onDeleteTodo={handleDeleteDailyTodo}
                />
              </View>
            </View> */}
          </View>

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
    position: 'relative',
    paddingHorizontal: 20,
    paddingTop: 16,
    minHeight: 132,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  greetingWrap: {
    flex: 1,
    minHeight: 120,
    paddingRight: '0%',
  },
  frameRow: {
    width: '100%',
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
  teamCard: {
    alignSelf: 'flex-start',
    marginTop: 6,
    maxWidth: 158,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  greeting: {
    ...typography.titleSm,
    fontWeight: '800',
    color: colors.white,
    marginLeft: 6,
    lineHeight: 28,
  },
  greetingDay: {
    color: colors.text,
  },
  greetingSunset: {
    color: colors.text,
  },
  dateText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dateTextLight: {
    color: colors.white60,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.black90,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  teamNameLight: {
    color: colors.white90,
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
    paddingTop: 40,
    width: '100%',
    alignItems: 'stretch',
  },
});
