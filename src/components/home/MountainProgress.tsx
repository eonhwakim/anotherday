import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
  G,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Polygon,
} from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { COLORS, SEASON_THEMES } from '../../constants/defaults';
import dayjs from '../../lib/dayjs';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTAINER_WIDTH = SCREEN_WIDTH; // 전체 너비 사용
const SVG_W = 350;
const SVG_H = 380;
const CONTAINER_HEIGHT = 380;

// 산의 경로를 부드럽게 언덕을 오르는 느낌으로 수정
const TRAIL_POINTS = [
  { x: 280, y: 340 }, { x: 220, y: 300 }, { x: 150, y: 260 },
  { x: 100, y: 200 }, { x: 160, y: 150 }, { x: 220, y: 120 },
  { x: 180, y: 80 }, { x: 175, y: 40 },
] as const;

const TRAIL_INPUT_RANGE = TRAIL_POINTS.map((_, i) => i / (TRAIL_POINTS.length - 1));

// 파스텔톤 아바타 컬러
const AVATAR_COLORS = [
  '#FFAB91', '#FFCC80', '#FFF59D', '#A5D6A7',
  '#80CBC4', '#81D4FA', '#9FA8DA', '#CE93D8',
];

type Theme = (typeof SEASON_THEMES)[keyof typeof SEASON_THEMES];

function getSeasonTheme(): Theme {
  const month = dayjs().month() + 1;
  if (month >= 3 && month <= 5) return SEASON_THEMES.spring;
  if (month >= 6 && month <= 8) return SEASON_THEMES.summer;
  if (month >= 9 && month <= 11) return SEASON_THEMES.autumn;
  return SEASON_THEMES.winter;
}

