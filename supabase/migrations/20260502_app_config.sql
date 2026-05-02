-- 2026-05-02: 앱 강제/권장 업데이트 체크용 설정 테이블
CREATE TABLE public.app_config (
  platform TEXT PRIMARY KEY CHECK (platform IN ('ios', 'android')),
  min_version TEXT NOT NULL,        -- 강제 업데이트 임계 버전 (이 미만이면 강제 업데이트)
  latest_version TEXT NOT NULL,     -- 최신 권장 버전 (이 미만이면 권장 업데이트 알림)
  store_url TEXT NOT NULL,          -- 스토어 딥링크
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (anon 포함, 로그인 전에도 체크 필요)
CREATE POLICY "Anyone can read app_config" ON public.app_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 초기 시드 (현재 1.2.0 출시 후 1.3.0 배포 예정 가정)
INSERT INTO public.app_config (platform, min_version, latest_version, store_url) VALUES
  ('ios',     '1.2.0', '1.2.0', 'https://apps.apple.com/app/id6759189268'),
  ('android', '1.2.0', '1.2.0', 'https://play.google.com/store/apps/details?id=com.anotherday.app');
