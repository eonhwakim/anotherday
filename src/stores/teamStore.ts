import { create } from 'zustand';
import type { Team, TeamMemberWithUser } from '../types/domain';
import {
  createTeamWithMember,
  deleteTeamById,
  fetchTeamMembers,
  fetchUserTeams,
  leaveTeamById,
  type TeamWithRole,
} from '../services/teamService';

export type { TeamWithRole } from '../services/teamService';

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
      const teamList = await fetchUserTeams(userId);
      if (teamList.length > 0) {
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
    const members = await fetchTeamMembers(teamId);
    set({ members: members as TeamMemberWithUser[] });
  },

  selectTeam: (team) => {
    set({ currentTeam: team, members: [] });
  },

  createTeam: async (name, userId) => {
    const team = await createTeamWithMember(name, userId);
    if (!team) {
      return null;
    }

    set((state) => ({
      teams: [...state.teams, team],
      currentTeam: team,
    }));

    return team;
  },

  deleteTeam: async (teamId, userId) => {
    const ok = await deleteTeamById(teamId, userId);
    if (!ok) {
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
    const ok = await leaveTeamById(teamId, userId);
    if (!ok) {
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
