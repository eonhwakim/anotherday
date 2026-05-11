import React, { memo, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Text,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import GlassCard from '../ui/GlassCard';
import { colors, radius, spacing, typography, ds } from '../../design/recipes';

export interface DaySummaryData {
  totalGoals: number;
  doneCount: number;
  passCount: number;
  missedCount: number;
}

export interface DaySummaryCardProps {
  stats: DaySummaryData | null;
  isToday?: boolean;
  isFuture?: boolean;
  style?: StyleProp<ViewStyle>;
}

function DaySummaryCard({ stats, isToday = true, isFuture = false, style }: DaySummaryCardProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 7200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(1000), // Pause between shimmers
      ]),
    );

    spinLoop.start();
    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [pulse, spin, shimmer]);

  const spinRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const reverseSpinRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.06],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });
  const ringGlowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.05],
  });
  const ringGlowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.72],
  });
  const shimmerTranslateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 300],
  });
  const sparkleOpacity = shimmer.interpolate({
    inputRange: [0, 0.18, 0.5, 0.82, 1],
    outputRange: [0, 0.22, 0.95, 0.2, 0],
  });

  if (!stats) return null;

  const actualMissedCount = isFuture ? 0 : stats.missedCount;

  const summaryTitle = isToday ? 'Today Summary' : 'Selected Date Summary';
  const summaryText =
    stats.totalGoals === 0
      ? '이 날에는 등록된 루틴이 없어요.'
      : isFuture
        ? '아직 다가오지 않은 날이에요.'
        : actualMissedCount > 0
          ? `${actualMissedCount}개를 인증해주세요.`
          : stats.passCount > 0
            ? '패스로 오늘 계획을 조정했어요.'
            : '모든 루틴이 깔끔하게 기록됐어요.';

  const orbSize = 164;
  const strokeWidth = 12;
  const ringRadius = 58;
  const circumference = 2 * Math.PI * ringRadius;
  const safeTotal = Math.max(stats.totalGoals, 1);
  const doneLength = circumference * (stats.doneCount / safeTotal);
  const passLength = circumference * (stats.passCount / safeTotal);
  const missedLength = circumference * (actualMissedCount / safeTotal);

  return (
    <GlassCard style={[styles.container, style]}>
      <View style={styles.heroRow}>
        <View style={styles.leftColumn}>
          <View style={styles.header}>
            <Text style={ds.title as TextStyle}>{summaryTitle}</Text>
            <Text style={styles.description}>{summaryText}</Text>
          </View>

          <View style={styles.orbShell}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.96)',
                'rgba(255,244,239,0.78)',
                'rgba(255,224,209,0.56)',
              ]}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={styles.orbGradient}
            >
              <Animated.View
                style={[
                  styles.orbGlow,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              />
              <View style={styles.orbSheen} />

              <View style={[StyleSheet.absoluteFill, { borderRadius: 88, overflow: 'hidden' }]}>
                <Animated.View
                  style={{
                    width: 60,
                    height: '200%',
                    top: '-50%',
                    left: 0,
                    transform: [{ translateX: shimmerTranslateX }, { rotate: '25deg' }],
                  }}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
              </View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.ringAura,
                  {
                    opacity: ringGlowOpacity,
                    transform: [{ scale: ringGlowScale }],
                  },
                ]}
              >
                <Svg width={orbSize} height={orbSize} viewBox={`0 0 ${orbSize} ${orbSize}`}>
                  <G rotation="-90" origin={`${orbSize / 2}, ${orbSize / 2}`}>
                    <Circle
                      cx={orbSize / 2}
                      cy={orbSize / 2}
                      r={ringRadius}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth={30}
                      fill="none"
                    />
                    <Circle
                      cx={orbSize / 2}
                      cy={orbSize / 2}
                      r={ringRadius}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={22}
                      fill="none"
                    />
                    <Circle
                      cx={orbSize / 2}
                      cy={orbSize / 2}
                      r={ringRadius}
                      stroke="rgba(255,255,255,0.34)"
                      strokeWidth={14}
                      fill="none"
                    />
                  </G>
                </Svg>
              </Animated.View>

              <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
                <Svg width={orbSize} height={orbSize} viewBox={`0 0 ${orbSize} ${orbSize}`}>
                  <Defs>
                    <SvgLinearGradient id="doneRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#A7F3D0" />
                      <Stop offset="100%" stopColor="#4ADE80" />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="passRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FDE68A" />
                      <Stop offset="100%" stopColor="#f2c94c" />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="missedRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={colors.brandWarm} />
                      <Stop offset="100%" stopColor={colors.primary} />
                    </SvgLinearGradient>
                  </Defs>

                  <G rotation="-90" origin={`${orbSize / 2}, ${orbSize / 2}`}>
                    <Circle
                      cx={orbSize / 2}
                      cy={orbSize / 2}
                      r={ringRadius}
                      stroke="rgba(255,255,255,0.34)"
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    {doneLength > 0 ? (
                      <Circle
                        cx={orbSize / 2}
                        cy={orbSize / 2}
                        r={ringRadius}
                        stroke="url(#doneRing)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${doneLength} ${circumference - doneLength}`}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : null}
                    {passLength > 0 ? (
                      <Circle
                        cx={orbSize / 2}
                        cy={orbSize / 2}
                        r={ringRadius}
                        stroke="url(#passRing)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${passLength} ${circumference - passLength}`}
                        strokeDashoffset={-doneLength}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : null}
                    {missedLength > 0 ? (
                      <Circle
                        cx={orbSize / 2}
                        cy={orbSize / 2}
                        r={ringRadius}
                        stroke="url(#missedRing)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${missedLength} ${circumference - missedLength}`}
                        strokeDashoffset={-(doneLength + passLength)}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : null}
                  </G>
                </Svg>
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sparkleOrbit,
                  {
                    opacity: sparkleOpacity,
                    transform: [{ rotate: spinRotate }],
                  },
                ]}
              >
                <View style={styles.sparkleCluster}>
                  <View style={styles.sparkleBloomLarge} />
                  <View style={styles.sparkleBloomSmall} />
                  <View style={styles.sparkleCore} />
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.orbInnerHalo,
                  {
                    transform: [{ rotate: reverseSpinRotate }],
                  },
                ]}
              />

              <View style={styles.orbCenter}>
                <Text style={styles.orbCount}>{stats.totalGoals}</Text>
                <Text style={styles.orbLabel}>총 루틴</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.metricsColumn}>
          <View style={[styles.metricCard, styles.metricDone]}>
            <View style={styles.metricTop}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.metricLabel}>완료</Text>
            </View>
            <Text style={styles.metricValue}>{stats.doneCount}</Text>
          </View>

          <View style={[styles.metricCard, styles.metricPass]}>
            <View style={styles.metricTop}>
              <Ionicons name="play-forward-circle" size={20} color={colors.warning} />
              <Text style={styles.metricLabel}>오늘 넘김</Text>
            </View>
            <Text style={styles.metricValue}>{stats.passCount}</Text>
          </View>

          <View style={[styles.metricCard, styles.metricMissed]}>
            <View style={styles.metricTop}>
              <Ionicons name="alert-circle" size={20} color={colors.primaryLight} />
              <Text style={styles.metricLabel}>미인증</Text>
            </View>
            <Text style={styles.metricValue}>{actualMissedCount}</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

export default memo(DaySummaryCard);

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.xxl,
  },
  header: {
    marginBottom: spacing[2],
    gap: spacing[1],
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[6],
  },
  leftColumn: {
    // container for header and orbShell
  },
  orbShell: {
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGradient: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    shadowColor: '#FFB380',
    shadowOpacity: 0.24,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  orbGlow: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  ringAura: {
    position: 'absolute',
    width: 164,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbSheen: {
    position: 'absolute',
    top: 18,
    left: 26,
    width: 84,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-18deg' }],
  },
  orbInnerHalo: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  sparkleOrbit: {
    position: 'absolute',
    width: 164,
    height: 164,
    alignItems: 'center',
  },
  sparkleCluster: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBloomLarge: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  sparkleBloomSmall: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.32)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  sparkleCore: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.95,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  orbCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 38,
  },
  orbLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    // marginTop: 2,
  },
  metricsColumn: {
    gap: spacing[3],
  },
  metricCard: {
    borderRadius: radius.xxl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
  },
  metricDone: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(255,255,255,0.42)',
  },
  metricPass: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(255, 214, 121, 0.4)',
  },
  metricMissed: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(255, 154, 144, 0.42)',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
});
