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
import CyberFrame from '../ui/CyberFrame';
import Pill from '../ui/Pill';
import DynamicBadge, {
  HOME_BADGE_POP_TRANSLATE_X_OFFSET_PX,
  HOME_BADGE_POP_TRANSLATE_Y_END_ADJUST_PX,
  HOME_BADGE_POP_TRANSLATE_Y_END_RATIO,
  HOME_BADGE_POP_TRANSLATE_Y_PEAK_ADJUST_PX,
  HOME_BADGE_POP_TRANSLATE_Y_PEAK_RATIO,
} from './TodayGoalBadge';
import { useStatsStore } from '../../stores/statsStore';
import { useAuthStore } from '../../stores/authStore';

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

function MemberCard({ member, isMe, animVal, onCarouselDragChange }: MemberCardProps) {
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
  const carouselX = useRef(new Animated.Value(0)).current;
  const carouselPullStartRef = useRef(0);
  const lastCarouselSyncRef = useRef(0);
  const carouselMaxOffsetRef = useRef(0);
  const carouselSnapPointsRef = useRef<number[]>([0]);
  const photoCountRef = useRef(0);
  const snapIntervalRef = useRef(0);

  const maxPullPx = useMemo(
    () => (photoSectionWidth > 0 ? Math.round(photoSectionWidth * SINGLE_PHOTO_PULL_RATIO) : 0),
    [photoSectionWidth],
  );

  const cardWidth = useMemo(() => {
    if (photoSectionWidth <= 0) return 0;
    return Math.max(photoSectionWidth - PHOTO_CARD_PEEK, 160);
  }, [photoSectionWidth]);

  /** 점선 빈 슬롯: 장수와 관계없이 한 장일 때와 동일한 너비(피크 + 당김 여유) */
  const peekTailWidth = useMemo(() => {
    if (photoSectionWidth <= 0 || photoCheckins.length === 0) return 0;
    return Math.max(100, Math.round(photoSectionWidth * SINGLE_PHOTO_PULL_RATIO) + PHOTO_CARD_PEEK);
  }, [photoSectionWidth, photoCheckins.length]);

  const snapInterval = cardWidth > 0 ? cardWidth + PHOTO_CARD_GAP : 0;

  const carouselContentWidth = useMemo(() => {
    const n = photoCheckins.length;
    if (n < 1 || cardWidth <= 0) return 0;
    return n * cardWidth + n * PHOTO_CARD_GAP + peekTailWidth;
  }, [photoCheckins.length, cardWidth, peekTailWidth]);

  const rawMaxOffset = useMemo(() => {
    if (photoSectionWidth <= 0 || carouselContentWidth <= 0) return 0;
    return Math.max(0, carouselContentWidth - photoSectionWidth);
  }, [photoSectionWidth, carouselContentWidth]);

  /** 한 장은 과도하게 안 밀리게 maxPull 캡; 여러 장은 콘텐츠 끝까지 */
  const carouselMaxOffset = useMemo(() => {
    if (photoCheckins.length <= 1) return Math.min(maxPullPx, rawMaxOffset);
    return rawMaxOffset;
  }, [photoCheckins.length, maxPullPx, rawMaxOffset]);

  const carouselSnapPoints = useMemo((): number[] => {
    const n = photoCheckins.length;
    const pts = new Set<number>();
    pts.add(0);
    if (n >= 2 && snapInterval > 0) {
      for (let k = 0; k < n; k++) {
        pts.add(-k * snapInterval);
      }
    }
    return [...pts].sort((a, b) => a - b);
  }, [photoCheckins.length, snapInterval]);

  carouselMaxOffsetRef.current = carouselMaxOffset;
  carouselSnapPointsRef.current = carouselSnapPoints;
  photoCountRef.current = photoCheckins.length;
  snapIntervalRef.current = snapInterval;

  /** 리액션 등으로 todayCheckins 참조만 바뀌면 스크롤 유지; 사진 슬라이드 구성(id)이 바뀔 때만 맨 앞으로 */
  const photoCarouselResetKey = useMemo(
    () =>
      (member.todayCheckins ?? [])
        .filter((c) => !!c.photo_url)
        .map((c) => c.id)
        .join('|'),
    [member.todayCheckins],
  );

  const carouselAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const snapCarouselToNearest = useCallback(
    (gesture?: PanResponderGestureState | null) => {
      carouselAnimRef.current?.stop();
      carouselPullStartRef.current = 0;
      const pts = carouselSnapPointsRef.current;
      const cur = lastCarouselSyncRef.current;
      const vx = gesture?.vx ?? 0;

      const n = photoCountRef.current;
      const si = snapIntervalRef.current;
      /** 점선 슬롯은 스냅 타겟이 아니라 오버스크롤 영역이라 마지막 사진 위치로만 복귀 */
      const lastPhotoSnap = n >= 2 && si > 0 ? -((n - 1) * si) : 0;
      const beyondLastPhoto = cur < lastPhotoSnap - 2;
      const useTailSpring = beyondLastPhoto || cur > 2;

      let best: number;
      if (cur > 2) {
        best = 0;
      } else if (beyondLastPhoto) {
        best = lastPhotoSnap;
      } else if (n >= 2 && si > 0) {
        const idx = carouselSnapIndexFromGesture(cur, vx, si, n);
        best = -idx * si;
      } else {
        best = pts[0] ?? 0;
        let bestD = Math.abs(cur - best);
        for (const p of pts) {
          const d = Math.abs(cur - p);
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        }
      }

      lastCarouselSyncRef.current = best;

      if (useTailSpring) {
        const spring = Animated.spring(carouselX, {
          toValue: best,
          friction: 7,
          tension: 100,
          useNativeDriver: false,
        });
        carouselAnimRef.current = spring;
        spring.start(({ finished }) => {
          carouselAnimRef.current = null;
          if (finished) {
            carouselX.setValue(best);
            lastCarouselSyncRef.current = best;
          }
        });
        return;
      }

      const timing = Animated.timing(carouselX, {
        toValue: best,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      carouselAnimRef.current = timing;
      timing.start(({ finished }) => {
        carouselAnimRef.current = null;
        if (finished) {
          carouselX.setValue(best);
          lastCarouselSyncRef.current = best;
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
          carouselX.stopAnimation((v) => {
            const base =
              typeof v === 'number' && !Number.isNaN(v) ? v : lastCarouselSyncRef.current;
            carouselPullStartRef.current = base;
            lastCarouselSyncRef.current = base;
          });
        },
        onPanResponderMove: (_, g) => {
          const maxO = carouselMaxOffsetRef.current;
          let next = carouselPullStartRef.current + g.dx;
          if (next > 0) {
            next *= 0.22;
          } else if (next < -maxO) {
            next = -maxO + (next + maxO) * 0.28;
          }
          lastCarouselSyncRef.current = next;
          carouselX.setValue(next);
        },
        onPanResponderRelease: (_e, g) => {
          onCarouselDragChange?.(false);
          snapCarouselToNearest(g);
        },
        onPanResponderTerminate: (_e, g) => {
          onCarouselDragChange?.(false);
          snapCarouselToNearest(g);
        },
      }),
    [carouselX, snapCarouselToNearest, onCarouselDragChange],
  );

  useEffect(() => {
    carouselAnimRef.current?.stop();
    carouselX.stopAnimation();
    carouselX.setValue(0);
    lastCarouselSyncRef.current = 0;
    carouselPullStartRef.current = 0;
  }, [photoCarouselResetKey, carouselX]);

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

  const renderCheckinSlide = (
    checkin: CheckinWithGoal,
    idx: number,
    slideWidth: number,
    marginRight: number,
  ) => {
    const reactions = checkin.reactions ?? [];
    const checkinReacted = !!user && reactions.some((r) => r.user_id === user.id);
    const likePillAccent = checkinReacted || reactions.length > 0;
    return (
      <View
        style={[
          styles.photoSlideCard,
          {
            width: slideWidth > 0 ? slideWidth : '100%',
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
              onPress={() => handleReactionPress(checkin)}
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
              {idx + 1}/{photoCheckins.length}
            </Text>
          </View>
        </View>
      </View>
    );
  };

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
            <View style={styles.photoCarouselClip}>
              <Animated.View
                style={[styles.photoSingleRow, { transform: [{ translateX: carouselX }] }]}
                {...carouselPanResponder.panHandlers}
              >
                {photoCheckins.map((checkin, idx) => (
                  <React.Fragment key={checkin.id}>
                    {renderCheckinSlide(checkin, idx, cardWidth, PHOTO_CARD_GAP)}
                  </React.Fragment>
                ))}
                {peekTailWidth > 0 ? <PhotoPeekPlaceholder /> : null}
              </Animated.View>
            </View>
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
  onPhotoCarouselDragChange,
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

  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return 0;
    });
  }, [members, currentUserId]);

  const carouselDragParentRef = useRef(onPhotoCarouselDragChange);
  carouselDragParentRef.current = onPhotoCarouselDragChange;
  const notifyCarouselDragToParent = useCallback((active: boolean) => {
    carouselDragParentRef.current?.(active);
  }, []);

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
  container: {
    marginTop: 0,
    width: '100%',
  },
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
  goalChip: {
    borderWidth: 0,
    // borderColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 10,
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
    fontSize: 13,
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
