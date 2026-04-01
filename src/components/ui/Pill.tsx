import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type {
  GestureResponderEvent,
  ReactNode,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { ds, radius, spacing, typography } from '../../design/recipes';

interface PillProps {
  label: string;
  icon?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  activeOpacity?: number;
}

export default function Pill({
  label,
  icon,
  onPress,
  style,
  textStyle,
  numberOfLines = 1,
  activeOpacity = 0.8,
}: PillProps) {
  const content = (
    <>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, textStyle]} numberOfLines={numberOfLines}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={[styles.base, style]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  base: {
    ...ds.rowCenter,
    alignSelf: 'flex-start',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] + 1,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  icon: {
    ...ds.rowCenter,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
