import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BaseCard from '../ui/BaseCard';
import type {
  CalendarDayMarking,
  MemberCheckinSummary,
} from '../../types/domain';
import { colors } from '../../design/tokens';
import CalendarScoreTable from './CalendarScoreTable';
import MemberGoalRow, {
  membersAuthenticatedForGoal,
  type OpenPhotoHandler,
} from './MemberGoalRow';

type DayMarking = CalendarDayMarking[string];

interface CalendarDateSummaryCardProps {
  formattedDate: string;
  selectedMarking?: DayMarking;
  statsGuideMessage: string | null;
  isFuture: boolean;
  myMember?: MemberCheckinSummary | null;
  allMembers?: MemberCheckinSummary[];
  selectedDate: string;
  onOpenPhoto?: OpenPhotoHandler;
}

export default function CalendarDateSummaryCard({
  formattedDate,
  selectedMarking,
  statsGuideMessage,
  isFuture,
  myMember,
  allMembers = [],
  selectedDate,
  onOpenPhoto,
}: CalendarDateSummaryCardProps) {
  const doneCount = selectedMarking?.doneCount ?? 0;
  const passCount = selectedMarking?.passCount ?? 0;
  const totalGoals = selectedMarking?.totalGoals ?? 0;
  const isFutureMarking = selectedMarking?.dayStatus === 'future';
  const goalNames = selectedMarking?.goalNames ?? [];

  return (
    <BaseCard glassOnly style={styles.dateSummaryFrame}>
      <View style={styles.dateSummaryHeader}>
        <Text style={styles.dateSummaryTitle}>{formattedDate}</Text>

        {selectedMarking && !isFutureMarking && (
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

      {selectedMarking ? (
        <View>
          {isFutureMarking && (
            <Text style={styles.futureLabel}>예정된 목표 {selectedMarking.totalGoals}개</Text>
          )}
          {goalNames.length > 0 && (
            <View style={styles.goalNameChips}>
              {goalNames.map((name, i) => (
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

      {myMember && myMember.goals.length > 0 ? (
        <View style={styles.myGoalsSection}>
          <Text style={styles.myGoalsTitle}>나의 루틴</Text>
          <View>
            {myMember.goals.map((goal, index) => {
              const checkin = myMember.checkins.find((c) => c.goal_id === goal.goalId);
              const authenticators = membersAuthenticatedForGoal(allMembers, goal.goalId);
              const isLast = index === myMember.goals.length - 1;

              return (
                <MemberGoalRow
                  key={goal.goalId}
                  goal={goal}
                  checkin={checkin}
                  authenticators={authenticators}
                  selectedDate={selectedDate}
                  forceFuture={isFuture}
                  onOpenPhoto={onOpenPhoto}
                  showBottomBorder={!isLast}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  dateSummaryFrame: {
    marginTop: 24,
    marginBottom: 8,
  },
  dateSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateSummaryTitle: {
    fontSize: 18,
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
  myGoalsSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 61, 0.08)',
  },
  myGoalsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(26,26,26,0.58)',
    marginBottom: 10,
  },
});
