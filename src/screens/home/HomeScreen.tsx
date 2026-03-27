import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
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
import MountainProgress from '../../components/home/MountainProgress';
import TodayGoalList from '../../components/home/TodayGoalList';
import DevGuideModal from '../../components/home/DevGuideModal';
import MonthlyGoalPromptModal from '../../components/home/MonthlyGoalPromptModal';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';
import { scheduleGoalReminderNotification } from '../../utils/notifications';
import { getCalendarWeekRanges } from '../../components/stats/StatsShared';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop, Rect, Path, Line, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam, fetchTeams, fetchMembers } = useTeamStore();
  const { myGoals, teamGoals, todayCheckins, fetchTeamGoals, fetchTodayCheckins, fetchMyGoals, extendGoalsForNewMonth } = useGoalStore();
  const { memberProgress, fetchMemberProgress } = useStatsStore();

  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
        lastTapRef.current = now;
      }
    });
    return unsubscribe;
  }, [navigation]);

  const [refreshing, setRefreshing] = React.useState(false);
  const [isStampFinished, setIsStampFinished] = React.useState(false);
  const [timePeriod, setTimePeriod] = React.useState<'DAY' | 'SUNSET' | 'NIGHT'>('DAY');
  const [isManualOverride, setIsManualOverride] = React.useState(false);
  const [showGuideModal, setShowGuideModal] = React.useState(false);
  const [showMonthlyPrompt, setShowMonthlyPrompt] = React.useState(false);
  const [promptNewMonth, setPromptNewMonth] = React.useState<string>('');

  // ── 안내 모달 체크 (유저 정보 로드 완료 시) ──
  React.useEffect(() => {
    if (!user) return;

    const checkGuide = async () => {
      try {
        const key = 'hasSeenDevGuide_v2';
        const hasSeen = await AsyncStorage.getItem(key);
        
        if (!hasSeen) {
          // 약간의 지연을 주어 화면 전환 후 뜨게 함
          setTimeout(() => {
            setShowGuideModal(true);
          }, 500);
        }
      } catch (e) {
        console.error('[GuideCheck] Error:', e);
      }
    };
    
    checkGuide();
  }, [user]);

  // ── 새 달 1주차 시작일 감지 ──
  React.useEffect(() => {
    if (!user) return;

    const checkMonthlyPrompt = async () => {
      try {
        const today = dayjs();
        const todayStr = today.format('YYYY-MM-DD');

        // 이번 달과 다음 달의 1주차 시작일 확인 (주차 편입 규칙 적용)
        const candidates = [
          today.format('YYYY-MM'),
          today.add(1, 'month').format('YYYY-MM'),
        ];

        let matchedMonth: string | null = null;
        for (const monthStr of candidates) {
          const { ranges } = getCalendarWeekRanges(monthStr);
          if (ranges.length > 0 && ranges[0].s.format('YYYY-MM-DD') === todayStr) {
            matchedMonth = monthStr;
            break;
          }
        }

        if (!matchedMonth) return;

        const storageKey = `monthly_goal_prompt_v1_${matchedMonth}`;
        const alreadyShown = await AsyncStorage.getItem(storageKey);
        if (alreadyShown) return;

        await AsyncStorage.setItem(storageKey, 'shown');
        setPromptNewMonth(matchedMonth);
        setTimeout(() => setShowMonthlyPrompt(true), 800);
      } catch (e) {
        console.error('[MonthlyPrompt] Error:', e);
      }
    };

    checkMonthlyPrompt();
  }, [user]);

  const handleMonthlyPromptContinue = async () => {
    if (!user || !promptNewMonth) return;
    setShowMonthlyPrompt(false);
    await extendGoalsForNewMonth(user.id, promptNewMonth);
  };

  const handleMonthlyPromptNewPlan = () => {
    setShowMonthlyPrompt(false);
  };

  const handleCloseGuide = async (savePreference: boolean) => {
    try {
      if (savePreference) {
        await AsyncStorage.setItem('hasSeenDevGuide_v1', 'true');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShowGuideModal(false);
    }
  };

  React.useEffect(() => {
    const updateTime = () => {
      if (isManualOverride) return;
      const hour = dayjs().hour();
      if (hour >= 4 && hour < 16) setTimePeriod('DAY');
      else if (hour >= 16 && hour < 19) setTimePeriod('SUNSET');
      else setTimePeriod('NIGHT');
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, [isManualOverride]);

  const handleManualTimeChange = (period: 'DAY' | 'SUNSET' | 'NIGHT') => {
    setIsManualOverride(true);
    setTimePeriod(period);
  };

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

    const progress = useStatsStore.getState().memberProgress;
    const myProgress = progress.find((p) => p.userId === user.id);
    if (myProgress) {
      const uncompleted = myProgress.goalDetails
        .filter((g) => g.isActive && !g.isDone && !g.isPass)
        .map((g) => g.goalName);
      scheduleGoalReminderNotification(uncompleted).catch(() => {});
    }
  }, [user]);

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

  // 오늘 해당되는 목표: DAILY(start_date이후) + WEEKLY_COUNT(이번 주 미달성)
  // 주 N회의 이번 주 완료 수는 todayCheckins + 이번 주 과거 데이터에서 계산
  const myActiveGoals = React.useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const activeUserGoalIds = myGoals
      .filter((ug) => {
        if (!ug.is_active) return false;
        // start_date 체크
        if (ug.start_date && todayStr < ug.start_date) return false;
        // DAILY는 항상 포함
        if (ug.frequency === 'daily') return true;
        // WEEKLY_COUNT: store의 fetchMemberProgress에서 이미 계산하므로
        // 여기서는 일단 포함 (UI에서 "이번 주 X/N" 표시 가능)
        if (ug.frequency === 'weekly_count') return true;
        return true;
      })
      .map((ug) => ug.goal_id);
    return teamGoals.filter((g) => activeUserGoalIds.includes(g.id));
  }, [myGoals, teamGoals]);

  const isDay = timePeriod === 'DAY';
  const isSunset = timePeriod === 'SUNSET';
  const isNight = timePeriod === 'NIGHT';

  return (
    <View style={styles.container}>
      <DevGuideModal
        visible={showGuideModal}
        onClose={handleCloseGuide}
      />

      <MonthlyGoalPromptModal
        visible={showMonthlyPrompt}
        newMonthStr={promptNewMonth}
        activeGoals={myGoals}
        goalNames={new Map(teamGoals.map(g => [g.id, g.name]))}
        onContinue={handleMonthlyPromptContinue}
        onNewPlan={handleMonthlyPromptNewPlan}
      />

      {/* ── 배경 ── */}
      <View style={styles.bgLayer}>
        <SkyBackground key={timePeriod} timePeriod={timePeriod} />
      </View>

      {/* ── 장식 ── */}
      <View style={styles.decorLayer}>
        {timePeriod === 'SUNSET' && (
          <HoloGlow style={{ top: 80, right: 20 }} color1={COLORS.holoPink} color2={COLORS.holoMint} />
        )}
        {timePeriod === 'NIGHT' && (
          <HoloMoon style={{ top: 90, right: 30 }} />
        )}
      </View>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
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
            <Text style={[styles.greeting, isDay && styles.greetingDay, isSunset && styles.greetingSunset]}>
              반가워요, {user?.nickname ?? ''}님
            </Text>
            <View style={styles.frameRow}>
              <CyberFrame>
                <Text style={[styles.dateText, isNight && styles.dateTextLight]}>{today}</Text>
                <Text style={[styles.teamName, isNight && styles.teamNameLight]}>
                  {currentTeam?.name ? `${currentTeam?.name}` : '오늘의 목표'}
                </Text>
              </CyberFrame>
            </View>
          </View>

          {/* 산 */}
          <View style={styles.mountainSection}>
            <MountainProgress members={memberProgress} currentUserId={user?.id} startAnimation={isStampFinished} isNight={timePeriod === 'NIGHT'} timePeriod={timePeriod} />
          </View>

          {/* 목표 — 항상 다크 배경 */}
          <View style={styles.goalDarkBg}>
            <View style={styles.goalSection}>
              <TodayGoalList
                members={memberProgress}
                currentUserId={user?.id}
                onAnimationFinish={() => setIsStampFinished(true)}
              />
            </View>
            <View style={{ height: 80 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── 시간대별 배경 ───

const SKY_COLORS = {
  DAY:    { top: '#F0F8FF', mid: '#88C4E0', bot: '#A0D4EC', orb1: '#FFFFFF', orb2: '#C0E0F0', orb3: '#FFFFFF' },
  SUNSET: { top: '#6AB0D8', mid: '#FFB898', bot: '#FFD0B8', orb1: '#FFE0D0', orb2: '#FFB090', orb3: '#FFC0A8' },
  NIGHT:  { top: '#020208', mid: '#030310', bot: '#050510', orb1: '#A29BFE', orb2: '#3030A0', orb3: '#181850' },
} as const;

function SkyBackground({ timePeriod }: { timePeriod: 'DAY' | 'SUNSET' | 'NIGHT' }) {
  const c = SKY_COLORS[timePeriod];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMin slice">
      <Defs>
        <LinearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={c.top} />
          <Stop offset="50%" stopColor={c.mid} />
          <Stop offset="100%" stopColor={c.bot} />
        </LinearGradient>
        <RadialGradient id="orb1" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0%" stopColor={c.orb1} stopOpacity="0.18" />
          <Stop offset="50%" stopColor={c.orb1} stopOpacity="0.06" />
          <Stop offset="100%" stopColor={c.orb1} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="orb2" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0%" stopColor={c.orb2} stopOpacity="0.14" />
          <Stop offset="50%" stopColor={c.orb2} stopOpacity="0.05" />
          <Stop offset="100%" stopColor={c.orb2} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="orb3" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0%" stopColor={c.orb3} stopOpacity="0.12" />
          <Stop offset="60%" stopColor={c.orb3} stopOpacity="0.04" />
          <Stop offset="100%" stopColor={c.orb3} stopOpacity="0" />
        </RadialGradient>
        {/* 태양 글로우 */}
        {(timePeriod === 'DAY' || timePeriod === 'SUNSET') && (
          <RadialGradient id="sunGlow" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
            <Stop offset="0%" stopColor="#FFF0C8" stopOpacity="0.9" />
            <Stop offset="30%" stopColor="#FFD860" stopOpacity="0.5" />
            <Stop offset="60%" stopColor="#FFD040" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#FFD040" stopOpacity="0" />
          </RadialGradient>
        )}
      </Defs>
      <Rect x="0" y="0" width="400" height="800" fill="url(#skyG)" />
      <Circle cx="312" cy="96" r="180" fill="url(#orb1)" />
      <Circle cx="60" cy="440" r="140" fill="url(#orb2)" />
      <Circle cx="240" cy="640" r="120" fill="url(#orb3)" />
      {(timePeriod === 'DAY' || timePeriod === 'SUNSET') && <Clouds timePeriod={timePeriod} />}
      {timePeriod === 'DAY' && <DaySun />}
      {timePeriod === 'SUNSET' && <SunsetSun />}
      {timePeriod === 'NIGHT' && <Stars />}
    </Svg>
  );
}

function DaySun() {
  return (
    <>
      {/* 태양 글로우 */}
      <Circle cx="325" cy="140" r="65" fill="url(#sunGlow)" />
      
    </>
  );
}

function SunsetSun() {
  return (
    <>
      <Circle cx="325" cy="140" r="65" fill="url(#sunGlow)" />
    </>
  );
}

function Clouds({ timePeriod }: { timePeriod: 'DAY' | 'SUNSET' }) {
  // 작고 부드러운 구름들
  const isSunset = timePeriod === 'SUNSET';
  const cloudColor = isSunset ? '#FFE0F0' : '#FFFFFF';
  const shadowColor = isSunset ? '#FFB0D0' : '#D0E8F8';
  
  return (
    <>
      {/* 작은 구름 1 — 왼쪽 하단 */}
      <G opacity={0.35}>
        <Circle cx="118" cy="360" r="18" fill={cloudColor} opacity={0.20} />
        <Circle cx="90" cy="340" r="35" fill={cloudColor} opacity={0.20} />
        <Path
          d="M 99 355 Q 105 354 111 355 Q 117 354 122 356 Q 122 357 117 358 Q 111 359 105 358 Q 99 359 99 357 Z"
          fill={shadowColor}
          opacity={0.25}
        />
        <Path
          d="M 97 350 C 97 348 99 347 103 348 C 107 346 111 346 115 348 C 119 346 122 348 123 350 C 124 352 122 354 118 355 C 114 356 110 356 106 354 C 102 356 99 355 98 354 C 97 353 96 352 97 350 Z"
          fill={cloudColor}
        />
      </G>
      
      {/* 작은 구름 2 — 오른쪽 하단 */}
      <G opacity={0.36}>
        <Circle cx="323" cy="335" r="14" fill={cloudColor} opacity={0.3} />
        <Circle cx="340" cy="355" r="22" fill={cloudColor} opacity={0.20} />

        <Path
          d="M 309 350 Q 315 349 321 350 Q 327 349 332 351 Q 332 352 327 353 Q 321 354 315 353 Q 309 354 309 352 Z"
          fill={shadowColor}
          opacity={0.25}
        />
        <Path
          d="M 307 345 C 307 343 309 342 313 343 C 317 341 321 341 325 343 C 329 341 332 343 333 345 C 334 347 332 349 328 350 C 324 351 320 351 316 349 C 312 351 309 350 308 349 C 307 348 306 347 307 345 Z"
          fill={cloudColor}
        />
      </G>
      
      {/* 작은 구름 3 — 중앙 상단 */}
      <G opacity={0.35}>
        <Circle cx="205" cy="195" r="14" fill={cloudColor} opacity={0.20} />
        <Path
          d="M 189 205 Q 195 204 201 205 Q 207 204 212 206 Q 212 207 207 208 Q 201 209 195 208 Q 189 209 189 207 Z"
          fill={shadowColor}
          opacity={0.25}
        />
        <Path
          d="M 187 200 C 187 198 189 197 193 198 C 197 196 201 196 205 198 C 209 196 212 198 213 200 C 214 202 212 204 208 205 C 204 206 200 206 196 204 C 192 206 189 205 188 204 C 187 203 186 202 187 200 Z"
          fill={cloudColor}
        />
      </G>
    </>
  );
}

// ─── 사이버 유리 프레임 ───

// 은빛 메탈릭 팔레트
const METAL = {
  silver:      '#B8BCC6',
  silverLight: '#D8DAE2',
  silverBright:'#ECEEF4',
  silverDim:   '#7E8290',
  silverFrost: '#A0A4B0',
} as const;

function CyberFrame({ children }: { children: React.ReactNode }) {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const C = 20;
  const R = 8;
  const SW = 1.8;

  return (
    <View
      style={cyberStyles.wrapper}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setSize({ w, h });
      }}
    >
      {size.w > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            {/* 글래스 배경 — 항상 밤 색상 */}
            <LinearGradient id="metalBg" x1="0" y1="0" x2="0.8" y2="1">
              <Stop offset="0%"   stopColor={METAL.silverBright} stopOpacity="0.16" />
              <Stop offset="40%"  stopColor={METAL.silverLight}  stopOpacity="0.10" />
              <Stop offset="70%"  stopColor={METAL.silverDim}    stopOpacity="0.08" />
              <Stop offset="100%" stopColor={METAL.silverBright} stopOpacity="0.14" />
            </LinearGradient>
            {/* 보더 */}
            <LinearGradient id="metalBorder" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor={METAL.silverBright} stopOpacity="0.45" />
              <Stop offset="35%"  stopColor={METAL.silverDim}    stopOpacity="0.20" />
              <Stop offset="65%"  stopColor={METAL.silverLight}  stopOpacity="0.28" />
              <Stop offset="100%" stopColor={METAL.silverBright} stopOpacity="0.45" />
            </LinearGradient>
          </Defs>

          {/* 글래스 배경 */}
          <Rect
            x={1} y={1}
            width={size.w - 2} height={size.h - 2}
            rx={R} ry={R}
            fill="url(#metalBg)"
            stroke="url(#metalBorder)"
            strokeWidth={0.8}
          />
          {/* 상단 하이라이트 (유리 반사광) */}
          <Rect
            x={4} y={2}
            width={size.w - 8} height={(size.h - 2) * 0.4}
            rx={R - 2} ry={R - 2}
            fill={METAL.silverBright}
            opacity={0.04}
          />

          {/* ── 코너 브라켓 (좌상) ── */}
          <Line x1={1} y1={R + C} x2={1} y2={R} stroke="url(#cTL)" strokeWidth={SW} />
          <Path d={`M 1 ${R} Q 1 1 ${R} 1`} stroke="url(#cTL)" strokeWidth={SW} fill="none" />
          <Line x1={R} y1={1} x2={R + C} y2={1} stroke="url(#cTL)" strokeWidth={SW} />
          {/* ── 코너 브라켓 (우상) ── */}
          <Line x1={size.w - R - C} y1={1} x2={size.w - R} y2={1} stroke="url(#cTR)" strokeWidth={SW} />
          <Path d={`M ${size.w - R} 1 Q ${size.w - 1} 1 ${size.w - 1} ${R}`} stroke="url(#cTR)" strokeWidth={SW} fill="none" />
          <Line x1={size.w - 1} y1={R} x2={size.w - 1} y2={R + C} stroke="url(#cTR)" strokeWidth={SW} />
          {/* ── 코너 브라켓 (좌하) ── */}
          <Line x1={1} y1={size.h - R - C} x2={1} y2={size.h - R} stroke="url(#cBL)" strokeWidth={SW} />
          <Path d={`M 1 ${size.h - R} Q 1 ${size.h - 1} ${R} ${size.h - 1}`} stroke="url(#cBL)" strokeWidth={SW} fill="none" />
          <Line x1={R} y1={size.h - 1} x2={R + C} y2={size.h - 1} stroke="url(#cBL)" strokeWidth={SW} />
          {/* ── 코너 브라켓 (우하) ── */}
          <Line x1={size.w - R - C} y1={size.h - 1} x2={size.w - R} y2={size.h - 1} stroke="url(#cBR)" strokeWidth={SW} />
          <Path d={`M ${size.w - R} ${size.h - 1} Q ${size.w - 1} ${size.h - 1} ${size.w - 1} ${size.h - R}`} stroke="url(#cBR)" strokeWidth={SW} fill="none" />
          <Line x1={size.w - 1} y1={size.h - R - C} x2={size.w - 1} y2={size.h - R} stroke="url(#cBR)" strokeWidth={SW} />

        </Svg>
      )}

      <View style={cyberStyles.content}>
        {children}
      </View>
    </View>
  );
}

