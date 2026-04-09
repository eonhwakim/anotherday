import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BadgeFrameProps {
  children?: React.ReactNode;
  colors: readonly [string, string, ...string[]];
  borderColor?: string;
  glowColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function BadgeFrame({
  children,
  colors,
  borderColor = 'rgba(255, 255, 255, 0.72)',
  glowColor,
  size = 48,
  style,
}: BadgeFrameProps) {
  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius,
          shadowColor: glowColor ?? borderColor,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.gradient,
          {
            borderRadius,
            borderColor,
          },
        ]}
      >
        <View
          style={[
            styles.innerGlow,
            {
              borderRadius: Math.max(10, borderRadius - 4),
            },
          ]}
        />
        <View style={styles.content}>{children}</View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  innerGlow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
