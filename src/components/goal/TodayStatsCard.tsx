import React, { memo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../design/recipes';
import BaseCard from '../ui/BaseCard';

export interface TodayStatsData {
  ratePct: number;
  streak: number;
  doneToday: number;
  totalToday: number;
  passToday: number;
}

const RATE_COLOR = '#E67E22';
const STREAK_COLOR = '#F1C40F';
const DONE_COLOR = '#27AE60';

export interface TodayStatsCardProps {
  stats: TodayStatsData | null;
  style?: StyleProp<ViewStyle>;
}

function TodayStatsCard({ stats, style }: TodayStatsCardProps) {
  if (!stats) return null;

  return (
    <View style={[styles.row, style]}>
      <BaseCard glassOnly padded={false} style={styles.card}>
        <View style={styles.valueRow}>
          <Ionicons name="flame" size={22} color={RATE_COLOR} />
          <Text style={[styles.value, styles.valueInline, { color: RATE_COLOR }]}>
            {stats.totalToday > 0 ? `${stats.ratePct}%` : '—'}
          </Text>
        </View>
        <Text style={styles.label}>오늘 달성률</Text>
      </BaseCard>
      <BaseCard glassOnly padded={false} style={styles.card}>
        <View style={styles.valueRow}>
          <Ionicons name="bicycle" size={24} color={STREAK_COLOR} />
          <Text style={[styles.value, styles.valueInline, { color: STREAK_COLOR }]}>
            {stats.streak}
          </Text>
        </View>
        <Text style={styles.label}>연속 달성</Text>
      </BaseCard>
      <BaseCard glassOnly padded={false} style={styles.card}>
        <View style={styles.valueRow}>
          <Ionicons name="trending-up" size={22} color={DONE_COLOR} />
          {stats.totalToday > 0 ? (
            <Text style={[styles.value, styles.valueInline, { color: DONE_COLOR }]}>
              {stats.doneToday}/{stats.totalToday}
              {stats.passToday > 0 ? (
                <Text style={styles.passValue}> ({stats.passToday}Pass)</Text>
              ) : null}
            </Text>
          ) : (
            <Text style={[styles.value, styles.valueInline, { color: DONE_COLOR }]}>—</Text>
          )}
        </View>
        <Text style={styles.label}>오늘 완료</Text>
      </BaseCard>
    </View>
  );
}

export default memo(TodayStatsCard);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  card: {
    flex: 1,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  passValue: {
    fontSize: 12,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing[1],
  },
  valueInline: {
    marginBottom: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    textAlign: 'center',
  },
});
