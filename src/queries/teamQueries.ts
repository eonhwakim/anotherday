import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTeamMembers, fetchUserTeams } from '../services/teamService';
import { useTeamStore } from '../stores/teamStore';
import { queryKeys } from './queryKeys';

export function useUserTeamsQuery(userId?: string) {
  const query = useQuery({
    queryKey: userId ? queryKeys.teams.list(userId) : ['teams', 'list', null],
    queryFn: () => fetchUserTeams(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!query.data) return;

    useTeamStore.setState((state) => {
      const teams = query.data;
      const currentTeamId = state.currentTeam?.id;
      const nextCurrentTeam = currentTeamId
        ? teams.find((team) => team.id === currentTeamId) ?? (teams[0] ?? null)
        : (teams[0] ?? null);

      return {
        teams,
        currentTeam: nextCurrentTeam,
        members:
          state.currentTeam?.id && nextCurrentTeam?.id !== state.currentTeam.id
            ? []
            : state.members,
      };
    });
  }, [query.data]);

  return query;
}

export function useTeamMembersQuery(
  teamId?: string,
  options?: { detailed?: boolean },
) {
  const detailed = options?.detailed ?? false;

  return useQuery({
    queryKey: teamId
      ? queryKeys.teams.members(teamId, detailed)
      : ['teams', 'members', null, detailed ? 'detailed' : 'basic'],
    queryFn: () => fetchTeamMembers(teamId!, { detailed }),
    enabled: !!teamId,
  });
}
