import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  useWindowDimensions,
  TouchableOpacity,
  PanResponder,
  type PanResponderGestureState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import type { CheckinWithGoal, MemberProgress, ReactionWithUser } from '../../types/domain';
import { colors } from '../../design/tokens';
import BaseCard from '../ui/BaseCard';
import GoalStatusChip from '../ui/GoalStatusChip';
import DynamicBadge, {
  HOME_BADGE_POP_TRANSLATE_X_OFFSET_PX,
  HOME_BADGE_POP_TRANSLATE_Y_END_ADJUST_PX,
  HOME_BADGE_POP_TRANSLATE_Y_END_RATIO,
  HOME_BADGE_POP_TRANSLATE_Y_PEAK_ADJUST_PX,
  HOME_BADGE_POP_TRANSLATE_Y_PEAK_RATIO,
} from '../ui/MissionBadge';
import { useAuthStore } from '../../stores/authStore';
import { handleServiceError } from '../../lib/serviceError';
import { useToggleReactionMutation } from '../../queries/statsMutations';

type BadgeState = 'START' | 'ALL_CLEAR' | 'FINISHER' | 'LEADER';

const PHOTO_CARD_PEEK = 56;
const PHOTO_CARD_GAP = 16;
const FEED_REACTION_AVATAR_MAX = 10;
/** 피크/점선 슬롯·좌측 당김 한도 비율(뷰 너비 기준); 고무줄·스프링은 한 장·여러 장 동일 계수 사용 */
const SINGLE_PHOTO_PULL_RATIO = 0.13;
/** 가로 플릭 시 다음/이전 슬라이드로 넘기기 위한 최소 속도(px/ms, PanResponder vx) */
const CAROUSEL_FLICK_VX = 0.22;
/** 플릭이 약할 때, 슬롯 간격 대비 이 비율만 넘기면 다음/이전으로 스냅(반보다 훨씬 짧게) */
const CAROUSEL_DRAG_COMMIT_FRAC = 0.22;

/** 좋아요 카운터 필(디자인 참고: 밝은 회색 캡슐 + 주황 하트·숫자) */
const LIKE_PILL_ACCENT = '#FF7A00';
const LIKE_PILL_MUTED = '#9AA3AE';

function PhotoPeekPlaceholder() {
  return <View style={[styles.photoSlideDashedCard, styles.photoPlaceholderCard]}></View>;
}

