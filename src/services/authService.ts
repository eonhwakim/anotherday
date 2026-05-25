import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { requireAuthenticatedUserId } from '../lib/auth';
import { runSingleFlight } from '../lib/requestCache';
import { supabase } from '../lib/supabaseClient';
import type { User } from '../types/domain';

WebBrowser.maybeCompleteAuthSession();

const SESSION_TIMEOUT_MS = 3000;
const KAKAO_REDIRECT_PATH = 'auth-callback';
const KAKAO_SCOPES = 'account_email profile_nickname profile_image';

type OAuthFlowResult = { success: true } | { success: false; error: string };

// ─── Kakao OAuth (in-app browser) ──────────────────────────────

function getKakaoRedirectUrl(): string {
  return Linking.createURL(KAKAO_REDIRECT_PATH);
}

/** Supabase가 redirect URL hash(#)에 넣어 주는 access_token 등 파싱 */
function parseAuthCallbackFragment(url: string) {
  const fragment = url.split('#')[1] ?? '';
  const params = new URLSearchParams(fragment);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    errorCode: params.get('error_code'),
    errorDescription: params.get('error_description'),
    error: params.get('error'),
  };
}

/**
 * signInWithOAuth / linkIdentity 가 준 URL을 인앱 브라우저로 열고,
 * 앱 딥링크로 돌아온 뒤 토큰으로 Supabase 세션을 설정한다.
 */
async function completeKakaoOAuthSession(authUrl: string): Promise<OAuthFlowResult> {
  const redirectUrl = getKakaoRedirectUrl();
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

  if (result.type !== 'success' || !result.url) {
    return { success: false, error: '카카오 로그인이 취소되었습니다.' };
  }

  const { accessToken, refreshToken, errorCode, errorDescription, error } =
    parseAuthCallbackFragment(result.url);

  if (errorCode || error) {
    return {
      success: false,
      error: errorDescription ?? error ?? '카카오 인증 중 오류가 발생했습니다.',
    };
  }

  if (!accessToken || !refreshToken) {
    return { success: false, error: '인증 응답에서 세션 정보를 찾을 수 없습니다.' };
  }

  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (setSessionError) {
    return { success: false, error: setSessionError.message };
  }

  return { success: true };
}

// ─── Profile ───────────────────────────────────────────────────

/** DB users 행이 없으면 RPC로 생성, 있으면 반환 (중복 호출 방지: single-flight) */
export async function ensureProfile(
  userId: string,
  email: string,
  nickname?: string,
): Promise<User | null> {
  return runSingleFlight(`ensureProfile:${userId}`, async () => {
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
  });
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

  if (error) {
    console.error('[Auth] fetchUserProfile error:', error.message);
    return null;
  }

  return data as User;
}

// ─── Session ───────────────────────────────────────────────────

export async function getCurrentSessionUser() {
  const sessionResult = await getSessionWithTimeout();
  const {
    data: { session },
  } = sessionResult;
  return session?.user ?? null;
}

/** AsyncStorage 복원이 느릴 때 무한 로딩 방지 */
async function getSessionWithTimeout() {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('session_restore_timeout')), SESSION_TIMEOUT_MS);
    }),
  ]).catch((error) => {
    console.warn('[Auth] getSession timeout/fallback:', error);
    return { data: { session: null } };
  });
}

// ─── Email auth ────────────────────────────────────────────────

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, nickname: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  });
}

export async function signOutAuth() {
  return supabase.auth.signOut();
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

// ─── Kakao auth ────────────────────────────────────────────────

export async function signInWithKakao() {
  const redirectTo = getKakaoRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      scopes: KAKAO_SCOPES,
    },
  });

  if (error) {
    return { data: { user: null, session: null }, error };
  }

  if (!data?.url) {
    return {
      data: { user: null, session: null },
      error: new Error('카카오 로그인 URL을 생성하지 못했습니다.'),
    };
  }

  const oauth = await completeKakaoOAuthSession(data.url);
  if (!oauth.success) {
    return {
      data: { user: null, session: null },
      error: new Error(oauth.error),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { data: { user: null, session: null }, error: userError };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  return {
    data: { user: user ?? null, session: session ?? null },
    error: sessionError,
  };
}

export async function hasKakaoIdentity(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user?.identities?.some((identity) => identity.provider === 'kakao');
}

/** 이미 로그인된 계정에 카카오 identity 연결 */
export async function linkKakaoIdentity(): Promise<OAuthFlowResult> {
  const redirectTo = getKakaoRedirectUrl();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'kakao',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      scopes: KAKAO_SCOPES,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data?.url) {
    return { success: false, error: '카카오 연결 URL을 생성하지 못했습니다.' };
  }

  return completeKakaoOAuthSession(data.url);
}

// ─── Account ───────────────────────────────────────────────────

export async function deleteUserAccount(userId: string) {
  const actorUserId = await requireAuthenticatedUserId(userId);
  return supabase.rpc('delete_user_account', { user_id: actorUserId });
}
