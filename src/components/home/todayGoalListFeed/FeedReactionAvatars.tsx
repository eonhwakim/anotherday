import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactionWithUser } from '../../../types/domain';
import { FEED_REACTION_AVATAR_MAX } from './constants';
import { colors } from '@/design/tokens';

export function FeedReactionAvatars({
  reactions,
  size = 'md',
}: {
  reactions: ReactionWithUser[];
  size?: 'md' | 'lg';
}) {
  if (reactions.length === 0) return null;

  const shown = reactions.slice(0, FEED_REACTION_AVATAR_MAX);
  const extra = reactions.length - shown.length;
  const avatarSize = size === 'lg' ? 32 : 24;
  const overlap = size === 'lg' ? -10 : -8;
  const borderRadius = avatarSize / 2;
  const iconSize = size === 'lg' ? 18 : 14;
  const moreSize = size === 'lg' ? 34 : 28;

  return (
    <View style={styles.feedReactionRow}>
      <View style={styles.reactionContainer}>
        {shown.map((reaction, idx) => (
          <View
            key={reaction.id}
            style={[
              styles.reactionSticker,
              {
                zIndex: shown.length - idx,
                marginLeft: idx > 0 ? overlap : 0,
                width: avatarSize,
                height: avatarSize,
                borderRadius,
              },
            ]}
          >
            {reaction.user.profile_image_url ? (
              <Image
                source={{ uri: reaction.user.profile_image_url }}
                style={styles.reactionAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.reactionAvatar, styles.reactionAvatarFallback]}>
                <Ionicons name="person" size={iconSize} color={colors.white} />
              </View>
            )}
          </View>
        ))}
      </View>
      {extra > 0 ? (
        <View
          style={[
            styles.reactionMore,
            {
              minWidth: moreSize,
              height: moreSize,
              borderRadius: moreSize / 2,
            },
          ]}
        >
          <Text style={styles.reactionMoreText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  feedReactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  reactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionSticker: {
    width: 26,
    height: 26,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.sauvignonBlush,
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionAvatar: {
    width: '100%',
    height: '100%',
  },
  reactionAvatarFallback: {
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionMore: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 6,
    marginLeft: 4,
    backgroundColor: 'rgba(255, 107, 61, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionMoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
});
