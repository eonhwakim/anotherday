import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, ds } from '../../design/recipes';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export default function ScreenHeader({ title, subtitle, onBack, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.leftGroup}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: ds.headerBar,
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  iconButton: ds.iconButton,
  titleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    ...ds.headerTitle,
    flexShrink: 1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  right: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
});
