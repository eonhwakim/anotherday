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
  if (onBack) {
    return (
      <View style={[styles.navHeader, style]}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={onBack} style={styles.navBackBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={ds.headerTitleNav as TextStyle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.navSide}>{right}</View>
        </View>
        {subtitle ? <Text style={styles.navSubtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftGroup}>
        <View style={styles.textWrap}>
          <Text style={ds.headerTitle as TextStyle}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

const NAV_SIDE_WIDTH = 32;

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
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  navHeader: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 53, 53, 0.1)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBackBtn: {
    width: NAV_SIDE_WIDTH,
    paddingVertical: spacing[1],
  },
  navSide: {
    width: NAV_SIDE_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  navSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
