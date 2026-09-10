import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import dayjs from '../../../lib/dayjs';
import { spacing } from '@/design/recipes';

import { useAuthStore } from '../../../stores/authStore';
import { useTeamStore } from '../../../stores/teamStore';
import { handleServiceError } from '../../../lib/serviceError';
import { useToggleReactionMutation } from '../../../queries/statsMutations';

import { PHOTO_CARD_GAP, CARD_CONTENT_HORIZONTAL_PAD } from './constants';
import { usePhotoCarousel } from './usePhotoCarousel';
import { PhotoPeekPlaceholder, PhotoSlideCard } from './PhotoSlideCard';
import type { CheckinWithGoal } from '../../../types/domain';

interface MemberPhotoCarouselProps {
  /** 해당 멤버의 오늘 체크인 (사진 없는 항목은 내부에서 걸러짐) */
  todayCheckins?: CheckinWithGoal[];
  /** 카드가 차지하는 콘텐츠 가로폭 (화면폭 - 좌우 여백) */
  contentWidth: number;
  onCarouselDragChange?: (dragging: boolean) => void;
}

/**
 * 오늘의 인증 사진 캐러셀.
 * MyTodayCard(내 카드)와 TeamMemberRow(팀 행)에서 공통으로 사용한다.
 */
export function MemberPhotoCarousel({
  todayCheckins,
  contentWidth,
  onCarouselDragChange,
}: MemberPhotoCarouselProps) {
  const user = useAuthStore((s) => s.user);
  const currentTeamId = useTeamStore((s) => s.currentTeam?.id);
  const todayStr = React.useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const toggleReactionMutation = useToggleReactionMutation({
    teamId: currentTeamId,
    userId: user?.id,
    date: todayStr,
  });

  const { cardWidth, carouselPanResponder, carouselX, peekTailWidth, photoCheckins } =
    usePhotoCarousel(todayCheckins, contentWidth, onCarouselDragChange);

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

  if (photoCheckins.length === 0) return null;

  return (
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
  );
}

const styles = StyleSheet.create({
  photoCarouselClip: {
    width: '100%',
    overflow: 'hidden',
  },
  photoSingleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  photoSection: {
    // 목표 칩과 사진이 붙어 보이지 않도록 여백을 넉넉히
    paddingTop: spacing[6],
    overflow: 'hidden',
    marginRight: -CARD_CONTENT_HORIZONTAL_PAD,
  },
});

export default MemberPhotoCarousel;
