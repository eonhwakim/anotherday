import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import {
  addGoal,
  checkCheckinExists,
  createCheckin,
  deleteCheckin,
  endTeamGoal,
  extendGoalsForNewMonth,
  removeTeamGoal,
} from '../services/goalService';
import { deleteCheckinPhoto, uploadCheckinPhotoAsset } from '../services/checkinService';
import type { Goal } from '../types/domain';
import { queryKeys } from './queryKeys';

// 이 함수는 체크인 관련 데이터가 바뀐 뒤, 앱 안의 여러 캐시를 낡은 것으로 표시합니다.
async function invalidateCheckinRelatedQueries(params: {
  queryClient: QueryClient;
  userId: string;
  teamId?: string;
  date: string;
}) {
  const { queryClient, userId, teamId, date } = params;
  const yearMonth = dayjs(date).format('YYYY-MM');

  await queryClient.invalidateQueries({
    queryKey: queryKeys.goals.todayCheckins(userId, date),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.goals.mine(userId),
  });
  await queryClient.invalidateQueries({
    queryKey: ['goals', 'weekly-done-counts', userId],
    exact: false,
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.stats.memberProgress(teamId, userId, date),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.stats.calendar(userId, yearMonth),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.stats.monthlyCheckins(userId, yearMonth),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.stats.dateCheckins(userId, date),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.stats.memberDateCheckins(teamId, userId, date),
  });
}

export function useCreateCheckinMutation(params: {
  userId?: string;
  teamId?: string;
  date?: string;
}) {
  const { userId, teamId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCheckin,
    onSuccess: async (_, variables) => {
      if (!userId) return;

      await invalidateCheckinRelatedQueries({
        queryClient,
        userId,
        teamId,
        date: variables.date ?? date,
      });
    },
  });
}

export function useCreatePhotoCheckinMutation(params: {
  userId?: string;
  teamId?: string;
  date?: string;
}) {
  const { teamId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      userId: string;
      goalId: string;
      imageUri: string;
      date?: string;
    }) => {
      const checkinDate = variables.date ?? date;
      const alreadyExists = await checkCheckinExists({
        userId: variables.userId,
        goalId: variables.goalId,
        date: checkinDate,
      });

      if (alreadyExists) {
        return { status: 'duplicate' as const, date: checkinDate };
      }

      const uploadedPhoto = await uploadCheckinPhotoAsset(variables.userId, variables.imageUri);

      const cleanupUploadedPhoto = async () => {
        try {
          await deleteCheckinPhoto(uploadedPhoto.objectPath);
        } catch (cleanupError) {
          console.warn(
            '[createPhotoCheckin] Failed to clean up uploaded photo:',
            cleanupError instanceof Error ? cleanupError.message : cleanupError,
          );
        }
      };

      try {
        const created = await createCheckin({
          userId: variables.userId,
          goalId: variables.goalId,
          date: checkinDate,
          photoUrl: uploadedPhoto.publicUrl,
        });

        if (!created) {
          await cleanupUploadedPhoto();
        }

        return {
          status: created ? ('created' as const) : ('duplicate' as const),
          date: checkinDate,
        };
      } catch (error) {
        await cleanupUploadedPhoto();
        throw error;
      }
    },
    onSuccess: async (result, variables) => {
      if (result.status !== 'created') return;

      await invalidateCheckinRelatedQueries({
        queryClient,
        userId: variables.userId,
        teamId,
        date: result.date,
      });
    },
  });
}

export function useDeleteCheckinMutation(params: {
  userId?: string;
  teamId?: string;
  date?: string;
}) {
  const { userId, teamId, date = dayjs().format('YYYY-MM-DD') } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCheckin,
    onSuccess: async () => {
      if (!userId) return;

      await invalidateCheckinRelatedQueries({
        queryClient,
        userId,
        teamId,
        date,
      });
    },
  });
}

export function useExtendGoalsForNewMonthMutation(params: { userId?: string; teamId?: string }) {
  const { userId, teamId } = params;
  const queryClient = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');

  return useMutation({
    mutationFn: ({ newMonthStr }: { newMonthStr: string }) => {
      if (!userId) throw new Error('userId is required');
      return extendGoalsForNewMonth(userId, newMonthStr);
    },
    onSuccess: async () => {
      if (!userId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.mine(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['goals', 'mine-month', userId],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.lastMonth(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['goals', 'weekly-done-counts', userId],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.memberProgress(teamId, userId, today),
      });
    },
  });
}

export function useAddGoalMutation(params: {
  userId?: string;
  teamId?: string;
  existingGoals: Goal[];
}) {
  const { userId, teamId, existingGoals } = params;
  const queryClient = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');

  return useMutation({
    mutationFn: (variables: {
      teamId?: string;
      userId: string;
      name: string;
      frequency?: 'daily' | 'weekly_count';
      targetCount?: number | null;
      duration?: 'continuous' | 'this_month';
    }) =>
      addGoal({
        ...variables,
        existingGoals,
      }),
    onSuccess: async () => {
      if (!userId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.mine(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['goals', 'mine-month', userId],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ['goals', 'team'],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.memberProgress(teamId, userId, today),
      });
    },
  });
}

export function useEndTeamGoalMutation(params: { userId?: string; teamId?: string }) {
  const { userId, teamId } = params;
  const queryClient = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');
  const currentMonth = dayjs().format('YYYY-MM');

  return useMutation({
    mutationFn: ({ goalId }: { goalId: string }) => {
      if (!userId) throw new Error('userId is required');
      return endTeamGoal(userId, goalId);
    },
    onSuccess: async () => {
      if (!userId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.mine(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['goals', 'mine-month', userId],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.todayCheckins(userId, today),
      });
      await queryClient.invalidateQueries({
        queryKey: ['goals', 'team'],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.memberProgress(teamId, userId, today),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.calendar(userId, currentMonth),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthlyCheckins(userId, currentMonth),
      });
    },
  });
}

export function useRemoveTeamGoalMutation(params: { userId?: string; teamId?: string }) {
  const { userId, teamId } = params;
  const queryClient = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');
  const currentMonth = dayjs().format('YYYY-MM');

  return useMutation({
    mutationFn: ({ goalId }: { goalId: string }) => {
      if (!userId) throw new Error('userId is required');
      return removeTeamGoal(teamId ?? '', userId, goalId);
    },
    onSuccess: async () => {
      if (!userId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.mine(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['goals', 'mine-month', userId],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.goals.todayCheckins(userId, today),
      });
      await queryClient.invalidateQueries({
        queryKey: ['goals', 'team'],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.memberProgress(teamId, userId, today),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.calendar(userId, currentMonth),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthlyCheckins(userId, currentMonth),
      });
    },
  });
}
