import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Image } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { colors } from '../../design/tokens';

const DEFAULT_CONTAINER_WIDTH = Dimensions.get('window').width;
const SVG_W = 340;
const SVG_H = 365;
const CONTAINER_HEIGHT = 370;

const TRACK_START_X = 90;
const TRACK_START_Y = 70;
const TRACK_FINISH_X = 250;
const TRACK_FINISH_Y = 260;

const AVATAR_COLORS = [colors.holoMint, colors.holoLavender, colors.holoCyan, colors.holoRed];

interface RacingProgressProps {
  members: MemberProgress[];
  currentUserId?: string;
  startAnimation?: boolean;
}

interface RacingCharacterProps {
  member: MemberProgress;
  index: number;
  totalMembers: number;
  containerWidth: number;
  avatarColor: string;
  startAnimation?: boolean;
  isMe: boolean;
}

const MY_HIGHLIGHT_COLOR = colors.yellow;

function getMemberStartEnd(index: number, _total: number) {
  const trackCount = 2;
  const trackIndex = index % trackCount;
  const laneSpread = 33;
  const laneOffset = (trackIndex - (trackCount - 1) / 2) * laneSpread;

  const dx = TRACK_FINISH_X - TRACK_START_X;
  const dy = TRACK_FINISH_Y - TRACK_START_Y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const px = -dy / len;
  const py = dx / len;

  return {
    sx: TRACK_START_X + px * laneOffset,
    sy: TRACK_START_Y + py * laneOffset,
    fx: TRACK_FINISH_X + px * laneOffset,
    fy: TRACK_FINISH_Y + py * laneOffset,
  };
}

/** 같은 레인에서 뒤에 겹치는 멤버만 시작 시 살짝 위로 (px, 화면 Y 음수) */
function getStackLift(index: number, total: number) {
  const slotOnTrack = Math.floor(index / 2);
  const slotsOnTrack = Math.max(1, Math.ceil(total / 2));
  if (slotsOnTrack <= 1) return 0;
  const STACK_STEP = 10;
  return (slotsOnTrack - 1 - slotOnTrack) * STACK_STEP;
}

function withAlpha(hexColor: string, alphaHex: string) {
  return `${hexColor}${alphaHex}`;
}

