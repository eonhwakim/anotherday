import { Alert } from 'react-native';

/**
 * Service 레이어에서 발생하는 에러.
 * userMessage: 사용자에게 보여줄 한국어 메시지
 * context: 내부 디버깅용 함수/위치 정보
 */
export class ServiceError extends Error {
  public readonly userMessage: string;

  constructor(userMessage: string, context: string, detail?: string) {
    super(detail ? `[${context}] ${detail}` : `[${context}] ${userMessage}`);
    this.name = 'ServiceError';
    this.userMessage = userMessage;
  }
}

/**
 * 서비스 에러를 로깅하고 사용자에게 알림을 표시한다.
 * - silent: true → 로깅만 하고 Alert을 표시하지 않음 (백그라운드 fetch 등)
 * - silent: false (기본) → Alert으로 사용자에게 피드백
 */
export function handleServiceError(
  error: unknown,
  options?: { silent?: boolean },
): void {
  const silent = options?.silent ?? false;

  if (error instanceof ServiceError) {
    console.warn(error.message);
    if (!silent) {
      Alert.alert('오류', error.userMessage);
    }
  } else if (error instanceof Error) {
    console.warn(`[UnexpectedError] ${error.message}`);
    if (!silent) {
      Alert.alert('오류', '일시적인 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
}
