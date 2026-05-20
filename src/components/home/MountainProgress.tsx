import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Image } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { colors } from '../../design/tokens';

/** 등산로 네온 그라데이션 ID (Svg 내 유일) */
const GRAD_MAIN = 'mountainTrailNeonMain';
const GRAD_GLOW = 'mountainTrailNeonGlow';

const DEFAULT_CONTAINER_WIDTH = Dimensions.get('window').width;
const SVG_W = 310;
const SVG_H = 400;
/** 산 영역 세로 높이(이미지·SVG·캐릭터 Y 스케일 공통). 너비는 100% 유지, 산 PNG만 세로로 늘리려면 `mountainImage.resizeMode: 'stretch'` 유지 */
const CONTAINER_HEIGHT = 390;

const TRAIL_POINTS = [
  { x: 230, y: 310 },
  { x: 70, y: 270 },
  { x: 80, y: 240 },
  { x: 240, y: 200 },
  { x: 190, y: 150 },
  { x: 120, y: 110 },
  { x: 170, y: 65 },
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
  containerWidth: number;
  avatarColor: string;
  startAnimation?: boolean;
  isMe: boolean;
  stackTx: number;
  stackTy: number;
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

/** 같은 지점: 오른쪽·아래 **대각 일직선** 위에 멤버를 두고, 그 직선에 수직으로만 지그재그 */
const STACK_STEP_X = 18;
const STACK_STEP_Y = 2;
/** 대각선에 수직(말줄 좌우) 흔들림 크기 */
const ZIG_PERP_AMP = 12;

const STACK_DIAG_LEN = Math.hypot(STACK_STEP_X, STACK_STEP_Y);
/** (STEP_X, STEP_Y) 방향에 수직인 단위벡터 — 직선 좌우로 번갈아 밀 때 사용 */
const PERP_X = -STACK_STEP_Y / STACK_DIAG_LEN;
const PERP_Y = STACK_STEP_X / STACK_DIAG_LEN;

/**
 * rank마다 대각선을 따라 한 칸씩 이동 + 직선에 수직으로 ±진폭 (지그재그).
 */
function stackOffsetOnDiagonalZigzag(rank: number): { tx: number; ty: number } {
  const alongX = rank * STACK_STEP_X;
  const alongY = rank * STACK_STEP_Y;
  if (rank === 0) return { tx: alongX, ty: alongY };
  const perpSign = rank % 2 === 1 ? 1 : -1;
  const z = ZIG_PERP_AMP * perpSign;
  return {
    tx: alongX + z * PERP_X,
    ty: alongY + z * PERP_Y,
  };
}

function memberProgressRatio(m: MemberProgress): number {
  return Math.min(1, Math.max(0, m.totalGoals > 0 ? m.completedGoals / m.totalGoals : 0));
}

/**
 * 동일 진행률(정수 %) 그룹만: 대각 일직선 + 수직 지그재그.
 * `currentUserId`가 있으면 **마지막 rank** 슬롯.
 */
function computeStackOffsets(
  members: MemberProgress[],
  currentUserId: string | undefined,
): { tx: number[]; ty: number[] } {
  const n = members.length;
  const tx = Array(n).fill(0);
  const ty = Array(n).fill(0);
  if (n <= 1) return { tx, ty };

  const progress = members.map(memberProgressRatio);
  const bucket = (p: number) => Math.round(p * 100);
  const groups = new Map<number, number[]>();
  progress.forEach((p, i) => {
    const b = bucket(p);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)!.push(i);
  });

  groups.forEach((indices) => {
    if (indices.length <= 1) return;

    const meMemberIndex =
      currentUserId !== undefined
        ? indices.find((i) => members[i].userId === currentUserId)
        : undefined;
    const others =
      meMemberIndex !== undefined ? indices.filter((i) => i !== meMemberIndex) : indices;

    if (currentUserId !== undefined && meMemberIndex !== undefined && others.length >= 1) {
      const sortedOthers = [...others].sort((a, b) => a - b);
      sortedOthers.forEach((memberIndex, rank) => {
        const o = stackOffsetOnDiagonalZigzag(rank);
        tx[memberIndex] = o.tx;
        ty[memberIndex] = o.ty;
      });
      const lastRank = sortedOthers.length;
      const o = stackOffsetOnDiagonalZigzag(lastRank);
      tx[meMemberIndex] = o.tx;
      ty[meMemberIndex] = o.ty;
      return;
    }

    const sortedByOrder = [...indices].sort((a, b) => a - b);
    sortedByOrder.forEach((memberIndex, rank) => {
      const o = stackOffsetOnDiagonalZigzag(rank);
      tx[memberIndex] = o.tx;
      ty[memberIndex] = o.ty;
    });
  });

  return { tx, ty };
}

function withAlpha(hexColor: string, alphaHex: string) {
  return `${hexColor}${alphaHex}`;
}

