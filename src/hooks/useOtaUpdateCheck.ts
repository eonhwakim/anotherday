import { useEffect } from 'react';
import * as Updates from 'expo-updates';

/**
 * 앱 시작 시 백그라운드로 OTA 업데이트를 확인하고, 있으면 다운로드합니다.
 * 받아둔 번들은 다음 콜드스타트에서 자동 적용됩니다.
 *
 * 네이티브 모듈 변경이 없는 JS-only 수정은 `eas update --branch production`으로
 * 즉시 배포 가능. runtimeVersion="appVersion" 정책이라 동일 네이티브 버전 사용자에게만 적용됩니다.
 */
export function useOtaUpdateCheck() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          // 강제 reload는 하지 않음 — 사용자가 다음에 앱을 켜면 자동 적용됨
          console.log('[OTA] update fetched, will apply on next cold start');
        }
      } catch (e) {
        console.warn('[OTA] check/fetch failed:', e);
      }
    })();
  }, []);
}
