# Another Day — 개발 설계서 (Development Design Document)

## 1. 프로젝트 개요

**프로젝트명**: Another Day  
**목적**: 팀 단위의 목표 달성 및 습관 형성 지원 서비스  
**핵심 가치**: "함께하면 더 멀리 간다" — 개인의 목표 달성을 팀원들과 공유하고 격려하며 지속 가능한 성장을 도모함.

---

## 2. 시스템 아키텍처

### 2.1. 기술 스택 선정 이유

| 영역 | 기술 | 선정 이유 |
|---|---|---|
| **Framework** | React Native (Expo SDK 54) | 크로스 플랫폼 개발 효율, Expo의 OTA 업데이트 지원 |
| **Language** | TypeScript | 도메인 타입 안정성 확보 (`domain.ts`에 모든 테이블 1:1 매핑) |
| **State** | Zustand v5 | Redux 대비 보일러플레이트 최소화, 크로스-스토어 리셋 패턴 가능 |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) | 별도 서버 없이 BaaS로 빠른 MVP, RLS로 데이터 보안 |
| **Navigation** | React Navigation 7 | Native Stack + Bottom Tabs 조합, auth-based 분기 라우팅 |
| **SVG** | react-native-svg | 산 애니메이션·차트 등 커스텀 비주얼에 필수 |
| **Date** | dayjs (ko locale, isoWeek plugin) | moment 대비 경량, ISO 8601 주간 연산 지원 |
| **Calendar** | react-native-calendars | 마킹·스타일 커스터마이징이 유연 |
| **Notifications** | expo-notifications | 매일 리마인더 (요일별 메시지) |

### 2.2. 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│                     React Native App                      │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │  AuthStack   │  │  AppTabs    │  │  Modal Screens   │ │
│  │  Login       │  │  Home       │  │  ProfileEdit     │ │
│  │  Register    │  │  Calendar   │  │  TeamDetail      │ │
│  │              │  │  Statistics │  │  MemberStats     │ │
│  │              │  │  MyPage     │  │  AppSettings     │ │
│  └──────┬───────┘  └──────┬──────┘  └────────┬─────────┘ │
│         │                 │                   │           │
│         └────────┬────────┴───────────────────┘           │
│                  ▼                                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Zustand Stores (3개)                    │ │
│  │  authStore ──── goalStore ──── teamStore             │ │
│  │  (user,auth)   (goals,checkins)  (teams,members)    │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           supabaseClient (AsyncStorage)              │ │
│  └──────────────────────┬──────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────┘
                          ▼
              ┌───────────────────────┐
              │   Supabase Cloud      │
              │   PostgreSQL + Auth   │
              │   + Storage + RPC     │
              └───────────────────────┘
```

### 2.3. 네비게이션 구조

`RootNavigator`가 인증 상태에 따라 화면을 분기한다.

```
RootNavigator (NativeStack, headerShown: false)
├── [비로그인] AuthStack
│   ├── Login
│   └── Register
└── [로그인] App (BottomTabs) + Stack Screens
    ├── HomeTab → HomeScreen
    ├── CalendarTab → CalendarScreen
    ├── StatsTab → StatisticsScreen
    ├── MyPageTab → MyPageScreen
    └── Stack Screens (모달처럼 push)
        ├── ProfileEdit
        ├── TeamDetail → TeamMember
        ├── TeamProfileEdit
        ├── MemberStats
        └── AppSettings
