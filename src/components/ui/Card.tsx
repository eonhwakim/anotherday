import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import CyberFrame from './CyberFrame';
import { ds, radius, spacing } from '../../design/recipes';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glassOnly?: boolean;
  padded?: boolean;
}

export default function Card({
  children,
  style,
  contentStyle,
  glassOnly = false,
  padded = true,
}: CardProps) {
  return (
    <CyberFrame
      style={[styles.frame, style]}
      contentStyle={[padded && styles.content, contentStyle]}
      glassOnly={glassOnly}
    >
      {children}
    </CyberFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    ...ds.card,
    borderRadius: radius.md,
  },
  content: {
    padding: spacing[4],
  },
});
