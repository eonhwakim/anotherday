import React from 'react';
import { StyleSheet, View } from 'react-native';
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
 * 배경·크기는 상태와 무관하게 동일하고, 좌측 점의 색으로만 상태를 구분한다.
 * - `todo`: 아직 미완료 (빈 점)
 * - `done`: 완료 (초록 점)
 * - `pass`: 패스 (주황 점)
 */
export default function GoalStatusChip({ goalName, status }: GoalStatusChipProps) {
  const isDone = status === 'done';
  const isPass = status === 'pass';

  return (
    <Chip
      label={goalName}
      icon={<View style={[styles.dot, isDone && styles.dotDone, isPass && styles.dotPass]} />}
      numberOfLines={1}
      style={styles.chip}
      textStyle={[styles.chipText, isDone && styles.chipTextDone, isPass && styles.chipTextPass]}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    // 상태와 무관하게 같은 배경·높이 — 목록이 얼룩덜룩해지지 않도록
    height: 26,
    paddingHorizontal: 10,
    paddingVertical: 0,
    gap: 6,
    borderWidth: 0,
    backgroundColor: colors.chipNeutral,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.1,
    color: colors.textSecondary,
    maxWidth: 130,
  },
  chipTextDone: {
    color: colors.text,
  },
  chipTextPass: {
    color: colors.textMuted,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: 'transparent',
  },
  dotDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  dotPass: {
    borderColor: colors.warning,
    backgroundColor: colors.warning,
  },
});
