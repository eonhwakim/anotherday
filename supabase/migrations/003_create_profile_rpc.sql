-- ─── 프로필 생성/조회 RPC 함수 ────────────────────────────────
-- SECURITY DEFINER로 RLS를 우회하여 프로필을 안전하게 생성/조회

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_nickname TEXT
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- 이미 있으면 조회만
  SELECT row_to_json(u) INTO result
  FROM public.users u WHERE u.id = user_id;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  -- 없으면 생성
  INSERT INTO public.users (id, email, nickname, profile_image_url)
  VALUES (user_id, user_email, user_nickname, NULL)
  ON CONFLICT (id) DO NOTHING;

  SELECT row_to_json(u) INTO result
  FROM public.users u WHERE u.id = user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
