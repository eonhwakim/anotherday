import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, Dimensions, Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, {
  Path, Circle, G, Defs, LinearGradient, Stop, Line, RadialGradient, Rect
} from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { COLORS, SEASON_THEMES } from '../../constants/defaults';
import dayjs from '../../lib/dayjs';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTAINER_WIDTH = SCREEN_WIDTH;
const SVG_W = 310;
const SVG_H = 400;
const CONTAINER_HEIGHT = 380;
const DOME_WIDTH = SCREEN_WIDTH - 40;
const DOME_HEIGHT = CONTAINER_HEIGHT;

const TRAIL_POINTS = [
  { x: 200, y: 280 }, { x: 220, y: 290 }, { x: 120, y: 240 },
  { x: 90, y: 190 }, { x: 190, y: 150 }, { x: 180, y: 120 },
  { x: 135, y: 90 }, { x: 175, y: 65 },
] as const;

const TRAIL_INPUT_RANGE = TRAIL_POINTS.map((_, i) => i / (TRAIL_POINTS.length - 1));

const AVATAR_COLORS = [
  COLORS.holoCyan, COLORS.holoMint, COLORS.holoPink, COLORS.holoLavender,
  COLORS.success, COLORS.accent, '#B0B8C8', '#8890A0',
];

// type Theme = (typeof SEASON_THEMES)[keyof typeof SEASON_THEMES];

// function getSeasonTheme(): Theme {
//   const month = dayjs().month() + 1;
//   if (month >= 3 && month <= 5) return SEASON_THEMES.spring;
//   if (month >= 6 && month <= 8) return SEASON_THEMES.summer;
//   if (month >= 9 && month <= 11) return SEASON_THEMES.autumn;
//   return SEASON_THEMES.winter;
// }

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

const MY_HIGHLIGHT_COLOR = '#FFD93D';

export default function MountainProgress({ members, currentUserId, startAnimation, isNight, timePeriod = 'NIGHT' }: { members: MemberProgress[]; currentUserId?: string; startAnimation?: boolean; isNight?: boolean; timePeriod?: 'DAY' | 'SUNSET' | 'NIGHT' }) {
  // const theme = getSeasonTheme();
  const [containerWidth, setContainerWidth] = useState(CONTAINER_WIDTH);

  return (
    <View style={styles.sceneContainer}>
      <View
        style={styles.sceneInner}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <MountainScene isNight={isNight} timePeriod={timePeriod} />
        {/* {[...Array(10)].map((_, i) => (
          <GeometricParticle key={`p-${i}`} emoji={theme.particle} index={i} />
        ))} */}
        {members.map((member, idx) => {
          const isMe = currentUserId != null && member.userId === currentUserId;
          const color = isMe ? MY_HIGHLIGHT_COLOR : AVATAR_COLORS[idx % AVATAR_COLORS.length];
          return (
            <ClimbingCharacter
              key={member.userId}
              member={member}
              index={idx}
              totalMembers={members.length}
              containerWidth={containerWidth}
              avatarColor={color}
              startAnimation={startAnimation}
              isMe={isMe}
            />
          );
        })}
        {/* 유리 돔 오버레이 */}
        {/* <GlassDome width={containerWidth} height={CONTAINER_HEIGHT} /> */}
      </View>
    </View>
  );
}

