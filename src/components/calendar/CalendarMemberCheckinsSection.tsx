import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CyberFrame from '../ui/CyberFrame';
import Pill from '../ui/Pill';
import dayjs from '../../lib/dayjs';
import type { CheckinWithGoal, MemberCheckinSummary, ReactionWithUser } from '../../types/domain';
import { colors, spacing, typography } from '../../design/tokens';
import CalendarScoreTable from './CalendarScoreTable';

const AVATAR_STACK_MAX = 4;

interface CalendarMemberCheckinsSectionProps {
  members: MemberCheckinSummary[];
  teamName?: string;
  currentUserId?: string;
  /** 선택된 날짜 YYYY-MM-DD (루틴 행 상태: 예정/미달 등) */
  selectedDate: string;
  isFuture: boolean;
  onOpenPhoto: (params: { url: string; checkinId: string }) => void;
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
  onOpenPhoto: (params: { url: string; checkinId: string }) => void;
}) {
  if (checkin?.photo_url) {
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

export default function CalendarMemberCheckinsSection({
  members,
  teamName,
  currentUserId,
  selectedDate,
  isFuture: isFutureProp,
  onOpenPhoto,
}: CalendarMemberCheckinsSectionProps) {
  const today = dayjs().format('YYYY-MM-DD');
  const isFuture = isFutureProp || selectedDate > today;
  const isToday = selectedDate === today;
  const isPast = selectedDate < today;
  const visibleMembers = currentUserId
    ? members.filter((member) => member.userId !== currentUserId)
    : members;

  if (visibleMembers.length === 0) return null;

  return (
    <View style={styles.memberSection}>
      <Text style={styles.memberSectionTitle}>{teamName ? `${teamName} 멤버` : '멤버 기록'}</Text>
      {visibleMembers.map((member) => (
        <CyberFrame
          key={member.userId}
          style={styles.memberCardFrame}
          contentStyle={styles.memberCardContent}
        >
          <View style={styles.memberHeader}>
            <View style={styles.memberIdentity}>
              <View style={styles.memberAvatar}>
                {member.profileImageUrl ? (
                  <Image source={{ uri: member.profileImageUrl }} style={styles.memberAvatarImg} />
                ) : (
                  <Ionicons name="person" size={16} color="rgba(255,255,255,0.50)" />
                )}
              </View>
              <Text style={styles.memberName}>{member.nickname}</Text>
            </View>

            <View style={styles.scoreContainer}>
              <CalendarScoreTable
                doneCount={member.doneCount}
                passCount={member.passCount}
                totalGoals={member.totalGoals}
              />
            </View>
          </View>

          {!member.goals || member.goals.length === 0 ? (
            <Text style={styles.emptyGoalText}>루틴이 없습니다.</Text>
          ) : (
            <View style={styles.goalsBlock}>
              {member.goals.map((goal, index) => {
                const checkin = member.checkins.find((c) => c.goal_id === goal.goalId);
                const isDone = checkin?.status === 'done';
                const isPass = checkin?.status === 'pass';
                const authenticators = membersAuthenticatedForGoal(visibleMembers, goal.goalId);

                let statusText = '';
                let badgeStyle = {};

                if (isFuture) {
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

                const reactions = checkin?.reactions ?? [];

                return (
                  <View
                    key={goal.goalId}
                    style={[
                      styles.goalRow,
                      index !== member.goals!.length - 1 && styles.goalRowBorder,
                    ]}
                  >
                    <GoalLeadArt
                      checkin={checkin}
                      authenticators={authenticators}
                      reactions={reactions}
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

                      {!checkin?.photo_url && reactions.length > 0 ? (
                        <View style={styles.reactionRow}>
                          {reactions.slice(0, 6).map((r, idx) => (
                            <View
                              key={r.id}
                              style={[
                                styles.reactionSticker,
                                { zIndex: 6 - idx, marginLeft: idx > 0 ? -6 : 0 },
                              ]}
                            >
                              {r.user.profile_image_url ? (
                                <Image
                                  source={{ uri: r.user.profile_image_url }}
                                  style={styles.reactionAvatar}
                                />
                              ) : (
                                <View style={[styles.reactionAvatar, styles.reactionAvatarFb]}>
                                  <Ionicons name="person" size={10} color="#fff" />
                                </View>
                              )}
                            </View>
                          ))}
                          {reactions.length > 6 ? (
                            <Text style={styles.reactionMore}>+{reactions.length - 6}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </CyberFrame>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  memberSection: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  memberSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  memberCardFrame: {
    marginBottom: 10,
  },
  memberCardContent: {
    padding: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 61, 0.08)',
  },
  memberIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.18)',
  },
  memberAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  emptyGoalText: {
    color: 'rgba(15, 15, 15, 0.43)',
    fontSize: 13,
    paddingLeft: 4,
    paddingVertical: 8,
  },
  goalsBlock: {
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
  reactionRowUnderPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 0,
    width: '100%',
  },
  goalLeadArtOnlyStack: {
    minHeight: 48,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
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
  avatarStackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStackItem: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFAF7',
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
  },
  avatarStackImg: {
    width: '100%',
    height: '100%',
  },
  avatarStackFallback: {
    backgroundColor: '#8B9099',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStackMore: {
    backgroundColor: 'rgba(255, 107, 61, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStackMoreText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
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
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  reactionSticker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFAF7',
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
  },
  reactionAvatar: {
    width: '100%',
    height: '100%',
  },
  reactionAvatarFb: {
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionMore: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
});