const cyberStyles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: METAL.silverLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 6,
  },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
});

// ─── 홀로그래픽 장식 ───

function HoloGlow({ style, color1, color2 }: any) {
  return (
    <View style={[styles.decorItem, style]}>
      <Svg width="140" height="140" viewBox="0 0 140 140">
        <Defs>
          <RadialGradient id="hGlow" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
            <Stop offset="0%" stopColor={color1} stopOpacity="0.20" />
            <Stop offset="40%" stopColor={color2} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={color1} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="70" cy="70" r="68" fill="url(#hGlow)" />
        <Circle cx="70" cy="70" r="25" fill={color1} opacity="0.08" />
      </Svg>
    </View>
  );
}

function HoloMoon({ style }: any) {
  return (
    <View style={[styles.decorItem, style]}>
      <Svg width="90" height="90" viewBox="0 0 90 90">
        <Defs>
          <RadialGradient id="moonGlow" cx="0.4" cy="0.4" rx="0.6" ry="0.6">
            <Stop offset="0%" stopColor={COLORS.holoLavender} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={COLORS.holoLavender} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="45" cy="45" r="42" fill="url(#moonGlow)" />
        <Path
          d="M 55 12 A 28 28 0 1 0 55 78 A 22 22 0 1 1 55 12 Z"
          fill="rgba(240,240,255,0.10)"
        />
      </Svg>
    </View>
  );
}

function Stars() {
  const stars = React.useMemo(() => {
    return [...Array(60)].map((_, i) => ({
      x: Math.random() * 400,
      y: Math.random() * 480,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));
  }, []);
  return (
    <>
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF" opacity={s.opacity} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFAF7',
  },
  bgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '80%',
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  frameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 10,
  },
  greetingDay: {
    color: '#4F4F4F',
  },
  greetingSunset: {
    color: '#4F4F4F',
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.50)',
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
    marginTop: 12,
  },
  goalDarkBg: {
    backgroundColor: '#FFFAF7',
  },
  goalSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
});
