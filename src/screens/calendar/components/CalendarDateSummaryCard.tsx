import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CyberFrame from '../../../components/ui/CyberFrame';
import type { CalendarDayMarking } from '../../../types/domain';

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
  return (
    <CyberFrame style={styles.dateSummaryFrame} contentStyle={styles.dateSummaryContent}>
      <View style={styles.dateSummaryHeader}>
        <Text style={styles.dateSummaryTitle}>{formattedDate}</Text>

        {selectedMarking && selectedMarking.dayStatus !== 'future' && (
          <View style={styles.scoreContainer}>
            <CyberFrame
              glassOnly={true}
              style={styles.scoreBadgeWrapper}
              contentStyle={styles.scoreBadgeContent}
            >
              <View style={styles.scoreLabelRow}>
                <Text style={styles.scoreLabelText}>완료</Text>
                <Text style={styles.scoreLabelText}>총목표</Text>
              </View>
              <View style={styles.scoreValueRow}>
                <Text style={styles.scoreDoneText}>{selectedMarking.doneCount ?? 0}</Text>
                <Text style={styles.scoreSlash}>/</Text>
                <Text style={styles.scoreTotalText}>{selectedMarking.totalGoals ?? 0}</Text>
              </View>
            </CyberFrame>
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
    color: '#1A1A1A',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  scoreBadgeWrapper: {
    borderRadius: 12,
  },
  scoreBadgeContent: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  scoreLabelRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 2,
    gap: 4,
  },
  scoreLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 107, 61, 0.7)',
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  scoreDoneText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF6B3D',
  },
  scoreSlash: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 107, 61, 0.4)',
    marginHorizontal: 4,
  },
  scoreTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(26, 26, 26, 0.6)',
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
