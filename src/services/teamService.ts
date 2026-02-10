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
