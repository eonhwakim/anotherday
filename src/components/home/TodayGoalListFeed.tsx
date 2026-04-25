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
import { FeedHeader } from './todayGoalListFeed/FeedHeader';
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
  const isFocused = useIsFocused();
  const { progress } = React.useMemo(() => getMissionProgress(members), [members]);
  const { badgeState, badgeMembers } = React.useMemo(() => getBadgeMeta(members), [members]);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const badgeOpacityAnim = useRef(new Animated.Value(0)).current;
  const memberAnims = useRef(members.map(() => new Animated.Value(0))).current;

  const hasBadgeAnimatedRef = useRef(false);
  const staggeredMemberCountRef = useRef(-1);
  const sequenceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const staggerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

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

  const scale = scaleAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.92, 1.04, 1] });
  const translateY = translateYAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const glowOpacity = scaleAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 0.9, 0],
  });

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
      <FeedHeader isNight={isNight} memberCount={sortedMembers.length} />
      <FeedBadgePanel
        badgeMembers={badgeMembers}
        badgeOpacityAnim={badgeOpacityAnim}
        badgeState={badgeState}
        glowOpacity={glowOpacity}
        isNight={isNight}
        scale={scale}
        translateY={translateY}
      />

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
