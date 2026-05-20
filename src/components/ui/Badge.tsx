import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../../design/tokens';
import { radius, spacing, typography } from '../../design/recipes';

interface BadgeProps {
  label: string;
  tone?: 'leader' | 'member' | 'neutral';
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
    container: {
      paddingHorizontal: spacing[1] + 2,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.softOrange,
    },
    text: {
      ...typography.badge,
      color: colors.white,
    },
  }),
  member: StyleSheet.create({
    container: {
      paddingHorizontal: spacing[1] + 2,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },
    text: {
      ...typography.badge,
      color: colors.textSecondary,
    },
  }),
  neutral: StyleSheet.create({
    container: {
      backgroundColor: colors.bgSoft,
      borderColor: colors.border,
    },
    text: {
      color: colors.textSecondary,
    },
  }),
} as const;
