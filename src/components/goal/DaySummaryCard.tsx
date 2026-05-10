import React, { memo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import GlassCard from '../ui/GlassCard';
import { colors, radius, spacing, typography } from '../../design/recipes';

export interface DaySummaryData {
  totalGoals: number;
  doneCount: number;
  passCount: number;
  missedCount: number;
}

export interface DaySummaryCardProps {
  stats: DaySummaryData | null;
  isToday?: boolean;
  style?: StyleProp<ViewStyle>;
}

function DaySummaryCard({ stats, isToday = true, style }: DaySummaryCardProps) {
  if (!stats) return null;

  const summaryTitle = isToday ? '오늘 루틴 요약' : '선택한 날짜 요약';
  const summaryText =
    stats.totalGoals === 0
      ? '이 날에는 등록된 루틴이 없어요.'
      : stats.missedCount > 0
        ? `${stats.missedCount}개가 아직 비어 있어요.`
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
  const missedLength = circumference * (stats.missedCount / safeTotal);

  return (
    <GlassCard style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{summaryTitle}</Text>
        <Text style={styles.description}>{summaryText}</Text>
      </View>

      <View style={styles.heroRow}>
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
            <View style={styles.orbGlow} />
            <View style={styles.orbSheen} />
            <Svg width={orbSize} height={orbSize} viewBox={`0 0 ${orbSize} ${orbSize}`}>
              <Defs>
                <SvgLinearGradient id="doneRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FF9A5C" />
                  <Stop offset="100%" stopColor="#FF6B3D" />
                </SvgLinearGradient>
                <SvgLinearGradient id="passRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFD978" />
                  <Stop offset="100%" stopColor="#FFB547" />
                </SvgLinearGradient>
                <SvgLinearGradient id="missedRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FF9A90" />
                  <Stop offset="100%" stopColor="#EF4444" />
                </SvgLinearGradient>
              </Defs>

              <G rotation="-90" origin={`${orbSize / 2}, ${orbSize / 2}`}>
                <Circle
                  cx={orbSize / 2}
                  cy={orbSize / 2}
                  r={ringRadius}
                  stroke="rgba(255,255,255,0.36)"
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

            <View style={styles.orbCenter}>
              <Text style={styles.orbCount}>{stats.totalGoals}</Text>
              <Text style={styles.orbLabel}>총 루틴</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.metricsColumn}>
          <View style={[styles.metricCard, styles.metricDone]}>
            <View style={styles.metricTop}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.metricLabel}>완료</Text>
            </View>
            <Text style={styles.metricValue}>{stats.doneCount}</Text>
          </View>

          <View style={[styles.metricCard, styles.metricPass]}>
            <View style={styles.metricTop}>
              <Ionicons name="play-forward-circle" size={18} color={colors.warning} />
              <Text style={styles.metricLabel}>오늘 넘김</Text>
            </View>
            <Text style={styles.metricValue}>{stats.passCount}</Text>
          </View>

          <View style={[styles.metricCard, styles.metricMissed]}>
            <View style={styles.metricTop}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.metricLabel}>미달</Text>
            </View>
            <Text style={styles.metricValue}>{stats.missedCount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.legendChip}>
          <View style={[styles.legendDot, styles.legendDone]} />
          <Text style={styles.legendText}>완료는 실제 인증한 루틴</Text>
        </View>
        <View style={styles.legendChip}>
          <View style={[styles.legendDot, styles.legendPass]} />
          <Text style={styles.legendText}>오늘 넘김은 오늘만 쉬어간 루틴</Text>
        </View>
      </View>
    </GlassCard>
  );
}

export default memo(DaySummaryCard);

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[4] + 2,
    paddingHorizontal: spacing[4],
    borderRadius: radius.xxl,
  },
  header: {
    marginBottom: spacing[4],
    gap: spacing[1],
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[4],
  },
  orbShell: {
    width: 176,
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
    width: 126,
    height: 126,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
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
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsColumn: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  metricCard: {
    flex: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderWidth: 1,
  },
  metricDone: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(255,255,255,0.42)',
  },
  metricPass: {
    backgroundColor: 'rgba(255, 232, 184, 0.36)',
    borderColor: 'rgba(255, 214, 121, 0.4)',
  },
  metricMissed: {
    backgroundColor: 'rgba(255, 214, 214, 0.36)',
    borderColor: 'rgba(255, 154, 144, 0.42)',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  footer: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendDone: {
    backgroundColor: colors.primary,
  },
  legendPass: {
    backgroundColor: colors.warning,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
