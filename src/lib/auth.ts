import { supabase } from './supabaseClient';
import { ServiceError } from './serviceError';

function toAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '인증 정보를 확인할 수 없습니다.';
}

export async function requireAuthenticatedUserId(expectedUserId?: string): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new ServiceError(
      '인증 정보를 확인하지 못했습니다. 다시 로그인해주세요.',
      'requireAuthenticatedUserId',
      toAuthErrorMessage(error),
    );
  }

  if (!user?.id) {
    throw new ServiceError(
      '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
      'requireAuthenticatedUserId',
    );
  }

  if (expectedUserId && user.id !== expectedUserId) {
    throw new ServiceError(
      '유효하지 않은 요청입니다. 다시 시도해주세요.',
      'requireAuthenticatedUserId',
      'session user does not match requested user',
    );
  }

  return user.id;
}
