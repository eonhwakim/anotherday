import { create } from 'zustand';

interface GoalState {
  reset: () => void;
}

/**
 * 서버 상태는 React Query로 이동했고, 이 스토어는 로그아웃 시점의
 * 호환용 reset 진입점만 유지한다.
 */
export const useGoalStore = create<GoalState>(() => ({
  reset: () => {},
}));
