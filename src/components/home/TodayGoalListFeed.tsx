import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import {
  getBadgeMeta,
  getMissionProgress,
  sortMembersForDisplay,
} from './todayGoalListFeed/feedUtils';
import type { TodayGoalListFeedProps } from './todayGoalListFeed/types';
import { styles } from './todayGoalListFeed/styles';

import { FeedBadgePanel } from './todayGoalListFeed/FeedBadgePanel';
import { MemberCard } from './todayGoalListFeed/MemberCard';
import { FeedReactionAvatars } from './todayGoalListFeed/FeedReactionAvatars';

export { FeedReactionAvatars };

export default function TodayGoalListFeed({
  members,
  currentUserId,
  onAnimationFinish,
  isNight = false,
  onPhotoCarouselDragChange,
}: TodayGoalListFeedProps) {
  // ===========================================================================
  // 1. Context & Derived Data
  const isFocused = useIsFocused();
  const { progress } = React.useMemo(() => getMissionProgress(members), [members]);
  const { badgeState, badgeMembers } = React.useMemo(() => getBadgeMeta(members), [members]);
  const sortedMembers = React.useMemo(
    () => sortMembersForDisplay(members, currentUserId),
    [members, currentUserId],
  );

  // ===========================================================================
  // 2. Animation Values & Refs
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const badgeOpacityAnim = useRef(new Animated.Value(0)).current;
  const memberAnims = useRef(members.map(() => new Animated.Value(0))).current;

  const hasBadgeAnimatedRef = useRef(false);
  const staggeredMemberCountRef = useRef(-1);
  const sequenceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const staggerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // ===========================================================================
  // 3. Interpolated Animation Styles
  const scale = scaleAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.92, 1.04, 1] });
  const translateY = translateYAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const glowOpacity = scaleAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 0.9, 0],
  });

  // ===========================================================================
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

  // ===========================================================================
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

  // ===========================================================================
  // 6. Render
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
      {/*도장 배찌*/}
      <FeedBadgePanel
        badgeMembers={badgeMembers}
        badgeOpacityAnim={badgeOpacityAnim}
        badgeState={badgeState}
        glowOpacity={glowOpacity}
        isNight={isNight}
        scale={scale}
        translateY={translateY}
      />
      {/*목표 리스트 */}
      <View style={styles.trailContainer}>
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listHeaderTitle, isNight && styles.listHeaderTitleNight]}>
            GOAL LIST
          </Text>
          <Text style={[styles.listHeaderMeta, isNight && styles.listHeaderMetaNight]}>
            {sortedMembers.length}명
          </Text>
        </View>

        {sortedMembers.length === 0 ? (
          <View style={styles.emptyTrail}>
            <Ionicons name="flag-outline" size={24} color="rgba(26,26,26,0.18)" />
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
