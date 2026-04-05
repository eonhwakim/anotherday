import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { colors } from '../../design/tokens';

const DEFAULT_CONTAINER_WIDTH = Dimensions.get('window').width;
const SVG_W = 310;
const SVG_H = 400;
/** 산 영역 세로 높이(이미지·SVG·캐릭터 Y 스케일 공통). 너비는 100% 유지, 산 PNG만 세로로 늘리려면 `mountainImage.resizeMode: 'stretch'` 유지 */
const CONTAINER_HEIGHT = 540;

const TRAIL_POINTS = [
  { x: 128, y: 350 },
  { x: 200, y: 320 },
  { x: 250, y: 280 },
  { x: 120, y: 250 },
  { x: 50, y: 220 },
  { x: 180, y: 165 },
  { x: 170, y: 135 },
  { x: 125, y: 100 },
  { x: 165, y: 65 },
] as const;

const TRAIL_INPUT_RANGE = TRAIL_POINTS.map((_, i) => i / (TRAIL_POINTS.length - 1));

const AVATAR_COLORS = [
  colors.primary,
  colors.holoMint,
  colors.holoPink,
  colors.holoLavender,
  colors.success,
  colors.yellow,
  '#B0B8C8',
  '#8890A0',
];

interface MountainProgressProps {
  members: MemberProgress[];
  currentUserId?: string;
  startAnimation?: boolean;
}

interface ClimbingCharacterProps {
  member: MemberProgress;
  index: number;
  totalMembers: number;
  containerWidth: number;
  avatarColor: string;
  startAnimation?: boolean;
  isMe: boolean;
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

const MY_HIGHLIGHT_COLOR = colors.yellow;

function withAlpha(hexColor: string, alphaHex: string) {
  return `${hexColor}${alphaHex}`;
}

export default function MountainProgress({
  members,
  currentUserId,
  startAnimation,
}: MountainProgressProps) {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH);

  return (
    <View style={styles.sceneContainer}>
      <View
        style={styles.sceneInner}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <MountainScene />

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
      </View>
    </View>
  );
}

function MountainScene() {
  const trailPath = useMemo(() => buildSmoothTrailPath(), []);

  return (
    <View style={styles.mountainScene}>
      <Image source={require('../../../assets/kingdom.png')} style={styles.mountainImage} />
      <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
        {/* 빛나는 흰색 경로 라인 */}
        <Path
          d={trailPath}
          stroke="#FFFFFF"
          strokeWidth={16}
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />
        <Path
          d={trailPath}
          stroke="#FFFFFF"
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
        />
        <Path
          d={trailPath}
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeDasharray="6 6"
          strokeLinecap="round"
          fill="none"
          opacity={1}
        />
      </Svg>
    </View>
  );
}

function ClimbingCharacter({
  member,
  index,
  totalMembers,
  containerWidth,
  avatarColor,
  startAnimation,
  isMe,
}: ClimbingCharacterProps) {
  const progress = Math.min(
    1,
    Math.max(0, member.totalGoals > 0 ? member.completedGoals / member.totalGoals : 0),
  );

  // 퍼센트가 같은 멤버들끼리 겹치지 않도록 퍼센트 기반으로 그룹화하여 오프셋을 계산합니다.
  // (이 로직은 부모 컴포넌트에서 계산해서 넘겨주는 것이 더 정확하지만, 여기서는 간단히 index를 사용하여 더 넓게 퍼지도록 수정합니다)
  const spreadOffset = totalMembers > 1 ? ((index / (totalMembers - 1)) * 2 - 1) * 28 : 0;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const displayPercent = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  // startAnimation이 true가 되면 0% → 목표 퍼센트까지 클라이밍 시작
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (startAnimation && !hasStarted.current) {
      hasStarted.current = true;
      timeoutId = setTimeout(() => {
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
      }, index * 100);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [startAnimation, progress, index, displayPercent, progressAnim]);

  // startAnimation이 false가 되면 (탭 이동 등으로 포커스 아웃됐다가 다시 돌아올 때)
  // 상태를 리셋하여 0%부터 다시 시작하도록 함
  useEffect(() => {
    if (!startAnimation) {
      hasStarted.current = false;
      progressAnim.setValue(0);
      displayPercent.setValue(0);
      bounceAnim.setValue(0);
    }
  }, [startAnimation, bounceAnim, displayPercent, progressAnim]);

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
  }, [progress, displayPercent, progressAnim]);

  // 통통 바운스 (클라이밍 시작 후에만)
  useEffect(() => {
    if (startAnimation) {
      const delay = index * 200 + 400;
      const timeout = setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: -4,
              duration: 800,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(bounceAnim, {
              toValue: 0,
              duration: 800,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
          ]),
        ).start();
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [startAnimation, index, bounceAnim]);

  const animatedLeft = progressAnim.interpolate({
    inputRange: TRAIL_INPUT_RANGE,
    outputRange: TRAIL_POINTS.map((pt) => (pt.x / SVG_W) * containerWidth + spreadOffset),
  });
  const animatedTop = progressAnim.interpolate({
    inputRange: TRAIL_INPUT_RANGE,
    outputRange: TRAIL_POINTS.map((pt) => (pt.y / SVG_H) * CONTAINER_HEIGHT),
  });

  return (
    <Animated.View
      style={[
        styles.characterWrapper,
        { left: animatedLeft, top: Animated.add(animatedTop, bounceAnim), zIndex: isMe ? 30 : 20 },
      ]}
    >
      <View style={[styles.bubble, { borderColor: isMe ? MY_HIGHLIGHT_COLOR : colors.holoCyan }]}>
        <PercentLabel value={displayPercent} color={colors.sauvignonBlush} />
      </View>
      <View style={[styles.bubbleTail, { borderTopColor: withAlpha(avatarColor, '50') }]} />
      <View style={[styles.avatarGlow, { shadowColor: avatarColor }]}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: withAlpha(avatarColor, '20'), borderColor: avatarColor },
          ]}
        >
          {member.profileImageUrl ? (
            <Image source={{ uri: member.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: avatarColor }]}>{member.nickname?.[0]}</Text>
          )}
        </View>
      </View>
      <View style={[styles.shadow, { backgroundColor: withAlpha(avatarColor, '15') }]} />
      <View style={styles.nicknameBadge}>
        <Text style={styles.nicknameText} numberOfLines={1}>
          {member.nickname ?? ''}
        </Text>
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
  sceneContainer: {
    width: '100%',
    height: CONTAINER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneInner: {
    width: '100%',
    height: '100%',
  },
  mountainScene: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  mountainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain', // 'stretch',
    position: 'absolute',
  },
  characterWrapper: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -20,
    marginTop: -40,
    zIndex: 20,
  },
  bubble: {
    backgroundColor: 'rgba(5, 5, 16, 0.62)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.2,
    marginBottom: 0,
  },
  bubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 0,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 2,
  },
  avatarGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 2,
    borderRadius: 18,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 16,
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 16,
  },
  shadow: {
    width: 28,
    height: 6,
    borderRadius: 14,
    marginTop: -3,
    zIndex: 1,
  },
  nicknameBadge: {
    backgroundColor: 'rgba(5,5,16,0.70)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 1,
    maxWidth: 70,
  },
  nicknameText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.80)',
    textAlign: 'center',
  },
});
