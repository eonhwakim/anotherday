import type { MemberProgress } from '../../../types/domain';
import type { BadgeState } from './types';

export function getMissionProgress(members: MemberProgress[]) {
  const totalGoals = members.reduce((sum, member) => sum + member.totalGoals, 0);
  const completedGoals = members.reduce((sum, member) => sum + member.completedGoals, 0);

  return {
    progress: totalGoals > 0 ? completedGoals / totalGoals : 0,
    totalGoals,
    completedGoals,
  };
}

export function getBadgeMeta(members: MemberProgress[]): {
  badgeMembers: MemberProgress[];
  badgeState: BadgeState;
} {
  if (members.length === 0) {
    return { badgeState: 'START', badgeMembers: [] };
  }

  const membersWithPct = members.map((member) => ({
    ...member,
    pct: member.totalGoals > 0 ? member.completedGoals / member.totalGoals : 0,
  }));

  if (membersWithPct.every((member) => member.pct >= 1)) {
    return { badgeState: 'ALL_CLEAR', badgeMembers: members };
  }

  const finishers = membersWithPct.filter((member) => member.pct >= 1);
  if (finishers.length > 0) {
    return { badgeState: 'FINISHER', badgeMembers: finishers };
  }

  const activeMembers = membersWithPct.filter((member) => member.completedGoals > 0);
  if (activeMembers.length === 0) {
    return { badgeState: 'START', badgeMembers: [] };
  }

  const bestPct = Math.max(...activeMembers.map((member) => member.pct));
  return {
    badgeState: 'LEADER',
    badgeMembers: activeMembers.filter((member) => member.pct === bestPct),
  };
}

export function sortMembersForDisplay(members: MemberProgress[], currentUserId?: string) {
  return [...members].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });
}
