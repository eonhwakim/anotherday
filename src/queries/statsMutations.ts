import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { CheckinWithGoal, MemberProgress, ReactionWithUser, User } from '../types/domain';
import { toggleReaction } from '../services/statsService';
import { queryKeys } from './queryKeys';

function patchCheckinReaction(
  checkin: CheckinWithGoal,
  currentUser: Pick<User, 'id' | 'nickname' | 'profile_image_url'>,
): CheckinWithGoal {
  const reactions = checkin.reactions ?? [];
  const alreadyReacted = reactions.some((reaction) => reaction.user_id === currentUser.id);

  if (alreadyReacted) {
    return {
      ...checkin,
      reactions: reactions.filter((reaction) => reaction.user_id !== currentUser.id),
    };
  }

  const optimisticReaction: ReactionWithUser = {
    id: `temp-${currentUser.id}-${Date.now()}`,
    checkin_id: checkin.id,
    user_id: currentUser.id,
    created_at: new Date().toISOString(),
    user: {
      id: currentUser.id,
      nickname: currentUser.nickname,
      profile_image_url: currentUser.profile_image_url,
    },
  };

  return {
    ...checkin,
    reactions: [...reactions, optimisticReaction],
  };
}

function patchMemberProgressCache(
  queryClient: QueryClient,
  currentUser: Pick<User, 'id' | 'nickname' | 'profile_image_url'>,
  checkinId: string,
  queryKey: readonly unknown[],
) {
  const previous = queryClient.getQueriesData<MemberProgress[]>({
    queryKey,
    exact: true,
  });

  queryClient.setQueriesData<MemberProgress[]>(
    {
      queryKey,
      exact: true,
    },
    (existing) => {
      if (!existing) return existing;

      return existing.map((member) => ({
        ...member,
        todayCheckins: member.todayCheckins?.map((checkin) =>
          checkin.id === checkinId ? patchCheckinReaction(checkin, currentUser) : checkin,
        ),
      }));
    },
  );

  return previous;
}

export function useToggleReactionMutation(params: {
  teamId?: string;
  userId?: string;
  date: string;
}) {
  const { teamId, userId, date } = params;
  const queryClient = useQueryClient();
  const memberProgressQueryKey = queryKeys.stats.memberProgress(teamId, userId, date);

  return useMutation({
    mutationFn: async ({
      checkin,
      user,
    }: {
      checkin: CheckinWithGoal;
      user: Pick<User, 'id' | 'nickname' | 'profile_image_url'>;
    }) => {
      const isReacted = (checkin.reactions ?? []).some((reaction) => reaction.user_id === user.id);
      return toggleReaction(checkin.id, user.id, isReacted);
    },
    onMutate: async ({ checkin, user }) => {
      const previousMemberProgress = patchMemberProgressCache(
        queryClient,
        user,
        checkin.id,
        memberProgressQueryKey,
      );
      return { previousMemberProgress };
    },
    onSuccess: async () => {
      if (!userId) return;

      await queryClient.invalidateQueries({
        queryKey: memberProgressQueryKey,
        exact: true,
      });
    },
    onError: (_error, _variables, context) => {
      context?.previousMemberProgress?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
  });
}
