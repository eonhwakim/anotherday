import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { User } from '../types/domain';

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
  clearError: () => void;
}

/**
 * RPC를 통해 프로필 조회/생성 (SECURITY DEFINER로 RLS 우회)
 */
async function ensureProfile(
  userId: string,
  email: string,
  nickname?: string
): Promise<User | null> {
  const displayName = nickname || email.split('@')[0];

  const { data, error } = await supabase.rpc('create_user_profile', {
    user_id: userId,
    user_email: email,
    user_nickname: displayName,
  });

  if (error) {
    console.error('[Auth] RPC create_user_profile error:', error.message);
    return null;
  }

  console.log('[Auth] Profile loaded:', data);
  return data as User;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  /** 프로필만 다시 가져오기 (isLoading 안 건드림, 네비게이션 리셋 방지) */
  refreshProfile: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && data) {
          set({ user: data as User });
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
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await ensureProfile(
          session.user.id,
          session.user.email ?? ''
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
        },
      });

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
    await supabase.auth.signOut();
    // 모든 스토어 초기화 (이전 유저 데이터 잔류 방지)
    const { useTeamStore } = require('./teamStore');
    const { useGoalStore } = require('./goalStore');
    useTeamStore.getState().reset();
    useGoalStore.getState().reset();
    set({ user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
