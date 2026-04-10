import { useQuery } from '@tanstack/react-query';
import { fetchTeamMembers } from '../services/teamService';
import { queryKeys } from './queryKeys';

export function useTeamMembersQuery(teamId?: string) {
  return useQuery({
    queryKey: teamId ? queryKeys.teams.members(teamId) : ['teams', 'members', null],
    queryFn: () => fetchTeamMembers(teamId!),
    enabled: !!teamId,
  });
}
