import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

export interface OtaUpdateInfo {
  /** 새 번들 다운로드가 끝나 적용(재시작) 대기 중인지 여부 */
  updateReady: boolean;
  /** 즉시 적용 — 다운로드된 번들로 앱을 재시작합니다. */
  applyUpdate: () => Promise<void>;
}

/**
 * OTA(EAS Update) 업데이트를 확인·다운로드하고, 받아지면 즉시 적용할 수 있게 합니다.
 *
 * - 앱 시작 시 1회 + 백그라운드 → 포그라운드 복귀 시마다 확인합니다. (방법 B)
 * - 다운로드가 끝나면 `updateReady`가 true가 되며, UI에서 사용자 동의를 받아
 *   `applyUpdate()`(= reloadAsync)로 그 세션에서 바로 적용합니다. (방법 A)
 *
 * 네이티브 모듈 변경이 없는 JS-only 수정은 `eas update --branch production`으로 배포.
 * runtimeVersion="appVersion" 정책이라 동일 네이티브 버전 사용자에게만 적용됩니다.
 */
export function useOtaUpdateCheck(): OtaUpdateInfo {
  const [updateReady, setUpdateReady] = useState(false);
  // setState는 비동기라 동시성 가드는 ref로 둔다.
  const checkingRef = useRef(false);
  const updateReadyRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const checkAndFetch = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) return;
    // 이미 받아둔 게 있거나 확인 중이면 중복 실행하지 않는다.
    if (checkingRef.current || updateReadyRef.current) return;

    checkingRef.current = true;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) {
          updateReadyRef.current = true;
          setUpdateReady(true);
          console.log('[OTA] update fetched, ready to apply');
        }
      }
    } catch (e) {
      console.warn('[OTA] check/fetch failed:', e);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // 앱 시작 시 1회
  useEffect(() => {
    checkAndFetch();
  }, [checkAndFetch]);

  // 백그라운드 → 포그라운드 복귀 시 재확인 (방법 B)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        checkAndFetch();
      }
    });
    return () => sub.remove();
  }, [checkAndFetch]);

  const applyUpdate = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      console.warn('[OTA] reload failed:', e);
    }
  }, []);

  return { updateReady, applyUpdate };
}
