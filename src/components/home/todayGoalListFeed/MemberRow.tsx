import React from 'react';
import { Animated, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, numericFont, spacing, typography } from '@/design/recipes';
import GoalStatusChip from '../../ui/GoalStatusChip';

import { MemberPhotoCarousel } from './MemberPhotoCarousel';
import type { MemberProgress } from '../../../types/domain';

interface MemberRowProps {
  member: MemberProgress;
  /** 내 항목 여부 — '나' 배지로만 구분한다 */
  isMe: boolean;
  animVal: Animated.Value;
  /** 위쪽 구분선 표시 (목록 첫 항목은 false) */
  showDivider?: boolean;
  onCarouselDragChange?: (dragging: boolean) => void;
}

/**
 * 오늘의 멤버 한 명.
 * 카드 배경 없이 시트 위에 콘텐츠만 떠 있는 형태 — 구분은 여백과 얇은 구분선으로만 준다.
 */
export function MemberRow({ member, isMe, animVal, onCarouselDragChange }: MemberRowProps) {
  const { width: screenWidth } = useWindowDimensions();
  // 캐러셀은 좌측만 시트 패딩에 맞추고 오른쪽은 화면 끝까지 흐른다
  const contentWidth = screenWidth;

  const total = member.totalGoals;
  const completed = member.completedGoals;
  const allDone = total > 0 && completed >= total;
  const progressRatio = total > 0 ? completed / total : 0;

  const animOpacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const animSlide = animVal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View
      style={[styles.wrap, { opacity: animOpacity, transform: [{ translateY: animSlide }] }]}
    >
      <View style={[styles.row]}>
        <View style={styles.headerRow}>
          <View style={[styles.avatarWrap, allDone && styles.avatarWrapDone]}>
            {member.profileImageUrl ? (
              <Image source={{ uri: member.profileImageUrl }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarInitial}>{member.nickname.charAt(0)}</Text>
            )}
          </View>

          <View style={styles.textBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {member.nickname}
              </Text>
              {isMe ? (
                <View style={styles.meBadge}>
                  <Text style={styles.meBadgeText}>나</Text>
                </View>
              ) : null}
              <View style={styles.spacer} />
              <Text style={[styles.count, allDone && styles.countDone]}>
                {completed}/{total}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  allDone && styles.progressFillDone,
                  { width: `${Math.min(progressRatio * 100, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {member.goalDetails.length > 0 ? (
          <View style={styles.goalChips}>
            {member.goalDetails.map((goal) => (
              <GoalStatusChip
                key={goal.goalId}
                goalName={goal.goalName}
                status={goal.isDone ? 'done' : goal.isPass ? 'pass' : 'todo'}
              />
            ))}
          </View>
        ) : isMe ? (
          <Text style={styles.noGoalText}>오늘 루틴 없음</Text>
        ) : null}

        <MemberPhotoCarousel
          todayCheckins={member.todayCheckins}
          contentWidth={contentWidth}
          onCarouselDragChange={onCarouselDragChange}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  /** 배경 없이 시트 위에 그대로 얹히는 콘텐츠 블록 */
  row: {
    paddingVertical: spacing[6],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white50,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: spacing[3],
  },
  avatarWrapDone: {
    borderColor: colors.successBright,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    ...typography.bodyStrong,
    color: colors.darkGreen,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    ...typography.titleSm,
    color: colors.text,
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
  meBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primaryStrong,
  },
  meBadgeText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  count: {
    ...typography.label,
    ...numericFont,
    color: colors.darkGreen,
    fontWeight: '600',
  },
  countDone: {
    color: colors.success,
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.track,
    overflow: 'hidden',
    marginTop: 7,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primaryWarm,
  },
  progressFillDone: {
    backgroundColor: colors.successBright,
  },
  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // 칩끼리 붙어 보이지 않도록 가로 간격을 넉넉히
    columnGap: 8,
    rowGap: 8,
    marginTop: spacing[3],
  },
  noGoalText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing[3],
  },
});

export default MemberRow;
