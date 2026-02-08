-- ─── 회원가입 시 users 프로필 자동 생성 트리거 ───────────────────
-- auth.users에 새 row가 생기면 → public.users에 자동으로 프로필 생성
-- 트리거는 서버사이드(SECURITY DEFINER)로 실행되므로 RLS를 우회함

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname, profile_image_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- auth.users INSERT 시 자동 실행
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
