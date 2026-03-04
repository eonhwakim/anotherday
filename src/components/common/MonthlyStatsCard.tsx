import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/defaults';

interface GoalStat {
  goalId: string;
  name: string;
  frequency?: 'daily' | 'weekly_count';
  targetCount?: number | null;
  done: number;
  pass: number;
  fail: number;
}

interface MonthlyStatsProps {
  monthLabel: string;
  stats: {
    avg: number;
    bestGoal: { name: string; rate: number; doneCount: number } | null;
    worstGoal: { name: string; rate: number; failCount: number } | null;
    doneTotal: number;
    passTotal: number;
    failTotal: number;
    goalStats: GoalStat[];
    topReasons: [string, number][];
  };
  teamCount?: number;
  showArrow?: boolean;
}

export default function MonthlyStatsCard({ monthLabel, stats, teamCount, showArrow }: MonthlyStatsProps) {
  return (
    <View style={styles.statsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{monthLabel} 통계</Text>
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        )}
      </View>

      {/* 평균 달성률 */}
      <View style={styles.avgSection}>
        <Text style={styles.avgLabel}>평균 달성률</Text>
        <Text style={styles.avgValue}>{stats.avg}%</Text>
      </View>

      {/* 최고 / 최저 목표 */}
      <View style={styles.bestWorstRow}>
        {stats.bestGoal && (
          <View style={styles.bestCard}>
            <View style={styles.bestWorstHeader}>
              <Ionicons name="trophy" size={14} color="#4ADE80" />
              <Text style={styles.bestWorstLabel}>최고</Text>
            </View>
            <Text style={styles.bestWorstGoalName} numberOfLines={1}>{stats.bestGoal.name}</Text>
            <View style={styles.bestWorstValues}>
              <Text style={styles.bestRate}>{stats.bestGoal.rate}%</Text>
              <Text style={styles.bestSub}>{stats.bestGoal.doneCount}완료</Text>
            </View>
          </View>
        )}
        {stats.worstGoal && stats.worstGoal.failCount > 0 && (
          <View style={styles.worstCard}>
            <View style={styles.bestWorstHeader}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.bestWorstLabel}>최저</Text>
            </View>
            <Text style={styles.bestWorstGoalName} numberOfLines={1}>{stats.worstGoal.name}</Text>
            <View style={styles.bestWorstValues}>
              <Text style={styles.worstRate}>{stats.worstGoal.rate}%</Text>
              <Text style={styles.worstSub}>{stats.worstGoal.failCount}미달</Text>
            </View>
          </View>
        )}
      </View>

      {/* 체크인 요약 (한 줄) */}
      <View style={styles.checkinSummary}>
        <View style={styles.checkinItem}>
          <View style={[styles.checkinDot, { backgroundColor: '#4ADE80' }]} />
          <Text style={styles.checkinText}>완료 <Text style={styles.checkinCount}>{stats.doneTotal}</Text></Text>
        </View>
        <View style={styles.checkinDivider} />
        <View style={styles.checkinItem}>
          <View style={[styles.checkinDot, { backgroundColor: '#E8960A' }]} />
          <Text style={styles.checkinText}>패스 <Text style={styles.checkinCount}>{stats.passTotal}</Text></Text>
        </View>
        <View style={styles.checkinDivider} />
        <View style={styles.checkinItem}>
          <View style={[styles.checkinDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.checkinText}>미달 <Text style={styles.checkinCount}>{stats.failTotal}</Text></Text>
        </View>
        {teamCount !== undefined && (
          <>
            <View style={styles.checkinDivider} />
            <View style={styles.checkinItem}>
              <View style={[styles.checkinDot, { backgroundColor: 'rgba(26,26,26,0.35)' }]} />
              <Text style={styles.checkinText}>팀 <Text style={styles.checkinCount}>{teamCount}</Text></Text>
            </View>
          </>
        )}
      </View>

      {/* 목표별 통계 */}
      {stats.goalStats.length > 0 && (
        <View style={styles.goalStatsSection}>
          <Text style={styles.goalStatsTitle}>목표별 현황</Text>
          {stats.goalStats.map((gs) => (
            <View key={gs.goalId} style={styles.goalStatRow}>
              <View style={styles.goalStatNameRow}>
                {gs.frequency && (
                  <View style={styles.freqBadge}>
                    <Text style={styles.freqBadgeText}>
                      {gs.frequency === 'weekly_count' && gs.targetCount
                        ? `주${gs.targetCount}회`
                        : '매일'}
                    </Text>
                  </View>
                )}
                <Text style={styles.goalStatName} numberOfLines={1}>{gs.name}</Text>
              </View>
              <View style={styles.goalStatBadges}>
                <Text style={styles.goalStatDone}>{gs.done} 완료</Text>
                {gs.pass > 0 && <Text style={styles.goalStatPass}>{gs.pass} 패스</Text>}
                {gs.fail > 0 && <Text style={styles.goalStatFail}>{gs.fail} 미달</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* PASS 사유 TOP3 */}
      {stats.topReasons.length > 0 && (
        <View style={styles.passReasonsSection}>
          <Text style={styles.goalStatsTitle}>패스 사유 TOP</Text>
          {stats.topReasons.map(([reason, count], idx) => (
            <View key={idx} style={styles.passReasonRow}>
              <Text style={styles.passReasonRank}>{idx + 1}</Text>
              <Text style={styles.passReasonText} numberOfLines={1}>{reason}</Text>
              <Text style={styles.passReasonCount}>{count}회</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
    marginBottom: 16,
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  avgSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 107, 61, 0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.10)',
  },
  avgLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.45)',
    marginBottom: 4,
  },
  avgValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B3D',
  },
  bestWorstRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  bestCard: {
    flex: 1,
    backgroundColor: 'rgba(74, 222, 128, 0.06)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
  },
  worstCard: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.12)',
  },
  bestWorstHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  bestWorstLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.45)',
  },
  bestWorstGoalName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  bestWorstValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bestRate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22C55E',
  },
  bestSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
  },
  worstRate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
  worstSub: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(239,68,68,0.60)',
  },
  checkinSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.08)',
    marginBottom: 2,
  },
  checkinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  checkinDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  checkinText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(26,26,26,0.50)',
  },
  checkinCount: {
    fontWeight: '800',
    color: '#1A1A1A',
  },
  checkinDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(26,26,26,0.10)',
    marginHorizontal: 10,
  },
  goalStatsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 61, 0.08)',
  },
  goalStatsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.45)',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  goalStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 61, 0.06)',
  },
  goalStatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  goalStatName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.80)',
    flexShrink: 1,
  },
  freqBadge: {
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 61, 0.18)',
  },
  freqBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.50)',
  },
  goalStatBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  goalStatDone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#45a247',
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalStatPass: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E8960A',
    backgroundColor: 'rgba(255,181,71,0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalStatFail: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  passReasonsSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 61, 0.08)',
  },
  passReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  passReasonRank: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(26,26,26,0.30)',
    width: 16,
    textAlign: 'center',
  },
  passReasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.65)',
    flex: 1,
  },
  passReasonCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E8960A',
  },
});
