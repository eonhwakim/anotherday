import React, { type ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../design/recipes';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.70)" />
      ) : (
        <View style={[styles.content, icon ? styles.contentWithIcon : null]}>
          {icon}
          <Text
            style={[
              styles.text,
              variant === 'primary' && styles.primaryText,
              variant === 'outline' && styles.outlineText,
              variant === 'secondary' && styles.secondaryText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.button,
  },
  secondary: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 61, 0.35)',
  },
  disabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWithIcon: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  text: {
    ...typography.bodyStrong,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: colors.primary,
  },
  secondaryText: {
    color: 'rgba(26,26,26,0.55)',
  },
});
