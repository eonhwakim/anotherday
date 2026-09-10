import React, { useCallback, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import dayjs from '../../../lib/dayjs';
import { colors, radius, spacing, typography } from '@/design/recipes';

import { useAuthStore } from '../../../stores/authStore';
import { useTeamStore } from '../../../stores/teamStore';
import { handleServiceError } from '../../../lib/serviceError';
import { useToggleReactionMutation } from '../../../queries/statsMutations';

import BaseCard from '../../ui/BaseCard';
import GoalStatusChip from '../../ui/GoalStatusChip';

import { PHOTO_CARD_GAP, CARD_CONTENT_HORIZONTAL_PAD } from './constants';
import type { MemberCardProps } from './types';
import { usePhotoCarousel } from './usePhotoCarousel';
import type { CheckinWithGoal } from '../../../types/domain';

import { PhotoPeekPlaceholder, PhotoSlideCard } from './PhotoSlideCard';

export function MemberCard({ member, isMe, animVal, onCarouselDragChange }: MemberCardProps) {
  const allDone = member.totalGoals > 0 && member.completedGoals >= member.totalGoals;
  const progressRatio = member.totalGoals > 0 ? member.completedGoals / member.totalGoals : 0;
  const animOpacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const animSlide = animVal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const { width: screenWidth } = useWindowDimensions();
  const feedContentWidth = Math.max(screenWidth - 40, 0);
  const user = useAuthStore((s) => s.user);
  const currentTeamId = useTeamStore((s) => s.currentTeam?.id);
  const todayStr = React.useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const toggleReactionMutation = useToggleReactionMutation({
    teamId: currentTeamId,
    userId: user?.id,
    date: todayStr,
  });
  const { cardWidth, carouselPanResponder, carouselX, peekTailWidth, photoCheckins } =
    usePhotoCarousel(member.todayCheckins, feedContentWidth, onCarouselDragChange);

  const pendingCheckinIds = useRef<Set<string>>(new Set());

  const handleReactionPress = useCallback(
    async (checkin: CheckinWithGoal) => {
      if (!user) return;
      if (pendingCheckinIds.current.has(checkin.id)) return;

      pendingCheckinIds.current.add(checkin.id);
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
      } finally {
        pendingCheckinIds.current.delete(checkin.id);
      }
    },
    [toggleReactionMutation, user],
  );

  return (
    <Animated.View
      style={[styles.memberRow, { opacity: animOpacity, transform: [{ translateY: animSlide }] }]}
    >
      <BaseCard glassOnly style={styles.memberCard}>
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
            </View>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.nickname}
                </Text>
                {isMe ? (
                  <View style={styles.meBadge}>
                    <Text style={styles.meBadgeText}>나</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <Text style={styles.memberCount}>
            {member.completedGoals}/{member.totalGoals}
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
        ) : (
          <Text style={styles.noGoalText}>오늘 루틴 없음</Text>
        )}

        {photoCheckins.length > 0 ? (
          <View style={styles.photoSection}>
            <View style={styles.photoCarouselClip}>
              <Animated.View
                style={[styles.photoSingleRow, { transform: [{ translateX: carouselX }] }]}
                {...carouselPanResponder.panHandlers}
              >
                {photoCheckins.map((checkin, index) => (
                  <PhotoSlideCard
                    key={checkin.id}
                    checkin={checkin}
                    index={index}
                    totalCount={photoCheckins.length}
                    userId={user?.id}
                    width={cardWidth}
                    marginRight={PHOTO_CARD_GAP}
                    onReactionPress={handleReactionPress}
                    isReactionPending={toggleReactionMutation.isPending}
                  />
                ))}
                {peekTailWidth > 0 ? <PhotoPeekPlaceholder width={peekTailWidth} /> : null}
              </Animated.View>
            </View>
          </View>
        ) : null}
      </BaseCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  memberRow: {
    marginBottom: 18,
    width: '100%',
  },
  memberCard: {
    flex: 1,
    borderRadius: radius.xxl,
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
    minWidth: 0,
  },
  memberAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 50,
    backgroundColor: colors.white80,
    borderWidth: 2,
    borderColor: colors.white,
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
    ...typography.titleSm,
    color: '#4A558F',
  },
  memberAvatarInitialDone: {
    color: colors.white,
  },
  noGoalText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 12,
  },
  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  memberName: {
    ...typography.titleSm,
    color: colors.text,
    flexShrink: 1,
    lineHeight: 22,
  },
  memberCount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.darkGreen,
    letterSpacing: 0,
    marginLeft: 12,
  },
  meBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primaryStrong,
  },
  meBadgeText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '800',
    letterSpacing: 0,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(26, 26, 26, 0.08)',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primaryWarm,
  },
  progressFillDone: {
    backgroundColor: colors.successBright,
  },
  photoCarouselClip: {
    width: '100%',
    overflow: 'hidden',
  },
  photoSingleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  photoSection: {
    paddingVertical: spacing[4],
    overflow: 'hidden',
    marginRight: -CARD_CONTENT_HORIZONTAL_PAD,
  },
});
