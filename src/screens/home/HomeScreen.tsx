import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  ImageBackground,
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
  const myGoalIds = useGoalStore.getState().myGoals.map((ug) => ug.goal_id);
  const myActiveGoals = teamGoals.filter((g) => myGoalIds.includes(g.id));

  return (
    <View style={styles.container}>
      {/* ── 배경 (하늘 + 잔디) ── */}
      <View style={styles.sky}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="screenSkyGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E1BEE7" stopOpacity="1" />
              <Stop offset="40%" stopColor="#FFCCBC" stopOpacity="1" />
              <Stop offset="80%" stopColor="#FFF9C4" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFF59D" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#screenSkyGradient)" />
        </Svg>
      </View>
      <View style={styles.grass} />
      
      {/* ── 배경 장식 (구름, 나무 등) ── */}
      <View style={styles.backgroundDecor}>
        <Sun style={{ top: 140, right: 40 }} />
        <Cloud style={{ top: 60, left: 40 }} scale={1} />
        <Cloud style={{ top: 100, right: -20 }} scale={0.8} />
        <Tree style={{ bottom: '35%', left: -30 }} scale={1.2} />
        <Tree style={{ bottom: '38%', right: -40 }} scale={1.5} />
      </View>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {/* 헤더 (나무 표지판 느낌) */}
          <View style={styles.header}>
            <View style={styles.signBoard}>
              <Text style={styles.dateText}>{today}</Text>
              <Text style={styles.teamName}>
                {currentTeam?.name ?? '적토마 팀'}
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
            <MountainProgress members={memberProgress} startAnimation={isStampFinished} />
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
        <Circle cx="40" cy="40" r="35" fill="#FFD54F" opacity="0.4" />
        <Circle cx="40" cy="40" r="20" fill="#FFC107" />
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
        <Circle cx="40" cy="50" r="20" fill="#C5E1A5" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.sky,
  },
  sky: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '60%',
    zIndex: -2,
  },
  grass: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '45%', // 화면 하단부는 잔디
    backgroundColor: '#C5E1A5', // 근경 언덕 색상과 일치
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    zIndex: -1,
  },
  backgroundDecor: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
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
});
