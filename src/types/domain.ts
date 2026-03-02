// ─── Domain Types ─────────────────────────────────────────────
// Supabase 테이블과 1:1 매핑되는 도메인 타입 정의

/** 사용자 프로필 */
export interface User {
  id: string;
  email: string;
  nickname: string;
  name: string | null;
  gender: string | null;
  age: number | null;
  profile_image_url: string | null;
  created_at: string;
}

/** 팀 */
export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

/** 팀 멤버 (User ↔ Team 매핑) */
export type TeamMemberRole = 'leader' | 'member';

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  created_at: string;
}

/** 팀 멤버 + 유저 정보 조인 결과 */
export interface TeamMemberWithUser extends TeamMember {
  user: Pick<User, 'id' | 'nickname' | 'profile_image_url'>;
}

/** 팀 공통 목표 */
export interface Goal {
  id: string;
  team_id: string;
  owner_id: string | null;
  name: string;
  is_active: boolean;
  created_at: string;
}

/** 개인이 선택한 목표 */
export type GoalFrequency = 'daily' | 'weekly_count';

export interface UserGoal {
  id: string;
  user_id: string;
  goal_id: string;
  is_active: boolean;
  frequency: GoalFrequency; // 'daily' | 'weekly_count'
  target_count: number | null; // weekly_count일 때 주 N회
  start_date: string | null; // 목표 시작일 (YYYY-MM-DD), 이 날짜부터 유효
  end_date: string | null; // 목표 종료일 (YYYY-MM-DD), 이 날짜까지 유효
  week_days: number[] | null; // deprecated, 호환용
  created_at: string;
}

/** 유저 목표 + 목표 상세 조인 결과 */
export interface UserGoalWithDetail extends UserGoal {
  goal: Goal;
}

/** 하루 인증(체크인) */
export type CheckinStatus = 'done' | 'pass';

export interface Checkin {
  id: string;
  user_id: string;
  goal_id: string;
  date: string; // 'YYYY-MM-DD'
  photo_url: string | null;
  memo: string | null;
  status: CheckinStatus; // 'done' | 'pass'
  created_at: string;
}

/** 체크인 + 목표명 조인 결과 */
export interface CheckinWithGoal extends Checkin {
  goal: Pick<Goal, 'id' | 'name'>;
}

/** 리액션 (MVP에서는 타입 정의만) */
export interface Reaction {
  id: string;
  checkin_id: string;
  user_id: string;
  created_at: string;
}

export interface ReactionWithUser extends Reaction {
  user: Pick<User, 'id' | 'nickname' | 'profile_image_url'>;
}

/** 체크인 + 목표명 + 리액션 조인 결과 */
export interface CheckinWithGoal extends Checkin {
  goal: Pick<Goal, 'id' | 'name'>;
  reactions?: ReactionWithUser[];
}

/** 월별 한마디 (Resolution) */
export interface MonthlyResolution {
  id: string;
  user_id: string;
  team_id: string;
  year_month: string; // 'YYYY-MM'
  content: string;
  created_at: string;
}

/** 월별 회고 (Retrospective) */
export interface MonthlyRetrospective {
  id: string;
  user_id: string;
  team_id: string;
  year_month: string; // 'YYYY-MM'
  content: string;
  created_at: string;
}

// ─── DTO / Insert Types ────────────────────────────────────────
// Supabase insert 시 사용할 타입 (id, created_at 제외)

export type UserInsert = Omit<User, 'id' | 'created_at'>;
export type TeamInsert = Omit<Team, 'id' | 'created_at'>;
export type TeamMemberInsert = Omit<TeamMember, 'id' | 'created_at'>;
export type GoalInsert = Omit<Goal, 'id' | 'created_at'>;

export type UserGoalInsert = Omit<UserGoal, 'id' | 'created_at'>;
export type CheckinInsert = Omit<Checkin, 'id' | 'created_at'>;

// ─── Helper Types ───────────────────────────────────────────────

/** 산 위치 구간 (입구 / 중간 / 정상) */
export type MountainPosition = 'base' | 'middle' | 'summit';

/** 멤버 진행 상황 (HomeScreen 산 UI 용) */
export interface MemberProgress {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  totalGoals: number;
  completedGoals: number;
  position: MountainPosition;
}

/** 캘린더 날짜별 상태 마킹 */
export interface CalendarDayMarking {
  [date: string]: {
    marked: boolean;
    dotColor?: string;
    checkinCount: number;
    /** 상태: all_done(✅), mixed(✅💤), mostly_fail(❌), partial */
    dayStatus?: 'all_done' | 'mixed' | 'mostly_fail' | 'partial' | 'none';
    doneCount?: number;
    passCount?: number;
    totalGoals?: number;
  };
}

/** 팀 멤버 체크인 (캘린더 상세용) */
export interface MemberCheckinSummary {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  checkins: CheckinWithGoal[];
  totalGoals: number;
  doneCount: number;
  passCount: number;
}
