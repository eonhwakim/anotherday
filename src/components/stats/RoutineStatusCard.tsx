import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../design/tokens';
import BaseCard from '../ui/BaseCard';
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
}: Props) {
  const isDaily = frequency === 'daily';

  return (
    <BaseCard glassOnly style={styles.card} contentStyle={styles.cardContent}>
      <View style={styles.mainRow}>
        <CircularProgress
          size={42}
          strokeWidth={4}
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
                <Text style={styles.statsText}>
                  {done !== undefined && done > 0 && (
                    <>
                      완료 <Text style={{ color: colors.success, fontWeight: '700' }}>{done}</Text>
                    </>
                  )}
                  {done !== undefined &&
                    done > 0 &&
                    ((!isDaily && pass !== undefined && pass > 0) ||
                      (fail !== undefined && fail > 0)) && (
                      <Text style={{ color: colors.borderMuted }}> | </Text>
                    )}
                  {!isDaily && pass !== undefined && pass > 0 && (
                    <>
                      패스 <Text style={{ color: colors.warning, fontWeight: '700' }}>{pass}</Text>
                    </>
                  )}
                  {!isDaily && pass !== undefined && pass > 0 && fail !== undefined && fail > 0 && (
                    <Text style={{ color: colors.borderMuted }}> | </Text>
                  )}
                  {fail !== undefined && fail > 0 && (
                    <>
                      미달 <Text style={{ color: colors.error, fontWeight: '700' }}>{fail}</Text>
                    </>
                  )}
                </Text>
              ) : isEnded ? (
                <>
                  <Text style={styles.endedDate}>{endedDateLabel(startDate, endDate)}</Text>
                  <View style={[sharedStyles.badge, sharedStyles.badgeEnded]}>
                    <Text style={[sharedStyles.badgeText, sharedStyles.badgeTextEnded]}>종료됨</Text>
                  </View>
                </>
              ) : (
                <Text style={sharedStyles.goalCount}>
                  <Text style={isAchieved ? { color: colors.success } : { color: '#888' }}>
                    {doneCount}
                  </Text>
                  <Text style={{ color: '#888' }}> / {target}</Text>
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    marginBottom: 2,
    width: '100%',
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    gap: 6,
  },
  statsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  endedDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
