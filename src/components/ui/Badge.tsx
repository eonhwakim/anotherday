import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../../design/tokens';
import { ds, radius, spacing, typography } from '../../design/recipes';

interface BadgeProps {
  label: string;
  tone?: 'leader' | 'member' | 'success' | 'warning' | 'error' | 'neutral';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Badge({ label, tone = 'neutral', style, textStyle }: BadgeProps) {
  return (
    <View style={[styles.base, toneStyles[tone].container, style]}>
      <Text style={[styles.text, toneStyles[tone].text, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing[1] + 2,
    paddingVertical: 2,
    borderRadius: radius.sm / 2,
    borderWidth: 1,
  },
  text: {
    ...typography.badge,
  },
});

const toneStyles = {
  leader: StyleSheet.create({
    container: ds.badgeLeader,
    text: ds.badgeLeaderText,
  }),
  member: StyleSheet.create({
    container: ds.badgeMember,
    text: ds.badgeMemberText,
  }),
  success: StyleSheet.create({
    container: {
      backgroundColor: 'rgba(74, 222, 128, 0.10)',
      borderColor: 'rgba(74, 222, 128, 0.22)',
    },
    text: {
      color: colors.successBright,
    },
  }),
  warning: StyleSheet.create({
    container: {
      backgroundColor: 'rgba(255,181,71,0.10)',
      borderColor: 'rgba(255,181,71,0.28)',
    },
    text: {
      color: '#E8960A',
    },
  }),
  error: StyleSheet.create({
    container: {
      backgroundColor: 'rgba(239,68,68,0.08)',
      borderColor: 'rgba(239,68,68,0.18)',
    },
    text: {
      color: colors.error,
    },
  }),
  neutral: StyleSheet.create({
    container: {
      backgroundColor: colors.glass,
      borderColor: colors.border,
    },
    text: {
      color: colors.textSecondary,
    },
  }),
} as const;
