import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { ds } from '@/design/recipes';

import { getMissionProgress, sortMembersForDisplay } from './todayGoalListFeed/feedUtils';
import type { TodayGoalListFeedProps } from './todayGoalListFeed/types';
import { MemberCard } from './todayGoalListFeed/MemberCard';
import { FeedReactionAvatars } from './todayGoalListFeed/FeedReactionAvatars';
import { colors, typography } from '@/design/recipes';

export { FeedReactionAvatars };

const FINISH_CALLBACK_DELAY_MS = 500;

export default function TodayGoalListFeed({
  members,
  currentUserId,
  onAnimationFinish,
  isNight = false,
  onPhotoCarouselDragChange,
}: TodayGoalListFeedProps) {
  const isFocused = useIsFocused();
  const { progress } = React.useMemo(() => getMissionProgress(members), [members]);
  const sortedMembers = React.useMemo(
    () => sortMembersForDisplay(members, currentUserId),
    [members, currentUserId],
  );

  const memberAnims = useRef(members.map(() => new Animated.Value(0))).current;
  const hasAnimatedRef = useRef(false);
  const staggeredMemberCountRef = useRef(-1);
  const staggerAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carouselDragParentRef = useRef(onPhotoCarouselDragChange);
  carouselDragParentRef.current = onPhotoCarouselDragChange;

  const notifyCarouselDragToParent = useCallback((active: boolean) => {
    carouselDragParentRef.current?.(active);
  }, []);

  //멤버 카드들이 0.45초(450ms) 간격으로 차례대로 나타나게 하는 애니메이션
  const startMemberCardStagger = useCallback(() => {
    if (memberAnims.length === 0) {
      staggeredMemberCountRef.current = 0;
      return;
    }

    staggerAnimRef.current?.stop();
    memberAnims.forEach((animation) => animation.setValue(0));
    const stagger = Animated.stagger(
      450,
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

  // 멤버 수 변경 시 애니메이션 배열 동기화
  useEffect(() => {
    if (members.length !== memberAnims.length) {
      const wasEmpty = memberAnims.length === 0;
      memberAnims.length = 0;
      members.forEach(() => memberAnims.push(new Animated.Value(wasEmpty ? 0 : 1)));
    }
  }, [members, memberAnims]);

  // 멤버 카드 스태거 애니메이션 시작 + 완료 콜백 (화면 포커스 시 1회)
  useEffect(() => {
    if (!isFocused) {
      hasAnimatedRef.current = false;
      staggeredMemberCountRef.current = -1;
      staggerAnimRef.current?.stop();
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      return;
    }

    if (hasAnimatedRef.current) {
      return;
    }

    // 데이터가 아직 로드되지 않은 경우 대기
    // members.length가 deps에 있으므로 로드 완료 시 effect가 재실행됨
    if (members.length === 0) {
      return;
    }

    staggerAnimRef.current?.stop();

    const startTimeoutId = setTimeout(() => {
      hasAnimatedRef.current = true;
      memberAnims.forEach((animation) => animation.setValue(0));
      startMemberCardStagger();

      // 과거 배지 등장 시퀀스가 끝나던 시점에 맞춰 완료를 알린다.
      // (부모는 이 콜백으로 후속 애니메이션 시작을 트리거함)
      finishTimerRef.current = setTimeout(() => {
        onAnimationFinish?.();
      }, FINISH_CALLBACK_DELAY_MS);
    }, 72);

    return () => {
      clearTimeout(startTimeoutId);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [isFocused, members.length, memberAnims, onAnimationFinish, startMemberCardStagger]);

  // 멤버가 추가되었을 때 스태거 애니메이션 재시작 보정
  useEffect(() => {
    if (!isFocused || members.length === 0) return;
    if (!hasAnimatedRef.current) return;
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
          <Text style={[ds.cardTitle, isNight && styles.titleNight]}>TODAY'S MISSION</Text>
          <Text style={[styles.hintText, isNight && styles.hintTextNight]}>
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
    width: '100%',
  },
  headerTextBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
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
