import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ServiceError } from '../lib/serviceError';
import {
  createTeamWithMember,
  deleteTeamById,
  joinTeamByCode,
  leaveTeamById,
  updateTeamProfile,
  uploadTeamProfileImage,
  type TeamWithRole,
} from '../services/teamService';
import { useTeamStore } from '../stores/teamStore';
import { queryKeys } from './queryKeys';

interface UpdateTeamProfileVariables {
  teamId: string;
  name: string;
  imageUri: string | null;
}

interface UpdatedTeamProfile {
  teamId: string;
  name: string;
  profileImageUrl: string | null;
}

export function useCreateTeamMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!userId) {
        throw new ServiceError('로그인이 필요합니다.', 'useCreateTeamMutation');
      }
      return createTeamWithMember(name, userId);
    },
    onSuccess: async (team) => {
      if (!team || !userId) return;

      useTeamStore.setState((state) => ({
        teams: [...state.teams, team],
        currentTeam: team,
      }));

      await queryClient.invalidateQueries({
        queryKey: queryKeys.teams.list(userId),
      });
    },
  });
}

export function useJoinTeamMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteCode }: { inviteCode: string }) => {
      if (!userId) {
        throw new ServiceError('로그인이 필요합니다.', 'useJoinTeamMutation');
      }
      return joinTeamByCode(inviteCode, userId);
    },
    onSuccess: async (team) => {
      if (!team || !userId) return;

      useTeamStore.setState({
        currentTeam: team,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.teams.list(userId),
      });
    },
  });
}

function removeTeamFromStore(teamId: string) {
  useTeamStore.setState((state) => {
    const teams = state.teams.filter((team) => team.id !== teamId);
    return {
      teams,
      currentTeam:
        state.currentTeam?.id === teamId ? (teams[0] ?? null) : state.currentTeam,
    };
  });
}

export function useDeleteTeamMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId }: { teamId: string }) => {
      if (!userId) {
        throw new ServiceError('로그인이 필요합니다.', 'useDeleteTeamMutation');
      }
      return deleteTeamById(teamId, userId);
    },
    onSuccess: async (_ok, { teamId }) => {
      if (!userId) return;

      removeTeamFromStore(teamId);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.list(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.members(teamId),
          exact: false,
        }),
      ]);
    },
  });
}

export function useLeaveTeamMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId }: { teamId: string }) => {
      if (!userId) {
        throw new ServiceError('로그인이 필요합니다.', 'useLeaveTeamMutation');
      }
      return leaveTeamById(teamId, userId);
    },
    onSuccess: async (_ok, { teamId }) => {
      if (!userId) return;

      removeTeamFromStore(teamId);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.list(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.members(teamId),
          exact: false,
        }),
      ]);
    },
  });
}

export function useUpdateTeamProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      name,
      imageUri,
    }: UpdateTeamProfileVariables): Promise<UpdatedTeamProfile> => {
      let profileImageUrl = imageUri;

      if (imageUri && !imageUri.startsWith('http')) {
        const uploadedUrl = await uploadTeamProfileImage(teamId, imageUri);
        if (!uploadedUrl) {
          throw new ServiceError(
            '이미지 업로드에 실패했습니다.',
            'useUpdateTeamProfileMutation.uploadTeamProfileImage',
          );
        }
        profileImageUrl = uploadedUrl;
      }

      const result = await updateTeamProfile(teamId, {
        name,
        profile_image_url: profileImageUrl,
      });

      if (!result.success) {
        throw new ServiceError(
          result.error || '팀 프로필 수정에 실패했습니다.',
          'useUpdateTeamProfileMutation.updateTeamProfile',
        );
      }

      return {
        teamId,
        name,
        profileImageUrl: profileImageUrl ?? null,
      };
    },
    onSuccess: async ({ teamId, name, profileImageUrl }) => {
      useTeamStore.setState((state) => ({
        teams: state.teams.map((team) =>
          team.id === teamId
            ? ({ ...team, name, profile_image_url: profileImageUrl } satisfies TeamWithRole)
            : team,
        ),
        currentTeam:
          state.currentTeam?.id === teamId
            ? { ...state.currentTeam, name }
            : state.currentTeam,
      }));

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['teams'],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.members(teamId),
          exact: false,
        }),
      ]);
    },
  });
}