function buildSmoothTrailPath(): string {
  const pts = TRAIL_POINTS;
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${midX} ${midY}`;
  }
  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
}

export default function MountainProgress({ members, startAnimation, isNight }: { members: MemberProgress[]; startAnimation?: boolean; isNight?: boolean }) {
  const theme = getSeasonTheme();
  const [containerWidth, setContainerWidth] = useState(CONTAINER_WIDTH);

  return (
    <View style={styles.sceneContainer}>
      <View
        style={styles.sceneInner}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <MountainScene theme={theme} isNight={isNight} />
        
        {/* 파티클 (꽃잎/나뭇잎) */}
        {[...Array(15)].map((_, i) => (
          <SeasonParticle key={`p-${i}`} emoji={theme.particle} index={i} />
        ))}

        {/* 캐릭터 */}
        {members.map((member, idx) => (
          <ClimbingCharacter
            key={member.userId}
            member={member}
            index={idx}
            totalMembers={members.length}
            containerWidth={containerWidth}
            avatarColor={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── 파스텔톤 노을 풍경 (Pastel Sunset) ───
function MountainScene({ theme, isNight }: { theme: Theme; isNight?: boolean }) {
  const trailPath = useMemo(() => buildSmoothTrailPath(), []);

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
      <Defs>
        {/* 2. 원경 산맥 (눈 덮인 봉우리 - 선명한 눈모자) */}
        <LinearGradient id="farMountainGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="25%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="26%" stopColor="#CFD8DC" stopOpacity="1" />
          <Stop offset="100%" stopColor="#B0BEC5" stopOpacity="1" />
        </LinearGradient>

        {/* 3. 중경 숲 (눈 쌓인 나무 꼭대기 - 선명한 눈모자) */}
        <LinearGradient id="midForestGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="15%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="16%" stopColor="#A5D6A7" stopOpacity="1" />
          <Stop offset="100%" stopColor="#81C784" stopOpacity="1" />
        </LinearGradient>

        {/* 4. 근경 언덕 (눈 덮인 언덕 꼭대기 - 선명한 눈모자) */}
        <LinearGradient id="nearHillGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="18%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="20%" stopColor="#C5E1A5" stopOpacity="1" />
          <Stop offset="100%" stopColor="#AED581" stopOpacity="80" />
        </LinearGradient>

        {/* 5. 길 (흙길) */}
        <LinearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#EFEBE9" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#D7CCC8" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* 1. 하늘 배경 (제거됨 - 투명) */}
      {/* <Rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#skyGradient)" /> */}

      {/* ☀️ 해 (연한 색깔) - 제거됨 (HomeScreen으로 이동) */}

      {/* 2. 구름 (왼쪽 상단 뭉게구름) - 밤에는 숨김 */}
      {!isNight && (
        <>
          <G opacity="0.8" transform="translate(-20, 20)">
            <Circle cx="50" cy="50" r="30" fill="#FFF" />
            <Circle cx="80" cy="40" r="35" fill="#FFF" />
            <Circle cx="110" cy="50" r="30" fill="#FFF" />
            <Circle cx="80" cy="60" r="30" fill="#FFF" />
          </G>
          <G opacity="0.6" transform="translate(200, 50) scale(0.6)">
            <Circle cx="50" cy="50" r="30" fill="#FFF" />
            <Circle cx="80" cy="40" r="35" fill="#FFF" />
            <Circle cx="110" cy="50" r="30" fill="#FFF" />
          </G>
        </>
      )}

      {/* 3. 원경 산맥 (실루엣) */}
      <Path 
        d="M 0 300 L 50 220 L 120 280 L 180 200 L 250 260 L 320 220 L 400 300 V 400 H 0 Z" 
        fill="url(#farMountainGrad)" 
        opacity="0.7"
      />
      <Path 
        d="M -50 400 Q 150 280 350 320 T 500 300 V 400 H -50 Z" 
        fill="#B0BEC5" 
        opacity="0.4"
      />

      {/* 4. 중경 숲 (침엽수림 실루엣) */}
      {/* 왼쪽 숲 */}
      <G transform="translate(-20, 250)">
        <Polygon points="20,0 0,80 40,80" fill="url(#midForestGrad)" />
        <Polygon points="50,20 30,80 70,80" fill="url(#midForestGrad)" />
        <Polygon points="80,10 60,80 100,80" fill="url(#midForestGrad)" />
      </G>
      {/* 오른쪽 숲 */}
      <G transform="translate(250, 260)">
        <Polygon points="30,0 10,80 50,80" fill="url(#midForestGrad)" />
        <Polygon points="60,20 40,80 80,80" fill="url(#midForestGrad)" />
        <Polygon points="0,30 -20,80 20,80" fill="url(#midForestGrad)" />
      </G>

      {/* 5. 메인 언덕 (부드러운 곡선) */}
      <Path 
        d="M -20 400 C 50 400 20 200 175 40 C 330 200 300 400 370 400 Z" 
        fill="url(#nearHillGrad)" 
      />

      {/* 6. 길 (원근감) */}
      <Path 
        d={trailPath} 
        stroke="url(#pathGrad)" 
        strokeWidth={16} 
        strokeLinecap="round" 
        fill="none" 
      />
      {/* 길 중앙 점선 */}
      <Path 
        d={trailPath} 
        stroke="#8D6E63" 
        strokeWidth={2} 
        strokeDasharray="5 5" 
        strokeLinecap="round" 
        fill="none" 
        opacity="0.5"
      />

      {/* 7. 정상의 깃발 (Flag) */}
      <G transform="translate(168, 5) scale(0.4)">
        {/* 깃대 */}
        <Line x1="20" y1="70" x2="20" y2="0" stroke="#5D4037" strokeWidth="4" />
        {/* 깃발 */}
        <Path 
          d="M 20 5 C 40 0 60 10 80 5 L 80 35 C 60 40 40 30 20 35 Z" 
          fill="#FF7043" 
          stroke="#E64A19" 
          strokeWidth="2"
        />
        {/* 깃발 그림자/주름 */}
        <Path 
          d="M 20 5 C 40 0 60 10 80 5" 
          stroke="#FFF" 
          strokeWidth="2" 
          opacity="0.3" 
          fill="none"
        />
      </G>


    </Svg>
  );
}

function SeasonParticle({ emoji, index }: any) {
    const fall = useRef(new Animated.Value(0)).current;
    const sway = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(Animated.parallel([
            Animated.sequence([
                Animated.timing(fall, { toValue: 1, duration: 6000 + index * 1500, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
            Animated.sequence([
                Animated.timing(sway, { toValue: 1, duration: 2500, easing: Easing.sin, useNativeDriver: true }),
                Animated.timing(sway, { toValue: -1, duration: 2500, easing: Easing.sin, useNativeDriver: true }),
            ])
        ])).start();
    }, []);
    return (
        <Animated.View style={{
            position: 'absolute', left: `${20 + index * 30}%`, top: -20,
            transform: [{ translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, 380] }) },
                        { translateX: sway.interpolate({ inputRange: [-1, 1], outputRange: [-15, 15] }) }]
        }}>
            <Text style={{ fontSize: 18, opacity: 0.8 }}>{emoji}</Text>
        </Animated.View>
    );
}

function ClimbingCharacter({ member, index, totalMembers, containerWidth, avatarColor }: any) {
    const progress = Math.min(1, Math.max(0, member.totalGoals > 0 ? member.completedGoals / member.totalGoals : 0));
    const spreadOffset = totalMembers > 1 ? ((index / (totalMembers - 1)) * 2 - 1) * 20 : 0;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => { Animated.spring(progressAnim, { toValue: progress, tension: 10, friction: 8, useNativeDriver: false }).start(); }, [progress]);
    useEffect(() => { Animated.loop(Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -4, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ])).start(); }, []);
    
    const animatedLeft = progressAnim.interpolate({ inputRange: TRAIL_INPUT_RANGE, outputRange: TRAIL_POINTS.map(pt => (pt.x / SVG_W) * containerWidth + spreadOffset) });
    const animatedTop = progressAnim.interpolate({ inputRange: TRAIL_INPUT_RANGE, outputRange: TRAIL_POINTS.map(pt => (pt.y / SVG_H) * CONTAINER_HEIGHT) });

    return (
        <Animated.View style={[styles.characterWrapper, { left: animatedLeft, top: Animated.add(animatedTop, bounceAnim) }]}>
            {/* 말풍선 (종이 느낌) */}
            <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{Math.floor(progress * 100)}%</Text>
            </View>
            <View style={styles.bubbleTail} />

            {/* 캐릭터 (프로필 이미지 또는 닉네임 첫 글자) */}
            <View style={[styles.avatar, { backgroundColor: avatarColor, overflow: 'hidden' }]}>
                {member.profileImageUrl ? (
                    <Image source={{ uri: member.profileImageUrl }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>{member.nickname?.[0]}</Text>
                )}
            </View>
            {/* 그림자 */}
            <View style={styles.shadow} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
  sceneContainer: {
    width: '100%',
    height: CONTAINER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    // 프레임 제거, 자연스럽게 배치
  },
  sceneInner: {
    width: '100%',
    height: '100%',
  },
  characterWrapper: {
    position: 'absolute', alignItems: 'center', width: 40, marginLeft: -20, marginTop: -40, zIndex: 20,
  },
  bubble: {
    backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#5D4037', marginBottom: 0,
  },
  bubbleText: { fontSize: 10, fontWeight: '700', color: '#5D4037' },
  bubbleTail: {
    width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 4,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#5D4037', marginBottom: 2,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#5D4037', zIndex: 2,
  },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  avatarText: { color: '#5D4037', fontWeight: '800', fontSize: 14 },
  shadow: {
    width: 24, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.1)', marginTop: -3, zIndex: 1,
  },
});