// ─── 유리 돔 오버레이 ───
function GlassDome({ width, height }: { width: number; height: number }) {
  if (width === 0) return null;
  const R = 56;
  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const x = pad;
  const y = pad;

  return (
    <Svg
      width={width}
      height={height}
      style={[StyleSheet.absoluteFill, { zIndex: 50 }]}
      pointerEvents="none"
    >
      <Defs>
        {/* 유리 내부 매우 미묘한 필 */}
        <LinearGradient id="domeGlass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.10" />
          <Stop offset="25%"  stopColor="#FFFFFF" stopOpacity="0.04" />
          <Stop offset="75%"  stopColor="#FFFFFF" stopOpacity="0.02" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.07" />
        </LinearGradient>
        {/* 테두리 그라디언트 — 좌상단 밝고 우하단 어둡게 */}
        <LinearGradient id="domeBorder" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.92" />
          <Stop offset="30%"  stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="60%"  stopColor="#FFFFFF" stopOpacity="0.22" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.65" />
        </LinearGradient>
        {/* 상단 반사광 그라디언트 (가로) */}
        <LinearGradient id="domeTopShine" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.00" />
          <Stop offset="20%"  stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="50%"  stopColor="#FFFFFF" stopOpacity="0.70" />
          <Stop offset="80%"  stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00" />
        </LinearGradient>
        {/* 좌측 반사광 (세로) */}
        <LinearGradient id="domeLeftShine" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.00" />
          <Stop offset="20%"  stopColor="#FFFFFF" stopOpacity="0.50" />
          <Stop offset="55%"  stopColor="#FFFFFF" stopOpacity="0.28" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00" />
        </LinearGradient>
        {/* 하단 받침대 그라디언트 */}
        <LinearGradient id="domeBase" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.00" />
          <Stop offset="20%"  stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="50%"  stopColor="#FFFFFF" stopOpacity="0.70" />
          <Stop offset="80%"  stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00" />
        </LinearGradient>
      </Defs>

      {/* 유리 내부 필 */}
      <Rect x={x} y={y} width={w} height={h} rx={R} ry={R} fill="url(#domeGlass)" />

      {/* 메인 유리 테두리 */}
      <Rect x={x} y={y} width={w} height={h} rx={R} ry={R}
        fill="none" stroke="url(#domeBorder)" strokeWidth={2.2}
      />

      {/* 상단 굵은 반사 하이라이트 */}
      <Rect
        x={x + 28} y={y + 4}
        width={w - 56} height={5}
        rx={2.5} ry={2.5}
        fill="url(#domeTopShine)"
      />
      {/* 상단 얇은 2차 반사선 */}
      <Rect
        x={x + 50} y={y + 2.5}
        width={w - 100} height={2}
        rx={1}
        fill="#FFFFFF" opacity={0.45}
      />

      {/* 좌측 반사 세로 라인 */}
      <Rect
        x={x + 4} y={y + 28}
        width={4} height={h - 80}
        rx={2}
        fill="url(#domeLeftShine)"
      />

      {/* 하단 받침대 라인 */}
      <Rect
        x={x + 20} y={y + h - 6}
        width={w - 40} height={3}
        rx={1.5}
        fill="url(#domeBase)"
      />
    </Svg>
  );
}

function MountainScene({ isNight = false, timePeriod = 'NIGHT' }: { isNight?: boolean; timePeriod?: string }) {
  const trailPath = useMemo(() => buildSmoothTrailPath(), []);

  return (
    <View style={{ width: '100%', height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
      <Image 
        source={require('../../../assets/mountain.png')} 
        style={{ width: '100%', height: '100%', resizeMode: 'contain', position: 'absolute' }} 
      />
    <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
        {/* 빛나는 흰색 경로 라인 */}
        <Path d={trailPath} stroke="#FFFFFF" strokeWidth={16} strokeLinecap="round" fill="none" opacity={0.3} />
        <Path d={trailPath} stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.6} />
        <Path d={trailPath} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" fill="none" opacity={1} />
    </Svg>
    </View>
  );
}

function GeometricParticle({ emoji, index }: any) {
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
      ]),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: `${20 + index * 30}%`, top: -20,
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, 380] }) },
        { translateX: sway.interpolate({ inputRange: [-1, 1], outputRange: [-15, 15] }) },
      ],
    }}>
      <Text style={{ fontSize: 10, opacity: 0.3, color: COLORS.holoLavender }}>{emoji}</Text>
    </Animated.View>
  );
}