```

**설계 의도**: `restoreSession()` → `fetchTeams()` → `scheduleDailyNotifications()` 순서로 초기화하여, 앱 로드 시 로딩 스피너 한 번만 노출 후 바로 메인 화면 진입.

---

## 3. 핵심 개념 정의 (Concept Model)

> 이 섹션은 앱 전체의 **진실의 원천(Single Source of Truth)**이다.
> 모든 화면, 컴포넌트, 통계 로직은 이 개념 정의에 따라 동작해야 한다.

### 3.1. 목표 유형 (Goal Types)

| 유형 | frequency | 설명 | 패스 가능 |
|---|---|---|---|
| **매일 목표** | `daily` | 매일(주 7회) 수행해야 하는 목표 | **불가** |
| **주N회 목표** | `weekly_count` | 일주일(월~일) 중 N회 수행하면 되는 목표 | **가능** |

### 3.2. 목표 기간 (Goal Period)

- 목표 추가 시: `start_date` = **오늘**, `end_date` = **해당 월의 말일**
- 해당 기간 동안만 목표가 유효 (캘린더, 통계, 오늘탭에서 활성)
- 월이 바뀌면 이전 달 목표는 만료 → "이어하기" 기능으로 연장 가능

### 3.3. 인증하기 (Check-in) — 핵심 규칙

#### 공통 규칙
- 인증은 **오늘 자정(24:00) 전**에 완료해야 함
- 인증 방법: 카메라로 사진 촬영 → `checkin.status = 'done'`
- 하루에 같은 목표는 1회만 인증 가능

#### 매일 목표 (Daily)
```
자정 전 사진 인증 → ✅ 완료 (done)
자정까지 아무것도 안 함 → ❌ 미달 (fail)  ← 패스 불가
```
- 매일 목표에는 **패스 버튼이 표시되지 않음**
- 인증하거나, 안 하면 미달. 선택지는 2가지뿐

#### 주N회 목표 (Weekly Count)
```
자정 전 사진 인증 → ✅ 완료 (done)
자정 전 패스 버튼 클릭 → ⏭ 패스 (pass)  ← 명시적 패스
자정까지 아무것도 안 함 → ⏭ 패스 (auto-pass)  ← 자동 패스
```
- 주N회 목표에는 **패스 버튼이 표시됨**
- 패스의 의미: "오늘은 이 목표를 스킵한다"
- **명시적 패스**: 사용자가 인증하기 모달에서 [패스] 버튼 클릭 → `checkin.status = 'pass'` 레코드 생성
- **자동 패스**: 자정까지 인증도 안 하고 패스도 안 누르면 → 해당 날은 패스로 처리 (DB에 레코드 없음, 집계 시 패스로 카운팅)
- **패스 취소 → 다시 인증 가능**: 자정 전에는 패스를 풀고 다시 인증할 수 있음

> **중요한 차이**: 매일 목표의 미인증 = **미달(fail)** / 주N회 목표의 미인증 = **패스(pass)**

### 3.4. 주간 집계 (Weekly Aggregation) — 통합 방식

주 단위는 **월요일~일요일** (ISO 8601 기준). 월초/월말 부분주가 4일 미만이면 인접 월에 편입.
인접 월에 편입된 날짜는 해당 월의 주차 범위에 실제로 포함되며, 체크인 데이터도 인접 월 날짜까지 조회.

**매일 목표와 주N회 목표 모두 동일한 주 단위 집계 방식을 사용:**

| 유형 | 주간 target | 계산 |
|---|---|---|
| 매일 목표 | 해당 주의 활성일 수 (4~7일) | done / activeDays × 100 |
| 주N회 목표 | target_count (고정 N회) | done / target_count × 100 |

예시: "주 2회 운동하기" 목표가 있을 때, 1주일의 기록이 다음과 같다면:

| 월 | 화 | 수 | 목 | 금 | 토 | 일 |
|---|---|---|---|---|---|---|
| 인증 ✅ | 패스 ⏭ | 인증 ✅ | 인증 ✅ | - | 인증 ✅ | - |

집계 결과:
- **완료(done)**: 4회 (사진 인증)
- **패스**: 3회 (명시적 패스 1 + 자동 패스 2)
- **주간 달성 여부**: 목표 2회 → 완료 4회 → ✅ **달성** (+2 초과)

미달 판정:
- 주간 완료(done) 횟수 < target → **미달**
- 매일 목표: target = 해당 주 활성일 수 / 주N회 목표: target = target_count
- 미달 횟수 = max(0, target - done_count)
- 미달은 **주차가 완전히 끝난 후(일요일 지남)에만 계산**

---

## 4. 상태 관리 설계

### 4.1. 스토어 분리 원칙

```
authStore — 인증/세션 전용 (user, signIn, signOut, restoreSession)
teamStore — 팀/멤버 관리 (currentTeam, members, fetchTeams)
goalStore — 목표·체크인·진행상황·캘린더·통계 데이터 일체 (가장 큰 스토어)
```

**설계 이유**: 도메인 단위 분리로 각 스토어가 독립적으로 reset 가능. 특히 로그아웃 시 크로스-스토어 리셋이 핵심.

### 4.2. 크로스-스토어 리셋 패턴

```typescript
// authStore.ts — signIn, signUp, signOut, deleteAccount 모두에서 호출
useGoalStore.getState().reset();
useTeamStore.getState().reset();
```

**해결한 문제**: 사용자 A가 로그아웃 후 사용자 B가 로그인하면, 이전 사용자의 목표·체크인 데이터가 순간적으로 노출되는 문제. `reset()`을 auth 이벤트 최상단에서 호출하여 방지.

**Zustand의 장점**: `useGoalStore.getState()`로 React 렌더 사이클 밖에서도 다른 스토어에 접근 가능 — Redux에서는 별도 middleware가 필요한 패턴.

### 4.3. goalStore 핵심 설계

goalStore는 앱에서 가장 복잡한 스토어로, 다음 책임을 가진다:

| 함수 | 역할 | 호출 시점 |
|---|---|---|
| `fetchTeamGoals` | 팀 공통 목표 목록 로드 | 홈/캘린더 포커스 시 |
| `fetchMyGoals` | 내 활성 목표 로드 | 홈/캘린더 포커스 시 |
| `fetchTodayCheckins` | 오늘 체크인 로드 | 홈 포커스 시 |
| `fetchMemberProgress` | 팀원별 산 위치 계산 | 홈 포커스 시 |
| `fetchCalendarMarkings` | 월별 날짜 마킹 | 캘린더 월 변경 시 |
| `fetchMonthlyCheckins` | 월별 체크인 전체 로드 | 통계/캘린더 |
| `fetchMemberDateCheckins` | 날짜별 팀원 체크인 상세 | 캘린더 날짜 선택 시 |
| `createCheckin` | 체크인 생성 (done/pass) | 인증 완료 시 |
| `toggleReaction` | 리액션 토글 (낙관적 업데이트) | 리액션 버튼 탭 시 |

### 4.4. 오늘 목표 판정 로직 (`fetchMemberProgress`)

"오늘 할 일" 리스트에 어떤 목표가 포함되는지 결정하는 핵심 알고리즘:

```typescript
for (const ug of userGoals) {
  // 1단계: 기간 유효성 — start_date ~ end_date 범위 내인지
  if (!isGoalActiveOnDate(ug, today)) continue;

  if (ug.frequency === 'daily') {
    // 매일 목표: 무조건 포함
    todayGoalIds.push(ug.goal_id);
  } else if (ug.frequency === 'weekly_count') {
    // 주N회 목표: 이번 주 done 횟수 < target이면 포함
    const weekDone = weekDoneMap.get(ug.goal_id) ?? 0;
    if (weekDone < (ug.target_count ?? 1)) {
      todayGoalIds.push(ug.goal_id);
    }
    // 이미 달성한 주N회 목표는 오늘 리스트에서 제외 → 100% 달성 가능
  }
}
```

**N+1 쿼리 최적화**: 각 주N회 목표마다 `getWeekDoneCount()`를 개별 호출하는 대신, 이번 주(월~일) done 체크인을 **한 번의 배치 쿼리**로 조회 후 `Map<goalId, count>`로 집계.

```typescript
// 한 번의 쿼리로 이번 주 모든 weekly 목표의 done 체크인 조회
const { data: weekCheckins } = await supabase
  .from('checkins')
  .select('goal_id')
  .eq('user_id', uid)
  .eq('status', 'done')
  .gte('date', monday)
  .lte('date', sunday)
  .in('goal_id', weeklyGoalIds);

