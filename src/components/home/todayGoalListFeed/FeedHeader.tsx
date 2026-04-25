import React from 'react';
import { Text, View } from 'react-native';
import type { FeedHeaderProps } from './types';
import { styles } from './styles';

export function FeedHeader({
  isNight,
  memberCount,
}: FeedHeaderProps) {
  return (
    <View style={styles.headerBlock}>
      <View style={styles.headerTextBlock}>
        <Text style={[styles.title, isNight && styles.titleNight]}>TODAY'S MISSION</Text>
        <Text style={[styles.hintText, isNight && styles.hintTextNight]}>
          오늘 해야 할 목표와 팀 진행 상황을 한눈에 확인하세요.
        </Text>
        <Text style={[styles.metaText, isNight && styles.metaTextNight]}>
          참여 멤버 {memberCount}명
        </Text>
      </View>
    </View>
  );
}
