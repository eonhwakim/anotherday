import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { ds } from '@/design/recipes';

import { useTeamStore } from '../../stores/teamStore';
import { getMissionProgress, sortMembersForDisplay } from './todayGoalListFeed/feedUtils';
import type { TodayGoalListFeedProps } from './todayGoalListFeed/types';
import { MemberRow } from './todayGoalListFeed/MemberRow';
import { FeedReactionAvatars } from './todayGoalListFeed/FeedReactionAvatars';
import { colors, numericFont, typography } from '@/design/recipes';

export { FeedReactionAvatars };

/** 카드 등장 간격 — 기다림이 느껴지지 않는 범위로 짧게 */
const MEMBER_STAGGER_MS = 90;
const FINISH_CALLBACK_DELAY_MS = 220;

export default function TodayGoalListFeed({
  members,
  currentUserId,
  onAnimationFinish,
  onPhotoCarouselDragChange,
}: TodayGoalListFeedProps) {
  const isFocused = useIsFocused();
  const teamName = useTeamStore((s) => s.currentTeam?.name);
  const { progress } = React.useMemo(() => getMissionProgress(members), [members]);
  const progressPercent = Math.round(progress * 100);
  const sortedMembers = React.useMemo(
    () => sortMembersForDisplay(members, currentUserId),
    [members, currentUserId],
  );
  const myMember = React.useMemo(
    () => sortedMembers.find((member) => member.userId === currentUserId),
    [sortedMembers, currentUserId],
  );
  const teamMembers = React.useMemo(
    () => sortedMembers.filter((member) => member.userId !== currentUserId),
    [sortedMembers, currentUserId],
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

  //멤버 카드들이 90ms 간격으로 차례대로 스프링으로 나타나게 하는 애니메이션
  const startMemberCardStagger = useCallback(() => {
    if (memberAnims.length === 0) {
      staggeredMemberCountRef.current = 0;
      return;
    }

    staggerAnimRef.current?.stop();
    memberAnims.forEach((animation) => animation.setValue(0));
    const stagger = Animated.stagger(
      MEMBER_STAGGER_MS,
      memberAnims.map((animation) =>
        Animated.spring(animation, {
          toValue: 1,
          stiffness: 190,
          damping: 20,
          mass: 1,
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

      // 카드 등장이 끝나가는 시점에 맞춰 완료를 알린다.
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

  const fallbackAnim = useRef(new Animated.Value(1)).current;
  const animForIndex = (index: number) => memberAnims[index] ?? fallbackAnim;

  if (sortedMembers.length === 0) {
    return (
      <View style={styles.emptyTrail}>
        <Ionicons name="flag-outline" size={24} color={colors.black20} />
        <Text style={styles.emptyText}>목표를 추가해보세요.</Text>
      </View>
    );
  }

  return (
    <View>
      {/* 내 오늘 — 팀원 카드와 같은 형태, 테두리와 '나' 배지로만 구분 */}
      {myMember ? (
        <MemberRow
          member={myMember}
          isMe
          animVal={animForIndex(0)}
          onCarouselDragChange={notifyCarouselDragToParent}
        />
      ) : null}

      {/* 함께하는 사람들 */}
      {teamMembers.length > 0 ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={ds.eyebrow} numberOfLines={1}>
              {teamName ?? '함께하는 사람들'}
            </Text>
            {/* <Text style={[ds.cardTitle, styles.sectionTitle]}>TODAY'S MISSION</Text> */}
            <View style={styles.progressPill}>
              <Ionicons name="trending-up-outline" size={13} color={colors.darkGreen} />
              <Text style={styles.hintText}>
                {sortedMembers.length}명 · {progressPercent}%
              </Text>
            </View>
          </View>

          {teamMembers.map((member, index) => (
            <MemberRow
              key={member.userId}
              member={member}
              isMe={false}
              showDivider={index > 0}
              animVal={animForIndex(myMember ? index + 1 : index)}
              onCarouselDragChange={notifyCarouselDragToParent}
            />
          ))}
        </View>
      ) : null}

      {progress === 1 && members.length > 0 && (
        <View style={styles.summitRow}>
          <View style={styles.trailNodeSummit}>
            <Ionicons name="flag" size={14} color="#000" />
          </View>
          <Text style={styles.summitText}>모두 완료!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
    gap: 14,
  },
  sectionTitle: {
    lineHeight: 25,
    letterSpacing: 0,
  },
  progressPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hintText: {
    ...typography.caption,
    ...numericFont,
    color: colors.darkGreen,
    fontWeight: '600',
    letterSpacing: 0,
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