// Map으로 집계
const weekDoneMap = new Map<string, number>();
(weekCheckins ?? []).forEach(c => {
  weekDoneMap.set(c.goal_id, (weekDoneMap.get(c.goal_id) ?? 0) + 1);
});
```

### 4.5. 산 위치 계산 (패스 제외 공식)

```typescript
function getPosition(done: number, total: number, pass: number = 0): MountainPosition {
  const effective = total - pass;                    // 패스를 분모에서 제외
  if (effective <= 0) return pass > 0 ? 'summit' : 'base';
  const ratio = done / effective;
  if (ratio >= 1.0)  return 'summit';  // 정상
  if (ratio >= 0.34) return 'middle';  // 중간
  return 'base';                        // 입구
}
```

**설계 의도**: 패스한 목표는 "오늘 안 하기로 한 것"이므로 분모에서 빠져야 한다. 이를 통해 패스를 활용하면 나머지 목표만 달성해도 100%(summit)에 도달 가능. 사용자에게 "패스 = 전략적 선택"이라는 인식을 강화.

---

## 5. 데이터 모델

### 5.1. DB 테이블

| 테이블명 | 설명 | 주요 필드 |
|---|---|---|
| `users` | 사용자 정보 | id, email, nickname, profile_image_url |
| `teams` | 팀 정보 | id, name, invite_code, profile_image_url |
| `team_members` | 팀 멤버 매핑 | user_id, team_id, role (leader/member) |
| `goals` | 목표 정의 | id, team_id, owner_id, name |
| `user_goals` | 개인별 목표 설정 | user_id, goal_id, frequency, target_count, start_date, end_date, is_active |
| `checkins` | 인증 기록 | user_id, goal_id, date, photo_url, status(done/pass), memo |
| `checkin_reactions` | 인증 반응 (좋아요) | checkin_id, user_id |
| `monthly_resolutions` | 월별 다짐 | user_id, team_id, year_month, content |
| `monthly_retrospectives` | 월별 회고 | user_id, team_id, year_month, content |

### 5.2. checkin 레코드 해석

| status | photo_url | 의미 |
|---|---|---|
| `done` | 있음 | 사진 인증 완료 |
| `done` | null | 인증 완료 (사진 업로드 실패) |
| `pass` | null | 명시적 패스 (사용자가 패스 버튼 클릭) |
| (레코드 없음) | — | 매일 목표→미달 / 주N회 목표→자동 패스 |

### 5.3. goals ↔ user_goals 분리 구조

```
goals 테이블                    user_goals 테이블
┌─────────────────┐            ┌──────────────────────────┐
│ id              │◀───────────│ goal_id (FK)             │
│ team_id         │            │ user_id                  │
│ owner_id        │            │ frequency (daily/weekly)  │
│ name            │            │ target_count (주N회의 N)  │
│ is_active       │            │ start_date / end_date    │
└─────────────────┘            │ is_active                │
                               └──────────────────────────┘
