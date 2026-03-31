import { create } from 'zustand';
import type { User } from '../types/domain';
import { useGoalStore } from './goalStore';
import { useTeamStore } from './teamStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteUserAccount,
  ensureProfile,
  fetchUserProfile,
  getCurrentSessionUser,
  signInWithPassword,
  signOutAuth,
  signUpWithPassword,
} from '../services/authService';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  restoreSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User) => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, nickname: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  /** 프로필만 다시 가져오기 (isLoading 안 건드림, 네비게이션 리셋 방지) */
  refreshProfile: async () => {
    try {
      const sessionUser = await getCurrentSessionUser();
      if (sessionUser) {
        const profile = await fetchUserProfile(sessionUser.id);
        if (profile) {
          set({ user: profile });
        }
      }
    } catch (e) {
      console.error('[Auth] refreshProfile error:', e);
    }
  },

  /** 직접 user 객체 세팅 */
  setUser: (user: User) => set({ user }),

  restoreSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const sessionUser = await getCurrentSessionUser();

      if (sessionUser) {
        const profile = await ensureProfile(
          sessionUser.id,
          sessionUser.email ?? ''
        );
        set({ user: profile });
      } else {
        set({ user: null });
      }
    } catch (e) {
      console.error('[Auth] restoreSession error:', e);
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ isLoading: true, error: null });

      // 이전 유저 데이터 초기화 (로그인 전 스토어 리셋)
      useGoalStore.getState().reset();
      useTeamStore.getState().reset();

      const { data, error } = await signInWithPassword(email, password);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      if (data.user) {
        const profile = await ensureProfile(data.user.id, email);

        if (!profile) {
          set({ error: '프로필을 불러올 수 없습니다.', isLoading: false });
          return false;
        }

        set({ user: profile, isLoading: false });
        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return false;
    }
  },

  signUp: async (email, password, nickname) => {
    try {
      set({ isLoading: true, error: null });

      // 이전 유저 데이터 초기화
      useGoalStore.getState().reset();
      useTeamStore.getState().reset();

      const { data, error } = await signUpWithPassword(email, password, nickname);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      // 이미 가입된 이메일 감지
      if (data.user?.identities?.length === 0) {
        set({
          error: '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
          isLoading: false,
        });
        return false;
      }

      if (data.user) {
        const profile = await ensureProfile(data.user.id, email, nickname);

        if (!profile) {
          set({ error: '프로필 생성에 실패했습니다.', isLoading: false });
          return false;
        }

        set({ user: profile, isLoading: false });
        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return false;
    }
  },

  signOut: async () => {
    // 모든 스토어 초기화 (이전 사용자 데이터 제거)
    useGoalStore.getState().reset();
    useTeamStore.getState().reset();
    
    // 테스트용: 로그아웃 시 안내 모달 기록 초기화 (개발 편의성 및 신규 유저 시뮬레이션)
    // 실제 배포 시에는 주석 처리하거나 제거할 수 있음
    await AsyncStorage.removeItem('hasSeenGuide_v4');
    
    await signOutAuth();
    set({ user: null, error: null });
  },

  deleteAccount: async () => {
    try {
      set({ isLoading: true, error: null });

      const sessionUser = await getCurrentSessionUser();
      if (!sessionUser) {
        set({ error: '로그인 세션이 없습니다.', isLoading: false });
        return false;
      }

      const { error } = await deleteUserAccount(sessionUser.id);

      if (error) {
        console.error('[Auth] deleteAccount RPC error:', error.message);
        set({ error: '계정 삭제에 실패했습니다.', isLoading: false });
        return false;
      }

      useGoalStore.getState().reset();
      useTeamStore.getState().reset();
      await signOutAuth();
      set({ user: null, error: null, isLoading: false });
      return true;
    } catch (e: any) {
      console.error('[Auth] deleteAccount error:', e);
      set({ error: e.message, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
