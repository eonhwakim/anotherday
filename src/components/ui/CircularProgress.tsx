import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../design/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 100
  color?: string;
  trackColor?: string;
  duration?: number;
  label?: string;
}

export default function CircularProgress({
  size = 48,
  strokeWidth = 3,
  progress,
  color: propColor,
  trackColor = '#F3F4F6',
  duration = 1000,
  label,
}: CircularProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const color =
    clampedProgress >= 90
      ? colors.success
      : clampedProgress < 50
        ? colors.warning
        : propColor || colors.primary;

  const animatedValue = useRef(new Animated.Value(0)).current;
  const halfSize = size / 2;
  const radius = halfSize - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: clampedProgress,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, duration, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={halfSize}
          cy={halfSize}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={halfSize}
          cy={halfSize}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.textContainer]}>
        <Text style={[styles.text, { color }]}>{label ?? `${Math.round(clampedProgress)}%`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
});
