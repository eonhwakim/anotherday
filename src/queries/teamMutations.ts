import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ServiceError } from '../lib/serviceError';
import {
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
