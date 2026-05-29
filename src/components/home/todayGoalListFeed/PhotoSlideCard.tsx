import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from '@/lib/dayjs';
import { LIKE_PILL_ACCENT, LIKE_PILL_MUTED } from './constants';
import { FeedReactionAvatars } from './FeedReactionAvatars';
import { colors, radius, typography } from '@/design/tokens';
import type { PhotoSlideCardProps } from './types';

export function PhotoPeekPlaceholder({ width }: { width: number }) {
  return (
    <View
      style={[
        styles.photoSlideDashedCard,
        styles.photoPlaceholderCard,
        { width: width > 0 ? width : undefined },
      ]}
    />
  );
}

export function PhotoSlideCard({
  checkin,
  index,
  totalCount,
  userId,
  width,
  marginRight,
  onReactionPress,
  isReactionPending = false,
}: PhotoSlideCardProps) {
  const reactions = checkin.reactions ?? [];
  const reacted = !!userId && reactions.some((reaction) => reaction.user_id === userId);
  const likePillAccent = reacted || reactions.length > 0;

  return (
    <View
      style={[
        styles.photoSlideCard,
        {
          width: width > 0 ? width : '100%',
          marginRight,
        },
      ]}
    >
      <View style={styles.photoSlideInner}>
        <View style={styles.photoTag}>
          <Text style={styles.photoTagText}>{checkin.goal?.name ?? '오늘의 인증'}</Text>
        </View>
        <Image source={{ uri: checkin.photo_url! }} style={styles.photoImage} />
        <View style={styles.photoTimestamp}>
          <Text style={styles.photoTimestampText}>
            {dayjs(checkin.created_at).format('A h:mm')}
          </Text>
        </View>
      </View>

      <View style={styles.photoFooter}>
        <View style={styles.photoActions}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.likePill}
            onPress={() => onReactionPress(checkin)}
            disabled={isReactionPending}
          >
            <Ionicons
              name={likePillAccent ? 'heart' : 'heart-outline'}
              size={20}
              color={likePillAccent ? LIKE_PILL_ACCENT : LIKE_PILL_MUTED}
            />
            <Text style={[styles.likePillCount, likePillAccent && styles.likePillCountAccent]}>
              {reactions.length}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.photoFooterRight}>
          <FeedReactionAvatars reactions={reactions} />
          <Text style={styles.photoIndexText}>
            {index + 1}/{totalCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photoSlideCard: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.white80,
  },
  photoPlaceholderCard: {
    backgroundColor: colors.white40,
  },
  photoSlideDashedCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.black20,
    borderTopLeftRadius: radius.xxl,
    borderBottomLeftRadius: radius.xxl,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  photoSlideInner: {
    position: 'relative',
    width: '100%',
  },
  photoTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    backgroundColor: colors.white,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoTagText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  photoImage: {
    width: '100%',
    aspectRatio: 1.18,
    backgroundColor: colors.black30,
  },
  photoTimestamp: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 2,
    backgroundColor: colors.black40,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  photoTimestampText: {
    ...typography.caption,
    color: colors.white,
  },
  photoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.black60,
  },
  photoFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexShrink: 1,
  },
  likePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(182, 180, 180, 0.2)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  likePillCount: {
    fontSize: 15,
    fontWeight: '700',
    color: LIKE_PILL_MUTED,
    fontVariant: ['tabular-nums'],
  },
  likePillCountAccent: {
    color: LIKE_PILL_ACCENT,
  },
  feedReactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  photoIndexText: {
    ...typography.label,
    color: colors.textMuted,
  },
});
