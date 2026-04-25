import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIKE_PILL_ACCENT, LIKE_PILL_MUTED } from './constants';
import { FeedReactionAvatars } from './FeedReactionAvatars';
import { styles } from './styles';
import type { PhotoSlideCardProps } from './types';

export function PhotoPeekPlaceholder() {
  return <View style={[styles.photoSlideDashedCard, styles.photoPlaceholderCard]} />;
}

export function PhotoSlideCard({
  checkin,
  index,
  totalCount,
  userId,
  width,
  marginRight,
  onReactionPress,
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
      </View>

      <View style={styles.photoFooter}>
        <View style={styles.photoActions}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.likePill}
            onPress={() => onReactionPress(checkin)}
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
