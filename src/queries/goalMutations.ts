import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import dayjs from '../lib/dayjs';
import {
  addGoal,
  createCheckin,
  deleteCheckin,
  endTeamGoal,
  extendGoalsForNewMonth,
  removeTeamGoal,
} from '../services/goalService';
import {
  createCheckinWithTimeout,
  deleteCheckinPhoto,
  uploadCheckinPhotoAsset,
} from '../services/checkinService';
import type { Checkin, Goal } from '../types/domain';
import { queryKeys } from './queryKeys';

function updateTodayCheckinsCache(
  queryClient: QueryClient,
  userId: string,
  date: string,
  updater: (current: Checkin[]) => Checkin[],
) {
  queryClient.setQueryData<Checkin[]>(queryKeys.goals.todayCheckins(userId, date), (current) =>
    updater(current ?? []),
  );
}

// 체크인 후 필요한 화면들을 새로고침하되, UI를 붙잡지 않도록 백그라운드에서 진행합니다.
function invalidateCheckinRelatedQueries(params: {
  queryClient: QueryClient;
  userId: string;
  teamId?: string;
  date: string;
}) {
  const { queryClient, userId, teamId, date } = params;
  const yearMonth = dayjs(date).format('YYYY-MM');

  void Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: queryKeys.goals.todayCheckins(userId, date),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.goals.mine(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: ['goals', 'weekly-done-counts', userId],
      exact: false,
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.memberProgress(teamId, userId, date),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.calendar(userId, yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.monthlyCheckins(userId, yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.dateCheckins(userId, date),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.stats.memberDateCheckins(teamId, userId, date),
    }),
  ]);
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
    onMutate: async (variables) => {
      if (!userId) return undefined;

      const checkinDate = variables.date ?? date;
      const queryKey = queryKeys.goals.todayCheckins(userId, checkinDate);
      const previousCheckins = queryClient.getQueryData<Checkin[]>(queryKey) ?? [];
      const alreadyExists = previousCheckins.some((checkin) => checkin.goal_id === variables.goalId);

      if (alreadyExists) {
        return { previousCheckins, checkinDate, optimisticId: null };
      }

      const optimisticId = `optimistic-${variables.goalId}-${checkinDate}`;
      updateTodayCheckinsCache(queryClient, userId, checkinDate, (current) => [
        ...current,
        {
          id: optimisticId,
          user_id: variables.userId,
          goal_id: variables.goalId,
          date: checkinDate,
          photo_url: variables.photoUrl ?? null,
          memo: variables.memo ?? null,
          status: variables.status ?? 'done',
          created_at: new Date().toISOString(),
        },
      ]);

      return { previousCheckins, checkinDate, optimisticId };
    },
    onError: (_error, _variables, context) => {
      if (!userId || !context) return;
      queryClient.setQueryData(queryKeys.goals.todayCheckins(userId, context.checkinDate), context.previousCheckins);
    },
    onSuccess: (created, variables, context) => {
      if (!userId) return;
      const checkinDate = variables.date ?? date;

      if (!created && context) {
        queryClient.setQueryData(
          queryKeys.goals.todayCheckins(userId, context.checkinDate),
          context.previousCheckins,
        );
        return;
      }

      invalidateCheckinRelatedQueries({
        queryClient,
        userId,
        teamId,
        date: checkinDate,
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
        const created = await createCheckinWithTimeout({
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
          photoUrl: uploadedPhoto.publicUrl,
        };
      } catch (error) {
        await cleanupUploadedPhoto();
        throw error;
      }
    },
    onMutate: async (variables) => {
      const checkinDate = variables.date ?? date;
      const queryKey = queryKeys.goals.todayCheckins(variables.userId, checkinDate);
      const previousCheckins = queryClient.getQueryData<Checkin[]>(queryKey) ?? [];
      const alreadyExists = previousCheckins.some((checkin) => checkin.goal_id === variables.goalId);

      if (alreadyExists) {
        return { previousCheckins, checkinDate, optimisticId: null };
      }

      const optimisticId = `optimistic-photo-${variables.goalId}-${checkinDate}`;
      updateTodayCheckinsCache(queryClient, variables.userId, checkinDate, (current) => [
        ...current,
        {
          id: optimisticId,
          user_id: variables.userId,
          goal_id: variables.goalId,
          date: checkinDate,
          photo_url: variables.imageUri,
          memo: null,
          status: 'done',
          created_at: new Date().toISOString(),
        },
      ]);

      return { previousCheckins, checkinDate, optimisticId };
    },
    onError: (_error, variables, context) => {
      if (!context) return;
      queryClient.setQueryData(
        queryKeys.goals.todayCheckins(variables.userId, context.checkinDate),
        context.previousCheckins,
      );
    },
    onSuccess: (result, variables, context) => {
      if (!context) return;

      if (result.status !== 'created') {
        queryClient.setQueryData(
          queryKeys.goals.todayCheckins(variables.userId, context.checkinDate),
          context.previousCheckins,
        );
        return;
      }

      if (context.optimisticId) {
        updateTodayCheckinsCache(queryClient, variables.userId, result.date, (current) =>
          current.map((checkin) =>
            checkin.id === context.optimisticId
              ? {
                  ...checkin,
                  photo_url: result.photoUrl,
                }
              : checkin,
          ),
        );
      }

      invalidateCheckinRelatedQueries({
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
    onMutate: async (checkinId) => {
      if (!userId) return undefined;

      const queryKey = queryKeys.goals.todayCheckins(userId, date);
      const previousCheckins = queryClient.getQueryData<Checkin[]>(queryKey) ?? [];

      updateTodayCheckinsCache(queryClient, userId, date, (current) =>
        current.filter((checkin) => checkin.id !== checkinId),
      );

      return { previousCheckins };
    },
    onError: (_error, _checkinId, context) => {
      if (!userId || !context) return;
      queryClient.setQueryData(queryKeys.goals.todayCheckins(userId, date), context.previousCheckins);
    },
    onSuccess: () => {
      if (!userId) return;

      invalidateCheckinRelatedQueries({
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
