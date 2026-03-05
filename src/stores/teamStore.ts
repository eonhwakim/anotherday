import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { Team, TeamMemberWithUser, TeamMemberRole } from '../types/domain';

export interface TeamWithRole extends Team {
  role?: TeamMemberRole;
}

interface TeamState {
  /** 현재 선택된 팀 */
  currentTeam: Team | null;
  /** 현재 팀의 멤버 목록 (유저 정보 포함) */
  members: TeamMemberWithUser[];
  /** 유저가 속한 팀 목록 */
  teams: TeamWithRole[];
  isLoading: boolean;

  /** 유저가 속한 팀 목록 로드 */
  fetchTeams: (userId: string) => Promise<void>;
  /** 팀 멤버 목록 로드 */
  fetchMembers: (teamId: string) => Promise<void>;
  /** 현재 팀 선택 */
  selectTeam: (team: Team) => void;
  /** 팀 생성 (회원가입 시 기본 팀 생성 등) */
  createTeam: (name: string, userId: string) => Promise<Team | null>;
  /** 팀 삭제 (LEADER 전용) */
  deleteTeam: (teamId: string, userId: string) => Promise<boolean>;
  /** 팀 탈퇴 (MEMBER 전용) */
  leaveTeam: (teamId: string, userId: string) => Promise<boolean>;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
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
        .select('team_id, role')
        .eq('user_id', userId);

      if (memberships && memberships.length > 0) {
        const teamIds = memberships.map((m) => m.team_id);
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name, invite_code, profile_image_url, created_at')
          .in('id', teamIds);

        const teamList: TeamWithRole[] = (teams ?? []).map(t => ({
          ...t,
          role: memberships.find(m => m.team_id === t.id)?.role as TeamMemberRole
        }));
        
        set({ teams: teamList });

        // 현재 팀이 이 유저의 팀 목록에 없으면 첫 번째 팀으로 재설정
        const current = get().currentTeam;
        const currentStillValid = current && teamList.some((t) => t.id === current.id);
        if (!currentStillValid && teamList.length > 0) {
          set({ currentTeam: teamList[0] });
          get().fetchMembers(teamList[0].id);
        } else if (!currentStillValid) {
          set({ currentTeam: null, members: [] });
        }
      } else {
        set({ teams: [], currentTeam: null, members: [] });
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
    // RPC로 팀 생성 + 멤버 등록을 한 트랜잭션으로 처리
    // (RLS SELECT 정책이 team_members 기반이라, INSERT 후 .select()가 안 되는 문제 해결)
    const { data, error } = await supabase.rpc('create_team_with_member', {
      team_name: name,
      member_user_id: userId,
    });

    if (error || !data) {
      console.error('[TeamStore] createTeam RPC error:', error?.message);
      return null;
    }

    const team = data as Team;

    set((state) => ({
      teams: [...state.teams, team],
      currentTeam: team,
    }));

    return team;
  },

  deleteTeam: async (teamId, userId) => {
    const { error } = await supabase.rpc('delete_team', {
      p_team_id: teamId,
      p_user_id: userId,
    });

    if (error) {
      console.error('[TeamStore] deleteTeam error:', error.message);
      return false;
    }

    set((state) => {
      const newTeams = state.teams.filter((t) => t.id !== teamId);
      const newCurrent = state.currentTeam?.id === teamId
        ? (newTeams[0] ?? null)
        : state.currentTeam;
      return { teams: newTeams, currentTeam: newCurrent, members: [] };
    });

    return true;
  },

  leaveTeam: async (teamId, userId) => {
    const { error } = await supabase.rpc('leave_team', {
      p_team_id: teamId,
      p_user_id: userId,
    });

    if (error) {
      console.error('[TeamStore] leaveTeam error:', error.message);
      return false;
    }

    set((state) => {
      const newTeams = state.teams.filter((t) => t.id !== teamId);
      const newCurrent = state.currentTeam?.id === teamId
        ? (newTeams[0] ?? null)
        : state.currentTeam;
      return { teams: newTeams, currentTeam: newCurrent, members: [] };
    });

    return true;
  },

  reset: () => {
    set({ currentTeam: null, members: [], teams: [], isLoading: false });
  },
}));
