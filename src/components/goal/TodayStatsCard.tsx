import React, { memo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../design/recipes';

export interface TodayStatsData {
  ratePct: number;
  streak: number;
  doneToday: number;
  totalToday: number;
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
      <View style={styles.card}>
        <View style={styles.valueRow}>
          <Ionicons name="flame" size={22} color={RATE_COLOR} />
          <Text style={[styles.value, styles.valueInline, { color: RATE_COLOR }]}>
            {stats.totalToday > 0 ? `${stats.ratePct}%` : '—'}
          </Text>
        </View>
        <Text style={styles.label}>오늘 달성률</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.valueRow}>
          <Ionicons name="bicycle" size={24} color={STREAK_COLOR} />
          <Text style={[styles.value, styles.valueInline, { color: STREAK_COLOR }]}>
            {stats.streak}
          </Text>
        </View>
        <Text style={styles.label}>연속 달성일</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.valueRow}>
          <Ionicons name="trending-up" size={22} color={DONE_COLOR} />
          <Text style={[styles.value, styles.valueInline, { color: DONE_COLOR }]}>
            {stats.totalToday > 0 ? `${stats.doneToday}/${stats.totalToday}` : '—'}
          </Text>
        </View>
        <Text style={styles.label}>오늘 완료</Text>
      </View>
    </View>
  );
}

export default memo(TodayStatsCard);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing[1],
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
