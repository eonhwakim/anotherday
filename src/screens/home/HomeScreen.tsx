import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import MountainProgress from '../../components/home/MountainProgress';
import TodayGoalList from '../../components/home/TodayGoalList';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam, fetchTeams, fetchMembers } = useTeamStore();
  const {
    myGoals,
    teamGoals,
    todayCheckins,
    memberProgress,
    fetchTeamGoals,
    fetchTodayCheckins,
    fetchMemberProgress,
    fetchMyGoals,
  } = useGoalStore();

  const [refreshing, setRefreshing] = React.useState(false);
  const [isStampFinished, setIsStampFinished] = React.useState(false);
  const [timePeriod, setTimePeriod] = React.useState<'DAY' | 'SUNSET' | 'NIGHT'>('DAY');
  const [isManualOverride, setIsManualOverride] = React.useState(false);

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
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setIsStampFinished(false); // 화면 진입 시 애니메이션 상태 초기화
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const today = dayjs().format('M월 D일');
  
  // 오늘 수행해야 하는 목표 필터링
  const myActiveGoals = React.useMemo(() => {
    const todayDayIndex = dayjs().day(); // 0(일) ~ 6(토)
    
    // 1. 오늘 해야 하는 UserGoal 찾기
    const activeUserGoalIds = myGoals
      .filter((ug) => {
        if (!ug.is_active) return false;
        if (ug.frequency === 'daily') return true;
        if (ug.frequency === 'weekly' && ug.week_days) {
          return ug.week_days.includes(todayDayIndex);
        }
        // weekly인데 week_days가 없으면(null) 일단 보여주지 않음 (설정 오류)
        return false;
      })
      .map((ug) => ug.goal_id);

    // 2. Goal 정보 매핑
    return teamGoals.filter((g) => activeUserGoalIds.includes(g.id));
  }, [myGoals, teamGoals]);

  return (
    <View style={styles.container}>
      {/* ── 배경 (하늘 + 잔디) ── */}
      <View style={styles.sky}>
        <Svg key={timePeriod} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="screenSkyGradient_DAY" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E3F2FD" stopOpacity="1" />
              <Stop offset="40%" stopColor="#BBDEFB" stopOpacity="1" />
              <Stop offset="80%" stopColor="#E1F5FE" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="screenSkyGradient_SUNSET" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E1BEE7" stopOpacity="1" />
              <Stop offset="40%" stopColor="#FFCCBC" stopOpacity="1" />
              <Stop offset="80%" stopColor="#FFF9C4" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFF59D" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="screenSkyGradient_NIGHT" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#0D1B2A" stopOpacity="1" />
              <Stop offset="40%" stopColor="#1B263B" stopOpacity="1" />
              <Stop offset="80%" stopColor="#415A77" stopOpacity="1" />
              <Stop offset="100%" stopColor="#778DA9" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#screenSkyGradient_${timePeriod})`} />
          {timePeriod === 'NIGHT' && <Stars />}
        </Svg>
      </View>
      <View style={styles.grass} />
      
      {/* ── 배경 장식 (구름, 나무 등) ── */}
      <View style={styles.backgroundDecor}>
        {timePeriod !== 'NIGHT' && (
          <>
            <Cloud style={{ top: 60, left: 40 }} scale={1} />
            <Cloud style={{ top: 100, right: -20 }} scale={0.8} />
          </>
        )}
        <Tree style={{ bottom: '35%', left: -30 }} scale={1.2} />
        <Tree style={{ bottom: '38%', right: -40 }} scale={1.5} />
      </View>

      {/* ☀️ 해 (낮/노을) 또는 🌙 달 (밤) */}
      {timePeriod !== 'NIGHT' ? (
        <Sun style={{ top: 110, right: 30, zIndex: 5 }} />
      ) : (
        <Moon style={{ top: 110, right: 35, zIndex: 5 }} />
      )}

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {/* 🧪 개발용 시간대 테스트 버튼 */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8, opacity: 0.8 }}>
            <TouchableOpacity onPress={() => handleManualTimeChange('DAY')} style={styles.testBtn}>
              <Text style={styles.testBtnText}>☀️ 아침</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleManualTimeChange('SUNSET')} style={styles.testBtn}>
              <Text style={styles.testBtnText}>🌅 노을</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleManualTimeChange('NIGHT')} style={styles.testBtn}>
              <Text style={styles.testBtnText}>🌙 밤</Text>
            </TouchableOpacity>
          </View>

          {/* 헤더 (나무 표지판 느낌) */}
          <View style={styles.header}>
            <View style={styles.signBoard}>
              <Text style={styles.dateText}>{today}</Text>
              <Text style={styles.teamName}>
                {currentTeam?.name ? `${currentTeam?.name} 팀` : '오늘의 목표'}
              </Text>
              {/* 표지판 못 */}
              <View style={[styles.nail, { top: 6, left: 6 }]} />
              <View style={[styles.nail, { top: 6, right: 6 }]} />
            </View>
            
            <View style={styles.userBadge}>
              <Text style={styles.greeting}>반가워요, {user?.nickname ?? ''}님!</Text>
            </View>
          </View>

          {/* 메인 산 (배경에 자연스럽게 녹아듦) */}
          <View style={styles.mountainSection}>
            <MountainProgress members={memberProgress} startAnimation={isStampFinished} isNight={timePeriod === 'NIGHT'} />
          </View>

          {/* 오늘의 목표 (잔디 위에 놓인 종이) */}
          <View style={styles.goalSection}>
            <TodayGoalList 
              goals={myActiveGoals} 
              checkins={todayCheckins} 
              onAnimationFinish={() => setIsStampFinished(true)}
            />
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── 장식용 컴포넌트 (SVG) ───

