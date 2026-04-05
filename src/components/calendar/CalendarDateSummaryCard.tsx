import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CyberFrame from '../ui/CyberFrame';
import Pill from '../ui/Pill';
import dayjs from '../../lib/dayjs';
import type {
  CalendarDayMarking,
  CheckinWithGoal,
  MemberCheckinSummary,
  ReactionWithUser,
} from '../../types/domain';
import { colors, spacing, typography } from '../../design/tokens';
import CalendarScoreTable from './CalendarScoreTable';

type DayMarking = CalendarDayMarking[string];

interface CalendarDateSummaryCardProps {
  formattedDate: string;
  selectedMarking?: DayMarking;
  statsGuideMessage: string | null;
  isFuture: boolean;
  myMember?: MemberCheckinSummary | null;
  allMembers?: MemberCheckinSummary[];
  selectedDate: string;
  onOpenPhoto?: (params: { url: string; checkinId: string }) => void;
}

function membersAuthenticatedForGoal(
  allMembers: MemberCheckinSummary[],
  goalId: string,
): MemberCheckinSummary[] {
  return allMembers.filter((m) =>
    m.checkins.some((c) => c.goal_id === goalId && (c.status === 'done' || c.status === 'pass')),
  );
}

function GoalLeadArt({
  checkin,
  authenticators,
  onOpenPhoto,
}: {
  checkin: CheckinWithGoal | undefined;
  authenticators: MemberCheckinSummary[];
  reactions: ReactionWithUser[];
  onOpenPhoto?: (params: { url: string; checkinId: string }) => void;
}) {
  if (checkin?.photo_url && onOpenPhoto) {
    return (
      <View style={styles.goalLeadArt}>
        <View style={styles.goalPhotoColumn}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onOpenPhoto({ url: checkin.photo_url!, checkinId: checkin.id })}
            style={styles.goalPhotoTouchable}
          >
            <View style={styles.goalPhotoWrap}>
              <Image source={{ uri: checkin.photo_url }} style={styles.goalPhoto} />
              <View style={styles.zoomIcon}>
                <Ionicons name="expand" size={10} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (authenticators.length > 0) {
    return (
      <View style={styles.goalLeadArt}>
        <View style={styles.goalLeadPlaceholder}>
          <Ionicons name="pause" size={18} color="rgba(26, 26, 26, 0.29)" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.goalLeadArt}>
      <View style={styles.goalLeadPlaceholder}>
        <Ionicons name="close" size={18} color="rgba(26, 26, 26, 0.29)" />
      </View>
    </View>
  );
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
  const today = dayjs().format('YYYY-MM-DD');
  const isFutureDate = isFuture || selectedDate > today;
  const isToday = selectedDate === today;
  const isPast = selectedDate < today;

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

      {myMember && myMember.goals.length > 0 ? (
        <View style={styles.myGoalsSection}>
          <Text style={styles.myGoalsTitle}>나의 루틴</Text>
          <View style={styles.myGoalsList}>
            {myMember.goals.map((goal, index) => {
              const checkin = myMember.checkins.find((c) => c.goal_id === goal.goalId);
              const isDone = checkin?.status === 'done';
              const isPass = checkin?.status === 'pass';
              const authenticators = membersAuthenticatedForGoal(allMembers, goal.goalId);

              let statusText = '';
              let badgeStyle = {};

              if (isFutureDate) {
                statusText = '예정';
                badgeStyle = styles.badgeFuture;
              } else if (isDone) {
                statusText = '완료';
                badgeStyle = styles.badgeSuccess;
              } else if (isPass) {
                statusText = '패스';
                badgeStyle = styles.badgePass;
              } else if (isPast) {
                statusText = '미달';
                badgeStyle = styles.badgeMissed;
              } else if (isToday) {
                badgeStyle = styles.badgeInProgress;
              }

              return (
                <View
                  key={goal.goalId}
                  style={[
                    styles.goalRow,
                    index !== myMember.goals.length - 1 && styles.goalRowBorder,
                  ]}
                >
                  <GoalLeadArt
                    checkin={checkin}
                    authenticators={authenticators}
                    reactions={checkin?.reactions ?? []}
                    onOpenPhoto={onOpenPhoto}
                  />

                  <View style={styles.goalMain}>
                    <View style={styles.goalTitleRow}>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalName} numberOfLines={2}>
                          ∙ {goal.name}
                        </Text>
                        <Text style={styles.goalFreq}>
                          {goal.frequency === 'daily' ? '매일' : `주 ${goal.targetCount}회`}
                        </Text>
                      </View>
                      {statusText ? (
                        <Pill
                          label={statusText}
                          style={[styles.statusBadge, badgeStyle]}
                          textStyle={styles.statusText}
                        />
                      ) : null}
                    </View>

                    {checkin ? (
                      <Text style={styles.checkinMeta}>
                        {dayjs(checkin.created_at).format('HH:mm')} · {isPass ? '패스' : '완료'}
                      </Text>
                    ) : null}

                    {checkin?.memo ? (
                      <Text style={styles.checkinMemo} numberOfLines={2}>
                        {checkin.memo}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </CyberFrame>
  );
}

const styles = StyleSheet.create({
  dateSummaryFrame: {
    marginHorizontal: 12,
    marginTop: 14,
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
  myGoalsList: {
    marginTop: 4,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  goalRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,26,26,0.06)',
  },
  goalLeadArt: {
    width: 46,
    alignItems: 'center',
  },
  goalPhotoColumn: {
    alignItems: 'center',
    width: 42,
  },
  goalPhotoTouchable: {
    alignItems: 'center',
  },
  goalPhotoWrap: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
  },
  goalPhoto: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  zoomIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius: 4,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalLeadPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  goalMain: {
    flex: 1,
    minWidth: 0,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  goalInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  goalName: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  goalFreq: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    ...typography.bodyStrong,
    fontSize: 12,
    color: '#fff',
  },
  badgeSuccess: {
    backgroundColor: colors.statusSuccessBg,
    borderColor: colors.statusSuccessBorder,
  },
  badgePass: {
    backgroundColor: colors.statusPassBg,
    borderColor: colors.statusPassBorder,
  },
  badgeMissed: {
    backgroundColor: colors.statusErrorBg,
    borderColor: colors.statusErrorBorder,
  },
  badgeFuture: {
    backgroundColor: colors.statusFutureBg,
    borderColor: colors.statusFutureBorder,
  },
  badgeInProgress: {
    borderWidth: 0,
  },
  checkinMeta: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.40)',
    marginTop: 4,
    marginLeft: 10,
  },
  checkinMemo: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.35)',
    marginTop: 4,
  },
});
