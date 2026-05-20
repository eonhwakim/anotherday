import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Image } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Mask, Rect, G } from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { colors } from '../../design/tokens';

const DEFAULT_CONTAINER_WIDTH = Dimensions.get('window').width;
const SVG_W = 340;
const SVG_H = 400;
/** 산 영역 세로 높이(이미지·SVG·캐릭터 Y 스케일 공통). 너비는 100% 유지, 산 PNG만 세로로 늘리려면 `mountainImage.resizeMode: 'stretch'` 유지 */
const CONTAINER_HEIGHT = 370;

const BOTTOM_Y = 340;
const TOP_Y = 60; // 로프가 끝까지 올라가도록 다시 복구

const AVATAR_COLORS = [colors.holoMint, colors.holoLavender, colors.holoCyan, colors.holoRed];

interface ClimbingProgressProps {
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
  memberX: number;
}

const MY_HIGHLIGHT_COLOR = colors.yellow;

function getMemberX(index: number, total: number) {
  if (total <= 1) return SVG_W / 2;
  const maxTotalWidth = SVG_W - 80; // 양옆 여백 40씩
  const spacing = Math.min(50, maxTotalWidth / (total - 1));
  const offset = (index - (total - 1) / 2) * spacing;
  return SVG_W / 2 + offset;
}

function withAlpha(hexColor: string, alphaHex: string) {
  return `${hexColor}${alphaHex}`;
}

export default function ClimbingProgress({
  members,
  currentUserId,
  startAnimation,
}: ClimbingProgressProps) {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH);

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
        <MountainScene members={members} />

        {renderOrder.map(({ member, originalIndex }) => {
          const isMe = currentUserId != null && member.userId === currentUserId;
          const color = isMe
            ? MY_HIGHLIGHT_COLOR
            : AVATAR_COLORS[originalIndex % AVATAR_COLORS.length];
          const memberX = getMemberX(originalIndex, members.length);

          return (
            <ClimbingCharacter
              key={member.userId}
              member={member}
              index={originalIndex}
              containerWidth={containerWidth}
              avatarColor={color}
              startAnimation={startAnimation}
              isMe={isMe}
              memberX={memberX}
            />
          );
        })}
      </View>
    </View>
  );
}

function MountainScene({ members }: { members: MemberProgress[] }) {
  const allTrailsPath = useMemo(() => {
    if (members.length === 0) return '';
    return members
      .map((_, i) => {
        const x = getMemberX(i, members.length);
        return `M ${x} ${BOTTOM_Y} L ${x} ${TOP_Y}`;
      })
      .join(' ');
  }, [members.length]);

  return (
    <View style={styles.mountainScene}>
      <Image source={require('../../../assets/mountain-2.png')} style={styles.mountainImage} />
      <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
        <Defs>
          {/* 로프가 위로 갈수록 투명해지는 마스크용 그라데이션 */}
          <LinearGradient
            id="ropeFadeMask"
            x1="0"
            y1={BOTTOM_Y}
            x2="0"
            y2={TOP_Y}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={colors.white} stopOpacity="1" />
            <Stop offset="60%" stopColor={colors.white} stopOpacity="1" />
            <Stop offset="90%" stopColor={colors.white} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={colors.white} stopOpacity="0" />
          </LinearGradient>

          <Mask id="fadeMask" x="0" y="0" width="100%" height="100%" maskUnits="userSpaceOnUse">
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#ropeFadeMask)" />
          </Mask>
        </Defs>

        <G mask="url(#fadeMask)">
          {/* 암벽 등반 로프 그림자 */}
          <Path
            d={allTrailsPath}
            stroke={colors.black30}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* 로프 바탕 (클라이밍 로프 특유의 선명한 오렌지색) */}
          <Path
            d={allTrailsPath}
            stroke={colors.primaryDark}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* 로프 꼬임 패턴 1 (검정색 지그재그 느낌) */}
          <Path
            d={allTrailsPath}
            stroke="#2B2D42"
            strokeWidth={5}
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* 로프 꼬임 패턴 2 (노란색 포인트) */}
          <Path
            d={allTrailsPath}
            stroke={colors.yellow}
            strokeWidth={4}
            strokeDasharray="2 10"
            strokeDashoffset="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* 로프 중앙 하이라이트 (원통형 입체감 부여) */}
          <Path
            d={allTrailsPath}
            stroke={colors.white40}
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>
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
  memberX,
}: ClimbingCharacterProps) {
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

  // startAnimation이 true가 되면 0% → 목표 퍼센트까지 클라이밍 시작
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
          duration: climbDuration, // 높이 올라갈수록 더 오래 걸림
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

      // 100% 달성 시 깃발 애니메이션
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
        ); // 클라이밍이 끝난 직후(200ms 여유) 깃발 등장
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

  // startAnimation이 false가 되면 (탭 이동 등으로 포커스 아웃됐다가 다시 돌아올 때)
  // 상태를 리셋하여 0%부터 다시 시작하도록 함
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

  const animatedLeft = (memberX / SVG_W) * containerWidth;
  const animatedTop = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [(BOTTOM_Y / SVG_H) * CONTAINER_HEIGHT, (TOP_Y / SVG_H) * CONTAINER_HEIGHT],
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

        <View style={styles.climberContainer}>
          <Image
            source={
              index % 2 === 0
                ? require('../../../assets/human-3.png')
                : require('../../../assets/human-4.png')
            }
            style={styles.climberImage}
          />
          <View
            style={[
              styles.avatarGlow,
              {
                shadowColor: avatarColor,
                left: index % 2 === 0 ? 9 : 10, // 아바타가 커졌으므로 left 값을 줄여서 중앙 정렬
                top: index % 2 === 0 ? 2 : 3, // 머리 위치에 맞게 top 미세 조정
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
    width: '95%',
    height: '95%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  mountainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
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
    top: 3, // 머리가 커졌으므로 조금 위로
  },
  avatar: {
    width: 26, // 머리 크기에 맞춰 아바타 크기 확대
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
  climberContainer: {
    position: 'relative',
    width: 50,
    height: 70,
    alignItems: 'center',
  },
  climberImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  shadow: {
    width: 28,
    height: 6,
    borderRadius: 14,
    marginTop: -3,
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
    top: -42, // 말풍선 위로 올라오도록 위치 조정
    right: -8, // 살짝 우측에 배치
    width: 42,
    height: 42,
    resizeMode: 'contain',
    zIndex: 50,
  },
});
