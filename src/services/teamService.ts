import { supabase } from '../lib/supabaseClient';
import { ServiceError } from '../lib/serviceError';
import type { Team, TeamMemberRole, TeamMemberWithUser } from '../types/domain';

export interface TeamWithRole extends Team {
  role?: TeamMemberRole;
  profile_image_url?: string | null;
}

/** 초대 코드로 팀 참가 (RPC로 RLS 우회) */
export async function joinTeamByCode(inviteCode: string, userId: string): Promise<Team | null> {
  const { data, error } = await supabase.rpc('join_team_by_invite', {
    invite: inviteCode,
    member_user_id: userId,
  });

  if (error) {
    throw new ServiceError('팀 참가에 실패했습니다.', 'joinTeamByCode', error.message);
  }

  if (!data) return null;

  return data as Team;
}

export async function fetchUserTeams(userId: string): Promise<TeamWithRole[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId);

  if (membershipError) {
    throw new ServiceError('팀 목록을 불러오지 못했습니다.', 'fetchUserTeams', membershipError.message);
  }

  if (!memberships || memberships.length === 0) return [];

  const teamIds = memberships.map((membership) => membership.team_id);
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, invite_code, profile_image_url, created_at')
    .in('id', teamIds);

  if (teamsError) {
    throw new ServiceError('팀 정보를 불러오지 못했습니다.', 'fetchUserTeams', teamsError.message);
  }

  return (teams ?? []).map((team) => ({
    ...team,
    role: memberships.find((membership) => membership.team_id === team.id)?.role as TeamMemberRole,
  }));
}

export async function fetchTeamMembers(
  teamId: string,
  options?: { detailed?: boolean },
): Promise<TeamMemberWithUser[]> {
  const selectClause = options?.detailed
    ? `
        *,
        user:users(id, nickname, profile_image_url, name, gender, age)
      `
    : `
        *,
        user:users(id, nickname, profile_image_url)
      `;

  const { data, error } = await supabase
    .from('team_members')
    .select(selectClause)
    .eq('team_id', teamId);

  if (error) {
    throw new ServiceError('팀원 목록을 불러오지 못했습니다.', 'fetchTeamMembers', error.message);
  }

  return (data as TeamMemberWithUser[]) ?? [];
}

export async function createTeamWithMember(name: string, userId: string): Promise<Team | null> {
  const { data, error } = await supabase.rpc('create_team_with_member', {
    team_name: name,
    member_user_id: userId,
  });

  if (error || !data) {
    throw new ServiceError('팀 생성에 실패했습니다.', 'createTeamWithMember', error?.message);
  }

  return data as Team;
}

export async function deleteTeamById(teamId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.rpc('delete_team', {
    p_team_id: teamId,
    p_user_id: userId,
  });

  if (error) {
    throw new ServiceError('팀 삭제에 실패했습니다.', 'deleteTeamById', error.message);
  }

  return true;
}

export async function leaveTeamById(teamId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.rpc('leave_team', {
    p_team_id: teamId,
    p_user_id: userId,
  });

  if (error) {
    throw new ServiceError('팀 탈퇴에 실패했습니다.', 'leaveTeamById', error.message);
  }

  return true;
}

/** 팀 프로필 수정 (이름, 프로필 이미지) */
export async function updateTeamProfile(
  teamId: string,
  updates: { name?: string; profile_image_url?: string | null },
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('teams').update(updates).eq('id', teamId);

    if (error) {
      console.error('updateTeamProfile error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('updateTeamProfile failed:', e);
    return { success: false, error: e?.message };
  }
}

/** 팀 프로필 이미지 업로드 */
export async function uploadTeamProfileImage(
  teamId: string,
  imageUri: string,
): Promise<string | null> {
  try {
    const fileName = `teams/${teamId}/${Date.now()}.jpg`;
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage.from('checkin-photos').upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (error) {
      console.error('Team profile image upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage.from('checkin-photos').getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.error('uploadTeamProfileImage failed:', e);
    return null;
  }
}