export function FeedReactionAvatars({
  reactions,
  size = 'md',
}: {
  reactions: ReactionWithUser[];
  size?: 'md' | 'lg';
}) {
  if (reactions.length === 0) return null;

  const shown = reactions.slice(0, FEED_REACTION_AVATAR_MAX);
  const extra = reactions.length - shown.length;
  const avatarSize = size === 'lg' ? 32 : 24;
  const overlap = size === 'lg' ? -10 : -8;
  const borderRadius = avatarSize / 2;
  const iconSize = size === 'lg' ? 18 : 14;
  const moreSize = size === 'lg' ? 34 : 28;

  return (
    <View style={styles.feedReactionRow}>
      <View style={styles.reactionContainer}>
        {shown.map((r, idx) => (
          <View
            key={r.id}
            style={[
              styles.reactionSticker,
              {
                zIndex: shown.length - idx,
                marginLeft: idx > 0 ? overlap : 0,
                width: avatarSize,
                height: avatarSize,
                borderRadius,
              },
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
                <Ionicons name="person" size={iconSize} color="#fff" />
              </View>
            )}
          </View>
        ))}
      </View>
      {extra > 0 ? (
        <View
          style={[
            styles.reactionMore,
            {
              minWidth: moreSize,
              height: moreSize,
              borderRadius: moreSize / 2,
            },
          ]}
        >
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
  /** true일 때 홈 등 부모 세로 ScrollView 스크롤을 막아 가로 슬라이드가 우선하도록 함 */
  onCarouselDragChange?: (dragging: boolean) => void;
}

interface TodayGoalListFeedProps {
  members: MemberProgress[];
  currentUserId?: string;
  onAnimationFinish?: () => void;
  isNight?: boolean;
  /** 사진 캐러셀을 드래그하는 동안 부모에서 scrollEnabled를 끄는 용도 */
  onPhotoCarouselDragChange?: (dragging: boolean) => void;
}

interface FeedHeaderProps {
  badgeMembers: MemberProgress[];
  badgeOpacityAnim: Animated.Value;
  badgeState: BadgeState;
  glowOpacity: Animated.AnimatedInterpolation<number>;
  isNight: boolean;
  rotate: Animated.AnimatedInterpolation<string>;
  scale: Animated.AnimatedInterpolation<number>;
  translateX: Animated.AnimatedInterpolation<number>;
  translateY: Animated.AnimatedInterpolation<number>;
}

interface PhotoSlideCardProps {
  checkin: CheckinWithGoal;
  index: number;
  totalCount: number;
  userId?: string;
  width: number;
  marginRight: number;
  onReactionPress: (checkin: CheckinWithGoal) => void;
}

function getMissionProgress(members: MemberProgress[]) {
  const totalGoals = members.reduce((sum, member) => sum + member.totalGoals, 0);
  const completedGoals = members.reduce((sum, member) => sum + member.completedGoals, 0);

  return {
    progress: totalGoals > 0 ? completedGoals / totalGoals : 0,
    totalGoals,
    completedGoals,
  };
}

function getBadgeMeta(members: MemberProgress[]): {
  badgeMembers: MemberProgress[];
  badgeState: BadgeState;
} {
  if (members.length === 0) {
    return { badgeState: 'START', badgeMembers: [] };
  }

  const membersWithPct = members.map((member) => ({
    ...member,
    pct: member.totalGoals > 0 ? member.completedGoals / member.totalGoals : 0,
  }));

  if (membersWithPct.every((member) => member.pct >= 1)) {
    return { badgeState: 'ALL_CLEAR', badgeMembers: members };
  }

  const finishers = membersWithPct.filter((member) => member.pct >= 1);
  if (finishers.length > 0) {
    return { badgeState: 'FINISHER', badgeMembers: finishers };
  }

  const activeMembers = membersWithPct.filter((member) => member.completedGoals > 0);
  if (activeMembers.length === 0) {
    return { badgeState: 'START', badgeMembers: [] };
  }

  const bestPct = Math.max(...activeMembers.map((member) => member.pct));
  return {
    badgeState: 'LEADER',
    badgeMembers: activeMembers.filter((member) => member.pct === bestPct),
  };
}

function sortMembersForDisplay(members: MemberProgress[], currentUserId?: string) {
  return [...members].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });
}

function FeedHeader({
  badgeMembers,
  badgeOpacityAnim,
  badgeState,
  glowOpacity,
  isNight,
  rotate,
  scale,
  translateX,
  translateY,
}: FeedHeaderProps) {
  return (
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
  );
}

function EmptyFeedState() {
  return (
    <View style={styles.emptyTrail}>
      <Ionicons name="flag-outline" size={24} color="rgba(26,26,26,0.18)" />
      <Text style={styles.emptyText}>목표를 추가해보세요.</Text>
    </View>
  );
}

function PhotoSlideCard({
  checkin,
  index,
  totalCount,
  userId,
  width,
  marginRight,
  onReactionPress,
}: PhotoSlideCardProps) {
  const reactions = checkin.reactions ?? [];
  const reacted = !!userId && reactions.some((reaction) => reaction.user_id === userId);
  const likePillAccent = reacted || reactions.length > 0;

  return (
    <View
      style={[
        styles.photoSlideCard,
        {
          width: width > 0 ? width : '100%',
          marginRight,
        },
      ]}
    >
      <View style={styles.photoSlideInner}>
        <View style={styles.photoTag}>
          <Text style={styles.photoTagText}>{checkin.goal?.name ?? '오늘의 인증'}</Text>
        </View>
        <Image source={{ uri: checkin.photo_url! }} style={styles.photoImage} />
      </View>

      <View style={styles.photoFooter}>
        <View style={styles.photoActions}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.likePill}
            onPress={() => onReactionPress(checkin)}
          >
            <Ionicons
              name={likePillAccent ? 'heart' : 'heart-outline'}
              size={20}
              color={likePillAccent ? LIKE_PILL_ACCENT : LIKE_PILL_MUTED}
            />
            <Text style={[styles.likePillCount, likePillAccent && styles.likePillCountAccent]}>
              {reactions.length}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.photoFooterRight}>
          <FeedReactionAvatars reactions={reactions} />
          <Text style={styles.photoIndexText}>
            {index + 1}/{totalCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** 가로 의도를 빨리 잡되, 순수 세로 스크롤은 부모에 넘김 */
function carouselMoveShouldSetResponder(_: unknown, g: PanResponderGestureState) {
  const adx = Math.abs(g.dx);
  const ady = Math.abs(g.dy);
  if (adx < 1) return false;
  return adx > ady + 2;
}

/** 여러 장: 플릭은 현재 칸 기준 ±1, 느린 드래그는 간격의 ~CAROUSEL_DRAG_COMMIT_FRAC 만 넘겨도 다음 칸으로 */
function carouselSnapIndexFromGesture(
  cur: number,
  vx: number,
  snapInterval: number,
  photoCount: number,
): number {
  if (photoCount < 2 || snapInterval <= 0) return 0;
  const raw = -cur / snapInterval;
  const pivot = Math.round(Math.max(0, Math.min(photoCount - 1, raw)));

  let idx: number;
  if (vx < -CAROUSEL_FLICK_VX) {
    idx = Math.min(photoCount - 1, pivot + 1);
  } else if (vx > CAROUSEL_FLICK_VX) {
    idx = Math.max(0, pivot - 1);
  } else {
    idx = Math.floor(raw + (1 - CAROUSEL_DRAG_COMMIT_FRAC));
  }

  return Math.max(0, Math.min(photoCount - 1, idx));
}

function usePhotoCarousel(
  todayCheckins: CheckinWithGoal[] | undefined,
  screenWidth: number,
  onCarouselDragChange?: (dragging: boolean) => void,
) {
  const photoCheckins = useMemo(
    () => (todayCheckins ?? []).filter((checkin) => !!checkin.photo_url),
    [todayCheckins],
  );
  const [photoSectionWidth, setPhotoSectionWidth] = useState(Math.max(screenWidth - 96, 220));
  const carouselX = useRef(new Animated.Value(0)).current;
  const carouselPullStartRef = useRef(0);
  const lastCarouselSyncRef = useRef(0);
  const carouselMaxOffsetRef = useRef(0);
  const carouselSnapPointsRef = useRef<number[]>([0]);
  const photoCountRef = useRef(0);
  const snapIntervalRef = useRef(0);
  const carouselAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const maxPullPx = useMemo(
    () => (photoSectionWidth > 0 ? Math.round(photoSectionWidth * SINGLE_PHOTO_PULL_RATIO) : 0),
    [photoSectionWidth],
  );

  const cardWidth = useMemo(() => {
    if (photoSectionWidth <= 0) return 0;
    return Math.max(photoSectionWidth - PHOTO_CARD_PEEK, 160);
  }, [photoSectionWidth]);

  const peekTailWidth = useMemo(() => {
    if (photoSectionWidth <= 0 || photoCheckins.length === 0) return 0;
    return Math.max(100, Math.round(photoSectionWidth * SINGLE_PHOTO_PULL_RATIO) + PHOTO_CARD_PEEK);
  }, [photoSectionWidth, photoCheckins.length]);

  const snapInterval = cardWidth > 0 ? cardWidth + PHOTO_CARD_GAP : 0;

  const carouselContentWidth = useMemo(() => {
    const count = photoCheckins.length;
    if (count < 1 || cardWidth <= 0) return 0;
    return count * cardWidth + count * PHOTO_CARD_GAP + peekTailWidth;
  }, [photoCheckins.length, cardWidth, peekTailWidth]);

  const rawMaxOffset = useMemo(() => {
    if (photoSectionWidth <= 0 || carouselContentWidth <= 0) return 0;
    return Math.max(0, carouselContentWidth - photoSectionWidth);
  }, [photoSectionWidth, carouselContentWidth]);

  const carouselMaxOffset = useMemo(() => {
    if (photoCheckins.length <= 1) return Math.min(maxPullPx, rawMaxOffset);
    return rawMaxOffset;
  }, [photoCheckins.length, maxPullPx, rawMaxOffset]);

  const carouselSnapPoints = useMemo(() => {
    const count = photoCheckins.length;
    const points = new Set<number>([0]);

    if (count >= 2 && snapInterval > 0) {
      for (let index = 0; index < count; index += 1) {
        points.add(-index * snapInterval);
      }
    }

    return [...points].sort((a, b) => a - b);
  }, [photoCheckins.length, snapInterval]);

  carouselMaxOffsetRef.current = carouselMaxOffset;
  carouselSnapPointsRef.current = carouselSnapPoints;
  photoCountRef.current = photoCheckins.length;
  snapIntervalRef.current = snapInterval;

  const photoCarouselResetKey = useMemo(
    () =>
      (todayCheckins ?? [])
        .filter((checkin) => !!checkin.photo_url)
        .map((checkin) => checkin.id)
        .join('|'),
    [todayCheckins],
  );

  const snapCarouselToNearest = useCallback(
    (gesture?: PanResponderGestureState | null) => {
      carouselAnimRef.current?.stop();
      carouselPullStartRef.current = 0;

      const current = lastCarouselSyncRef.current;
      const velocityX = gesture?.vx ?? 0;
      const count = photoCountRef.current;
      const currentSnapInterval = snapIntervalRef.current;
      const firstPoint = carouselSnapPointsRef.current[0] ?? 0;
      const lastPhotoSnap =
        count >= 2 && currentSnapInterval > 0 ? -((count - 1) * currentSnapInterval) : 0;
      const beyondLastPhoto = current < lastPhotoSnap - 2;
      const useTailSpring = beyondLastPhoto || current > 2;

      let nextTarget = firstPoint;

      if (current > 2) {
        nextTarget = 0;
      } else if (beyondLastPhoto) {
        nextTarget = lastPhotoSnap;
      } else if (count >= 2 && currentSnapInterval > 0) {
        const nextIndex = carouselSnapIndexFromGesture(
          current,
          velocityX,
          currentSnapInterval,
          count,
        );
        nextTarget = -nextIndex * currentSnapInterval;
      } else {
        let bestDistance = Math.abs(current - firstPoint);
        for (const point of carouselSnapPointsRef.current) {
          const distance = Math.abs(current - point);
          if (distance < bestDistance) {
            bestDistance = distance;
            nextTarget = point;
          }
        }
      }

      lastCarouselSyncRef.current = nextTarget;

      const animation = useTailSpring
        ? Animated.spring(carouselX, {
            toValue: nextTarget,
            friction: 7,
            tension: 100,
            useNativeDriver: false,
          })
        : Animated.timing(carouselX, {
            toValue: nextTarget,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          });

      carouselAnimRef.current = animation;
      animation.start(({ finished }) => {
        carouselAnimRef.current = null;
        if (finished) {
          carouselX.setValue(nextTarget);
          lastCarouselSyncRef.current = nextTarget;
        }
      });
    },
    [carouselX],
  );

  const carouselPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: carouselMoveShouldSetResponder,
        onMoveShouldSetPanResponderCapture: carouselMoveShouldSetResponder,
        onShouldBlockNativeResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          onCarouselDragChange?.(true);
          carouselAnimRef.current?.stop();
          carouselX.stopAnimation((value) => {
            const base =
              typeof value === 'number' && !Number.isNaN(value)
                ? value
                : lastCarouselSyncRef.current;
            carouselPullStartRef.current = base;
            lastCarouselSyncRef.current = base;
          });
        },
        onPanResponderMove: (_event, gesture) => {
          const maxOffset = carouselMaxOffsetRef.current;
          let nextValue = carouselPullStartRef.current + gesture.dx;

          if (nextValue > 0) {
            nextValue *= 0.22;
          } else if (nextValue < -maxOffset) {
            nextValue = -maxOffset + (nextValue + maxOffset) * 0.28;
          }

          lastCarouselSyncRef.current = nextValue;
          carouselX.setValue(nextValue);
        },
        onPanResponderRelease: (_event, gesture) => {
          onCarouselDragChange?.(false);
          snapCarouselToNearest(gesture);
        },
        onPanResponderTerminate: (_event, gesture) => {
          onCarouselDragChange?.(false);
          snapCarouselToNearest(gesture);
        },
      }),
    [carouselX, onCarouselDragChange, snapCarouselToNearest],
  );

  useEffect(() => {
    carouselAnimRef.current?.stop();
    carouselX.stopAnimation();
    carouselX.setValue(0);
    lastCarouselSyncRef.current = 0;
    carouselPullStartRef.current = 0;
  }, [photoCarouselResetKey, carouselX]);

  return {
    cardWidth,
    carouselPanResponder,
    carouselX,
    peekTailWidth,
    photoCheckins,
    photoSectionWidth,
    setPhotoSectionWidth,
  };
}

