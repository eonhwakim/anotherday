import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../design/tokens';
import Chip from './Chip';

export type GoalChipStatus = 'todo' | 'done' | 'pass';

interface GoalStatusChipProps {
  /** 표시할 목표 이름 */
  goalName: string;
  /** 체크인 상태 */
  status: GoalChipStatus;
}

/**
 * 오늘의 목표 체크인 상태를 표시하는 칩.
 * - `todo`: 아직 미완료 (반투명 배경)
 * - `done`: 완료 (브랜드 색 + ✓ 아이콘)
 * - `pass`: 패스 (옅은 브랜드 색, "(패스) " 접두)
 */
export default function GoalStatusChip({ goalName, status }: GoalStatusChipProps) {
  const isDone = status === 'done';
  const isPass = status === 'pass';

  const containerStyle = [
    styles.chip,
    isPass && styles.chipPass,
    isDone && styles.chipDone,
  ];
  const labelStyle = [
    styles.chipText,
    isPass && styles.chipTextPass,
    isDone && styles.chipTextDone,
  ];

  return (
    <Chip
      label={isPass ? `(패스) ${goalName}` : goalName}
      icon={isDone ? <Text style={styles.chipIcon}>✓</Text> : undefined}
      numberOfLines={1}
      style={containerStyle}
      textStyle={labelStyle}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.54)',
  },
  chipDone: {
    backgroundColor: colors.brandWarm,
  },
  chipPass: {
    backgroundColor: colors.brandPale,
  },
  chipIcon: {
    marginRight: 3,
    color: '#fff',
    fontWeight: '700',
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  chipTextDone: {
    color: '#fff',
    fontWeight: '600',
  },
  chipTextPass: {
    color: colors.textMuted,
  },
});
