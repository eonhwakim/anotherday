import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { COLORS } from '../../constants/defaults';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
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
      {/* 홀로그래픽 그라디언트 배경 (primary) */}
      {variant === 'primary' && !isDisabled && (
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="holoBtn" x1="0" y1="0.5" x2="1" y2="0.5">
              <Stop offset="0%" stopColor={COLORS.secondary} />
              <Stop offset="35%" stopColor="#2EE8A5" />
              <Stop offset="65%" stopColor={COLORS.holoCyan} />
              <Stop offset="100%" stopColor={COLORS.secondary} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#holoBtn)" rx={14} />
        </Svg>
      )}
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? COLORS.primaryLight : '#fff'}
        />
      ) : (
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
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
  },
  disabled: {
    opacity: 0.3,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryText: {
    color: '#000',
  },
  outlineText: {
    color: COLORS.primaryLight,
  },
  secondaryText: {
    color: COLORS.text,
  },
});
