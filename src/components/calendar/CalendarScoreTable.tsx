import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '../../design/tokens';

interface CalendarScoreTableProps {
  doneCount: number;
  passCount: number;
  totalGoals: number;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export default function CalendarScoreTable({
  doneCount,
  passCount,
  totalGoals,
  style,
  compact = false,
}: CalendarScoreTableProps) {
  const missedCount = Math.max(0, totalGoals - (doneCount + passCount));
  const scoreItems = [
    missedCount > 0
      ? {
          key: 'missed',
          label: '미달',
          value: missedCount,
          labelStyle: styles.scoreLabelMissed,
          valueStyle: styles.scoreValueMissed,
        }
      : null,
    passCount > 0
      ? {
          key: 'pass',
          label: '패스',
          value: passCount,
          labelStyle: styles.scoreLabelPass,
          valueStyle: styles.scoreValuePass,
        }
      : null,
    {
      key: 'done',
      label: '완료',
      value: doneCount,
      labelStyle: styles.scoreLabelDone,
      valueStyle: styles.scoreValueDone,
    },
    {
      key: 'total',
      label: '총 루틴',
      value: totalGoals,
      labelStyle: styles.scoreLabelTotal,
      valueStyle: styles.scoreValueTotal,
    },
  ].filter(Boolean) as {
    key: string;
    label: string;
    value: number;
    labelStyle: StyleProp<TextStyle>;
    valueStyle: StyleProp<TextStyle>;
  }[];

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact, style]}>
      <View style={styles.grid}>
        {scoreItems.map((item, index) => (
          <View
            key={item.key}
            style={[styles.cell, compact && styles.cellCompact, index > 0 && styles.cellDivider]}
          >
            <Text style={[styles.labelText, item.labelStyle]}>{item.label}</Text>
            <Text style={[styles.valueText, compact && styles.valueTextCompact, item.valueStyle]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 1,
  },
  wrapperCompact: {
    paddingVertical: 2,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cellCompact: {
    minWidth: 32,
    paddingHorizontal: 4,
  },
  cellDivider: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(26, 26, 26, 0.10)',
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '700',
  },
  valueTextCompact: {
    fontWeight: '800',
  },
  scoreLabelMissed: {
    color: colors.error,
  },
  scoreLabelPass: {
    color: colors.warning,
  },
  scoreLabelDone: {
    color: colors.success,
  },
  scoreLabelTotal: {
    color: colors.textSecondary,
  },
  scoreValueMissed: {
    color: colors.error,
  },
  scoreValuePass: {
    color: colors.warning,
  },
  scoreValueDone: {
    color: colors.success,
  },
  scoreValueTotal: {
    color: colors.textSecondary,
  },
});
