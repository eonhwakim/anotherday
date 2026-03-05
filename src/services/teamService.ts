import { supabase } from '../lib/supabaseClient';
import { DEFAULT_GOALS, DEFAULT_TEAM_NAME } from '../constants/defaults';
import type { Team } from '../types/domain';

// ─── 팀 관련 서비스 ───────────────────────────────────────────

/**
 * 회원가입 후 기본 팀 + 기본 목표 셋업
 * MVP에서는 가입 시 자동으로 1팀 생성 + 기본 목표 3개 생성 + 유저 목표 배정
 */
export async function setupDefaultTeam(userId: string): Promise<Team | null> {
  try {
    // 1) RPC로 팀 생성 + 멤버 등록 (RLS 이슈 해결)
    const { data: teamData, error: teamError } = await supabase.rpc('create_team_with_member', {
      team_name: DEFAULT_TEAM_NAME,
      member_user_id: userId,
    });

    if (teamError || !teamData) {
      console.error('setupDefaultTeam: team creation failed', teamError?.message);
      return null;
    }

    const team = teamData as Team;

    // 2) 기본 목표 생성
    const goalInserts = DEFAULT_GOALS.map((g) => ({
      team_id: team.id,
      name: g.name,
      is_active: true,
    }));

    const { data: goals } = await supabase
      .from('goals')
      .insert(goalInserts)
      .select();

    // 3) 유저에게 모든 기본 목표 배정
    if (goals) {
      const userGoalInserts = goals.map((g) => ({
        user_id: userId,
        goal_id: g.id,
        is_active: true,
        frequency: 'daily',
        week_days: null,
      }));

      await supabase.from('user_goals').insert(userGoalInserts);
    }

    return team;
  } catch (e) {
    console.error('setupDefaultTeam error:', e);
    return null;
  }
}

/** 초대 코드로 팀 참가 (RPC로 RLS 우회) */
export async function joinTeamByCode(
  inviteCode: string,
  userId: string
): Promise<Team | null> {
  const { data, error } = await supabase.rpc('join_team_by_invite', {
    invite: inviteCode,
    member_user_id: userId,
  });

  if (error) {
    console.error('[TeamService] joinTeamByCode RPC error:', error.message);
    return null;
  }

  if (!data) return null;

  return data as Team;
}

/** 팀 프로필 수정 (이름, 프로필 이미지) */
export async function updateTeamProfile(
  teamId: string,
  updates: { name?: string; profile_image_url?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId);

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
  imageUri: string
): Promise<string | null> {
  try {
    const fileName = `teams/${teamId}/${Date.now()}.jpg`;
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('checkin-photos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Team profile image upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('checkin-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.error('uploadTeamProfileImage failed:', e);
    return null;
  }
}