function MemberCard({ member, isMe, animVal, onCarouselDragChange }: MemberCardProps) {
  const allDone = member.totalGoals > 0 && member.completedGoals >= member.totalGoals;
  const animOpacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const animSlide = animVal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const { width: screenWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const toggleReactionMutation = useToggleReactionMutation();
  const {
    cardWidth,
    carouselPanResponder,
    carouselX,
    peekTailWidth,
    photoCheckins,
    photoSectionWidth,
    setPhotoSectionWidth,
  } = usePhotoCarousel(member.todayCheckins, screenWidth, onCarouselDragChange);

  const handleReactionPress = useCallback(
    async (checkin: CheckinWithGoal) => {
      if (!user) return;
      try {
        await toggleReactionMutation.mutateAsync({
          checkin,
          user: {
            id: user.id,
            nickname: user.nickname,
            profile_image_url: user.profile_image_url,
          },
        });
      } catch (e) {
        handleServiceError(e);
      }
    },
    [toggleReactionMutation, user],
  );

  return (
    <Animated.View
      style={[styles.memberRow, { opacity: animOpacity, transform: [{ translateY: animSlide }] }]}
    >
      <BaseCard glassOnly style={styles.memberCard} contentStyle={styles.memberCardContent}>
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

            <Text style={[styles.memberName]} numberOfLines={1}>
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
              <GoalStatusChip
                key={g.goalId}
                goalName={g.goalName}
                status={g.isDone ? 'done' : g.isPass ? 'pass' : 'todo'}
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
            <View style={styles.photoCarouselClip}>
              <Animated.View
                style={[styles.photoSingleRow, { transform: [{ translateX: carouselX }] }]}
                {...carouselPanResponder.panHandlers}
              >
                {photoCheckins.map((checkin, idx) => (
                  <PhotoSlideCard
                    key={checkin.id}
                    checkin={checkin}
                    index={idx}
                    totalCount={photoCheckins.length}
                    userId={user?.id}
                    width={cardWidth}
                    marginRight={PHOTO_CARD_GAP}
                    onReactionPress={handleReactionPress}
                  />
                ))}
                {peekTailWidth > 0 ? <PhotoPeekPlaceholder /> : null}
              </Animated.View>
            </View>
          </View>
        ) : null}
      </BaseCard>
    </Animated.View>
  );
}

