import { create } from 'zustand';
import type { User } from '../types/domain';
import { useGoalStore } from './goalStore';
import { useTeamStore } from './teamStore';
import { useStatsStore } from './statsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      useStatsStore.getState().reset();

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
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
      return false;
    }
  },

  signUp: async (email, password, nickname) => {
    try {
      set({ isLoading: true, error: null });

      // 이전 유저 데이터 초기화
      useGoalStore.getState().reset();
      useTeamStore.getState().reset();
      useStatsStore.getState().reset();

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
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
      return false;
    }
  },

  signInWithKakao: async () => {
    try {
      set({ isLoading: true, error: null });

      useGoalStore.getState().reset();
      useTeamStore.getState().reset();
      useStatsStore.getState().reset();

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
        // 이미 프로필이 있는 user — 카카오 연결한 기존 회원 또는 카카오 재로그인
        set({ user: existingProfile, isLoading: false });
        return { success: true, isNewUser: false };
      }

      // 신규 카카오 user — 프로필 미생성. 사용자 선택 대기 상태로 전환
      set({ isLoading: false });
      return {
        success: true,
        isNewUser: true,
        pendingUserId: data.user.id,
        pendingEmail: data.user.email ?? null,
      };
    } catch (e) {
      console.error('[Auth] signInWithKakao error:', e);
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
      return { success: false };
    }
  },

  finalizeKakaoSignup: async (userId, email, nickname) => {
    try {
      set({ isLoading: true, error: null });

      // 카카오 신규 user는 비즈니스 인증 없으면 email이 null일 수 있음 — placeholder 사용
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
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
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
      // 세션이 갱신되었을 수 있으니 프로필도 다시 가져온다
      const sessionUser = await getCurrentSessionUser();
      if (sessionUser) {
        const profile = await fetchUserProfile(sessionUser.id);
        if (profile) set({ user: profile });
      }
    }
    return result;
  },

  signOut: async () => {
    // 모든 스토어 초기화 (이전 사용자 데이터 제거)
    useGoalStore.getState().reset();
    useTeamStore.getState().reset();
    useStatsStore.getState().reset();
    
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
      useStatsStore.getState().reset();
      await signOutAuth();
      set({ user: null, error: null, isLoading: false });
      return true;
    } catch (e) {
      console.error('[Auth] deleteAccount error:', e);
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
