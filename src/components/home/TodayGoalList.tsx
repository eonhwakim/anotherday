import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle as SvgCircle,
  Rect,
} from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';

import CyberFrame from '../ui/CyberFrame';

interface TodayGoalListProps {
  members: MemberProgress[];
  currentUserId?: string;
  onAnimationFinish?: () => void;
}

// ─── Goal Chip ───
interface GoalChipProps {
  goalId: string;
  goalName: string;
  isDone: boolean;
  isPass: boolean;
  isInactive: boolean;
}

function GoalChip({ goalId, goalName, isDone, isPass, isInactive }: GoalChipProps) {
  const chipStyle = [
    styles.goalChip,
    isInactive && styles.goalChipInactive,
    isPass && styles.goalChipPass,
    isDone && styles.goalChipDone,
  ];
  const textStyle = [
    styles.goalChipText,
    isInactive && styles.goalChipTextInactive,
    isPass && styles.goalChipTextPass,
    isDone && styles.goalChipTextDone,
  ];

  return (
    <View key={goalId} style={chipStyle}>
      {isDone && (
        <Text style={styles.goalChipIcon}>✓</Text>
      )}
      <Text style={textStyle} numberOfLines={1}>
        {isPass ? '(패스) ' : ''}{goalName}
      </Text>
    </View>
  );
}

// ─── Member Card ───
interface MemberCardProps {
  member: MemberProgress;
  isMe: boolean;
  animVal: Animated.Value;
}

function MemberCard({ member, isMe, animVal }: MemberCardProps) {
  const allDone = member.totalGoals > 0 && member.completedGoals >= member.totalGoals;
  const animOpacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const animSlide = animVal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View
      style={[
        styles.memberRow,
        { opacity: animOpacity, transform: [{ translateY: animSlide }] },
      ]}
    >
      <View style={[styles.trailNode, allDone && styles.trailNodeDone]}>
        {member.profileImageUrl ? (
          <Image source={{ uri: member.profileImageUrl }} style={styles.avatarImg} />
        ) : (
          <Text style={[styles.avatarInitial, allDone && styles.avatarInitialDone]}>
            {member.nickname.charAt(0)}
          </Text>
        )}
        {allDone && (
          <View style={styles.doneCheckBadge}>
            <Ionicons name="checkmark-sharp" size={12} color="#000" />
            <Text style={{ display: 'none' }}>✓</Text>
          </View>
        )}
      </View>

      <CyberFrame
        style={styles.memberCard}
        contentStyle={styles.memberCardContent}
      >
        <View style={styles.memberHeader}>
          <Text style={[styles.memberName, isMe && styles.memberNameMe]} numberOfLines={1}>
            {member.nickname}{isMe ? ' (나)' : ''}
          </Text>
          <Text style={styles.memberCount}>
            {member.completedGoals}/{member.totalGoals}
          </Text>
        </View>

        {member.goalDetails.length > 0 ? (
          <View style={styles.goalChips}>
            {member.goalDetails.map((g) => {
              const isInactive = g.isActive === false && !g.isDone && !g.isPass;
              return (
                <GoalChip
                  key={g.goalId}
                  goalId={g.goalId}
                  goalName={g.goalName}
                  isDone={g.isDone}
                  isPass={g.isPass ?? false}
                  isInactive={isInactive}
                />
              );
            })}
          </View>
        ) : (
          <Text style={styles.noGoalText}>오늘 목표 없음</Text>
        )}
      </CyberFrame>
    </Animated.View>
  );
}

