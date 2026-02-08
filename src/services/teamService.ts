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
    // 1) 팀 생성
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: DEFAULT_TEAM_NAME, invite_code: inviteCode })
      .select()
      .single();

    if (teamError || !team) return null;

    // 2) 생성자를 리더로 추가
    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: userId,
      role: 'leader',
    });

    // 3) 기본 목표 생성
    const goalInserts = DEFAULT_GOALS.map((g) => ({
      team_id: team.id,
      name: g.name,
      is_active: true,
    }));

    const { data: goals } = await supabase
      .from('goals')
      .insert(goalInserts)
      .select();

    // 4) 유저에게 모든 기본 목표 배정
    if (goals) {
      const userGoalInserts = goals.map((g) => ({
        user_id: userId,
        goal_id: g.id,
        is_active: true,
      }));

      await supabase.from('user_goals').insert(userGoalInserts);
    }

    return team;
  } catch (e) {
    console.error('setupDefaultTeam error:', e);
    return null;
  }
}

/** 초대 코드로 팀 참가 */
export async function joinTeamByCode(
  inviteCode: string,
  userId: string
): Promise<Team | null> {
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (!team) return null;

  // 이미 멤버인지 확인
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: userId,
      role: 'member',
    });

    // 팀의 활성 목표를 유저에게도 배정
    const { data: goals } = await supabase
      .from('goals')
      .select('id')
      .eq('team_id', team.id)
      .eq('is_active', true);

    if (goals) {
      const userGoalInserts = goals.map((g) => ({
        user_id: userId,
        goal_id: g.id,
        is_active: true,
      }));
      await supabase.from('user_goals').insert(userGoalInserts);
    }
  }

  return team;
}
