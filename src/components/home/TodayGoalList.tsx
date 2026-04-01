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
import { useIsFocused } from '@react-navigation/native';
import type { MemberProgress } from '../../types/domain';
import { colors } from '../../design/tokens';
import CyberFrame from '../ui/CyberFrame';
import Pill from '../ui/Pill';
import DynamicBadge from './TodayGoalBadge';

interface MemberCardProps {
  member: MemberProgress;
  isMe: boolean;
  animVal: Animated.Value;
}
interface TodayGoalListProps {
  members: MemberProgress[];
  currentUserId?: string;
  onAnimationFinish?: () => void;
  isNight?: boolean;
}

interface GoalChipProps {
  goalName: string;
  isDone: boolean;
  isPass: boolean;
}

function GoalChip({ goalName, isDone, isPass }: GoalChipProps) {
  const chipStyle = [styles.goalChip, isPass && styles.goalChipPass, isDone && styles.goalChipDone];
  const textStyle = [
    styles.goalChipText,
    isPass && styles.goalChipTextPass,
    isDone && styles.goalChipTextDone,
  ];

  return (
    <Pill
      label={`${isPass ? '(패스) ' : ''}${goalName}`}
      icon={isDone ? <Text style={styles.goalChipIcon}>✓</Text> : undefined}
      numberOfLines={1}
      style={chipStyle}
      textStyle={textStyle}
    />
  );
}

function MemberCard({ member, isMe, animVal }: MemberCardProps) {
  const allDone = member.totalGoals > 0 && member.completedGoals >= member.totalGoals;
  const animOpacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const animSlide = animVal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View
      style={[styles.memberRow, { opacity: animOpacity, transform: [{ translateY: animSlide }] }]}
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

      <CyberFrame style={styles.memberCard} contentStyle={styles.memberCardContent}>
        <View style={styles.memberHeader}>
          <Text style={[styles.memberName, isMe && styles.memberNameMe]} numberOfLines={1}>
            {member.nickname}
            {isMe ? ' (나)' : ''}
          </Text>
          <Text style={styles.memberCount}>
            {member.completedGoals}/{member.totalGoals}
          </Text>
        </View>

        {member.goalDetails.length > 0 ? (
          <View style={styles.goalChips}>
            {member.goalDetails.map((g) => {
              return (
                <GoalChip
                  key={g.goalId}
                  goalName={g.goalName}
                  isDone={g.isDone}
                  isPass={g.isPass ?? false}
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

export default function TodayGoalList({
  members,
  currentUserId,
  onAnimationFinish,
  isNight = false,
}: TodayGoalListProps) {
  const isFocused = useIsFocused();
  const totalAll = members.reduce((s, m) => s + m.totalGoals, 0);
  const completedAll = members.reduce((s, m) => s + m.completedGoals, 0);
  const progress = totalAll > 0 ? completedAll / totalAll : 0;

  const { badgeState, badgeMembers } = React.useMemo(() => {
    if (!members || members.length === 0) return { badgeState: 'START', badgeMembers: [] };

    const membersWithPct = members.map((m) => ({
      ...m,
      pct: m.totalGoals > 0 ? m.completedGoals / m.totalGoals : 0,
    }));

    if (membersWithPct.every((m) => m.pct >= 1)) {
      return { badgeState: 'ALL_CLEAR', badgeMembers: members };
    }

    const finishers = membersWithPct.filter((m) => m.pct >= 1);
    if (finishers.length > 0) {
      return { badgeState: 'FINISHER', badgeMembers: finishers };
    }

    const activeMembers = membersWithPct.filter((m) => m.completedGoals > 0);
    if (activeMembers.length === 0) {
      return { badgeState: 'START', badgeMembers: [] };
    }

    const sorted = [...activeMembers].sort((a, b) => b.pct - a.pct);
    const bestPct = sorted[0].pct;
    const top = sorted.filter((m) => m.pct === bestPct);

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
  }, [members, memberAnims]);

  useEffect(() => {
    if (!isFocused) {
      hasBadgeAnimatedRef.current = false;
      sequenceAnimRef.current?.stop();
      staggerAnimRef.current?.stop();
      return;
    }

    if (hasBadgeAnimatedRef.current) {
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
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.elastic(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        Animated.delay(800),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 2,
            duration: 700,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(badgeOpacityAnim, {
            toValue: 0,
            duration: 700,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
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
  }, [
    isFocused,
    members.length,
    badgeState,
    memberAnims,
    scaleAnim,
    translateYAnim,
    rotateAnim,
    badgeOpacityAnim,
    onAnimationFinish,
  ]);

  const { width: screenWidth } = useWindowDimensions();
  const centerTranslateX = -(screenWidth / 2);

  const scale = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] });
  const translateY = translateYAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -250, -420],
  });
  const translateX = translateYAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, centerTranslateX, centerTranslateX + 80],
  });
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
          <Text style={[styles.title, isNight && styles.titleNight]}>TODAY'S MISSION</Text>
          <Text style={[styles.hintText, isNight && styles.hintTextNight]}>
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

const styles = StyleSheet.create({
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
  titleNight: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(26, 26, 26, 0.47)',
    marginTop: 4,
    lineHeight: 15,
  },
  hintTextNight: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  badgeWrapper: {
    position: 'relative',
  },

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

  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
    width: '100%',
  },

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
    borderColor: colors.successBright,
    backgroundColor: colors.successBright,
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
    backgroundColor: colors.successBright,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
    color: colors.text,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.35)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  goalChip: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.54)',
  },
  goalChipDone: {
    backgroundColor: colors.brandWarm,
  },
  goalChipPass: {
    backgroundColor: colors.brandPale,
  },
  goalChipIcon: {
    marginRight: 3,
    color: '#ffffffff',
    fontWeight: '700',
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    maxWidth: 120,
  },
  goalChipTextDone: {
    color: '#ffffffff',
    fontWeight: '600',
  },
  goalChipTextPass: {
    color: colors.textMuted,
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
    letterSpacing: 1,
  },
});
