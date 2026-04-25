import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import DynamicBadge from '../../ui/MissionBadge';
import type { FeedBadgePanelProps } from './types';
import { styles } from './styles';

export function FeedBadgePanel({
  badgeMembers,
  badgeOpacityAnim,
  badgeState,
  glowOpacity,
  isNight,
  scale,
  translateY,
}: FeedBadgePanelProps) {
  return (
    <View style={[styles.badgePanel, isNight && styles.badgePanelNight]}>
      <View style={styles.badgePanelText}>
        <Text style={[styles.badgeEyebrow, isNight && styles.badgeEyebrowNight]}>TODAY BADGE</Text>
        <Text style={[styles.badgePanelTitle, isNight && styles.badgePanelTitleNight]}>
          오늘의 진행 배지
        </Text>
      </View>

      <Animated.View
        style={[
          styles.badgeWrapper,
          {
            opacity: badgeOpacityAnim,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <DynamicBadge state={badgeState} members={badgeMembers} isActive={false} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
          <DynamicBadge state={badgeState} members={badgeMembers} isActive />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
