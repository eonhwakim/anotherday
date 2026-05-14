import React, { useCallback } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Dimensions,
} from 'react-native';
import dayjs from '../../../lib/dayjs';
import { colors, radius, typography } from '@/design/recipes';

import { useAuthStore } from '../../../stores/authStore';
import { useTeamStore } from '../../../stores/teamStore';
import { handleServiceError } from '../../../lib/serviceError';
import { useToggleReactionMutation } from '../../../queries/statsMutations';

import BaseCard from '../../ui/BaseCard';
import GoalStatusChip from '../../ui/GoalStatusChip';

import { PHOTO_CARD_GAP } from './constants';
import type { MemberCardProps } from './types';
import { usePhotoCarousel } from './usePhotoCarousel';
import type { CheckinWithGoal } from '../../../types/domain';

import { PhotoPeekPlaceholder, PhotoSlideCard } from './PhotoSlideCard';

export function MemberCard({ member, isMe, animVal, onCarouselDragChange }: MemberCardProps) {
  const allDone = member.totalGoals > 0 && member.completedGoals >= member.totalGoals;
  const animOpacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const animSlide = animVal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const { width: screenWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const currentTeamId = useTeamStore((s) => s.currentTeam?.id);
  const todayStr = dayjs().format('YYYY-MM-DD');
  const toggleReactionMutation = useToggleReactionMutation({
    teamId: currentTeamId,
    userId: user?.id,
    date: todayStr,
  });
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
      <BaseCard glassOnly wide style={styles.memberCard}>
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

            <Text style={styles.memberName} numberOfLines={1}>
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
          <View
            style={styles.photoSection}
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              if (width > 0 && Math.abs(width - photoSectionWidth) > 1) {
                setPhotoSectionWidth(width);
              }
            }}
          >
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

const styles = StyleSheet.create({
  memberRow: {
    marginBottom: 18,
    width: '100%',
  },
  memberCard: {
    flex: 1,
    width: Dimensions.get('window').width, // 화면 전체 너비로 강제 고정
    marginLeft: -20, // 부모의 좌측 여백 상쇄
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
  },
  memberAvatarWrap: {
    width: 34,
    height: 34,
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
  },
  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  memberName: {
    ...typography.titleSm,
    flex: 1,
  },
  memberCount: {
    ...typography.bodyStrong,
    color: colors.textFaint,
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
    marginTop: 22,
    marginBottom: 22,
    overflow: 'hidden',
  },
});