```

**설계 이유**: `goals`는 팀 단위의 목표 정의 (이름), `user_goals`는 각 사용자가 그 목표를 어떤 빈도·기간으로 설정했는지. 같은 "운동" 목표를 A는 매일, B는 주3회로 설정 가능.

---

## 6. 화면별 구현 상세

### 6.1. 홈 화면 (HomeScreen)

#### 핵심 구현: 시간대별 하늘 배경

```typescript
const hour = new Date().getHours();
if (hour >= 4 && hour < 16)      → 'DAY'     // 주간
else if (hour >= 16 && hour < 19) → 'SUNSET'  // 석양
else                              → 'NIGHT'   // 야간
```

각 시간대에 따라 `SkyBackground` SVG가 다른 그라데이션을 렌더링. 산 색상, 파티클, 달/별 표시 여부가 모두 연동.

#### 핵심 구현: 산 등반 애니메이션 (MountainProgress)

산 위의 캐릭터 위치는 `TRAIL_POINTS` 배열의 인덱스로 결정:

```
position: 'base'   → TRAIL_POINTS[0..2] 중 하나 (무작위)
position: 'middle'  → TRAIL_POINTS[3..5] 중 하나
position: 'summit'  → TRAIL_POINTS[6..7] (정상)
```

`buildSmoothTrailPath()`로 Bezier 곡선 등산로를 SVG로 그리고, 각 멤버의 아바타가 해당 위치에 배치. 현재 사용자는 노란색 하이라이트.

계절 테마(`SEASON_THEMES`)가 월별로 자동 적용:
- 3~5월: 봄 (벚꽃 파티클)
- 6~8월: 여름 (시안 톤)
- 9~11월: 가을 (단풍 파티클)
- 12~2월: 겨울 (눈 파티클)

#### 데이터 로드 흐름

```
useFocusEffect (탭 포커스) → loadData()
  ├── fetchTeams(userId)
  ├── fetchTeamGoals(teamId, userId)
  ├── fetchTodayCheckins(userId)
  ├── fetchMyGoals(userId)
  └── fetchMemberProgress(teamId, userId) → 산 위치 계산