// ─── Main Component ───
export default function TodayGoalList({ members, currentUserId, onAnimationFinish }: TodayGoalListProps) {
  const isFocused = useIsFocused();

  const totalAll = members.reduce((s, m) => s + m.totalGoals, 0);
  const completedAll = members.reduce((s, m) => s + m.completedGoals, 0);
  const progress = totalAll > 0 ? completedAll / totalAll : 0;

  const { badgeState, badgeMembers } = React.useMemo(() => {
    if (!members || members.length === 0) return { badgeState: 'START', badgeMembers: [] };

    const membersWithPct = members.map(m => ({
      ...m,
      pct: m.totalGoals > 0 ? m.completedGoals / m.totalGoals : 0,
    }));

    if (membersWithPct.every(m => m.pct >= 1)) {
      return { badgeState: 'ALL_CLEAR', badgeMembers: members };
    }

    const finishers = membersWithPct.filter(m => m.pct >= 1);
    if (finishers.length > 0) {
      return { badgeState: 'FINISHER', badgeMembers: finishers };
    }

    const activeMembers = membersWithPct.filter(m => m.completedGoals > 0);
    if (activeMembers.length === 0) {
      return { badgeState: 'START', badgeMembers: [] };
    }

    const sorted = [...activeMembers].sort((a, b) => b.pct - a.pct);
    const bestPct = sorted[0].pct;
    const top = sorted.filter(m => m.pct === bestPct);

    return { badgeState: 'LEADER', badgeMembers: top };
  }, [members]);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const badgeOpacityAnim = useRef(new Animated.Value(1)).current;
  const memberAnims = useRef(members.map(() => new Animated.Value(0))).current;

  const hasBadgeAnimatedRef = useRef(false);
  const sequenceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const staggerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (members.length !== memberAnims.length) {
      const wasEmpty = memberAnims.length === 0;
      memberAnims.length = 0;
      members.forEach(() => memberAnims.push(new Animated.Value(wasEmpty ? 0 : 1)));
    }
  }, [members.length]);

  useEffect(() => {
    if (!isFocused) {
      hasBadgeAnimatedRef.current = false;
      return;
    }

    if (hasBadgeAnimatedRef.current) {
      memberAnims.forEach((a) => a.setValue(1));
      return;
    }

    sequenceAnimRef.current?.stop();
    staggerAnimRef.current?.stop();
    memberAnims.forEach((a) => a.setValue(1));

    const timeoutId = setTimeout(() => {
      hasBadgeAnimatedRef.current = true;

      scaleAnim.setValue(0);
      translateYAnim.setValue(0);
      rotateAnim.setValue(0);
      badgeOpacityAnim.setValue(1);
      memberAnims.forEach((a) => a.setValue(0));

      const seq = Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.elastic(1.5)), useNativeDriver: true }),
          Animated.timing(translateYAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        Animated.delay(800),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(translateYAnim, { toValue: 2, duration: 700, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 0, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(badgeOpacityAnim, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]);
      sequenceAnimRef.current = seq;
      seq.start(({ finished }) => {
        if (finished && onAnimationFinish) onAnimationFinish();
      });

      const stag = Animated.stagger(
        150,
        memberAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.back(1.1)),
            useNativeDriver: true,
          }),
        ),
      );
      staggerAnimRef.current = stag;
      stag.start();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isFocused, progress, totalAll, badgeState]);

  const { width: screenWidth } = useWindowDimensions();
  const centerTranslateX = -(screenWidth / 2);

  const scale = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] });
  const translateY = translateYAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -250, -420] });
  const translateX = translateYAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, centerTranslateX, centerTranslateX + 80] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] });
  const glowOpacity = scaleAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });

  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return 0;
    });
  }, [members, currentUserId]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>TODAY'S MISSION</Text>
          <Text style={styles.hintText}>
            오늘 계획이 없는 주 N회 목표를 "패스"하면 달성률이 올라가요!
          </Text>
        </View>
        <Animated.View
          style={[
            styles.badgeWrapper,
            {
              opacity: badgeOpacityAnim,
              transform: [{ translateX }, { translateY }, { scale }, { rotate }],
              zIndex: 100,
            },
          ]}
        >
          <DynamicBadge state={badgeState} members={badgeMembers} isActive={false} />
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
            <DynamicBadge state={badgeState} members={badgeMembers} isActive={true} />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.trailContainer}>
        {sortedMembers.length === 0 ? (
          <View style={styles.emptyTrail}>
            <Ionicons name="flag-outline" size={24} color="rgba(26,26,26,0.18)" />
            <Text style={styles.emptyText}>목표를 추가해보세요</Text>
          </View>
        ) : (
          <>
            {sortedMembers.map((member, idx) => (
              <MemberCard
                key={member.userId}
                member={member}
                isMe={member.userId === currentUserId}
                animVal={memberAnims[idx] ?? new Animated.Value(1)}
              />
            ))}

            {progress === 1 && members.length > 0 && (
              <View style={styles.summitRow}>
                <View style={styles.trailNodeSummit}>
                  <Ionicons name="flag" size={14} color="#000" />
                </View>
                <Text style={styles.summitText}>모두 완료!</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Badge constants ───
const THUMB_UP = 'M50 8C50 2 64 2 64 10L66 42 92 42C98 42 102 48 102 54C102 58 100 61 97 62C100 64 102 68 102 72C102 76 100 79 97 80C100 82 102 86 102 90C102 94 99 98 94 98L48 98C42 98 36 94 34 88L26 70C24 66 20 64 16 64L12 64C8 64 6 60 6 56L6 46C6 42 8 40 12 40L34 40C40 40 44 34 46 26Z';
const THUMB_HIGHLIGHT = 'M50 10C50 4 62 4 63 11L64 42 88 42C92 42 96 46 96 50C96 54 94 56 92 57L50 57 50 10Z';

function DynamicBadge({ state, members, isActive }: { state: string; members: MemberProgress[]; isActive: boolean }) {
  if (state === 'START') return <StartBadge isActive={isActive} />;
  if (state === 'LEADER') return <LeaderBadge members={members} isActive={isActive} />;
  if (state === 'FINISHER') return <FinisherBadge members={members} isActive={isActive} />;
  if (state === 'ALL_CLEAR') return <AllClearBadge isActive={isActive} />;
  return null;
}

function AvatarGroup({ members, size, showName = false }: { members: MemberProgress[]; size: number; showName?: boolean }) {
  const count = members.length;
  const isSingle = count === 1;
  const isMany = count >= 3;

  const actualSize = isSingle ? size * 1.4 : isMany ? size * 0.72 : size;
  const nameSize = isSingle ? 10 : isMany ? 7 : 8;
  const rowGap = showName ? (isMany ? 8 : 14) : (isMany ? 2 : 4);
  const itemGap = showName ? (isMany ? 2 : 8) : -actualSize / 3;
  const nameTagTop = actualSize - (isSingle ? 8 : isMany ? 4 : 6);
  const nameTagMinWidth = isSingle ? actualSize + 4 : isMany ? actualSize + 8 : actualSize + 4;

  const rows: MemberProgress[][] = [];
  let remaining = [...members];
  while (remaining.length > 0) {
    if (remaining.length === 4) {
      rows.push(remaining.slice(0, 2));
      rows.push(remaining.slice(2, 4));
      break;
    }
    if (remaining.length <= 3) {
      rows.push(remaining);
      break;
    }
    rows.push(remaining.slice(0, 3));
    remaining = remaining.slice(3);
  }

  return (
    <View style={{ alignItems: 'center', gap: rowGap }}>
      {rows.map((rowMembers, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.avatarsRow}>
          {rowMembers.map((m, i) => (
            <View
              key={m.userId}
              style={{ width: actualSize, alignItems: 'center', marginLeft: i > 0 ? itemGap : 0, zIndex: 10 - i }}
            >
              <View style={[
                styles.medalAvatarWrap,
                { width: actualSize, height: actualSize, borderRadius: actualSize / 2, borderWidth: isMany ? 1.5 : 2 },
              ]}>
                {m.profileImageUrl ? (
                  <Image source={{ uri: m.profileImageUrl }} style={styles.medalAvatarImg} />
                ) : (
                  <View style={styles.medalAvatarFallback}>
                    <Text style={[styles.medalAvatarInitial, { fontSize: actualSize * 0.4 }]}>
                      {m.nickname.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              {showName && (
                <View style={[
                  styles.nameTag,
                  { top: nameTagTop, borderRadius: isMany ? 4 : 6, minWidth: nameTagMinWidth },
                ]}>
                  <Text style={[styles.nameTagText, { fontSize: nameSize }]}>
                    {m.nickname}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function StartBadge({ isActive }: { isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;
  const id = `start_${isActive}`;
  return (
    <View style={styles.thumbBadge}>
      <Svg width={110} height={110} viewBox="0 0 108 108" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}_fill`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFD93D" stopOpacity={String(0.3 * k)} />
            <Stop offset="100%" stopColor="#FF9A5C" stopOpacity={String(0.3 * k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_border`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFD93D" stopOpacity={String(0.8 * k)} />
            <Stop offset="50%" stopColor="#ef3b36" stopOpacity={String(0.8 * k)} />
            <Stop offset="100%" stopColor="#FF9A5C" stopOpacity={String(0.8 * k)} />
          </LinearGradient>
        </Defs>
        <SvgCircle cx="54" cy="54" r="42" fill={`url(#${id}_fill)`} stroke={`url(#${id}_border)`} strokeWidth={isActive ? 4 : 2} />
      </Svg>
      <View style={[styles.medalContentWrap, { top: 12, height: 84 }]}>
        <Text style={{ fontSize: 28 }}>🔥</Text>
        <Text style={[styles.holoText, styles.holoTextSm, { color: isActive ? '#FFF' : 'rgba(255,255,255,0.7)' }]}>
          첫 인증을{'\n'}기다려요!
        </Text>
      </View>
    </View>
  );
}

function LeaderBadge({ members, isActive }: { members: MemberProgress[]; isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;
  const textColor = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)';
  const id = `l_${isActive}`;

  return (
    <View style={styles.thumbBadge}>
      <Svg width={110} height={106} viewBox="0 0 108 106" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}_fill1`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#FF6B3D" stopOpacity={String(0.30 * k)} />
            <Stop offset="25%"  stopColor="#FFD93D" stopOpacity={String(0.25 * k)} />
            <Stop offset="50%"  stopColor="#FF9A5C" stopOpacity={String(0.28 * k)} />
            <Stop offset="75%"  stopColor="#FFB380" stopOpacity={String(0.22 * k)} />
            <Stop offset="100%" stopColor="#FF6B3D" stopOpacity={String(0.30 * k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_fill2`} x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#FFD93D" stopOpacity={String(0.15 * k)} />
            <Stop offset="40%"  stopColor="#FF9A5C" stopOpacity={String(0.12 * k)} />
            <Stop offset="100%" stopColor="#FF6B3D" stopOpacity={String(0.18 * k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_border`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#FF6B3D" stopOpacity={String(0.80 * k)} />
            <Stop offset="20%"  stopColor="#FFD93D" stopOpacity={String(0.65 * k)} />
            <Stop offset="40%"  stopColor="#FF9A5C" stopOpacity={String(0.70 * k)} />
            <Stop offset="60%"  stopColor="#FFB380" stopOpacity={String(0.60 * k)} />
            <Stop offset="80%"  stopColor="#FFD93D" stopOpacity={String(0.55 * k)} />
            <Stop offset="100%" stopColor="#FF6B3D" stopOpacity={String(0.80 * k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_bloomOuter`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#FF6B3D" stopOpacity={String(0.20 * k)} />
            <Stop offset="30%"  stopColor="#FFD93D" stopOpacity={String(0.14 * k)} />
            <Stop offset="60%"  stopColor="#FF9A5C" stopOpacity={String(0.16 * k)} />
            <Stop offset="100%" stopColor="#FFB380" stopOpacity={String(0.14 * k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_bloomMid`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#FF6B3D" stopOpacity={String(0.35 * k)} />
            <Stop offset="25%"  stopColor="#FFD93D" stopOpacity={String(0.28 * k)} />
            <Stop offset="50%"  stopColor="#FF9A5C" stopOpacity={String(0.32 * k)} />
            <Stop offset="75%"  stopColor="#FFB380" stopOpacity={String(0.25 * k)} />
            <Stop offset="100%" stopColor="#FF6B3D" stopOpacity={String(0.35 * k)} />
          </LinearGradient>
        </Defs>
        <Path d={THUMB_UP} fill="none" stroke={`url(#${id}_bloomOuter)`} strokeWidth={isActive ? 10 : 6} strokeLinejoin="round" />
        <Path d={THUMB_UP} fill="none" stroke={`url(#${id}_bloomMid)`} strokeWidth={isActive ? 5 : 3} strokeLinejoin="round" />
        <Path d={THUMB_UP} fill={`url(#${id}_fill1)`} />
        <Path d={THUMB_UP} fill={`url(#${id}_fill2)`} />
        <Path d={THUMB_UP} fill="none" stroke={`url(#${id}_border)`} strokeWidth={isActive ? 1.6 : 0.9} strokeLinejoin="round" />
      </Svg>

      <View style={styles.leaderAvatarWrap}>
        <AvatarGroup members={members} size={28} showName={true} />
      </View>

      <View style={styles.leaderLabelWrap}>
        <Text style={[styles.holoText, styles.holoTextSm, styles.badgeLabelShadow, { color: textColor }]}>
          {members.length > 1 ? '공동 선두!' : '현재 선두!'}
        </Text>
      </View>
    </View>
  );
}

function FinisherBadge({ members, isActive }: { members: MemberProgress[]; isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;
  const id = `f_${isActive}`;

  return (
    <View style={styles.finisherBadge}>
      <Svg width={120} height={120} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}_gold`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#FFE066" stopOpacity={String(0.9 * k)} />
            <Stop offset="30%"  stopColor="#FFF7CC" stopOpacity={String(0.95 * k)} />
            <Stop offset="50%"  stopColor="#FFD700" stopOpacity={String(0.9 * k)} />
            <Stop offset="80%"  stopColor="#FFA500" stopOpacity={String(0.95 * k)} />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity={String(0.9 * k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_border`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#FFD700" stopOpacity={String(k)} />
            <Stop offset="50%"  stopColor="#FFA500" stopOpacity={String(k)} />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity={String(k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_ribbon`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#FFD700" stopOpacity={String(k)} />
            <Stop offset="50%"  stopColor="#ffd89b" stopOpacity={String(k)} />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity={String(k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_ribbonDark`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#FFA500" stopOpacity={String(k)} />
            <Stop offset="50%"  stopColor="#ffffff" stopOpacity={String(k)} />
            <Stop offset="100%" stopColor="#CC7000" stopOpacity={String(k)} />
          </LinearGradient>
        </Defs>

        <Path d="M 15 75 L 2 75 L 10 85 L 2 95 L 30 95 L 30 75 Z" fill={`url(#${id}_ribbonDark)`} stroke={`url(#${id}_border)`} strokeWidth={isActive ? 2 : 1} strokeLinejoin="round" />
        <Path d="M 105 75 L 118 75 L 110 85 L 118 95 L 90 95 L 90 75 Z" fill={`url(#${id}_ribbonDark)`} stroke={`url(#${id}_border)`} strokeWidth={isActive ? 2 : 1} strokeLinejoin="round" />
        <SvgCircle cx="60" cy="48" r="44" fill={`url(#${id}_gold)`} stroke={`url(#${id}_border)`} strokeWidth={isActive ? 6 : 3} />
        <Rect x="20" y="72" width="80" height="28" rx="4" fill={`url(#${id}_ribbon)`} stroke={`url(#${id}_border)`} strokeWidth={isActive ? 3 : 1.5} />
      </Svg>

      <View style={styles.finisherAvatarWrap}>
        <AvatarGroup members={members} size={36} showName={true} />
      </View>

      <View style={styles.finisherLabelWrap}>
        <Text style={styles.finisherLabelText}>
          100% 달성
        </Text>
      </View>
    </View>
  );
}

function AllClearBadge({ isActive }: { isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;
  const id = `a_${isActive}`;
  return (
    <View style={styles.thumbBadge}>
      <Svg width={110} height={110} viewBox="0 0 108 108" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}_fill`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#4ADE80" stopOpacity={String(0.3 * k)} />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity={String(0.3 * k)} />
          </LinearGradient>
          <LinearGradient id={`${id}_border`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#4ADE80" stopOpacity={String(0.8 * k)} />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity={String(0.8 * k)} />
          </LinearGradient>
        </Defs>
        <SvgCircle cx="54" cy="54" r="42" fill={`url(#${id}_fill)`} stroke={`url(#${id}_border)`} strokeWidth={isActive ? 4 : 2} />
      </Svg>
      <View style={[styles.medalContentWrap, { top: 12, height: 84 }]}>
        <Text style={{ fontSize: 32 }}>🎉</Text>
        <Text style={[styles.holoText, { color: isActive ? '#FFF' : 'rgba(255,255,255,0.7)', marginTop: 2, fontSize: 14 }]}>
          모두{'\n'}클리어!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Layout ───
  container: {
    marginTop: 0,
    width: '100%',
    paddingHorizontal: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    height: 30,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(3, 3, 3, 0.59)',
    letterSpacing: 2,
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(26, 26, 26, 0.47)',
    marginTop: 4,
    lineHeight: 15,
  },
  badgeWrapper: {
    position: 'relative',
  },

  // ─── Trail ───
  trailContainer: {
    position: 'relative',
    paddingLeft: 26,
    width: '100%',
  },
  emptyTrail: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.40)',
    fontStyle: 'italic',
  },

  // ─── Member row ───
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
    width: '100%',
  },

  // ─── Trail node ───
  trailNode: {
    position: 'absolute',
    left: -36 + 3,
    top: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
    shadowColor: '#4A558F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  trailNodeDone: {
    borderColor: '#4ADE80',
    backgroundColor: '#4ADE80',
  },
  avatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A558F',
  },
  avatarInitialDone: {
    color: '#FFFFFF',
  },
  doneCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Member card ───
  memberCard: {
    flex: 1,
    width: '100%',
    marginTop: 4,
  },
  memberCardContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.55)',
    flex: 1,
  },
  memberNameMe: {
    color: '#1A1A1A',
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.35)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // ─── Goal chips ───
  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.54)',
  },
  goalChipDone: {
    backgroundColor: 'rgba(253, 143, 110, 0.92)',
  },
  goalChipPass: {
    backgroundColor: 'rgba(246, 111, 69, 0.29)',
  },
  goalChipInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  goalChipIcon: {
    marginRight: 3,
    color: '#ffffffff',
    fontWeight: '700',
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(26, 26, 26, 0.50)',
    maxWidth: 120,
  },
  goalChipTextDone: {
    color: '#ffffffff',
    fontWeight: '600',
  },
  goalChipTextPass: {
    color: '#9a9a9ae2',
  },
  goalChipTextInactive: {
    color: '#6e7178ff',
  },
  noGoalText: {
    fontSize: 12,
    color: '#A8B2D1',
    fontStyle: 'italic',
  },

  // ─── Summit ───
  summitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
    position: 'relative',
  },
  trailNodeSummit: {
    position: 'absolute',
    left: -36 + 3,
    top: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF6B3D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  summitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B3D',
    letterSpacing: 0.3,
  },

  // ─── Badge shared ───
  thumbBadge: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalContentWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holoText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  holoTextSm: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeLabelShadow: {
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ─── AvatarGroup ───
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFD93D',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalAvatarImg: {
    width: '100%',
    height: '100%',
  },
  medalAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 107, 61, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B3D',
  },
  nameTag: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    alignItems: 'center',
  },
  nameTagText: {
    color: '#FFF',
    fontWeight: '700',
  },

  // ─── Leader badge ───
  leaderAvatarWrap: {
    position: 'absolute',
    left: 12,
    right: 0,
    top: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderLabelWrap: {
    position: 'absolute',
    bottom: -8,
    left: -5,
    right: -30,
    alignItems: 'center',
  },

  // ─── Finisher badge ───
  finisherBadge: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finisherAvatarWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  finisherLabelWrap: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  finisherLabelText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
});
