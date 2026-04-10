import { supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from '../lib/auth';
import type { User } from '../types/domain';

const SESSION_TIMEOUT_MS = 3000;

export async function ensureProfile(
  userId: string,
  email: string,
  nickname?: string,
): Promise<User | null> {
  const actorUserId = await requireAuthenticatedUserId(userId);
  const displayName = nickname || email.split('@')[0];

  const { data, error } = await supabase.rpc('create_user_profile', {
    user_id: actorUserId,
    user_email: email,
    user_nickname: displayName,
  });

  if (error) {
    console.error('[Auth] RPC create_user_profile error:', error.message);
    return null;
  }

  return data as User;
}

export async function getCurrentSessionUser() {
  const sessionResult = await Promise.race([
    supabase.auth.getSession(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('session_restore_timeout')), SESSION_TIMEOUT_MS);
    }),
  ]).catch((error) => {
    console.warn('[Auth] getSession timeout/fallback:', error);
    return {
      data: { session: null },
    };
  });

  const {
    data: { session },
  } = sessionResult;

  return session?.user ?? null;
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

  if (error) {
    console.error('[Auth] fetchUserProfile error:', error.message);
    return null;
  }

  return data as User;
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, nickname: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  });
}

export async function signOutAuth() {
  return supabase.auth.signOut();
}

export async function deleteUserAccount(userId: string) {
  const actorUserId = await requireAuthenticatedUserId(userId);
  return supabase.rpc('delete_user_account', {
    user_id: actorUserId,
  });
}

export async function checkEmailExists(email: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('check_email_exists', {
    check_email: email,
  });

  if (error) {
    console.warn('[Register] email check RPC error:', error.message);
    return null;
  }

  return data === true;
}
