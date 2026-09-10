import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, numericFont } from '../../design/recipes';

interface CalendarScoreTableProps {
  doneCount: number;
  passCount: number;
  totalGoals: number;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

/**
 * 하루 성취를 요약하는 점 범례.
 * Habits의 Today Summary·루틴 목록과 같은 색 언어를 쓴다.
 * (완료 초록 / 패스 노랑 / 미달 코랄)
 */
export default function CalendarScoreTable({
  doneCount,
  passCount,
  totalGoals,
  style,
  compact = false,
}: CalendarScoreTableProps) {
  const missedCount = Math.max(0, totalGoals - (doneCount + passCount));

  const items = [
    { key: 'done', color: colors.softGreen, value: doneCount },
    passCount > 0 ? { key: 'pass', color: colors.softYellow, value: passCount } : null,
    missedCount > 0 ? { key: 'missed', color: colors.softCoral, value: missedCount } : null,
  ].filter(Boolean) as { key: string; color: string; value: number }[];

  return (
    <View style={[styles.row, compact && styles.rowCompact, style]}>
      {items.map((item) => (
        <View key={item.key} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
      <Text style={styles.total}>/ {totalGoals}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  rowCompact: {
    columnGap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  value: {
    ...numericFont,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  total: {
    ...numericFont,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
