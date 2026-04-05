import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CyberFrame from '../ui/CyberFrame';
import type { CalendarDayMarking } from '../../types/domain';
import { colors } from '../../design/tokens';
import CalendarScoreTable from './CalendarScoreTable';

type DayMarking = CalendarDayMarking[string];

interface CalendarDateSummaryCardProps {
  formattedDate: string;
  selectedMarking?: DayMarking;
  statsGuideMessage: string | null;
  isFuture: boolean;
}

export default function CalendarDateSummaryCard({
  formattedDate,
  selectedMarking,
  statsGuideMessage,
  isFuture,
}: CalendarDateSummaryCardProps) {
  const doneCount = selectedMarking?.doneCount ?? 0;
  const passCount = selectedMarking?.passCount ?? 0;
  const totalGoals = selectedMarking?.totalGoals ?? 0;

  return (
    <CyberFrame style={styles.dateSummaryFrame} contentStyle={styles.dateSummaryContent}>
      <View style={styles.dateSummaryHeader}>
        <Text style={styles.dateSummaryTitle}>{formattedDate}</Text>

        {selectedMarking && selectedMarking.dayStatus !== 'future' && (
          <View style={styles.scoreContainer}>
            <CalendarScoreTable
              doneCount={doneCount}
              passCount={passCount}
              totalGoals={totalGoals}
            />
          </View>
        )}
      </View>

      {statsGuideMessage && (
        <View style={styles.excludedStatsBox}>
          <Text style={styles.excludedStatsText}>{statsGuideMessage}</Text>
        </View>
      )}

      {selectedMarking && selectedMarking.dayStatus === 'future' ? (
        <View>
          <Text style={styles.futureLabel}>예정된 목표 {selectedMarking.totalGoals}개</Text>
          {(selectedMarking.goalNames ?? []).length > 0 && (
            <View style={styles.goalNameChips}>
              {(selectedMarking.goalNames ?? []).map((name, i) => (
                <View key={i} style={styles.goalNameChip}>
                  <Text style={styles.goalNameChipText}>{name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : selectedMarking ? (
        <View>
          {(selectedMarking.goalNames ?? []).length > 0 && (
            <View style={styles.goalNameChips}>
              {(selectedMarking.goalNames ?? []).map((name, i) => (
                <View key={i} style={styles.goalNameChip}>
                  <Text style={styles.goalNameChipText}>{name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.noDataText}>{isFuture ? '아직 오지 않은 날이에요' : '기록 없음'}</Text>
      )}
    </CyberFrame>
  );
}

const styles = StyleSheet.create({
  dateSummaryFrame: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  dateSummaryContent: {
    padding: 14,
  },
  dateSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  noDataText: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.30)',
    fontWeight: '500',
  },
  futureLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 107, 61, 0.65)',
    marginBottom: 8,
  },
  goalNameChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  goalNameChip: {
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goalNameChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.50)',
  },
  excludedStatsBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  excludedStatsText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
  },
});
