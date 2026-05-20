import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import BaseCard from './BaseCard';
import { ds, spacing } from '../../design/recipes';

interface SelectableCardProps {
  label: string;
  active: boolean;
  onPress: () => void;
  glassOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SelectableCard({
  label,
  active,
  onPress,
  glassOnly = true,
  style,
}: SelectableCardProps) {
  return (
    <TouchableOpacity
      style={[styles.touchable, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <BaseCard
        style={[ds.selectableOption, active && ds.selectableOptionActive]}
        contentStyle={ds.selectableOptionContent}
        glassOnly={glassOnly}
      >
        <Text style={[ds.selectableOptionText, active && ds.selectableOptionTextActive]}>
          {label}
        </Text>
      </BaseCard>
    </TouchableOpacity>
  );
}

interface SelectableCardGroupProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SelectableCardGroup({ children, style }: SelectableCardGroupProps) {
  return <View style={[styles.group, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  group: {
    flexDirection: 'row',
    gap: spacing[3],
  },
});

export default SelectableCard;
