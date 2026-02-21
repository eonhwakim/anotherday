# Zustand으로 팀 기반 목표 추적 앱의 복잡한 상태 관리하기

> React Native + Supabase로 만든 팀 목표 추적 앱 **Another Day**에서 Zustand을 활용해 인증, 목표, 팀이라는 세 개의 도메인 상태를 어떻게 설계하고, 낙관적 업데이트·캘린더 마킹 알고리즘·크로스 스토어 통신 같은 실전 문제를 해결했는지 공유합니다.

---

## 목차

1. [왜 Zustand인가?](#1-왜-zustand인가)
2. [멀티 스토어 아키텍처 설계](#2-멀티-스토어-아키텍처-설계)
3. [도메인 타입과 스토어 인터페이스](#3-도메인-타입과-스토어-인터페이스)
4. [캘린더 마킹 알고리즘 — 복잡한 파생 상태](#4-캘린더-마킹-알고리즘--복잡한-파생-상태)
5. [낙관적 업데이트 — 리액션 토글](#5-낙관적-업데이트--리액션-토글)
6. [크로스 스토어 통신 — 로그아웃 시 전체 초기화](#6-크로스-스토어-통신--로그아웃-시-전체-초기화)
7. [컴포넌트에서의 선택적 구독](#7-컴포넌트에서의-선택적-구독)
8. [주간 목표와 연습 주 판별 로직](#8-주간-목표와-연습-주-판별-로직)
9. [산 진행률 시각화 데이터 매핑](#9-산-진행률-시각화-데이터-매핑)
10. [마치며 — 배운 것과 개선 포인트](#10-마치며--배운-것과-개선-포인트)

---

## 1. 왜 Zustand인가?

React Native 프로젝트에서 상태 관리 라이브러리를 선택할 때, 크게 세 가지 선택지가 있었다.

| | Redux Toolkit | Zustand | Jotai/Recoil |
|---|---|---|---|
| **보일러플레이트** | 많음 (slice, action, reducer) | 극소 (함수 하나) | 중간 (atom 정의) |
| **비동기 처리** | thunk/saga 필요 | 내장 (async 함수 직접 사용) | suspense 기반 |
| **타입스크립트** | 별도 설정 | 인터페이스 하나로 완성 | 양호 |
| **번들 크기** | ~12KB | ~1KB | ~3KB |
| **React 외부 접근** | `store.getState()` | `useStore.getState()` | 불가 |

Another Day는 인증, 목표, 팀이라는 **세 개의 독립된 도메인**이 있고, 각 도메인 안에서 **Supabase 비동기 호출**이 빈번하다. Zustand은 async 함수를 별도 미들웨어 없이 바로 사용할 수 있어서, 가장 적은 코드로 가장 직관적인 구조를 만들 수 있었다.

특히 **React 컴포넌트 밖에서 스토어에 접근**할 수 있다는 점이 결정적이었다. 로그아웃 시 `authStore`에서 `goalStore.getState().reset()`을 호출하는 식의 **크로스 스토어 통신**이 자연스럽게 가능하기 때문이다.

---

## 2. 멀티 스토어 아키텍처 설계

```
┌──────────────────────────────────────────────────────┐
│                    RootNavigator                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ authStore│  │  goalStore   │  │  teamStore   │   │
│  │          │  │              │  │              │   │
│  │ • user   │  │ • teamGoals  │  │ • teams      │   │
│  │ • session│  │ • myGoals    │  │ • currentTeam│   │
│  │ • signIn │  │ • checkins   │  │ • members    │   │
│  │ • signOut│──│ • markings   │──│ • fetchTeams │   │
│  │ • delete │  │ • reactions  │  │ • createTeam │   │
│  └──────────┘  └──────────────┘  └──────────────┘   │
│        │              │                │              │
│        └──────── reset() ─────────────┘              │
└──────────────────────────────────────────────────────┘
```

**스토어를 분리한 기준**은 간단했다.

- **authStore**: 로그인/로그아웃/세션 복원 등 **인증 상태**. 앱 전체 생명주기를 관장한다.
- **teamStore**: 팀 목록, 현재 선택 팀, 멤버 관리. **어떤 팀의 데이터를 볼 것인가**를 결정한다.
- **goalStore**: 목표, 체크인, 캘린더 마킹, 리액션 등 **핵심 비즈니스 로직**. 가장 복잡하고 상태가 많다.

이렇게 분리하면 각 스토어가 자신의 책임에만 집중할 수 있고, 특정 도메인의 변경이 다른 도메인에 불필요한 리렌더를 일으키지 않는다.

---

## 3. 도메인 타입과 스토어 인터페이스

Zustand 스토어를 설계할 때, **TypeScript 인터페이스를 먼저 정의**하고 구현하는 방식을 택했다. 이렇게 하면 스토어의 상태와 액션이 한눈에 보이고, 컴포넌트에서 자동완성도 완벽하게 동작한다.

### 도메인 타입 정의

```typescript
// types/domain.ts

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
    dayStatus?: 'all_done' | 'mixed' | 'mostly_fail' | 'partial' | 'none';
    doneCount?: number;
    passCount?: number;
    totalGoals?: number;
  };
}
```

`MountainPosition`과 `CalendarDayMarking`처럼 **UI와 비즈니스 로직의 경계에 있는 타입**을 도메인 레벨에서 정의해두면, 스토어와 컴포넌트가 같은 언어로 소통할 수 있다.

### goalStore 인터페이스

```typescript
// stores/goalStore.ts

interface GoalState {
  // ── 상태 ──
  teamGoals: Goal[];
  myGoals: UserGoal[];
  todayCheckins: Checkin[];
  memberProgress: MemberProgress[];
  calendarMarkings: CalendarDayMarking;
  selectedDateCheckins: CheckinWithGoal[];
  monthlyCheckins: Checkin[];
  memberDateCheckins: MemberCheckinSummary[];
  isLoading: boolean;

  // ── 액션 ──
  fetchTeamGoals: (teamId: string, userId?: string) => Promise<void>;
  fetchMyGoals: (userId: string) => Promise<void>;
  fetchTodayCheckins: (userId: string) => Promise<void>;
  createCheckin: (params: { ... }) => Promise<boolean>;
  toggleReaction: (checkinId: string, user: { ... }) => Promise<void>;
  fetchCalendarMarkings: (userId: string, yearMonth: string) => Promise<void>;
  fetchMemberProgress: (teamId?: string, userId?: string) => Promise<void>;
  reset: () => void;
}
```

**상태 8개, 액션 11개**로 이루어진 goalStore는 앱에서 가장 복잡한 스토어다. 하지만 인터페이스를 먼저 정의함으로써, 각 액션이 어떤 상태를 변경하는지 명확하게 파악할 수 있다.

핵심 설계 원칙:
- **fetch 액션은 set()으로 끝난다**: 서버에서 데이터를 가져와 상태에 넣는 것이 전부다.
- **create/toggle 액션은 boolean을 반환한다**: 성공/실패를 호출자가 판단할 수 있게 한다.
- **reset()은 모든 상태를 초기값으로 되돌린다**: 로그아웃 시 이전 사용자의 데이터를 완전히 제거한다.

---

## 4. 캘린더 마킹 알고리즘 — 복잡한 파생 상태

캘린더 화면에서 각 날짜에 상태 이모지(😎/💥/😬/💢)를 보여주려면, **날짜별로 "활성 목표 수 vs 완료 수 vs 패스 수"를 계산**해야 한다. 이 로직이 예상보다 복잡했던 이유는 세 가지다:

1. **목표에 시작일(`start_date`)이 있다**: 2월 10일에 추가한 목표는 2월 9일 캘린더에 나타나면 안 된다.
2. **주 N회 목표(`weekly_count`)가 있다**: 매일이 아닌 주 단위로 판별해야 한다.
3. **패스 시스템이 있다**: 패스는 "했지만 안 한 것"이므로, 달성률 계산에서 분모를 줄여야 한다.

```typescript
// stores/goalStore.ts — fetchCalendarMarkings

fetchCalendarMarkings: async (userId, yearMonth) => {
  const startDate = `${yearMonth}-01`;
  const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

  // 1. 해당 월의 모든 체크인을 한 번에 가져온다 (N+1 방지)
  const { data: checkins } = await supabase
    .from('checkins')
    .select('date, status, goal_id, memo')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  // 2. 활성 목표 목록도 한 번에 가져온다
  const { data: userGoals } = await supabase
    .from('user_goals')
    .select('goal_id, frequency, target_count, start_date')
    .eq('user_id', userId)
    .eq('is_active', true);

  const markings: CalendarDayMarking = {};
  const today = dayjs().format('YYYY-MM-DD');
  const daysInMonth = dayjs(startDate).daysInMonth();

  // 3. 날짜별로 순회하며 상태를 계산한다
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
    if (dateStr > today) break; // 미래 날짜는 무시

    // 해당 날짜에 유효한 목표 필터링 (start_date 이후만)
    const activeGoals = (userGoals ?? []).filter((ug) => {
      if (!isGoalActiveOnDate(ug, dateStr)) return false;
      return true;
    });

    const totalGoals = activeGoals.length;
    if (totalGoals === 0) continue;

    // 해당 날짜의 체크인 필터링
    const dayCheckins = (checkins ?? []).filter((c) => c.date === dateStr);
    const doneCount = dayCheckins.filter(
      (c) => c.status === 'done' && !(c.memo?.startsWith('[패스]'))
    ).length;
    const passCount = dayCheckins.filter(
      (c) => c.status === 'pass' || c.memo?.startsWith('[패스]')
    ).length;

    // 4. 상태 판별 로직
    let dayStatus: 'all_done' | 'mixed' | 'mostly_fail' | 'partial' | 'none';
    if (doneCount + passCount >= totalGoals && doneCount > 0) {
      dayStatus = passCount > 0 ? 'mixed' : 'all_done';
    } else if (doneCount > 0 || passCount > 0) {
      dayStatus = 'partial';
    } else {
      dayStatus = 'mostly_fail';
    }

    markings[dateStr] = {
      marked: true,
      dotColor: dayStatus === 'all_done' ? '#4ADE80'
              : dayStatus === 'mixed' ? '#FBBF24'
              : '#EF4444',
      checkinCount: doneCount + passCount,
      dayStatus,
      doneCount,
      passCount,
      totalGoals,
    };
  }

  set({ calendarMarkings: markings });
},
```

### 핵심 포인트: N+1 쿼리 방지

처음에는 날짜별로 Supabase를 호출했다가 한 달 30일 × 2쿼리 = **60번의 API 호출**이 발생하는 문제가 있었다. 이를 **월 단위로 체크인과 목표를 한 번씩만 가져온 뒤 JavaScript에서 필터링**하는 방식으로 개선하여 **쿼리 2번**으로 줄였다.

### 상태 판별 매트릭스

| done + pass ≥ total | done > 0 | pass > 0 | 결과 |
|---|---|---|---|
| ✅ | ✅ | ❌ | `all_done` (😎) |
| ✅ | ✅ | ✅ | `mixed` (💥) |
| ❌ | ✅ or ❌ | ✅ or ❌ | `partial` (💢) |
| ❌ | ❌ | ❌ | `mostly_fail` (😬) |

이 마킹 데이터는 CalendarScreen에서 `useMemo`로 react-native-calendars의 `markedDates` 형식으로 변환된다:

```typescript
// screens/calendar/CalendarScreen.tsx

const calendarMarkedDates = React.useMemo(() => {
  const marks: Record<string, any> = {};
  Object.entries(calendarMarkings).forEach(([date, m]) => {
    marks[date] = {
      marked: true,
      dotColor: m.dotColor,
      selected: date === selectedDate,
      selectedColor: 'rgba(255,255,255,0.12)',
    };
  });
  if (selectedDate && !marks[selectedDate]) {
    marks[selectedDate] = {
      selected: true,
      selectedColor: 'rgba(255,255,255,0.12)',
    };
  }
  return marks;
}, [calendarMarkings, selectedDate]);
```

**스토어에는 도메인 데이터**를, **컴포넌트에서는 UI 라이브러리에 맞는 형식**으로 변환하는 이 패턴 덕분에, 캘린더 라이브러리를 교체하더라도 스토어 코드를 수정할 필요가 없다.

---

## 5. 낙관적 업데이트 — 리액션 토글

팀원의 체크인 사진에 "봤어요" 리액션을 남기는 기능에서, 서버 응답을 기다리면 **탭 후 0.5~1초 뒤에야 UI가 바뀌는** 답답한 경험이 된다. 이를 **낙관적 업데이트(Optimistic Update)** 패턴으로 해결했다.

```typescript
// stores/goalStore.ts — toggleReaction

toggleReaction: async (checkinId, user) => {
  const userId = user.id;
  
  // ① 현재 상태에서 리액션 여부 확인
  const currentMemberCheckins = get().memberDateCheckins;
  let isReacted = false;

  // ② 새로운 상태를 미리 계산 (immutable하게)
  const nextMemberCheckins = currentMemberCheckins.map(summary => ({
    ...summary,
    checkins: summary.checkins.map(c => {
      if (c.id !== checkinId) return c;
      
      const reactions = c.reactions || [];
      const existing = reactions.find(r => r.user_id === userId);
      isReacted = !!existing;
      
      let newReactions;
      if (existing) {
        // 이미 있으면 제거
        newReactions = reactions.filter(r => r.user_id !== userId);
      } else {
        // 없으면 추가 (임시 ID 부여)
        newReactions = [
          ...reactions,
          {
            id: 'temp-' + Date.now(),
            checkin_id: checkinId,
            user_id: userId,
            created_at: new Date().toISOString(),
            user: {
              id: user.id,
              nickname: user.nickname,
              profile_image_url: user.profile_image_url,
            },
          },
        ];
      }
      return { ...c, reactions: newReactions };
    }),
  }));

  // ③ UI를 즉시 업데이트 (서버 응답 전)
  set({ memberDateCheckins: nextMemberCheckins });

  // ④ 서버에 실제 반영 (백그라운드)
  try {
    if (isReacted) {
      await supabase
        .from('checkin_reactions')
        .delete()
        .match({ checkin_id: checkinId, user_id: userId });
    } else {
      await supabase.from('checkin_reactions').insert({
        checkin_id: checkinId,
        user_id: userId,
      });
    }
  } catch (e) {
    console.error('toggleReaction error:', e);
    // 에러 시 이전 상태로 롤백하거나, 서버에서 다시 fetch
  }
},
```

### 낙관적 업데이트의 핵심 흐름

```
사용자 탭 → ① 현재 상태 읽기 → ② 새 상태 계산 → ③ set() → UI 즉시 반영
                                                        ↓
                                               ④ 서버 요청 (백그라운드)
                                                        ↓
                                               성공: 아무것도 안 함
                                               실패: 롤백 or 재동기화
```

컴포넌트에서는 `toggleReaction`을 호출하되, **await하지 않는다**:

```typescript
// screens/calendar/CalendarScreen.tsx

const handleReactionPress = async () => {
  if (!photoModal || !user) return;
  
  // await를 붙이지 않아 즉시 반환 → UI 블로킹 없음
  toggleReaction(photoModal.checkinId, {
    id: user.id,
    nickname: user.nickname,
    profile_image_url: user.profile_image_url,
  });
};
```

이 패턴의 핵심은 **`set()`이 동기적으로 실행된다**는 Zustand의 특성을 활용한 것이다. `set()`을 호출하는 순간 모든 구독 컴포넌트가 새 상태를 받으므로, 서버 응답을 기다릴 필요 없이 UI가 즉시 반영된다.

### 임시 ID 전략

리액션 추가 시 `'temp-' + Date.now()`로 임시 ID를 부여한다. 서버가 실제 ID를 반환하기 전에도 리스트 렌더링이 정상 동작하고, React의 `key` prop도 충돌하지 않는다. 다음에 전체 데이터를 fetch하면 서버의 실제 ID로 자연스럽게 교체된다.

---

## 6. 크로스 스토어 통신 — 로그아웃 시 전체 초기화

멀티 스토어 아키텍처에서 가장 까다로운 문제는 **스토어 간 통신**이다. 특히 로그아웃 시 모든 스토어의 데이터를 초기화해야 하는데, 이 때 Zustand의 **`getState()` 패턴**이 빛을 발한다.

```typescript
// stores/authStore.ts

import { useGoalStore } from './goalStore';
import { useTeamStore } from './teamStore';

export const useAuthStore = create<AuthState>((set) => ({
  // ...

  signIn: async (email, password) => {
    try {
      set({ isLoading: true, error: null });

      // ✅ 로그인 전, 이전 사용자 데이터 초기화
      useGoalStore.getState().reset();
      useTeamStore.getState().reset();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      // ...
    }
  },

  signOut: async () => {
    // ✅ 로그아웃 시 모든 스토어 초기화
    useGoalStore.getState().reset();
    useTeamStore.getState().reset();
    await supabase.auth.signOut();
    set({ user: null, error: null });
  },

  deleteAccount: async () => {
    // ...
    // ✅ 계정 삭제 후에도 동일하게 초기화
    useGoalStore.getState().reset();
    useTeamStore.getState().reset();
    await supabase.auth.signOut();
    set({ user: null, error: null, isLoading: false });
    return true;
  },
}));
```

### 왜 import해서 직접 호출하는가?

Redux라면 하나의 root reducer에서 `RESET` 액션을 처리하겠지만, Zustand의 독립 스토어에서는 **다른 스토어의 훅을 직접 import해서 `getState()`로 접근**한다. 이것이 가능한 이유는 Zustand의 `create()`가 반환하는 것이 단순한 React hook이 아닌, **`getState()`, `setState()`, `subscribe()`를 가진 store 객체**이기 때문이다.

```
useGoalStore          ← React hook (컴포넌트 안에서만 사용)
useGoalStore.getState ← vanilla store 접근 (어디서든 사용 가능)
useGoalStore.setState ← 외부에서 상태 변경 가능
```

각 스토어의 `reset()`은 깔끔하게 초기값으로 되돌린다:

```typescript
// stores/goalStore.ts
reset: () => {
  set({
    teamGoals: [],
    myGoals: [],
    todayCheckins: [],
    memberProgress: [],
    calendarMarkings: {},
    selectedDateCheckins: [],
    monthlyCheckins: [],
    memberDateCheckins: [],
    isLoading: false,
  });
},

// stores/teamStore.ts
reset: () => {
  set({ currentTeam: null, members: [], teams: [], isLoading: false });
},
```

### 초기화 타이밍이 중요한 이유

A 사용자가 로그아웃하고 B 사용자가 로그인하면, **goalStore에 A의 체크인 데이터가 남아 있으면** B의 화면에 A의 데이터가 잠깐 보인다. 이를 방지하기 위해 `signIn` 액션의 **가장 첫 단계에서** reset을 호출한다.

---

## 7. 컴포넌트에서의 선택적 구독

Zustand의 가장 큰 성능 이점 중 하나는 **선택적 구독(Selective Subscription)**이다. 컴포넌트가 스토어의 특정 슬라이스만 구독하면, 그 슬라이스가 변경될 때만 리렌더가 발생한다.

### HomeScreen — 여러 스토어에서 필요한 것만 꺼내기

```typescript
// screens/home/HomeScreen.tsx

export default function HomeScreen() {
  // authStore에서 user만 구독
  const user = useAuthStore((s) => s.user);
  
  // teamStore에서 필요한 것만 구독
  const { currentTeam, fetchTeams, fetchMembers } = useTeamStore();
  
  // goalStore에서 필요한 것만 구독
  const {
    myGoals, teamGoals, todayCheckins, memberProgress,
    fetchTeamGoals, fetchTodayCheckins, fetchMemberProgress, fetchMyGoals,
  } = useGoalStore();

  // ...
}
```

`useAuthStore((s) => s.user)`는 **user 객체의 참조가 바뀔 때만** HomeScreen을 리렌더한다. authStore의 `isLoading`이나 `error`가 변경되어도 HomeScreen은 영향을 받지 않는다.

### 데이터 로딩 — useFocusEffect + Promise.all

```typescript
const loadData = useCallback(async () => {
  if (!user) return;
  await fetchTeams(user.id);
  const team = useTeamStore.getState().currentTeam;
  const teamId = team?.id;
  
  // 독립적인 fetch를 병렬로 실행
  const promises = [
    fetchTeamGoals(teamId ?? '', user.id),
    fetchTodayCheckins(user.id),
    fetchMyGoals(user.id),
    fetchMemberProgress(teamId, user.id),
  ];
  if (teamId) promises.push(fetchMembers(teamId));
  await Promise.all(promises);
}, [user]);

useFocusEffect(
  useCallback(() => {
    loadData();
  }, [loadData]),
);
```

여기서 주목할 점은 `fetchTeams`를 먼저 await한 뒤, `useTeamStore.getState().currentTeam`으로 최신 팀 정보를 가져온다는 것이다. React 상태는 비동기적으로 업데이트되지만, **Zustand의 `getState()`는 항상 최신 값을 동기적으로 반환**하기 때문에 가능한 패턴이다.

---

## 8. 주간 목표와 연습 주 판별 로직

Another Day에는 "매일" 목표 외에 "주 N회" 목표가 있다. 예를 들어 "운동 주 3회"라면, 월~일 중 3번만 체크인하면 된다. 이를 위한 헬퍼 함수들:

```typescript
// stores/goalStore.ts — Helpers

/** 주의 시작 월요일 (dayjs 기준) */
function getWeekMonday(dateStr: string): string {
  const d = dayjs(dateStr);
  const day = d.day(); // 0=일, 1=월, ...
  const diff = day === 0 ? 6 : day - 1;
  return d.subtract(diff, 'day').format('YYYY-MM-DD');
}

/** 주 N회 목표가 연습 주인지 (생성 주와 같은 주) */
function isPracticeWeek(startDate: string, dateStr: string): boolean {
  if (!startDate) return false;
  return getWeekMonday(startDate) === getWeekMonday(dateStr);
}

/** 이번 주 완료 횟수 조회 */
async function getWeekDoneCount(
  userId: string,
  goalId: string,
  dateStr: string,
): Promise<number> {
  const monday = getWeekMonday(dateStr);
  const sunday = dayjs(monday).add(6, 'day').format('YYYY-MM-DD');

  const { count } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('status', 'done')
    .gte('date', monday)
    .lte('date', sunday);

  return count ?? 0;
}
```

### "연습 주" 개념

목표를 수요일에 추가했다면, 그 주의 월~화에는 목표가 없었으므로 **주 3회를 채우기 어렵다**. 이런 불공정을 방지하기 위해 목표 생성 주를 "연습 주"로 표시하고, **목표에는 포함하되 미달성 페널티를 주지 않는다**.

```typescript
// fetchMemberProgress 내부

for (const ug of userGoals ?? []) {
  if (!isGoalActiveOnDate(ug, today)) continue;

  if (ug.frequency === 'daily') {
    todayGoalIds.push(ug.goal_id);
  } else if (ug.frequency === 'weekly_count') {
    const practice = isPracticeWeek(ug.start_date, today);
    if (practice) {
      todayGoalIds.push(ug.goal_id); // 연습 주: 목표에 포함
    } else {
      const weekDone = await getWeekDoneCount(uid, ug.goal_id, today);
      if (weekDone < (ug.target_count ?? 1)) {
        todayGoalIds.push(ug.goal_id); // 아직 미달성이면 포함
      }
      // 이미 이번 주 목표 달성했으면 오늘 목표에서 제외
    }
  }
}
```

이 로직 덕분에 주 3회 운동 목표가 있고 이미 3번 체크인했다면, 홈 화면의 "오늘의 미션"에서 운동이 사라진다.

---

## 9. 산 진행률 시각화 데이터 매핑

Another Day의 홈 화면에는 산 그래픽이 있고, 팀원들이 오늘의 목표 달성률에 따라 **입구(base) → 중간(middle) → 정상(summit)**에 위치한다.

```typescript
// constants/defaults.ts
export const MOUNTAIN_THRESHOLDS = {
  MIDDLE: 0.34,   // 34% 이상이면 중간
  SUMMIT: 1.0,    // 100%면 정상
} as const;

// stores/goalStore.ts
function getPosition(completed: number, total: number): MountainPosition {
  if (total === 0) return 'base';
  const ratio = completed / total;
  if (ratio >= MOUNTAIN_THRESHOLDS.SUMMIT) return 'summit';
  if (ratio >= MOUNTAIN_THRESHOLDS.MIDDLE) return 'middle';
  return 'base';
}
```

패스를 고려한 실제 매핑:

```typescript
const doneCount = (todayCheckins ?? []).filter(
  (c) => c.status === 'done' && !(c.memo?.startsWith('[패스]'))
).length;
const passCount = (todayCheckins ?? []).filter(
  (c) => c.status === 'pass' || c.memo?.startsWith('[패스]')
).length;

// 패스한 목표는 분모에서 제외
const effectiveTotal = total - passCount;

progress.push({
  userId: uid,
  nickname: user?.nickname ?? '알 수 없음',
  profileImageUrl: user?.profile_image_url ?? null,
  totalGoals: effectiveTotal > 0 ? effectiveTotal : total,
  completedGoals: doneCount,
  position: getPosition(doneCount, effectiveTotal > 0 ? effectiveTotal : total),
});
```

**패스한 목표는 분모에서 제외**하여, 5개 목표 중 1개 패스 + 4개 완료면 `4/4 = 100%`로 정상에 도달하게 된다. 이렇게 스토어 레벨에서 계산된 `MemberProgress` 배열이 `MountainProgress` 컴포넌트로 전달되어 시각화된다.

---

## 10. 마치며 — 배운 것과 개선 포인트

### 배운 것

1. **Zustand의 단순함이 진짜 힘이다**: `create()` 하나로 상태와 액션을 정의하고, async 함수를 바로 사용할 수 있다. 별도의 미들웨어나 보일러플레이트가 필요 없어서, 비즈니스 로직에 집중할 수 있었다.

2. **멀티 스토어는 관심사 분리의 자연스러운 결과**: auth/goal/team으로 나누니 각 스토어가 300줄 이내로 관리 가능했고, 어떤 상태가 어디에 있는지 직관적으로 파악할 수 있었다.

3. **`getState()`는 컴포넌트 밖에서의 강력한 무기**: 크로스 스토어 통신, async 함수 내에서의 최신 상태 접근 등 React의 비동기 상태 업데이트 제약을 우회할 수 있었다.

4. **낙관적 업데이트는 set()의 동기적 특성 덕분에 자연스럽다**: 서버 호출 전에 `set()`으로 UI를 미리 업데이트하는 패턴이 Zustand에서는 매우 간결하게 구현된다.

### 개선하고 싶은 점

1. **에러 롤백 로직 보강**: 현재 낙관적 업데이트의 실패 시 롤백이 불완전하다. `previousState`를 저장해두고 에러 시 복원하는 패턴을 적용하면 더 견고해질 것이다.

2. **캐싱 전략**: 같은 월의 캘린더 마킹을 탭을 전환할 때마다 다시 fetch하고 있다. Zustand에 간단한 캐시 레이어(`lastFetchedMonth` 같은 상태)를 추가하면 불필요한 API 호출을 줄일 수 있다.

3. **goalStore 분리 검토**: 현재 goalStore가 상태 8개, 액션 11개로 가장 크다. 캘린더 관련 상태를 `calendarStore`로 분리하는 것도 고려해볼 만하다.

4. **Zustand middleware 활용**: `devtools` 미들웨어를 추가하면 상태 변화를 시각적으로 디버깅할 수 있고, `persist` 미들웨어로 오프라인 캐싱도 가능하다.

---

## 참고 자료

- [Zustand 공식 문서](https://docs.pmnd.rs/zustand)
- [React Native 성능 최적화 — 불필요한 리렌더 방지](https://reactnative.dev/docs/performance)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

---

*이 글은 [Another Day](https://github.com/) 프로젝트의 실제 코드를 기반으로 작성되었습니다.*
