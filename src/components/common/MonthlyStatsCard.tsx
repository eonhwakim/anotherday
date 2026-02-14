import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/defaults';

interface GoalStat {
  goalId: string;
  name: string;
  done: number;
  pass: number;
  fail: number;
}

interface MonthlyStatsProps {
  monthLabel: string;
  stats: {
    avg: number;
    max: number;
    min: number;
    doneTotal: number;
    passTotal: number;
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

      {/* 달성률 요약 */}
      <View style={styles.statsRow}>
        <StatItem label="평균 달성률" value={`${stats.avg}%`} icon="analytics" color="#fff" />
        <StatItem label="최고" value={`${stats.max}%`} icon="arrow-up" color="#4ADE80" />
        <StatItem label="최저" value={`${stats.min}%`} icon="arrow-down" color="#EF4444" />
      </View>

      {/* DONE / PASS 카운트 */}
      <View style={[styles.statsRow, { marginTop: 16 }]}>
        <StatItem 
          label="체크인" 
          value={`${stats.passTotal} 패스 ${stats.doneTotal} 완료`} 
          icon="checkmark-circle" 
          color="#fff" 
        />
        {teamCount !== undefined && (
          <StatItem label="소속 팀" value={`${teamCount}개`} icon="people" color="rgba(255,255,255,0.60)" />
        )}
      </View>

      {/* 목표별 통계 */}
      {stats.goalStats.length > 0 && (
        <View style={styles.goalStatsSection}>
          <Text style={styles.goalStatsTitle}>목표별 현황</Text>
          {stats.goalStats.map((gs) => (
            <View key={gs.goalId} style={styles.goalStatRow}>
              <Text style={styles.goalStatName} numberOfLines={1}>{gs.name}</Text>
              <View style={styles.goalStatBadges}>
                <Text style={styles.goalStatDone}>{gs.done}완료</Text>
                {gs.pass > 0 && <Text style={styles.goalStatPass}>{gs.pass}패스</Text>}
                {gs.fail > 0 && <Text style={styles.goalStatFail}>{gs.fail}미달</Text>}
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

function StatItem({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statItem}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
    shadowColor: 'rgba(255,255,255,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
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
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  goalStatsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  goalStatsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  goalStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  goalStatName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
    flex: 1,
    marginRight: 8,
  },
  goalStatBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  goalStatDone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalStatPass: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFB547',
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
    backgroundColor: 'rgba(239,68,68,0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  passReasonsSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
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
    color: 'rgba(255,255,255,0.30)',
    width: 16,
    textAlign: 'center',
  },
  passReasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    flex: 1,
  },
  passReasonCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB547',
  },
});