export default function RacingProgress({
  members,
  currentUserId,
  startAnimation,
}: RacingProgressProps) {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH);

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
        <RacingScene members={members} />

        {renderOrder.map(({ member, originalIndex }) => {
          const isMe = currentUserId != null && member.userId === currentUserId;
          const color = isMe
            ? MY_HIGHLIGHT_COLOR
            : AVATAR_COLORS[originalIndex % AVATAR_COLORS.length];

          return (
            <RacingCharacter
              key={member.userId}
              member={member}
              index={originalIndex}
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

function RacingScene({ members }: { members: MemberProgress[] }) {
  // 길을 2개로 고정하여 그리기
  const allTrailsPath = useMemo(() => {
    const paths = [];
    for (let i = 0; i < 2; i++) {
      const { sx, sy, fx, fy } = getMemberStartEnd(i, 2);
      paths.push(`M ${sx} ${sy} L ${fx} ${fy}`);
    }
    return paths.join(' ');
  }, []);

  return (
    <View style={styles.racingScene}>
      <Image source={require('../../../assets/trail.png')} style={styles.racingImage} />
      <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
        <Defs>
          {/* 빛이 퍼지는 느낌을 위한 그라데이션 필터 (선택적 사용) */}
          <LinearGradient id="glowGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.white} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.white} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* 1. 빛이 퍼지는 느낌의 넓은 배경 (Glow 효과) */}
        <Path
          d={allTrailsPath}
          stroke="url(#glowGradient)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.5}
        />

        {/* 2. 선명한 흰색 실선 길 */}
        <Path
          d={allTrailsPath}
          stroke={colors.white}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function RacingCharacter({
  member,
  index,
  totalMembers,
  containerWidth,
  avatarColor,
  startAnimation,
  isMe,
}: RacingCharacterProps) {
  const progress = Math.min(
    1,
    Math.max(0, member.totalGoals > 0 ? member.completedGoals / member.totalGoals : 0),
  );

  const progressAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const displayPercent = useRef(new Animated.Value(0)).current;
  const flagOpacityAnim = useRef(new Animated.Value(0)).current;
  const flagFloatAnim = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let flagTimeoutId: ReturnType<typeof setTimeout> | null = null;

    if (startAnimation && !hasStarted.current) {
      hasStarted.current = true;
      const climbDuration = 1200 + progress * 1500;
      const delay = index * 100;

      timeoutId = setTimeout(() => {
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: climbDuration,
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

      if (progress === 1) {
        flagTimeoutId = setTimeout(
          () => {
            Animated.timing(flagOpacityAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }).start();

            Animated.loop(
              Animated.sequence([
                Animated.timing(flagFloatAnim, {
                  toValue: -8,
                  duration: 1200,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(flagFloatAnim, {
                  toValue: 0,
                  duration: 1200,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
              ]),
            ).start();
          },
          delay + climbDuration + 200,
        );
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (flagTimeoutId) clearTimeout(flagTimeoutId);
    };
  }, [
    startAnimation,
    progress,
    index,
    displayPercent,
    progressAnim,
    flagOpacityAnim,
    flagFloatAnim,
  ]);

  useEffect(() => {
    if (!startAnimation) {
      hasStarted.current = false;
      progressAnim.setValue(0);
      displayPercent.setValue(0);
      bounceAnim.setValue(0);
      flagOpacityAnim.setValue(0);
      flagFloatAnim.setValue(0);
    }
  }, [startAnimation, bounceAnim, displayPercent, progressAnim, flagOpacityAnim, flagFloatAnim]);

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

  const { sx, sy, fx, fy } = getMemberStartEnd(index, totalMembers);
  const stackLift = getStackLift(index, totalMembers);

  const animatedLeft = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [(sx / SVG_W) * containerWidth, (fx / SVG_W) * containerWidth],
  });
  const animatedTop = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [(sy / SVG_H) * CONTAINER_HEIGHT, (fy / SVG_H) * CONTAINER_HEIGHT],
  });
  const stackLiftAnim = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-stackLift, 0],
  });

  return (
    <Animated.View
      style={[
        styles.characterWrapper,
        {
          left: animatedLeft,
          top: Animated.add(Animated.add(animatedTop, bounceAnim), stackLiftAnim),
          zIndex: isMe ? 100 : 20 + index,
          elevation: isMe ? 14 : 4,
        },
      ]}
    >
      <View style={styles.characterStack}>
        {progress === 1 && (
          <Animated.Image
            source={require('../../../assets/flag-1.png')}
            style={[
              styles.flagImage,
              {
                opacity: flagOpacityAnim,
                transform: [{ translateY: flagFloatAnim }],
              },
            ]}
          />
        )}
        <View style={[styles.bubble, { borderColor: avatarColor }]}>
          <PercentLabel value={displayPercent} color={colors.sauvignonBlush} />
        </View>
        <View style={[styles.bubbleTail, { borderTopColor: avatarColor }]} />

        <View style={styles.carContainer}>
          <Image source={require('../../../assets/car-2.png')} style={styles.carImage} />
          <View
            style={[
              styles.avatarGlow,
              {
                shadowColor: avatarColor,
              },
            ]}
          >
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
        </View>

        <View
          style={[
            styles.shadow,
            {
              backgroundColor: withAlpha(avatarColor, '15'),
            },
          ]}
        />
        <View style={[styles.nicknameBadge]}>
          <Text style={styles.nicknameText} numberOfLines={1}>
            {member.nickname ?? ''}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

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
  racingScene: {
    width: '90%',
    height: '90%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  racingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
    position: 'absolute',
  },
  characterWrapper: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -40, // 차 너비(80)의 절반
    marginTop: -40, // 차와 아바타 높이 고려
    zIndex: 20,
  },
  characterStack: {
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: colors.black60,
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
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
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
    borderRadius: 16,
    position: 'absolute',
    top: -5, // 차 위에 떠있게 배치
    left: 27, // 차 중앙에 맞춤 (80/2 - 13)
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 26,
    height: 26,
    borderRadius: 15,
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 12,
  },
  carContainer: {
    position: 'relative',
    width: 88,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  shadow: {
    width: 40,
    height: 8,
    borderRadius: 20,
    marginTop: -5,
    zIndex: 1,
  },
  nicknameBadge: {
    backgroundColor: colors.black70,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 1,
    maxWidth: 70,
  },
  nicknameText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white80,
    textAlign: 'center',
  },
  flagImage: {
    position: 'absolute',
    top: -34,
    width: 38,
    height: 38,
    resizeMode: 'contain',
    zIndex: 50,
  },
});