```

Pull-to-refresh도 동일한 `loadData()`를 호출하며, 더블탭으로 스크롤 최상단 이동.

#### TodayGoalList 구현

팀원별 목표 완료 현황을 카드로 표시. 엔트리 순서:
1. **현재 사용자가 항상 첫 번째** (본인의 목표 상태를 최우선으로 확인)
2. 나머지 팀원

목표 칩의 색상 의미:
- 🟢 초록: 인증 완료 (done)
- 🟡 노란: 패스
- ⬜ 비활성: 미완료/비활성

엔트리 등장 시 **순차적 페이드인 애니메이션** (staggered entrance) 적용, 모든 목표 완료 시 **깃발 펄럭임 + 배지 날아오는 애니메이션** → 산 등반 애니메이션 트리거.

### 6.2. 캘린더 화면 (CalendarScreen)

#### 날짜별 달성률 계산

사용자가 선택한 날짜의 인증 현황을 퍼센트로 표시할 때 **패스 제외 공식**:

```typescript
Math.round(
  (doneCount / ((totalGoals - passCount) || 1)) * 100
)
```

- `doneCount`: 해당 날짜에 사진 인증(done) 완료한 목표 수
- `totalGoals`: 해당 날짜에 유효한 전체 목표 수
- `passCount`: 패스한 목표 수 (분모에서 제외)
- `|| 1`: division by zero 방지 (패스 수 = 전체 목표일 때)

**설계 의도**: 오늘 탭의 산 위치 계산(`getPosition`)과 동일한 공식. 앱 전체에서 "패스는 분모에서 빠진다"를 일관되게 적용.

#### 날짜별 상태 마킹

`fetchCalendarMarkings(userId, yearMonth)`가 월별 모든 날짜를 순회하며:

```
all_done    → 모든 목표 인증 완료 (초록 dot)
mixed       → 인증 + 패스 혼합 (노란 dot)
partial     → 일부만 완료
mostly_fail → 대부분 미달 (빨간 dot)
none        → 아무것도 안 함
```

#### 인증 모달

`CheckinModal`이 오늘 날짜 선택 시 활성화. 내부에서:
1. `checkinService.takePhoto()` → 카메라 촬영 (불가 시 갤러리 fallback)
2. `checkinService.uploadCheckinPhoto()` → Supabase Storage 업로드
3. `goalStore.createCheckin()` → DB 기록

### 6.3. 통계 화면 (StatisticsScreen)

#### 아키텍처: 5단계 계산 파이프라인

모든 통계는 `useMemo` 훅으로 파생. 데이터 변경 시 자동 재계산:

```
goals (월/팀 필터링) → checkins (목표 필터링)
  │
  ├── heroData     — 월간 종합: 평균 달성률, 총 인증/패스 수, 고도
  ├── weeklyPace   — 이번 주 페이스: 목표별 현재 진행률
  ├── trendData    — 주차별 트렌드: 주간 달성률 변화 (Area Chart)
  ├── goalDetails  — 목표별 상세: done/pass/fail 카운트, 달성률
  └── weekDetail   — 주차 상세: 선택 주의 날짜별 목표 현황
```

#### heroData 계산 (통합 방식)

```typescript
const heroData = useMemo(() => {
  // 매일/주N회 모두 동일한 주 단위 집계
  goals.forEach(ug => {
    const isDaily = ug.frequency === 'daily';
    const target = isDaily ? 1 : (ug.target_count || 1);
    const goalWeeks = getGoalWeekRanges(yearMonth, startDate, endDate, target);
    goalWeeks.forEach(gw => {
      const activeDays = gw.e - gw.s + 1;
      totalTarget += isDaily ? activeDays : target;  // 핵심: 매일=활성일, 주N회=고정N
      totalDone += 해당 주의 done 체크인 수;
    });
    allGoalRates.push(totalDone / totalTarget * 100);
  });

  avgRate = allGoalRates 평균;
  altitude = avgRate × 100;  // "고도" 표현 (0 ~ 10,000m)
}, [checkins, goals, ...]);
```

#### trendData 계산 (주차별 트렌드)

월을 달력 기준 주차로 나누고, 각 주에 대해 목표별 달성률을 계산하여 평균:

```
예시: 2026년 3월 (3/1이 일요일인 경우)
  — 3/1(일)은 4일 미만 → 2월 마지막주에 편입
  1주차: 3/2(월) ~ 3/8(일)
  2주차: 3/9(월) ~ 3/15(일)
  3주차: 3/16(월) ~ 3/22(일)
  4주차: 3/23(월) ~ 3/29(일)
  — 3/30(월)~3/31(화)는 4일 미만 → 4월 첫째주에 편입
```

**부분주 편입 규칙**: 월초/월말 부분주가 4일 미만(7일의 절반 미만)이면 인접 월에 편입하여 해당 월 통계에서 제외. 4일 이상이면 해당 월의 주차로 포함.

#### goalDetails 계산 (통합 방식)

**매일/주N회 모두 동일한 코드 경로로 처리:**
```
getGoalWeekRanges()로 주차 범위 생성
  → 매일: targetCount=1 전달 (합산 없음), 주간 target = 활성일 수
  → 주N회: targetCount=N 전달 (activeDays < N인 주는 인접 주에 합산)
  → 각 주차마다:
    done: 해당 범위의 done 체크인
    fail: 주가 끝난 후 done < weekTarget이면 미달
  → rate: totalDone / totalTarget × 100
