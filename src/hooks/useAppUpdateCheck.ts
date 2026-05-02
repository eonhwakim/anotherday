import { useEffect, useState } from 'react';
import { Platform, Linking } from 'react-native';
import * as Application from 'expo-application';
import { supabase } from '../lib/supabaseClient';

export type AppUpdateState = 'ok' | 'recommended' | 'required';

/** "1.2.10" 형태 버전 비교. a < b면 음수, a > b면 양수, 같으면 0 */
function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export interface AppUpdateInfo {
  state: AppUpdateState;
  currentVersion: string;
  latestVersion: string | null;
  storeUrl: string | null;
  openStore: () => Promise<void>;
}

/**
 * 앱 시작 시 Supabase의 app_config를 조회해 강제/권장 업데이트 여부를 판별합니다.
 * - state === 'required': 닫을 수 없는 모달로 강제 업데이트 유도
 * - state === 'recommended': 닫기 가능한 안내 모달
 */
export function useAppUpdateCheck(): AppUpdateInfo {
  const currentVersion = Application.nativeApplicationVersion ?? '0.0.0';
  const [state, setState] = useState<AppUpdateState>('ok');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const platform = Platform.OS;
      if (platform !== 'ios' && platform !== 'android') return;

      const { data, error } = await supabase
        .from('app_config')
        .select('min_version, latest_version, store_url')
        .eq('platform', platform)
        .maybeSingle();

      if (cancelled || error || !data) return;

      setLatestVersion(data.latest_version);
      setStoreUrl(data.store_url);

      if (compareVersion(currentVersion, data.min_version) < 0) {
        setState('required');
      } else if (compareVersion(currentVersion, data.latest_version) < 0) {
        setState('recommended');
      } else {
        setState('ok');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  const openStore = async () => {
    if (!storeUrl) return;
    try {
      await Linking.openURL(storeUrl);
    } catch (e) {
      console.warn('[useAppUpdateCheck] failed to open store:', e);
    }
  };

  return { state, currentVersion, latestVersion, storeUrl, openStore };
}
