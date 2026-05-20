import React, { memo, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Text,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, ds, spacing, typography } from '../../design/recipes';

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

  // 숨쉬는 애니메이션을 위한 값들 (FloatingCameraButton 참고)
  const scaleAnim1 = useRef(new Animated.Value(1)).current;
  const scaleAnim2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 첫 번째 겹 (크게 숨쉬는 듯한 애니메이션)
    const scaleLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim1, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim1, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // 두 번째 겹 (조금 다르게 숨쉬는 애니메이션)
    const scaleLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim2, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim2, {
          toValue: 0.95,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

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

    scaleLoop1.start();
    scaleLoop2.start();
    spinLoop.start();
    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      scaleLoop1.stop();
      scaleLoop2.stop();
      spinLoop.stop();
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [pulse, spin, shimmer, scaleAnim1, scaleAnim2]);

  const spinRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const reverseSpinRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const ringGlowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.05],
  });
  const ringGlowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.72],
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

  const orbSize = 176;
  const strokeWidth = 18;
  const ringRadius = 66;
  const circumference = 2 * Math.PI * ringRadius;
  const safeTotal = Math.max(stats.totalGoals, 1);

  const activeSegments =
    (stats.doneCount > 0 ? 1 : 0) + (stats.passCount > 0 ? 1 : 0) + (actualMissedCount > 0 ? 1 : 0);

  const gap = activeSegments > 1 ? strokeWidth + 10 : 0;
  const totalGap = activeSegments * gap;
  const usableCircumference = Math.max(0, circumference - totalGap);

  const doneDash = usableCircumference * (stats.doneCount / safeTotal);
  const passDash = usableCircumference * (stats.passCount / safeTotal);
  const missedDash = usableCircumference * (actualMissedCount / safeTotal);

  let currentOffset = 0;
  const doneOffset = currentOffset;
  if (stats.doneCount > 0) currentOffset -= doneDash + gap;
  const passOffset = currentOffset;
  if (stats.passCount > 0) currentOffset -= passDash + gap;
  const missedOffset = currentOffset;

  return (
    <View style={[styles.heroRow, style]}>
      <View style={styles.leftColumn}>
        <View style={styles.header}>
          <Text style={ds.cardTitle}>{summaryTitle}</Text>
          <Text style={styles.description}>{summaryText}</Text>
        </View>

        <View style={styles.orbShell}>
          <View style={styles.orbGradient}>
            {/* 숨쉬는 무지개빛 비눗방울 효과 추가 */}
            <Animated.View
              style={[
                styles.blob,
                styles.blob1,
                { transform: [{ scale: scaleAnim1 }, { rotate: spinRotate }] },
              ]}
            />
            <Animated.View
              style={[
                styles.blob,
                styles.blob2,
                { transform: [{ scale: scaleAnim2 }, { rotate: reverseSpinRotate }] },
              ]}
            />
            <Animated.View
              style={[
                styles.blob,
                styles.blobWhite,
                { transform: [{ scale: scaleAnim1 }, { rotate: spinRotate }] },
              ]}
            />

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
              <Svg
                width={orbSize + 40}
                height={orbSize + 40}
                viewBox={`0 0 ${orbSize + 40} ${orbSize + 40}`}
              >
                <G rotation="-90" origin={`${(orbSize + 40) / 2}, ${(orbSize + 40) / 2}`}>
                  <Circle
                    cx={(orbSize + 40) / 2}
                    cy={(orbSize + 40) / 2}
                    r={ringRadius}
                    stroke={colors.mint}
                    strokeOpacity={0.2}
                    strokeWidth={40}
                    fill="none"
                  />
                  <Circle
                    cx={(orbSize + 40) / 2}
                    cy={(orbSize + 40) / 2}
                    r={ringRadius}
                    stroke={colors.softYellow}
                    strokeOpacity={0.3}
                    strokeWidth={25}
                    fill="none"
                  />
                </G>
              </Svg>
            </Animated.View>

            <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
              <Svg width={orbSize} height={orbSize} viewBox={`0 0 ${orbSize} ${orbSize}`}>
                <Defs>
                  <SvgLinearGradient id="doneRing" x1="0%" y1="100%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={colors.mint} />
                    <Stop offset="100%" stopColor={colors.softGreen} />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="passRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={colors.softYellow} />
                    <Stop offset="100%" stopColor={colors.softPeach} />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="missedRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={colors.softPink} />
                    <Stop offset="100%" stopColor={colors.softCoral} />
                  </SvgLinearGradient>
                </Defs>

                <G rotation="-90" origin={`${orbSize / 2}, ${orbSize / 2}`}>
                  {/* 흰색 테두리 추가 */}
                  <Circle
                    cx={orbSize / 2}
                    cy={orbSize / 2}
                    r={ringRadius}
                    stroke={colors.white}
                    strokeWidth={strokeWidth + 6}
                    fill="none"
                  />
                  <Circle
                    cx={orbSize / 2}
                    cy={orbSize / 2}
                    r={ringRadius}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {stats.doneCount > 0 ? (
                    <Circle
                      cx={orbSize / 2}
                      cy={orbSize / 2}
                      r={ringRadius}
                      stroke="url(#doneRing)"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${doneDash} ${circumference - doneDash}`}
                      strokeDashoffset={doneOffset}
                      strokeLinecap="round"
                      fill="none"
                    />
                  ) : null}
                  {stats.passCount > 0 ? (
                    <Circle
                      cx={orbSize / 2}
                      cy={orbSize / 2}
                      r={ringRadius}
                      stroke="url(#passRing)"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${passDash} ${circumference - passDash}`}
                      strokeDashoffset={passOffset}
                      strokeLinecap="round"
                      fill="none"
                    />
                  ) : null}
                  {actualMissedCount > 0 ? (
                    <Circle
                      cx={orbSize / 2}
                      cy={orbSize / 2}
                      r={ringRadius}
                      stroke="url(#missedRing)"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${missedDash} ${circumference - missedDash}`}
                      strokeDashoffset={missedOffset}
                      strokeLinecap="round"
                      fill="none"
                    />
                  ) : null}
                </G>
              </Svg>
            </Animated.View>

            <View style={styles.orbCenter}>
              <Text style={styles.orbCount}>{stats.totalGoals}</Text>
              <Text style={styles.orbLabel}>총 루틴</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.metricsColumn}>
        <View style={[styles.metricCard]}>
          <View style={styles.metricTop}>
            <Ionicons name="checkmark-circle" size={22} color={colors.statusSuccessBg} />
            <Text style={styles.metricLabel}>완료</Text>
          </View>
          <Text style={styles.metricValue}>{stats.doneCount}</Text>
        </View>

        <View style={[styles.metricCard]}>
          <View style={styles.metricTop}>
            <Ionicons name="play-forward-circle" size={22} color={colors.statusPassBg} />
            <Text style={styles.metricLabel}>오늘 넘김</Text>
          </View>
          <Text style={styles.metricValue}>{stats.passCount}</Text>
        </View>

        <View style={[styles.metricCard]}>
          <View style={styles.metricTop}>
            <Ionicons name="alert-circle" size={22} color={colors.statusErrorBg} />
            <Text style={styles.metricLabel}>미인증</Text>
          </View>
          <Text style={styles.metricValue}>{actualMissedCount}</Text>
        </View>
      </View>
    </View>
  );
}

export default memo(DaySummaryCard);

const styles = StyleSheet.create({
  header: {
    width: '100%',
    marginBottom: spacing[5],
    gap: spacing[1],
    alignItems: 'flex-start',
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 32,
    paddingVertical: spacing[5],
    paddingRight: spacing[3],
    shadowColor: colors.softBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  leftColumn: {
    alignItems: 'center',
    flex: 1,
  },
  orbShell: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGradient: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 네온 파형 글로우 효과 (blob 재활용)
  blob: {
    position: 'absolute',
    width: 160,
    height: 160,
  },
  blob1: {
    backgroundColor: colors.softPink,
    opacity: 0.4,
    borderRadius: 80,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 70,
    borderBottomRightRadius: 85,
    borderBottomLeftRadius: 60,
    width: 190,
    height: 190,
  },
  blob2: {
    backgroundColor: colors.softRed,
    opacity: 0.4,
    borderRadius: 80,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 90,
    borderBottomRightRadius: 70,
    borderBottomLeftRadius: 100,
    width: 180,
    height: 180,
    transform: [{ rotate: '45deg' }],
  },
  blobWhite: {
    backgroundColor: colors.softYellow,
    opacity: 0.3,
    borderRadius: 80,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 70,
    borderBottomRightRadius: 100,
    borderBottomLeftRadius: 60,
    width: 170,
    height: 170,
    transform: [{ rotate: '-20deg' }],
  },
  ringAura: {
    position: 'absolute',
    width: 216,
    height: 216,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCount: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 46,
  },
  orbLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  metricsColumn: {
    marginTop: 36,
    gap: spacing[3],
    justifyContent: 'center',
    paddingLeft: spacing[2],
  },
  metricCard: {
    alignItems: 'flex-start',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginLeft: 26, // 아이콘 너비만큼 들여쓰기
  },
});
