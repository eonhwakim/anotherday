import React, { useCallback } from 'react';
import { Animated, Image, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from '../../../lib/dayjs';

import { useAuthStore } from '../../../stores/authStore';
import { useTeamStore } from '../../../stores/teamStore';
import { handleServiceError } from '../../../lib/serviceError';
import { useToggleReactionMutation } from '../../../queries/statsMutations';

import BaseCard from '../../ui/BaseCard';
import GoalStatusChip from '../../ui/GoalStatusChip';

import { PHOTO_CARD_GAP } from './constants';
import { styles } from './styles';
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
