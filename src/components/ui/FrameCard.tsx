import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import CyberFrame from './CyberFrame';
import { radius, spacing } from '../../design/recipes';

interface FrameCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export default function FrameCard({
  children,
  style,
  contentStyle,
  padded = true,
}: FrameCardProps) {
  return (
    <CyberFrame style={[styles.frame, style]} contentStyle={[padded && styles.content, contentStyle]}>
      {children}
    </CyberFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.lg,
  },
  content: {
    padding: spacing[4],
  },
});