function ClimbingCharacter({ member, index, totalMembers, containerWidth, avatarColor, startAnimation, isMe }: any) {
  const progress = Math.min(1, Math.max(0, member.totalGoals > 0 ? member.completedGoals / member.totalGoals : 0));
  
  // 퍼센트가 같은 멤버들끼리 겹치지 않도록 퍼센트 기반으로 그룹화하여 오프셋을 계산합니다.
  // (이 로직은 부모 컴포넌트에서 계산해서 넘겨주는 것이 더 정확하지만, 여기서는 간단히 index를 사용하여 더 넓게 퍼지도록 수정합니다)
  const spreadOffset = totalMembers > 1 ? ((index / (totalMembers - 1)) * 2 - 1) * 28 : 0;
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const displayPercent = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  // startAnimation이 true가 되면 0% → 목표 퍼센트까지 클라이밍 시작
  useEffect(() => {
    if (startAnimation && !hasStarted.current) {
      hasStarted.current = true;
      // 멤버별로 약간의 딜레이를 줘서 순차적으로 올라가는 느낌
      const delay = index * 100;
      setTimeout(() => {
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 1200 + progress * 1500, // 높이 올라갈수록 더 오래 걸림
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
        Animated.timing(displayPercent, {
          toValue: progress * 100,
          duration: 1200 + progress * 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, delay);
    }
  }, [startAnimation, progress]);

  // startAnimation이 false가 되면 (탭 이동 등으로 포커스 아웃됐다가 다시 돌아올 때)
  // 상태를 리셋하여 0%부터 다시 시작하도록 함
  useEffect(() => {
    if (!startAnimation) {
      hasStarted.current = false;
      progressAnim.setValue(0);
      displayPercent.setValue(0);
      bounceAnim.setValue(0);
    }
  }, [startAnimation]);

  // 데이터가 변경될 때 (이미 애니메이션 시작 후 리프레시)
  useEffect(() => {
    if (hasStarted.current) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      Animated.timing(displayPercent, {
        toValue: progress * 100,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  // 통통 바운스 (클라이밍 시작 후에만)
  useEffect(() => {
    if (startAnimation) {
      const delay = index * 200 + 400;
      const timeout = setTimeout(() => {
        Animated.loop(Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -4, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ])).start();
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [startAnimation]);

  const animatedLeft = progressAnim.interpolate({ inputRange: TRAIL_INPUT_RANGE, outputRange: TRAIL_POINTS.map(pt => (pt.x / SVG_W) * containerWidth + spreadOffset) });
  const animatedTop = progressAnim.interpolate({ inputRange: TRAIL_INPUT_RANGE, outputRange: TRAIL_POINTS.map(pt => (pt.y / SVG_H) * CONTAINER_HEIGHT) });

  return (
    <Animated.View style={[styles.characterWrapper, { left: animatedLeft, top: Animated.add(animatedTop, bounceAnim), zIndex: isMe ? 30 : 20 }]}>
      <View style={[styles.bubble, { borderColor: COLORS.holoLavender1 }]}>
        <PercentLabel value={displayPercent} color={COLORS.sky} />
      </View>
      <View style={[styles.bubbleTail, { borderTopColor: avatarColor + '50' }]} />
      <View style={[styles.avatarGlow, { shadowColor: avatarColor }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColor + '20', borderColor: avatarColor }]}>
          {member.profileImageUrl ? (
            <Image source={{ uri: member.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: avatarColor }]}>{member.nickname?.[0]}</Text>
          )}
        </View>
      </View>
      <View style={[styles.shadow, { backgroundColor: avatarColor + '15' }]} />
      <View style={styles.nicknameBadge}>
        <Text style={styles.nicknameText} numberOfLines={1}>{member.nickname ?? ''}</Text>
      </View>
    </Animated.View>
  );
}

/** 퍼센트 숫자가 올라가는 라벨 */
function PercentLabel({ value, color }: { value: Animated.Value; color: string }) {
  const [display, setDisplay] = useState('0%');

  useEffect(() => {
    const id = value.addListener(({ value: v }) => {
      setDisplay(`${Math.floor(v)}%`);
    });
    return () => value.removeListener(id);
  }, [value]);

  return <Text style={[styles.bubbleText, { color, textAlign: 'center' }]}>{display}</Text>;
}

const styles = StyleSheet.create({
  sceneContainer: { width: '100%', height: CONTAINER_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  sceneInner: { width: '100%', height: '100%' },
  characterWrapper: { position: 'absolute', alignItems: 'center', marginLeft: -20, marginTop: -40, zIndex: 20 },
  bubble: { backgroundColor: 'rgba(5,5,16,0.75)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, marginBottom: 0 },
  bubbleText: { fontSize: 10, fontWeight: '700', color: COLORS.text, flexShrink: 0 },
  bubbleTail: { width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 4, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginBottom: 2 },
  avatarGlow: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10, elevation: 8, zIndex: 2, borderRadius: 18 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, overflow: 'hidden' },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  avatarText: { fontWeight: '800', fontSize: 14 },
  shadow: { width: 28, height: 6, borderRadius: 14, marginTop: -3, zIndex: 1 },
  nicknameBadge: { 
    backgroundColor: 'rgba(5,5,16,0.70)', 
    paddingHorizontal: 6, 
    paddingVertical: 1, 
    borderRadius: 4, 
    marginTop: 1,
    maxWidth: 60,
  },
  nicknameText: { 
    fontSize: 8, 
    fontWeight: '700', 
    color: 'rgba(255,255,255,0.80)', 
    textAlign: 'center',
  },
});
