import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  deleteUserAccount,
  ensureProfile,
  fetchUserProfile,
  getCurrentSessionUser,
  linkKakaoIdentity,
  signInWithKakao as signInWithKakaoService,
  signInWithPassword,
  signOutAuth,
  signUpWithPassword,
} from '../services/authService';
import type { User } from '../types/domain';
import { useGoalStore } from './goalStore';
import { useStatsStore } from './statsStore';
import { useTeamStore } from './teamStore';

export type KakaoSignInResult =
  | { success: true; isNewUser: false }
  | { success: true; isNewUser: true; pendingUserId: string; pendingEmail: string | null }
  | { success: false };

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  restoreSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User) => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, nickname: string) => Promise<boolean>;
  signInWithKakao: () => Promise<KakaoSignInResult>;
  finalizeKakaoSignup: (userId: string, email: string | null, nickname?: string) => Promise<boolean>;
  cancelKakaoSignup: () => Promise<void>;
  linkKakaoAccount: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  clearError: () => void;
}

/** 로그인·로그아웃·탈퇴 시 goal/team/stats 캐시 스토어 초기화 */
function resetDependentStores(): void {
  useGoalStore.getState().reset();
  useTeamStore.getState().reset();
  useStatsStore.getState().reset();
}

function authErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  setUser: (user) => set({ user }),

  /** 프로필만 다시 가져오기 (isLoading 변경 없음 → RootNavigator 로딩 리셋 방지) */
  refreshProfile: async () => {
    try {
      const sessionUser = await getCurrentSessionUser();
      if (!sessionUser) return;

      const profile = await fetchUserProfile(sessionUser.id);
      if (profile) set({ user: profile });
    } catch (e) {
      console.error('[Auth] refreshProfile error:', e);
    }
  },

  /** 앱 시작 시 Supabase 세션 복원 후 user 설정 */
  restoreSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const sessionUser = await getCurrentSessionUser();

      if (sessionUser) {
        const profile = await ensureProfile(sessionUser.id, sessionUser.email ?? '');
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
      resetDependentStores();

      const { data, error } = await signInWithPassword(email, password);
      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      if (!data.user) {
        set({ isLoading: false });
        return false;
      }

      const profile = await ensureProfile(data.user.id, email);
      if (!profile) {
        set({ error: '프로필을 불러올 수 없습니다.', isLoading: false });
        return false;
      }

      set({ user: profile, isLoading: false });
      return true;
    } catch (e) {
      set({ error: authErrorMessage(e), isLoading: false });
      return false;
    }
  },

  signUp: async (email, password, nickname) => {
    try {
      set({ isLoading: true, error: null });
      resetDependentStores();

      const { data, error } = await signUpWithPassword(email, password, nickname);
      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      if (data.user?.identities?.length === 0) {
        set({
          error: '이미 가입된 이메일입니다. 로그인을 시도해주세요.',
          isLoading: false,
        });
        return false;
      }

      if (!data.user) {
        set({ isLoading: false });
        return false;
      }

      const profile = await ensureProfile(data.user.id, email, nickname);
      if (!profile) {
        set({ error: '프로필 생성에 실패했습니다.', isLoading: false });
        return false;
      }

      set({ user: profile, isLoading: false });
      return true;
    } catch (e) {
      set({ error: authErrorMessage(e), isLoading: false });
      return false;
    }
  },

  signInWithKakao: async () => {
    try {
      set({ isLoading: true, error: null });
      resetDependentStores();

      const { data, error } = await signInWithKakaoService();
      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false };
      }

      if (!data.user) {
        set({ isLoading: false });
        return { success: false };
      }

      const existingProfile = await fetchUserProfile(data.user.id);
      if (existingProfile) {
        set({ user: existingProfile, isLoading: false });
        return { success: true, isNewUser: false };
      }

      set({ isLoading: false });
      return {
        success: true,
        isNewUser: true,
        pendingUserId: data.user.id,
        pendingEmail: data.user.email ?? null,
      };
    } catch (e) {
      console.error('[Auth] signInWithKakao error:', e);
      set({ error: authErrorMessage(e), isLoading: false });
      return { success: false };
    }
  },

  finalizeKakaoSignup: async (userId, email, nickname) => {
    try {
      set({ isLoading: true, error: null });

      const profileEmail = email ?? `${userId}@kakao.local`;
      const profile = await ensureProfile(userId, profileEmail, nickname);
      if (!profile) {
        set({ error: '프로필 생성에 실패했습니다.', isLoading: false });
        return false;
      }

      set({ user: profile, isLoading: false });
      return true;
    } catch (e) {
      console.error('[Auth] finalizeKakaoSignup error:', e);
      set({ error: authErrorMessage(e), isLoading: false });
      return false;
    }
  },

  cancelKakaoSignup: async () => {
    try {
      const sessionUser = await getCurrentSessionUser();
      if (sessionUser) {
        await deleteUserAccount(sessionUser.id);
      }
    } catch (e) {
      console.warn('[Auth] cancelKakaoSignup delete error:', e);
    }
    await signOutAuth();
    set({ user: null, error: null });
  },

  linkKakaoAccount: async () => {
    const result = await linkKakaoIdentity();
    if (result.success) {
      const sessionUser = await getCurrentSessionUser();
      if (sessionUser) {
        const profile = await fetchUserProfile(sessionUser.id);
        if (profile) set({ user: profile });
      }
    }
    return result;
  },

  signOut: async () => {
    resetDependentStores();

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

      resetDependentStores();
      await signOutAuth();
      set({ user: null, error: null, isLoading: false });
      return true;
    } catch (e) {
      console.error('[Auth] deleteAccount error:', e);
      set({ error: authErrorMessage(e), isLoading: false });
      return false;
    }
  },
}));
