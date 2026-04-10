import { useQuery } from '@tanstack/react-query';
import { fetchTeamMembers } from '../services/teamService';
import { queryKeys } from './queryKeys';

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
