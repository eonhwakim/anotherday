import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';

//Supabase 설정
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native에서는 false
    lock: processLock, // 동시 토큰 갱신 시 경쟁 상태 방지
  },
});

// 앱이 포그라운드일 때만 토큰 자동 갱신을 켠다.
// 모바일은 백그라운드에서 타이머가 멈추므로, 복귀 시점에 즉시 갱신해
// 세션이 만료된 채 남는 것을 방지한다. (등록은 1회만)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
