import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, ds, spacing, typography } from '../../design/recipes';

interface PageHeaderProps {
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  right?: ReactNode;
  style?: ViewStyle;
}

export default function PageHeader({ title, subtitle, onBack, right, style }: PageHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftGroup}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.textWrap}>
          <Text style={ds.headerTitle as TextStyle}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing[4],
    paddingBottom: spacing[7],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  backButton: {
    ...ds.iconButton,
    marginRight: spacing[2],
    marginTop: 4,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
