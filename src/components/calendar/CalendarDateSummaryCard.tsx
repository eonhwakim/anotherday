import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CalendarDayMarking, DailyTodo, MemberCheckinSummary } from '../../types/domain';
import { colors } from '../../design/tokens';
import CalendarScoreTable from './CalendarScoreTable';
import MemberGoalRow, { membersAuthenticatedForGoal, type OpenPhotoHandler } from './MemberGoalRow';

type DayMarking = CalendarDayMarking[string];

interface CalendarDateSummaryCardProps {
  formattedDate: string;
  selectedMarking?: DayMarking;
  statsGuideMessage: string | null;
  isFuture: boolean;
  myMember?: MemberCheckinSummary | null;
  dailyTodos?: DailyTodo[];
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
  dailyTodos = [],
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
    <View style={styles.dateSummaryFrame}>
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

      {dailyTodos.length > 0 ? (
        <View style={styles.todoSection}>
          <Text style={styles.todoTitle}>TODO</Text>
          <View style={styles.todoList}>
            {dailyTodos.map((todo) => (
              <View key={todo.id} style={styles.todoItem}>
                <View style={[styles.todoCheck, todo.is_completed ? styles.todoCheckDone : null]} />
                <View style={styles.todoTextWrap}>
                  <Text style={[styles.todoText, todo.is_completed ? styles.todoTextDone : null]}>
                    {todo.title}
                  </Text>
                  {(todo.due_time || todo.reminder_minutes) && (
                    <Text style={styles.todoMeta}>
                      {todo.due_time ?? '시간 미정'}
                      {todo.reminder_minutes
                        ? ` · ${todo.reminder_minutes === 60 ? '1시간 전' : `${todo.reminder_minutes}분 전`} 알림`
                        : ''}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  /** 내 기록도 멤버 카드와 같은 규격으로 묶는다 (달력만 불투명 흰 카드로 떠 있어 구분됨) */
  dateSummaryFrame: {
    marginTop: 24,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  dateSummaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
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
    color: colors.textMuted,
    fontWeight: '400',
  },
  futureLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  goalNameChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
    marginTop: 10,
  },
  goalNameChip: {
    height: 26,
    justifyContent: 'center',
    backgroundColor: colors.chipNeutral,
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  goalNameChipText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
    color: colors.textSecondary,
  },
  excludedStatsBox: {
    marginTop: 8,
    marginBottom: 4,
  },
  excludedStatsText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textFaint,
    fontWeight: '400',
  },
  todoSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  todoTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textFaint,
    marginBottom: 10,
  },
  todoList: {
    gap: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  todoCheck: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    backgroundColor: colors.borderMuted,
  },
  todoCheckDone: {
    backgroundColor: colors.softGreen,
  },
  todoTextWrap: {
    flex: 1,
  },
  todoText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.text,
  },
  todoTextDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  todoMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 3,
  },
  myGoalsSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  myGoalsTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textFaint,
    marginBottom: 10,
  },
});
