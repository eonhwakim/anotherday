import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MemberCheckinSummary } from '../../types/domain';
import { colors } from '../../design/tokens';
import CalendarScoreTable from './CalendarScoreTable';
import MemberGoalRow, { membersAuthenticatedForGoal, type OpenPhotoHandler } from './MemberGoalRow';

interface CalendarMemberCheckinsSectionProps {
  members: MemberCheckinSummary[];
  teamName?: string;
  currentUserId?: string;
  /** 선택된 날짜 YYYY-MM-DD (루틴 행 상태: 예정/미달 등) */
  selectedDate: string;
  isFuture: boolean;
  onOpenPhoto: OpenPhotoHandler;
}

export default function CalendarMemberCheckinsSection({
  members,
  teamName,
  currentUserId,
  selectedDate,
  isFuture,
  onOpenPhoto,
}: CalendarMemberCheckinsSectionProps) {
  const visibleMembers = currentUserId
    ? members.filter((member) => member.userId !== currentUserId)
    : members;

  if (visibleMembers.length === 0) return null;

  return (
    <View style={styles.memberSection}>
      <Text style={styles.memberSectionTitle}>{teamName ? `${teamName} 멤버` : '멤버 기록'}</Text>
      {visibleMembers.map((member) => (
        <View key={member.userId} style={styles.memberCardFrame}>
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
            <View>
              {member.goals.map((goal, index) => {
                const checkin = member.checkins.find((c) => c.goal_id === goal.goalId);
                const authenticators = membersAuthenticatedForGoal(visibleMembers, goal.goalId);
                const isLast = index === member.goals!.length - 1;

                return (
                  <MemberGoalRow
                    key={goal.goalId}
                    goal={goal}
                    checkin={checkin}
                    authenticators={authenticators}
                    selectedDate={selectedDate}
                    forceFuture={isFuture}
                    showReactions
                    onOpenPhoto={onOpenPhoto}
                    showBottomBorder={!isLast}
                  />
                );
              })}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  memberSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  memberSectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textFaint,
  },
  /** 사람마다 하나의 카드로 묶는다 (Habits 루틴 목록 카드와 같은 규격) */
  memberCardFrame: {
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  memberIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.chipNeutral,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.text,
    flex: 1,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  emptyGoalText: {
    color: colors.textMuted,
    fontSize: 12,
    paddingLeft: 4,
    paddingVertical: 8,
  },
});