```

### 6.4. 마이페이지 (MyPageScreen)

목표 추가 흐름:
1. 사용자가 목표 이름, 빈도(매일/주N회), N을 입력
2. `addGoal()` 호출 → `goals` 테이블에 목표 생성 → `user_goals`에 개인 설정 기록
3. 동일 이름의 비활성 목표가 있으면 재활성화 (중복 방지)
4. `start_date` = 오늘, `end_date` = 월말 자동 설정

이어하기 흐름:
1. 월초에 `fetchLastMonthGoals()` → 최근 만료된 목표 조회
2. "지난 달 목표 이어하기" → `copyGoalsFromLastMonth()` → 동일 목표를 이번 달로 연장

---

## 7. 핵심 알고리즘 상세

### 7.1. 오늘탭 달성률

```typescript
유효 목표 수 = 전체 오늘 목표 수 - 패스한 목표 수
달성률(%) = 완료(done) 수 / 유효 목표 수 × 100
```

- **패스한 목표는 분모에서 제외** → 100%를 달성하려면 패스 활용
- 매일 목표: 분모에 항상 포함 (패스 불가하므로)
- 주N회 목표: 패스하면 분모에서 빠짐
- 주N회 목표 중 이번 주 이미 target_count 달성한 경우 → 오늘 목표 리스트에서 제외

### 7.2. 주간 집계 로직

```typescript
// 한 주(월~일)에 대해
const doneCount = 해당 주 done 체크인 수;
const explicitPassCount = 해당 주 pass 체크인 수;
const autoPassCount = 활성일 - doneCount - explicitPassCount;

// 주간 달성 여부 (일요일 지난 후에만)
if (doneCount >= targetCount) → 달성 (초과: doneCount - targetCount)
else → 미달 (부족: targetCount - doneCount)
```

### 7.3. 부분주 편입 알고리즘 (통계 전용)

**2단계 처리**:

**1단계 — 달력 기준 편입 (getCalendarWeekRanges)**:
- 월초 부분주(1일~첫 번째 월요일 전날)가 4일 미만이면 이전 달 마지막주에 편입 → 해당 월에서 제외
- 월말 부분주(마지막 월요일~말일)가 4일 미만이면 다음 달 첫째주에 편입 → 해당 월에서 제외
- 4일 이상이면 해당 월의 주차로 포함
- **인접 월 확장**: 이 월이 소유하는 주차는 완전한 Mon-Sun 범위를 반환 (월 경계를 넘을 수 있음)
  - 예: 3월 1일이 수요일이고 이번 주 이 달 해당일 ≥4일 → 범위: 2/27(월)~3/5(일) (2월 날짜 포함)
  - 예: 3월 30일(월)~31일(화)만 남아 <4일 → 이 주는 4월 소유. 4월 통계에서 3/30~4/5 범위 반환
- **dataStart/dataEnd**: 체크인 데이터를 조회해야 하는 전체 날짜 범위 반환 (fetchMonthlyCheckins에서 사용)

```typescript
function getCalendarWeekRanges(yearMonth) {
  // 1. 첫 번째 월요일 찾기
  // 2. 월초 부분주: 4일 이상이면 이전 월 월요일까지 확장하여 포함, 미만이면 제외
  // 3. 완전한 월~일 주 생성
  // 4. 월말 부분주: 4일 이상이면 다음 월 일요일까지 확장하여 포함, 미만이면 제외
  // 5. dataStart/dataEnd 계산: ranges의 최소 시작~최대 끝
}
```

**2단계 — 목표별 합산 (getGoalWeekRanges)**:
목표의 활성 기간(start_date ~ end_date)과 달력 주차를 교차한 뒤, 활성일이 target_count 미만인 주는 인접 주에 합산.
monthEnd/monthStart 클리핑 없이 **목표 날짜(start_date ~ end_date)로만 클리핑**.

```typescript
function getGoalWeekRanges(yearMonth, goalStart, goalEnd, targetCount) {
  const { ranges } = getCalendarWeekRanges(yearMonth);
  // 각 주차의 활성일 = 목표 기간 ∩ 주차 범위 (월 경계 클리핑 없음)
  // 첫 주 활성일 < target → 다음 주에 합산
  // 마지막 주 활성일 < target → 이전 주에 합산
}
```

**합산 규칙의 핵심**: 합산되어도 **target은 그대로** (1주 분량). 활성일만 넓어져 더 여유롭게 목표 달성 가능. "짧은 주 = 불이익"을 제거.

### 7.4. 월간 달성률 (통합 공식)

```typescript
// 매일/주N회 모두 동일한 공식
goals.forEach(ug => {
  const isDaily = ug.frequency === 'daily';
  const weekTarget = isDaily ? activeDays : targetCount;
  goalRate = totalDone / Σ(weekTarget) × 100
});
avgRate = 모든 goalRate의 산술 평균
```

---

## 8. 사진 인증 서비스 구현

### 8.1. 카메라 → 업로드 파이프라인

```
takePhoto()
  ├── [시도] expo-image-picker launchCameraAsync (1:1 crop, quality 0.7)
  ├── [실패] 시뮬레이터 등 카메라 없음 → launchImageLibraryAsync fallback
  └── 반환: local URI

