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
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, ds, spacing } from '../../design/recipes';

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

  // stats가 없으면 아래에서 null을 반환해 Animated.View가 하나도 렌더되지 않는다.
  // 그 상태로 네이티브 드라이버 루프를 시작하면 붙일 뷰가 없어 애니메이션이 그대로 얼어붙으므로,
  // 뷰가 실제로 그려지는 시점(=stats 도착)에 맞춰 시작한다.
  const hasStats = !!stats;

  useEffect(() => {
    if (!hasStats) return;

    // 첫 번째 겹 (크게 숨쉬는 듯한 애니메이션)
    const scaleLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim1, {
          // 오브를 줄인 만큼 배율을 키워야 같은 정도로 '숨쉬어' 보인다
          toValue: 1.22,
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
          toValue: 1.13,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim2, {
          toValue: 0.92,
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
  }, [hasStats, pulse, spin, shimmer, scaleAnim1, scaleAnim2]);

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
    outputRange: [0.96, 1.09],
  });
  const ringGlowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.34, 0.8],
  });

  if (!stats) return null;

  const actualMissedCount = isFuture ? 0 : stats.missedCount;

  const summaryTitle = isToday ? 'Today Summary' : 'Selected Date Summary';

  const orbSize = 140;
  const strokeWidth = 14;
  const ringRadius = 53;
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
        {/* <View style={styles.header}>
          <Text style={ds.cardTitle}>{summaryTitle}</Text>
        </View> */}

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

        {/* 오브 아래 가로 범례 — 세 숫자는 결국 링의 범례이므로 링과 같은 색 점으로 잇는다 */}
        <View style={styles.legendRow}>
          <LegendItem color={colors.softGreen} label="완료" value={stats.doneCount} />
          <LegendItem color={colors.softYellow} label="패스" value={stats.passCount} />
          <LegendItem color={colors.softCoral} label="미인증" value={actualMissedCount} />
        </View>
      </View>
    </View>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
  value: number;
}

function LegendItem({ color, label, value }: LegendItemProps) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

export default memo(DaySummaryCard);

const styles = StyleSheet.create({
  header: {
    width: '100%',
    marginBottom: spacing[7],
    gap: spacing[1],
    alignItems: 'flex-start',
  },
  heroRow: {
    borderRadius: 28,
    // 타이틀이 빠져서 오브 위아래 여백을 균등하게
    paddingVertical: spacing[5],
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
  /** 오브 아래 한 줄로 놓이는 범례 */
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    // 세 항목은 한 덩어리로 읽혀야 하므로 간격을 좁게
    columnGap: spacing[3],
    rowGap: spacing[2],
    // 오브와 충분히 떨어뜨려 별개의 줄로 읽히게
    marginTop: spacing[7],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  orbGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 네온 파형 글로우 효과 (blob 재활용)
  blob: {
    position: 'absolute',
    width: 140,
    height: 140,
  },
  blob1: {
    backgroundColor: colors.softPink,
    opacity: 0.4,
    borderRadius: 80,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 70,
    borderBottomRightRadius: 85,
    borderBottomLeftRadius: 60,
    width: 168,
    height: 168,
  },
  blob2: {
    backgroundColor: colors.softRed,
    opacity: 0.4,
    borderRadius: 80,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 90,
    borderBottomRightRadius: 70,
    borderBottomLeftRadius: 100,
    width: 160,
    height: 160,
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
    width: 152,
    height: 152,
    transform: [{ rotate: '-20deg' }],
  },
  ringAura: {
    position: 'absolute',
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCount: {
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: colors.text,
    lineHeight: 38,
  },
  orbLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
