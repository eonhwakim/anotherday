import type { MemberProgress } from '../../../types/domain';

export function getMissionProgress(members: MemberProgress[]) {
  const totalGoals = members.reduce((sum, member) => sum + member.totalGoals, 0);
  const completedGoals = members.reduce((sum, member) => sum + member.completedGoals, 0);

  return {
    progress: totalGoals > 0 ? completedGoals / totalGoals : 0,
    totalGoals,
    completedGoals,
  };
}

export function sortMembersForDisplay(members: MemberProgress[], currentUserId?: string) {
  return [...members].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });
}