uploadCheckinPhoto(userId, imageUri)
  ├── fetch(imageUri) → response.arrayBuffer()  // RN의 local file을 읽는 트릭
  ├── supabase.storage.upload(fileName, arrayBuffer, { contentType: 'image/jpeg' })
  └── supabase.storage.getPublicUrl(fileName) → public URL 반환
```

**기술적 포인트**: React Native에서 로컬 파일을 Supabase Storage에 업로드하려면 `FormData`가 아닌 `ArrayBuffer`를 사용해야 한다. `fetch(localUri)`로 파일을 읽고 `.arrayBuffer()`로 변환하는 방식이 외부 라이브러리 없이 가장 깔끔.

### 8.2. 패스 시스템

- 매일 목표에서는 패스 버튼 자체가 UI에 노출되지 않음

---

## 9. 리액션 시스템 (낙관적 업데이트)

```typescript
toggleReaction: async (checkinId, user) => {
  // 1. 현재 상태에서 리액션 여부 확인
  const isReacted = reactions.find(r => r.user_id === userId);

  // 2. UI 즉시 업데이트 (낙관적)
  if (isReacted) {
    nextReactions = reactions.filter(r => r.user_id !== userId);  // 제거
  } else {
    nextReactions = [...reactions, { id: 'temp-' + Date.now(), ... }];  // 추가
  }
  set({ memberDateCheckins: nextMemberCheckins });

  // 3. DB 반영 (비동기)
  try {
    if (isReacted) await supabase.delete();
    else await supabase.insert();
  } catch (e) {
    // 실패 시 롤백 가능 (현재는 로그만)
  }
}
```

**설계 의도**: 리액션은 사용자 인터랙션의 즉각성이 중요. DB 응답을 기다리면 0.5~1초 딜레이가 발생하여 UX 저하. `temp-ID`로 즉시 UI 반영 후 DB 동기화.

---

## 10. Supabase 연동 설계

### 10.1. React Native 세션 관리

```typescript
export const supabase = createClient(URL, KEY, {
  auth: {
    storage: AsyncStorage,        // 브라우저 localStorage 대신 RN AsyncStorage 사용
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // RN에는 URL 기반 세션 감지 불필요
  },
});
```

`react-native-url-polyfill/auto`를 최상단에서 import하여 URL 파싱 호환성 확보 (Supabase SDK 내부에서 `URL` 객체 사용).

### 10.2. RLS 우회 — PostgreSQL RPC 활용

**문제**: Supabase RLS가 활성화된 상태에서, INSERT 직후 해당 데이터를 SELECT하면 RLS 정책이 아직 적용되지 않아 데이터가 반환되지 않는 경우 발생.

**해결**: `SECURITY DEFINER` RPC로 INSERT + SELECT를 하나의 트랜잭션에서 수행:

```sql
CREATE OR REPLACE FUNCTION create_team_with_member(...)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- RLS 우회
AS $$
BEGIN
  INSERT INTO teams ...;
  INSERT INTO team_members ...;
  RETURN (SELECT row_to_json(t) FROM teams t WHERE ...);
END;
$$;
```

적용 사례:
- `create_team_with_member`: 팀 생성 + 멤버 추가 원자적 실행
- `create_user_profile`: 사용자 프로필 조회/생성
- `delete_user_account`: 계정 삭제 시 연관 데이터 일괄 정리

### 10.3. 알림 시스템

`expo-notifications`를 사용한 로컬 푸시 알림:

```typescript
// 요일별 다른 메시지
const MESSAGES = {
  0: '일요일도 산을 오르는 사람이 있다',
  1: '월요일, 새로운 한 주의 시작',
  ...
};

// 매일 특정 시간에 알림 스케줄
await Notifications.scheduleNotificationAsync({
  content: { title, body },
  trigger: { weekday, hour, minute, repeats: true },
});
```

---

## 11. UI/UX 설계 원칙

### 11.1. 색상 시스템

| 역할 | 색상 | 용도 |
|---|---|---|
| Brand | `#FF6B3D` | 주요 액센트, 버튼, 진행률 바 |
| Background | `#FFFAF7` | 전체 배경 (따뜻한 화이트) |
| Surface | `#FFFFFF` | 카드, 모달 |
| Text | `#1A1A1A` | 본문 |
| Text Secondary | `rgba(26,26,26,0.50)` | 보조 텍스트 |
| Success | `#4ADE80` | 완료 표시 |
| Warning | `#FBBF24` | 패스/혼합 표시 |
| Error | `#EF4444` | 미달/실패 표시 |

### 11.2. 통계 UI 시각 표현

