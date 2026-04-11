import { create } from 'zustand';
import type { Team } from '../types/domain';
import type { TeamWithRole } from '../services/teamService';

export type { TeamWithRole } from '../services/teamService';

interface TeamState {
  /** 현재 선택된 팀 */
  currentTeam: Team | null;
  /** 유저가 속한 팀 목록 */
  teams: TeamWithRole[];
  /** 현재 팀 선택 */
  selectTeam: (team: Team) => void;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
}

/**
 * 팀 목록은 React Query가 소유하고, 이 스토어는
 * 현재 선택 팀과 간단한 UI 상태만 유지한다.
 */
export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  teams: [],

  selectTeam: (team) => {
    set({ currentTeam: team });
  },

  reset: () => {
    set({ currentTeam: null, teams: [] });
  },
}));
