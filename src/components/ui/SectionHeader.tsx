import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors, ds, spacing, typography } from '../../design/recipes';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  inset?: boolean;
}

export default function SectionHeader({
  title,
  subtitle,
  right,
  inset = false,
}: SectionHeaderProps) {
  return (
    <View style={[styles.row, inset && styles.inset]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...ds.rowBetween,
    alignItems: 'flex-end',
    marginBottom: spacing[3],
  },
  inset: {
    marginHorizontal: spacing[4],
  },
  textWrap: {
    flexShrink: 1,
  },
  title: {
    ...typography.titleSm,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
