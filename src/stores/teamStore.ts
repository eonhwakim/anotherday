import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { Team, TeamMemberWithUser } from '../types/domain';

interface TeamState {
  /** 현재 선택된 팀 */
  currentTeam: Team | null;
  /** 현재 팀의 멤버 목록 (유저 정보 포함) */
  members: TeamMemberWithUser[];
  /** 유저가 속한 팀 목록 */
  teams: Team[];
  isLoading: boolean;

  /** 유저가 속한 팀 목록 로드 */
  fetchTeams: (userId: string) => Promise<void>;
  /** 팀 멤버 목록 로드 */
  fetchMembers: (teamId: string) => Promise<void>;
  /** 현재 팀 선택 */
  selectTeam: (team: Team) => void;
  /** 팀 생성 (회원가입 시 기본 팀 생성 등) */
  createTeam: (name: string, userId: string) => Promise<Team | null>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  currentTeam: null,
  members: [],
  teams: [],
  isLoading: false,

  fetchTeams: async (userId) => {
    set({ isLoading: true });
    try {
      // team_members 테이블에서 유저가 속한 팀 ID 조회
      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);

      if (memberships && memberships.length > 0) {
        const teamIds = memberships.map((m) => m.team_id);
        const { data: teams } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);

        const teamList = teams ?? [];
        set({ teams: teamList });

        // 현재 팀이 없으면 첫 번째 팀 자동 선택
        if (!get().currentTeam && teamList.length > 0) {
          set({ currentTeam: teamList[0] });
          // 멤버도 바로 로드
          get().fetchMembers(teamList[0].id);
        }
      } else {
        set({ teams: [] });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMembers: async (teamId) => {
    const { data } = await supabase
      .from('team_members')
      .select(`
        *,
        user:users(id, nickname, profile_image_url)
      `)
      .eq('team_id', teamId);

    set({ members: (data as TeamMemberWithUser[]) ?? [] });
  },

  selectTeam: (team) => {
    set({ currentTeam: team, members: [] });
  },

  createTeam: async (name, userId) => {
    // 간단한 초대 코드 생성 (6자리 랜덤)
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name, invite_code: inviteCode })
      .select()
      .single();

    if (error || !team) return null;

    // 생성자를 leader로 team_members에 추가
    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: userId,
      role: 'leader',
    });

    set((state) => ({
      teams: [...state.teams, team],
      currentTeam: team,
    }));

    return team;
  },
}));
