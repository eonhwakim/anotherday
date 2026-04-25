import React from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactionWithUser } from '../../../types/domain';
import { FEED_REACTION_AVATAR_MAX } from './constants';
import { styles } from './styles';

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
                <Ionicons name="person" size={iconSize} color="#fff" />
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
