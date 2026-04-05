import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Image,
  useWindowDimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import type { CheckinWithGoal, MemberProgress, ReactionWithUser } from '../../types/domain';
import { colors } from '../../design/tokens';
import CyberFrame from '../ui/CyberFrame';
import Pill from '../ui/Pill';
import DynamicBadge from './TodayGoalBadge';
import { useStatsStore } from '../../stores/statsStore';
import { useAuthStore } from '../../stores/authStore';

const PHOTO_CARD_PEEK = 28;
const PHOTO_CARD_GAP = 12;
const FEED_REACTION_AVATAR_MAX = 3;

function FeedReactionAvatars({ reactions }: { reactions: ReactionWithUser[] }) {
  if (reactions.length === 0) return null;

  const shown = reactions.slice(0, FEED_REACTION_AVATAR_MAX);
  const extra = reactions.length - shown.length;

  return (
    <View style={styles.feedReactionRow}>
      <View style={styles.reactionContainer}>
        {shown.map((r, idx) => (
          <View
            key={r.id}
            style={[
              styles.reactionSticker,
              { zIndex: shown.length - idx, marginLeft: idx > 0 ? -8 : 0 },
            ]}
          >
            {r.user.profile_image_url ? (
              <Image
                source={{ uri: r.user.profile_image_url }}
                style={styles.reactionAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.reactionAvatar, styles.reactionAvatarFallback]}>
                <Ionicons name="person" size={14} color="#fff" />
              </View>
            )}
          </View>
        ))}
      </View>
      {extra > 0 ? (
        <View style={styles.reactionMore}>
          <Text style={styles.reactionMoreText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

interface MemberCardProps {
  member: MemberProgress;
  isMe: boolean;
  animVal: Animated.Value;
}

interface TodayGoalListFeedProps {
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
  const { width: screenWidth } = useWindowDimensions();
  const { toggleReaction } = useStatsStore();
  const user = useAuthStore((s) => s.user);

  const photoCheckins = React.useMemo(
    () => (member.todayCheckins ?? []).filter((checkin) => !!checkin.photo_url),
    [member.todayCheckins],
  );
  const [photoSectionWidth, setPhotoSectionWidth] = useState(Math.max(screenWidth - 96, 220));
  const photoScrollRef = useRef<ScrollView>(null);

  const cardWidth = useMemo(() => {
    if (photoSectionWidth <= 0) return 0;
    if (photoCheckins.length <= 1) return photoSectionWidth;
    return Math.max(photoSectionWidth - PHOTO_CARD_PEEK, 160);
  }, [photoSectionWidth, photoCheckins.length]);

  const snapInterval = cardWidth > 0 ? cardWidth + PHOTO_CARD_GAP : 0;

  /** 리액션 등으로 todayCheckins 참조만 바뀌면 스크롤 유지; 사진 슬라이드 구성(id)이 바뀔 때만 맨 앞으로 */
  const photoCarouselResetKey = useMemo(
    () =>
      (member.todayCheckins ?? [])
        .filter((c) => !!c.photo_url)
        .map((c) => c.id)
        .join('|'),
    [member.todayCheckins],
  );

  useEffect(() => {
    photoScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [photoCarouselResetKey]);

  const handleReactionPress = useCallback(
    async (checkin: CheckinWithGoal) => {
      if (!user) return;
      await toggleReaction(checkin.id, {
        id: user.id,
        nickname: user.nickname,
        profile_image_url: user.profile_image_url,
      });
    },
    [user, toggleReaction],
  );

  return (
    <Animated.View
      style={[styles.memberRow, { opacity: animOpacity, transform: [{ translateY: animSlide }] }]}
    >
      <CyberFrame style={styles.memberCard} contentStyle={styles.memberCardContent}>
        <View style={styles.memberHeader}>
          <View style={styles.memberIdentity}>
            <View style={[styles.memberAvatarWrap, allDone && styles.memberAvatarWrapDone]}>
              {member.profileImageUrl ? (
                <Image source={{ uri: member.profileImageUrl }} style={styles.memberAvatar} />
              ) : (
                <Text
                  style={[styles.memberAvatarInitial, allDone && styles.memberAvatarInitialDone]}
                >
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

            <Text style={[styles.memberName, isMe && styles.memberNameMe]} numberOfLines={1}>
              {member.nickname}
              {isMe ? ' (나)' : ''}
            </Text>
          </View>
          <Text style={styles.memberCount}>
            {member.completedGoals}/{member.totalGoals}
          </Text>
        </View>

        {member.goalDetails.length > 0 ? (
          <View style={styles.goalChips}>
            {member.goalDetails.map((g) => (
              <GoalChip
                key={g.goalId}
                goalName={g.goalName}
                isDone={g.isDone}
                isPass={g.isPass ?? false}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.noGoalText}>오늘 루틴 없음</Text>
        )}

        {photoCheckins.length > 0 ? (
          <View
            style={styles.photoSection}
            onLayout={(event) => {
              const w = event.nativeEvent.layout.width;
              if (w > 0 && Math.abs(w - photoSectionWidth) > 1) {
                setPhotoSectionWidth(w);
              }
            }}
          >
            <ScrollView
              ref={photoScrollRef}
              horizontal
              scrollEnabled={photoCheckins.length > 1}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={photoCheckins.length > 1 ? snapInterval : undefined}
              snapToAlignment="start"
              disableIntervalMomentum
              contentContainerStyle={
                photoCheckins.length > 1 ? styles.photoCarouselContent : undefined
              }
            >
              {photoCheckins.map((checkin, idx) => {
                const reactions = checkin.reactions ?? [];
                const checkinReacted = !!user && reactions.some((r) => r.user_id === user.id);
                return (
                  <View
                    key={checkin.id}
                    style={[
                      styles.photoSlideCard,
                      {
                        width: cardWidth > 0 ? cardWidth : '100%',
                        marginRight: photoCheckins.length > 1 ? PHOTO_CARD_GAP : 0,
                      },
                    ]}
                  >
                    <View style={styles.photoSlideInner}>
                      <View style={styles.photoTag}>
                        <Text style={styles.photoTagText}>
                          {checkin.goal?.name ?? '오늘의 인증'}
                        </Text>
                      </View>
                      <Image source={{ uri: checkin.photo_url! }} style={styles.photoImage} />
                    </View>

                    <View style={styles.photoFooter}>
                      <View style={styles.photoActions}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={[
                            styles.actionPill,
                            styles.actionPillIconOnly,
                            checkinReacted && styles.actionPillActive,
                          ]}
                          onPress={() => handleReactionPress(checkin)}
                        >
                          <Ionicons
                            name={checkinReacted ? 'heart' : 'heart-outline'}
                            size={24}
                            color={checkinReacted ? colors.primary : '#9299A6'}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.photoFooterRight}>
                        <FeedReactionAvatars reactions={reactions} />
                        {photoCheckins.length > 1 ? (
                          <Text style={styles.photoIndexText}>
                            {idx + 1}/{photoCheckins.length}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </CyberFrame>
    </Animated.View>
  );
}

export default function TodayGoalListFeed({
  members,
  currentUserId,
  onAnimationFinish,
  isNight = false,
}: TodayGoalListFeedProps) {
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
            오늘 계획이 없는 주 N회 루틴은 "패스" 인증 해주세요!
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
            <Text style={styles.emptyText}>목표를 추가해보세요.</Text>
          </View>
        ) : (
          <View style={styles.trailContent}>
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
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    width: '100%',
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
    width: '100%',
  },
  trailContent: {
    paddingLeft: 0,
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
    marginBottom: 12,
    width: '100%',
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
  memberIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  memberAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
    shadowColor: '#4A558F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  memberAvatarWrapDone: {
    borderColor: colors.successBright,
    backgroundColor: colors.successBright,
  },
  memberAvatar: {
    width: '100%',
    height: '100%',
  },
  memberAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A558F',
  },
  memberAvatarInitialDone: {
    color: '#FFFFFF',
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
    color: '#fff',
    fontWeight: '700',
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    maxWidth: 120,
  },
  goalChipTextDone: {
    color: '#fff',
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
  photoSection: {
    marginTop: 12,
    width: '100%',
  },
  photoCarouselContent: {
    paddingRight: PHOTO_CARD_PEEK,
  },
  photoSlideCard: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  photoSlideInner: {
    position: 'relative',
    width: '100%',
  },
  photoTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  photoImage: {
    width: '100%',
    aspectRatio: 1.18,
    backgroundColor: '#ECE4DA',
  },
  photoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,26,26,0.06)',
  },
  photoFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  feedReactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  reactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionSticker: {
    width: 24,
    height: 24,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFAF7',
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionAvatar: {
    width: '100%',
    height: '100%',
  },
  reactionAvatarFallback: {
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionMore: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 6,
    marginLeft: 4,
    backgroundColor: 'rgba(255, 107, 61, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionMoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#EDF1F6',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionPillIconOnly: {
    paddingHorizontal: 12,
  },
  actionPillActive: {
    backgroundColor: 'rgba(255, 107, 61, 0.14)',
  },
  photoIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.34)',
  },
  summitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
    position: 'relative',
  },
  trailNodeSummit: {
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
});
