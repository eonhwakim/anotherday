import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS } from '../../constants/defaults';
import dayjs from '../../lib/dayjs';

interface GoalStat {
  goalId: string;
  name: string;
  frequency?: 'daily' | 'weekly_count';
  targetCount?: number | null;
  startDate?: string | null; // 시작일 추가
  done: number;
  pass: number;
  fail: number;
  rate?: number; // 달성률
}

interface MonthlyStatsProps {
  monthLabel: string;
  stats: {
    daily: {
      avgRate: number;
      goals: GoalStat[];
      doneTotal: number;
      passTotal: number;
      failTotal: number;
    };
    weekly: {
      avgRate: number;
      goals: GoalStat[];
      doneTotal: number;
      passTotal: number;
      failTotal: number;
    };
    // topReasons: [string, number][];
  };
  teamCount?: number;
  showArrow?: boolean;
}

/** 원형 프로그레스 바 */
function CircularProgress({ rate, size = 60, strokeWidth = 6, color = COLORS.primary }: { rate: number, size?: number, strokeWidth?: number, color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(0,0,0,0.05)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>{rate}%</Text>
        </View>
      </View>
    </View>
  );
}

/** 수평 프로그레스 바 */
function ProgressBar({ rate, height = 6, color = COLORS.primary }: { rate: number, height?: number, color?: string }) {
  return (
    <View style={{ height, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: height / 2, flex: 1, overflow: 'hidden' }}>
      <View style={{ width: `${rate}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export default function MonthlyStatsCard({ monthLabel, stats, teamCount, showArrow }: MonthlyStatsProps) {
  
  const renderGoalItem = (gs: GoalStat, isWeekly: boolean) => {
    const rate = gs.rate ?? 0;
    const barColor = rate >= 80 ? '#4ADE80' : rate >= 50 ? '#FBBF24' : '#EF4444';
    const startDateText = gs.startDate ? dayjs(gs.startDate).format('M.D 시작') : '';

    return (
      <View key={gs.goalId} style={styles.goalItemCard}>
        <View style={styles.goalItemHeader}>
          <View style={styles.goalNameWrap}>
            {isWeekly && (
              <View style={styles.freqBadge}>
                <Text style={styles.freqBadgeText}>주{gs.targetCount}회</Text>
              </View>
            )}
            <Text style={styles.goalItemName} numberOfLines={1}>{gs.name}</Text>
          </View>
          {startDateText ? <Text style={styles.startDateText}>{startDateText}</Text> : null}
        </View>

        <View style={styles.progressRow}>
          <ProgressBar rate={rate} color={barColor} />
          <Text style={[styles.progressText, { color: barColor }]}>{rate}%</Text>
        </View>

        <View style={styles.statChipRow}>
          <View style={[styles.statChip, { backgroundColor: 'rgba(74, 222, 128, 0.1)' }]}>
            <Text style={[styles.statChipLabel, { color: '#166534' }]}>완료</Text>
            <Text style={[styles.statChipValue, { color: '#15803d' }]}>{gs.done}</Text>
          </View>
          {gs.pass > 0 && (
            <View style={[styles.statChip, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
              <Text style={[styles.statChipLabel, { color: '#b45309' }]}>패스</Text>
              <Text style={[styles.statChipValue, { color: '#d97706' }]}>{gs.pass}</Text>
            </View>
          )}
          {gs.fail > 0 && (
            <View style={[styles.statChip, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Text style={[styles.statChipLabel, { color: '#991b1b' }]}>미달</Text>
              <Text style={[styles.statChipValue, { color: '#b91c1c' }]}>{gs.fail}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.statsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{monthLabel} 통계</Text>
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        )}
      </View>

      {/* ─── 매일 목표 통계 ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>매일 목표</Text>
            <Text style={styles.sectionSubtitle}>꾸준함이 중요해요!</Text>
          </View>
          <CircularProgress rate={stats.daily.avgRate} color="#FF6B3D" />
        </View>

        {stats.daily.goals.length > 0 ? (
          <View style={styles.goalList}>
            {stats.daily.goals.map(gs => renderGoalItem(gs, false))}
          </View>
        ) : (
          <Text style={styles.emptyText}>설정된 매일 목표가 없어요</Text>
        )}
      </View>

      <View style={styles.divider} />

      {/* ─── 주 N회 목표 통계 ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>주 N회 목표</Text>
            <Text style={styles.sectionSubtitle}>유연하게 달성해보세요</Text>
          </View>
          <CircularProgress rate={stats.weekly.avgRate} color="#3B82F6" />
        </View>

        {stats.weekly.goals.length > 0 ? (
          <View style={styles.goalList}>
            {stats.weekly.goals.map(gs => renderGoalItem(gs, true))}
          </View>
        ) : (
          <Text style={styles.emptyText}>설정된 주 N회 목표가 없어요</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.08)',
    marginBottom: 16,
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 20,
  },
  section: {},
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleCol: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.5)',
  },
  goalList: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: 'rgba(26,26,26,0.40)',
    fontSize: 13,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  
  // Goal Item Card Style
  goalItemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  goalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  goalItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    flexShrink: 1,
  },
  startDateText: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.4)',
    fontWeight: '500',
  },
  freqBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freqBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'right',
  },
  statChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statChipValue: {
    fontSize: 10,
    fontWeight: '800',
  },

  teamCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,26,26,0.05)',
  },
  teamCountLabel: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.50)',
    fontWeight: '600',
  },
  teamCountValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '700',
  },
});