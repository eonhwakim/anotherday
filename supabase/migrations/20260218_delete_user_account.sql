CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 체크인 기록 삭제
  DELETE FROM checkins WHERE checkins.user_id = delete_user_account.user_id;

  -- 유저 목표 삭제
  DELETE FROM user_goals WHERE user_goals.user_id = delete_user_account.user_id;

  -- 본인이 만든 목표 삭제 (다른 유저가 사용하지 않는 것만)
  DELETE FROM goals
  WHERE owner_id = delete_user_account.user_id
    AND id NOT IN (
      SELECT goal_id FROM user_goals WHERE user_goals.user_id != delete_user_account.user_id
    );

  -- 팀 멤버십 삭제
  DELETE FROM team_members WHERE team_members.user_id = delete_user_account.user_id;

  -- 프로필 삭제
  DELETE FROM users WHERE id = delete_user_account.user_id;

  -- auth.users에서 삭제
  DELETE FROM auth.users WHERE id = delete_user_account.user_id;
END;
$$;