export default function MountainProgress({
  members,
  currentUserId,
  startAnimation,
}: MountainProgressProps) {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH);

  const stackOffsets = useMemo(
    () => computeStackOffsets(members, currentUserId),
    [members, currentUserId],
  );

  /** 레이어: 나를 마지막에 그려 위에 올림 */
  const renderOrder = useMemo(() => {
    if (!currentUserId) {
      return members.map((member, originalIndex) => ({ member, originalIndex }));
    }
    const rest: { member: MemberProgress; originalIndex: number }[] = [];
    let me: { member: MemberProgress; originalIndex: number } | null = null;
    members.forEach((member, originalIndex) => {
      if (member.userId === currentUserId) me = { member, originalIndex };
      else rest.push({ member, originalIndex });
    });
    return me ? [...rest, me] : rest;
  }, [members, currentUserId]);

  return (
    <View style={styles.sceneContainer}>
      <View
        style={styles.sceneInner}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <MountainScene />

        {renderOrder.map(({ member, originalIndex }) => {
          const isMe = currentUserId != null && member.userId === currentUserId;
          const color = isMe
            ? MY_HIGHLIGHT_COLOR
            : AVATAR_COLORS[originalIndex % AVATAR_COLORS.length];
          return (
            <ClimbingCharacter
              key={member.userId}
              member={member}
              index={originalIndex}
              containerWidth={containerWidth}
              avatarColor={color}
              startAnimation={startAnimation}
              isMe={isMe}
              stackTx={stackOffsets.tx[originalIndex] ?? 0}
              stackTy={stackOffsets.ty[originalIndex] ?? 0}
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
      <Image source={require('../../../assets/mountain.png')} style={styles.mountainImage} />
      <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
        <Defs>
          {/* 등산로 대각선(시작점→정상) 방향, viewBox 좌표 */}
          <LinearGradient
            id={GRAD_MAIN}
            x1={24}
            y1={SVG_H - 20}
            x2={SVG_W - 24}
            y2={32}
            gradientUnits="userSpaceOnUse"
          >
            {/* 양끝: 시안(기존 중간) / 중앙: 핑크·코랄·퍼플·밝은 톤(기존 위·아래) */}
            <Stop offset="10%" stopColor="#05D9E8" stopOpacity={0.7} />
            <Stop offset="33%" stopColor="#FFF0F8" stopOpacity={0.7} />
            <Stop offset="40%" stopColor="#f8b500" stopOpacity={0.8} />
            <Stop offset="54%" stopColor="#ffafbd" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#f3f9a7" stopOpacity={0.9} />
          </LinearGradient>
          <LinearGradient
            id={GRAD_GLOW}
            x1={0}
            y1={SVG_H}
            x2={SVG_W}
            y2={0}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#FF2A6D" stopOpacity={0.5} />
            <Stop offset="42%" stopColor="#FFF0F8" stopOpacity={0.45} />
            <Stop offset="100%" stopColor="#FF2A6D" stopOpacity={0.4} />
          </LinearGradient>
        </Defs>

        {/* 바깥 블룸 — 그라데이션 글로우 */}
        <Path
          d={trailPath}
          stroke={`url(#${GRAD_GLOW})`}
          strokeWidth={22}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.55}
        />
        <Path
          d={trailPath}
          stroke={`url(#${GRAD_MAIN})`}
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.28}
        />
        {/* 중간 튜브 */}
        <Path
          d={trailPath}
          stroke={`url(#${GRAD_MAIN})`}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.62}
        />
        <Path
          d={trailPath}
          stroke={`url(#${GRAD_MAIN})`}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.88}
        />
        {/* 밝은 코어 + 하이라이트 */}
        <Path
          d={trailPath}
          stroke={`url(#${GRAD_MAIN})`}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={1}
        />
        <Path
          d={trailPath}
          stroke="#FFFFFF"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.95}
        />
        <Path
          d={trailPath}
          stroke={`url(#${GRAD_MAIN})`}
          strokeWidth={1.1}
          strokeDasharray="4 8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.85}
        />
      </Svg>
    </View>
  );
}

function ClimbingCharacter({
  member,
  index,
  containerWidth,
  avatarColor,
  startAnimation,
  isMe,
  stackTx,
  stackTy,
}: ClimbingCharacterProps) {
  const progress = Math.min(
    1,
    Math.max(0, member.totalGoals > 0 ? member.completedGoals / member.totalGoals : 0),
  );

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
    outputRange: TRAIL_POINTS.map((pt) => (pt.x / SVG_W) * containerWidth),
  });
  const animatedTop = progressAnim.interpolate({
    inputRange: TRAIL_INPUT_RANGE,
    outputRange: TRAIL_POINTS.map((pt) => (pt.y / SVG_H) * CONTAINER_HEIGHT),
  });

  return (
    <Animated.View
      style={[
        styles.characterWrapper,
        {
          left: animatedLeft,
          top: Animated.add(animatedTop, bounceAnim),
          zIndex: isMe ? 100 : 20 + index,
          elevation: isMe ? 14 : 4,
        },
      ]}
    >
      <View
        style={[
          styles.characterStack,
          { transform: [{ translateX: stackTx }, { translateY: stackTy }] },
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
              <Text style={[styles.avatarText, { color: avatarColor }]}>
                {member.nickname?.[0]}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.shadow, { backgroundColor: withAlpha(avatarColor, '15') }]} />
        <View style={styles.nicknameBadge}>
          <Text style={styles.nicknameText} numberOfLines={1}>
            {member.nickname ?? ''}
          </Text>
        </View>
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
    width: '96%',
    height: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  mountainImage: {
    width: '96%',
    height: '100%',
    resizeMode: 'stretch', // 'stretch',
    position: 'absolute',
  },
  characterWrapper: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -20,
    marginTop: -40,
    zIndex: 20,
  },
  characterStack: {
    alignItems: 'center',
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