| 요소 | 디자인 | 의미 |
|---|---|---|
| 🔵 합산 배지 | 파란색 소형 배지 "합산" | 부분주가 인접 주에 합산됨 |
| 🟢 달성 배지 | 초록색 "달성" | 주간 목표 달성 |
| 🔴 미달 배지 | 빨간색 "미달" | 주간 목표 미달 |
| Area Chart | 주차별 달성률 꺾은선 + 면적 | 시각적 트렌드 파악 |
| Progress Bar | 가로 바 (브랜드 오렌지) | 목표별/주차별 진행률 |

---

## 12. 상태 전이 다이어그램

### 매일 목표 — 하루의 상태
```
[시작] ──사진인증──→ [완료 ✅]
  │
  └──자정 넘김──→ [미달 ❌]
```

### 주N회 목표 — 하루의 상태
```
[시작] ──사진인증──→ [완료 ✅]
  │
  ├──패스 클릭──→ [패스 ⏭] ──취소──→ [시작] (자정 전 가능)
  │
  └──자정 넘김──→ [자동 패스 ⏭] (DB 레코드 없음, 집계 시 패스 처리)
```

### 주N회 목표 — 주간 상태
```
한 주가 끝남 (일요일 지남)
  │
  ├── done_count >= target_count → [달성 ✅] (초과량: done - target)
  │
  └── done_count < target_count → [미달 ❌] (부족량: target - done)
```

---

## 13. 트러블슈팅 및 기술적 도전

### 13.1. 크로스-스토어 데이터 오염

**현상**: 사용자 A 로그아웃 → 사용자 B 로그인 시, A의 목표/체크인 데이터가 순간적으로 표시.

**원인**: Zustand 스토어는 앱 전체 수명주기 동안 유지되므로, 로그인/로그아웃 시 수동으로 리셋하지 않으면 이전 데이터가 남음.

**해결**: `authStore`의 `signIn`, `signUp`, `signOut`, `deleteAccount` 모든 메서드에서 다른 스토어의 `reset()`을 명시적으로 호출.

### 13.2. Supabase RLS INSERT→SELECT 문제

**현상**: 팀 생성 직후 팀 목록을 다시 조회하면 방금 만든 팀이 안 보임.

**원인**: RLS 정책이 `team_members`에 멤버십이 있는 팀만 조회 가능하도록 설정. INSERT 순서(teams → team_members)에 따라 teams INSERT 직후에는 membership이 아직 없어 SELECT에서 제외.

**해결**: `create_team_with_member` RPC로 INSERT + SELECT를 `SECURITY DEFINER` 트랜잭션 내에서 원자적 실행.

### 13.3. React Native Supabase 세션 관리

**현상**: 앱 재시작 시 로그인이 풀림.

**원인**: Supabase 기본 세션 관리가 브라우저의 `localStorage`를 사용하는데, React Native에는 없음.

**해결**: `AsyncStorage`를 `storage`로 지정하고, `detectSessionInUrl: false` 설정. `react-native-url-polyfill` 추가.


### 13.4. N+1 쿼리 문제

**현상**: 팀원 5명 × 주N회 목표 3개 = 15회 개별 DB 쿼리.

**원인**: `fetchMemberProgress`에서 각 멤버의 각 주N회 목표마다 `getWeekDoneCount()`를 개별 호출.

**해결**: 멤버당 이번 주 done 체크인을 한 번의 배치 쿼리로 조회 후 `Map<goalId, count>`로 집계.

### 13.6. 연습 주(Practice Week) 제거

**현상**: 목표 생성 주에 "연습 주" 로직이 작동하여 목표를 이미 달성해도 계속 오늘 할 일에 표시.

**원인**: `isPracticeWeek`가 true이면 `weekDone < target` 체크를 건너뛰고 무조건 목표 포함.

**해결**: `isPracticeWeek` 로직 완전 제거. 모든 주에서 동일하게 `weekDone < target_count`로 판별. 첫 주도 동일 규칙 적용.

---

## 14. 향후 개선 계획

- **자정 자동 처리 (Cron Job)**: 현재 클라이언트 집계 시점에 패스/미달 판정. 서버사이드 스케줄러로 자정에 자동 패스 레코드 생성 검토
- **알림 고도화**: 인증 마감 임박, 팀원 인증, 리액션 수신 시 원격 푸시
- **연속 달성일 (Streak)**: 연속으로 인증한 일수 표시
- **랭킹 시스템**: 주간/월간 달성률 랭킹
- **오프라인 모드**: 로컬 캐싱 처리
- **리액션 롤백**: 낙관적 업데이트 실패 시 이전 상태로 복구

---

*본 문서는 코드베이스의 실제 구현을 기반으로 작성된 개발 설계서입니다. 모든 기능 구현 및 확장 시 이 문서를 참조하세요.*
