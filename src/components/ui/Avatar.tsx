import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  icon?: 'person' | 'people';
}

export default function Avatar({ uri, size = 48, icon = 'person' }: AvatarProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.42)} color={colors.primaryLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.brandLight,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brandPale,
  },
});
