import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import {
  getBadgeMeta,
  getMissionProgress,
  sortMembersForDisplay,
} from './todayGoalListFeed/feedUtils';
import type { TodayGoalListFeedProps } from './todayGoalListFeed/types';
// import { FeedBadgePanel } from './todayGoalListFeed/FeedBadgePanel';
import { MemberCard } from './todayGoalListFeed/MemberCard';
import { FeedReactionAvatars } from './todayGoalListFeed/FeedReactionAvatars';
import { colors, typography } from '@/design/recipes';

export { FeedReactionAvatars };

export default function TodayGoalListFeed({
  members,
  currentUserId,
  onAnimationFinish,
  isNight = false,
  onPhotoCarouselDragChange,
}: TodayGoalListFeedProps) {
  // 1. Context & Derived Data
  const isFocused = useIsFocused();
  const { progress } = React.useMemo(() => getMissionProgress(members), [members]);
  const { badgeState } = React.useMemo(() => getBadgeMeta(members), [members]);
  const sortedMembers = React.useMemo(
    () => sortMembersForDisplay(members, currentUserId),
    [members, currentUserId],
  );

  // 2. Animation Values & Refs
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const badgeOpacityAnim = useRef(new Animated.Value(0)).current;
  const memberAnims = useRef(members.map(() => new Animated.Value(0))).current;

  const hasBadgeAnimatedRef = useRef(false);
  const staggeredMemberCountRef = useRef(-1);
  const sequenceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const staggerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // 4. Callbacks & Handlers
  const carouselDragParentRef = useRef(onPhotoCarouselDragChange);
  carouselDragParentRef.current = onPhotoCarouselDragChange;

  const notifyCarouselDragToParent = useCallback((active: boolean) => {
    carouselDragParentRef.current?.(active);
  }, []);

  //멤버 카드들이 0.15초(150ms) 간격으로 차례대로 나타나게 하는 애니메이션
  const startMemberCardStagger = useCallback(() => {
    if (memberAnims.length === 0) {
      staggeredMemberCountRef.current = 0;
      return;
    }

    staggerAnimRef.current?.stop();
    memberAnims.forEach((animation) => animation.setValue(0));
    const stagger = Animated.stagger(
      150,
      memberAnims.map((animation) =>
        Animated.timing(animation, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ),
    );
    staggerAnimRef.current = stagger;
    stagger.start();
    staggeredMemberCountRef.current = memberAnims.length;
  }, [memberAnims]);

  // 5. Lifecycle Effects (Animation Orchestration)
  // 5.1. 멤버 수 변경 시 애니메이션 배열 동기화
  useEffect(() => {
    if (members.length !== memberAnims.length) {
      const wasEmpty = memberAnims.length === 0;
      memberAnims.length = 0;
      members.forEach(() => memberAnims.push(new Animated.Value(wasEmpty ? 0 : 1)));
    }
  }, [members, memberAnims]);

  // 5.2. 배지 등장 및 리스트 스태거 애니메이션 시작 (화면 포커스 시 1회)
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
    memberAnims.forEach((animation) => animation.setValue(1));

    const timeoutId = setTimeout(() => {
      hasBadgeAnimatedRef.current = true;

      scaleAnim.setValue(0);
      translateYAnim.setValue(0);
      badgeOpacityAnim.setValue(0);
      memberAnims.forEach((animation) => animation.setValue(0));

      const sequence = Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(badgeOpacityAnim, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(220),
        Animated.timing(scaleAnim, {
          toValue: 2,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      sequenceAnimRef.current = sequence;
      sequence.start(({ finished }) => {
        if (finished) onAnimationFinish?.();
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
    badgeOpacityAnim,
    onAnimationFinish,
    startMemberCardStagger,
  ]);

  // 5.3. 멤버가 추가되었을 때 스태거 애니메이션 재시작 보정
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

  return (
    <View>
      {/*헤더 */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.title, isNight && styles.titleNight]}>TODAY'S MISSION</Text>
          <Text style={[styles.hintText, isNight && styles.hintTextNight]}>
            오늘 해야 할 목표와 팀 진행 상황을 한눈에 확인하세요.
          </Text>
          <Text style={[styles.metaText, isNight && styles.metaTextNight]}>
            참여 멤버 {sortedMembers.length}명
          </Text>
        </View>
      </View>

      {/*목표 리스트 */}
      <View style={styles.trailContainer}>
        {sortedMembers.length === 0 ? (
          <View style={styles.emptyTrail}>
            <Ionicons name="flag-outline" size={24} color={colors.black20} />
            <Text style={styles.emptyText}>목표를 추가해보세요.</Text>
          </View>
        ) : (
          <View>
            {sortedMembers.map((member, index) => (
              <MemberCard
                key={member.userId}
                member={member}
                isMe={member.userId === currentUserId}
                animVal={memberAnims[index] ?? new Animated.Value(1)}
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
  headerBlock: {
    marginBottom: 14,
    width: '100%',
  },
  headerTextBlock: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.black70,
    letterSpacing: 2,
  },
  titleNight: {
    color: colors.white90,
  },
  hintText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  hintTextNight: {
    color: colors.white80,
  },
  metaText: {
    ...typography.label,
    color: colors.white60,
    alignSelf: 'flex-end',
  },
  metaTextNight: {
    color: colors.white60,
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
    ...typography.label,
    color: colors.textFaint,
    fontStyle: 'italic',
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  summitText: {
    ...typography.label,
    color: colors.primary,
  },
});
