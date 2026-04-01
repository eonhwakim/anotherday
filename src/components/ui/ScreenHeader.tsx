import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, ds } from '../../design/recipes';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export default function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSpace} />
      )}
      <Text style={styles.title}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : <View style={styles.sideSpace} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: ds.headerBar,
  iconButton: ds.iconButton,
  title: ds.headerTitle,
  sideSpace: {
    width: 24,
  },
  right: {
    minWidth: 24,
    alignItems: 'flex-end',
  },
});
