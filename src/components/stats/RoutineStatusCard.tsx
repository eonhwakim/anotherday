import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, numericFont } from '../../design/recipes';
import CircularProgress from '../ui/CircularProgress';
import {
  freqLabel,
  endedDateLabel,
  statisticsSharedStyles as sharedStyles,
} from '../../screens/stats/statisticsShared';

interface Props {
  name: string;
  frequency: string; // 'daily' | 'weekly_count'
  targetCount: number | null;
  _totalTarget?: number; // for monthly
  rate: number; // 0-100
  isAchieved?: boolean; // for weekly color
  isEnded?: boolean;
  startDate?: string | null;
  endDate?: string | null;

  // Monthly stats
  done?: number;
  pass?: number;
  fail?: number;

  // Weekly stats
  doneCount?: number;
  target?: number;

  variant: 'monthly' | 'weekly';
  /** 위쪽 구분선 (목록 첫 항목은 false) */
  showDivider?: boolean;
}

/** 완료/패스/미달을 앱 공통 색 점 범례로 */
function CountDots({ done, pass, fail }: { done?: number; pass?: number; fail?: number }) {
  const items = [
    done ? { key: 'done', color: colors.softGreen, value: done } : null,
    pass ? { key: 'pass', color: colors.softYellow, value: pass } : null,
    fail ? { key: 'fail', color: colors.softCoral, value: fail } : null,
  ].filter(Boolean) as { key: string; color: string; value: number }[];

  if (items.length === 0) return null;

  return (
    <View style={styles.countRow}>
      {items.map((item) => (
        <View key={item.key} style={styles.countItem}>
          <View style={[styles.countDot, { backgroundColor: item.color }]} />
          <Text style={styles.countValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function RoutineStatusCard({
  name,
  frequency,
  targetCount,
  rate,
  isAchieved,
  isEnded,
  startDate,
  endDate,
  done,
  pass,
  fail,
  doneCount,
  target,
  variant,
  showDivider = false,
}: Props) {
  const isDaily = frequency === 'daily';

  return (
    <View style={[styles.row, showDivider && styles.rowDivided]}>
      <View style={styles.mainRow}>
        <CircularProgress
          size={36}
          strokeWidth={3}
          progress={rate}
          color={
            variant === 'monthly'
              ? rate >= 100
                ? colors.successBright
                : colors.primary
              : isAchieved
                ? colors.successBright
                : colors.primary
          }
        />
        <View style={styles.info}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Text>
            {isEnded && variant === 'monthly' && (
              <View style={sharedStyles.badgeEnded}>
                <Text style={sharedStyles.badgeTextEnded}>종료됨</Text>
              </View>
            )}
          </View>
          <View style={styles.metaLine}>
            <Text style={styles.target}>
              {variant === 'monthly'
                ? freqLabel(frequency, targetCount)
                : isDaily
                  ? '매일'
                  : `주 ${target}회`}
            </Text>
            <View style={styles.metaRight}>
              {variant === 'monthly' ? (
                <CountDots done={done} pass={!isDaily ? pass : undefined} fail={fail} />
              ) : isEnded ? (
                <>
                  <Text style={styles.endedDate}>{endedDateLabel(startDate, endDate)}</Text>
                  <View style={[sharedStyles.badge, sharedStyles.badgeEnded]}>
                    <Text style={[sharedStyles.badgeText, sharedStyles.badgeTextEnded]}>
                      종료됨
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.goalCount}>
                  <Text style={isAchieved ? styles.goalCountDone : undefined}>{doneCount}</Text>
                  <Text style={styles.goalCountTotal}> / {target}</Text>
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** 카드 대신 행 — 상위에서 하나의 카드로 감싼다 */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  countValue: {
    ...numericFont,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  goalCount: {
    ...numericFont,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  goalCountDone: {
    color: colors.success,
  },
  goalCountTotal: {
    color: colors.textMuted,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: '100%',
    gap: 12,
    minWidth: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    width: '100%',
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    color: colors.text,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  target: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '400',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    gap: 6,
  },
  endedDate: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
