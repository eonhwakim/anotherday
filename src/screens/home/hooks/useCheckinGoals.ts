import React from 'react';
import { useWeeklyDoneCountsQuery } from '../../../queries/goalQueries';
import type { Goal, UserGoal } from '../../../types/domain';

export function useCheckinGoals(params: {
  myGoals: UserGoal[];
  teamGoals: Goal[];
  todayStr: string;
  userId?: string;
}) {
  const { myGoals, teamGoals, todayStr, userId } = params;

  const currentTeamUserGoals = React.useMemo(() => {
    if (teamGoals.length === 0 || !userId) return [];
    const myOwnedGoalIds = new Set(
      teamGoals.filter((goal) => goal.owner_id === userId).map((goal) => goal.id),
    );
    return myGoals.filter((userGoal) => myOwnedGoalIds.has(userGoal.goal_id));
  }, [myGoals, teamGoals, userId]);

  const weeklyGoalIds = React.useMemo(() => {
    if (!userId || teamGoals.length === 0 || myGoals.length === 0) {
      return [];
    }

    const myOwnedGoalIds = new Set(
      teamGoals.filter((goal) => goal.owner_id === userId).map((goal) => goal.id),
    );

    return myGoals
      .filter((userGoal) => userGoal.frequency === 'weekly_count')
      .filter((userGoal) => myOwnedGoalIds.has(userGoal.goal_id))
      .filter((userGoal) => {
        if (userGoal.start_date && todayStr < userGoal.start_date) return false;
        if (userGoal.end_date && todayStr > userGoal.end_date) return false;
        return true;
      })
      .map((userGoal) => userGoal.goal_id);
  }, [myGoals, teamGoals, todayStr, userId]);

  const { data: weeklyDoneCounts = {} } = useWeeklyDoneCountsQuery({
    userId,
    goalIds: weeklyGoalIds,
  });

  return React.useMemo(() => {
    const myOwnedGoalIds = new Set(
      teamGoals.filter((goal) => goal.owner_id === userId).map((goal) => goal.id),
    );

    return teamGoals
      .filter((goal) => myOwnedGoalIds.has(goal.id))
      .filter((goal) => {
        const userGoal = currentTeamUserGoals.find((item) => item.goal_id === goal.id);
        if (!userGoal) return false;
        if (userGoal.start_date && todayStr < userGoal.start_date) return false;
        if (userGoal.end_date && todayStr > userGoal.end_date) return false;
        return true;
      })
      .map((goal) => {
        const userGoal = currentTeamUserGoals.find((item) => item.goal_id === goal.id);
        return {
          goal,
          frequency: userGoal?.frequency ?? 'daily',
          targetCount: userGoal?.target_count ?? null,
          weeklyDoneCount: weeklyDoneCounts[goal.id] ?? 0,
        };
      });
  }, [currentTeamUserGoals, teamGoals, todayStr, userId, weeklyDoneCounts]);
}