function Sun({ style }: any) {
  return (
    <View style={[styles.decorItem, style]}>
      <Svg width="80" height="80" viewBox="0 0 80 80">
        <Circle cx="40" cy="40" r="35" fill="#FFD54F" opacity="0.3" />
        <Circle cx="40" cy="40" r="20" fill="#FFD54F" opacity="0.5"/>
      </Svg>
    </View>
  );
}

function Moon({ style }: any) {
  return (
    <View style={[styles.decorItem, style]}>
      <Svg width="80" height="80" viewBox="0 0 80 80">
        {/* 달빛 은은하게 */}
        <Circle cx="40" cy="40" r="35" fill="#FFF59D" opacity="0.1" />
        <Circle cx="40" cy="40" r="25" fill="#FFF59D" opacity="0.2" />
        {/* 초승달 모양 (C 형태) */}
        <Path
          d="M 52 15 A 25 25 0 1 0 52 65 A 20 20 0 1 1 52 15 Z"
          fill="#FFF176"
        />
      </Svg>
    </View>
  );
}

function Cloud({ style, scale = 1 }: any) {
  return (
    <View style={[styles.decorItem, style, { transform: [{ scale }] }]}>
      <Svg width="100" height="60" viewBox="0 0 100 60">
        <Path
          d="M 20 40 Q 10 40 10 30 Q 10 10 30 15 Q 40 0 60 10 Q 80 0 90 20 Q 100 30 90 40 Z"
          fill="rgba(255,255,255,0.8)"
        />
      </Svg>
    </View>
  );
}

function Tree({ style, scale = 1 }: any) {
  return (
    <View style={[styles.decorItem, style, { transform: [{ scale }] }]}>
      <Svg width="80" height="120" viewBox="0 0 80 120">
        {/* 나무 기둥 */}
        <Path d="M 35 80 L 35 120 L 45 120 L 45 80 Z" fill="#8D6E63" />
        {/* 나뭇잎 (둥글둥글) */}
        <Circle cx="40" cy="70" r="25" fill="#AED581" />
        <Circle cx="25" cy="80" r="15" fill="#9CCC65" />
        <Circle cx="55" cy="80" r="15" fill="#9CCC65" />
        <Circle cx="40" cy="50" r="20" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

function Stars() {
  const stars = React.useMemo(() => {
    return [...Array(40)].map((_, i) => ({
      x: Math.random() * 100 + '%',
      y: Math.random() * 60 + '%',
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
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
    // backgroundColor: COLORS.sky, // 배경색 제거 (SVG가 전체를 덮도록 함)
  },
  sky: {
    ...StyleSheet.absoluteFillObject, // 전체 화면 채움
    zIndex: -10, // 가장 뒤로
  },
  grass: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '45%', // 화면 하단부는 잔디
    backgroundColor: '#FFFFFF', // 눈 쌓인 바닥 (흰색)
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    zIndex: -5, // 하늘보다 앞, 콘텐츠보다 뒤
  },
  backgroundDecor: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -4, // 잔디보다 앞
    pointerEvents: 'none',
  },
  decorItem: {
    position: 'absolute',
  },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'flex-start',
  },
  signBoard: {
    backgroundColor: '#D7CCC8', // 나무색
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8D6E63',
    marginBottom: 8,
    transform: [{ rotate: '-2deg' }], // 살짝 삐뚤게
    shadowColor: '#5D4037',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
  },
  nail: {
    position: 'absolute',
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: '#5D4037',
  },
  dateText: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '700',
    marginBottom: 2,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4E342E',
  },
  userBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '700',
  },
  
  mountainSection: {
    alignItems: 'center',
    marginBottom: 0,
    zIndex: 10,
    marginTop: 20,
  },
  goalSection: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  testBtn: { 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  testBtnText: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#5D4037' 
  },
});