export default function TodayGoalListFeed({
  members,
  currentUserId,
  onAnimationFinish,
  isNight = false,
  onPhotoCarouselDragChange,
}: TodayGoalListFeedProps) {
  const isFocused = useIsFocused();
  const { progress } = React.useMemo(() => getMissionProgress(members), [members]);
  const { badgeState, badgeMembers } = React.useMemo(() => getBadgeMeta(members), [members]);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const badgeOpacityAnim = useRef(new Animated.Value(1)).current;
  const memberAnims = useRef(members.map(() => new Animated.Value(0))).current;

  const hasBadgeAnimatedRef = useRef(false);
  /** 마지막으로 멤버 카드 스태거를 돌린 `members.length` (빈 배열로 먼저 돌면 0에 고정되어 카드가 안 보이는 버그 방지) */
  const staggeredMemberCountRef = useRef(-1);
  const sequenceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const staggerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const startMemberCardStagger = useCallback(() => {
    if (memberAnims.length === 0) {
      staggeredMemberCountRef.current = 0;
      return;
    }
    staggerAnimRef.current?.stop();
    memberAnims.forEach((a) => a.setValue(0));
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
    staggeredMemberCountRef.current = memberAnims.length;
  }, [memberAnims]);

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
      staggeredMemberCountRef.current = -1;
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

      startMemberCardStagger();
    }, 72);

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
    startMemberCardStagger,
  ]);

  /** `memberProgress`가 늦게 도착해 인트로가 빈 멤버로 끝난 뒤에도 카드 스태거가 한 번 돌도록 보정 */
  useEffect(() => {
    if (!isFocused || members.length === 0) return;
    if (!hasBadgeAnimatedRef.current) return;
    if (memberAnims.length !== members.length) return;

    if (staggeredMemberCountRef.current === members.length) return;

    if (staggeredMemberCountRef.current > members.length) {
      staggeredMemberCountRef.current = members.length;
      return;
    }

    startMemberCardStagger();
  }, [isFocused, members, members.length, memberAnims.length, startMemberCardStagger]);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const centerTranslateX = -(screenWidth / 2) + HOME_BADGE_POP_TRANSLATE_X_OFFSET_PX;
  const peakTranslateY =
    -Math.round(screenHeight * HOME_BADGE_POP_TRANSLATE_Y_PEAK_RATIO) +
    HOME_BADGE_POP_TRANSLATE_Y_PEAK_ADJUST_PX;
  const endTranslateY =
    -Math.round(screenHeight * HOME_BADGE_POP_TRANSLATE_Y_END_RATIO) +
    HOME_BADGE_POP_TRANSLATE_Y_END_ADJUST_PX;

  const scale = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] });
  const translateY = translateYAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, peakTranslateY, endTranslateY],
  });
  const translateX = translateYAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, centerTranslateX, centerTranslateX + 80],
  });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] });
  const glowOpacity = scaleAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });

  const sortedMembers = React.useMemo(
    () => sortMembersForDisplay(members, currentUserId),
    [members, currentUserId],
  );

  const carouselDragParentRef = useRef(onPhotoCarouselDragChange);
  carouselDragParentRef.current = onPhotoCarouselDragChange;
  const notifyCarouselDragToParent = useCallback((active: boolean) => {
    carouselDragParentRef.current?.(active);
  }, []);

  return (
    <View>
      <FeedHeader
        badgeMembers={badgeMembers}
        badgeOpacityAnim={badgeOpacityAnim}
        badgeState={badgeState}
        glowOpacity={glowOpacity}
        isNight={isNight}
        rotate={rotate}
        scale={scale}
        translateX={translateX}
        translateY={translateY}
      />

      <View style={styles.trailContainer}>
        {sortedMembers.length === 0 ? (
          <EmptyFeedState />
        ) : (
          <View>
            {sortedMembers.map((member, idx) => (
              <MemberCard
                key={member.userId}
                member={member}
                isMe={member.userId === currentUserId}
                animVal={memberAnims[idx] ?? new Animated.Value(1)}
                onCarouselDragChange={notifyCarouselDragToParent}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    height: 20,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(3, 3, 3, 0.59)',
    letterSpacing: 2,
  },
  titleNight: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  hintText: {
    fontSize: 14,
    color: 'rgba(26, 26, 26, 0.47)',
    marginTop: 6,
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: '100%',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  memberAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
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
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  memberCount: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.35)',
  },
  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  noGoalText: {
    fontSize: 12,
    color: '#A8B2D1',
    fontStyle: 'italic',
  },
  photoSection: {
    marginTop: 12,
    marginBottom: 22,
    paddingLeft: 12,
    overflow: 'hidden',
  },
  photoCarouselClip: {
    width: '100%',
    overflow: 'hidden',
  },
  photoSingleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  photoPlaceholderCard: {
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  photoPlaceholderFooter: {
    minHeight: 52,
    opacity: 0.85,
  },
  photoSlideCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  photoSlideDashedCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(26,26,26,0.2)',
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    minWidth: 200,
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
    paddingHorizontal: 14,
    paddingVertical: 16,
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
  },
  likePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(182, 180, 180, 0.2)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  likePillCount: {
    fontSize: 15,
    fontWeight: '700',
    color: LIKE_PILL_MUTED,
    fontVariant: ['tabular-nums'],
  },
  likePillCountAccent: {
    color: LIKE_PILL_ACCENT,
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
    width: 26,
    height: 26,
    borderRadius: 50,
    borderWidth: 1,
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
