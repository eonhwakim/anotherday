import { create } from 'zustand';

interface StatsState {
  reset: () => void;
}

/**
 * 서버 상태는 React Query가 소유하고, 이 스토어는 로그아웃 시점의
 * 호환용 reset 진입점만 유지한다.
 */
export const useStatsStore = create<StatsState>(() => ({
  reset: () => {},
}));
