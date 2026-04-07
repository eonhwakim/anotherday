import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MemberCheckinSummary } from '../../types/domain';
import { colors } from '../../design/tokens';
import BaseCard from '../ui/BaseCard';
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
        <BaseCard
          glassOnly
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
        </BaseCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  memberSection: {
    marginTop: 24,
  },
  memberSectionTitle: {
    marginTop: 12,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
    borderBottomColor: colors.border,
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
});
