# Another Day: 오늘의 100%를 완성하는 목표 앱

> **"혼자 하면 작심삼일, 함께 하면 정상까지."**
>
> 팀원들과 함께 목표를 달성하며 산을 오르는 게이미피케이션 습관 형성 플랫폼
>
> [App Store](https://apps.apple.com/kr/app/%EC%96%B4%EB%82%98%EB%8D%94%EB%8D%B0%EC%9D%B4/id6759189268)

<br/>

## 프로젝트 소개

**Another Day**는 개인의 목표 달성 과정을 시각화하고, 팀원들과 공유하여 지속적인 동기를 부여하는 모바일 애플리케이션입니다.

단순히 체크리스트를 지우는 지루한 과정에서 벗어나, 달성률에 따라 **베이스캠프 → 중턱 → 정상**으로 이동하는 '산 오르기' 메타포를 적용했습니다. 사용자는 팀원들의 등반 과정을 실시간으로 확인하고 서로 응원(Reaction)하며 함께 성장하는 경험을 할 수 있습니다.

<img src="https://github.com/user-attachments/assets/e098a5a8-c675-42bb-98ab-de32d450d43e" width="350" height="750" />&nbsp;&nbsp;

<br/>

## 기술 스택

| Category             | Technology |
| -------------------- | ---------- |
| **Frontend**         | ![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) ![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white) |
| **Server State**     | ![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=flat&logo=reactquery&logoColor=white) |
| **Local State**      | ![Zustand](https://img.shields.io/badge/Zustand-orange?style=flat&logo=react&logoColor=white) |
| **Backend / DB**     | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) |
| **Styling**          | React Native StyleSheet, Design Tokens (`design/tokens.ts`) |

<br/>

## 주요 기능 & 기술적 도전

### 1. 복잡한 목표 주기 관리와 비즈니스 로직

단순한 '매일 반복'뿐만 아니라 **'주 N회'** 목표를 지원하기 위해 복잡한 날짜 계산 로직이 필요했습니다.

- **Challenge:** 특정 날짜가 주 N회 목표의 성공 범위에 포함되는지, 이번 주에 몇 번 더 해야 하는지 실시간으로 계산해야 했습니다.
- **Solution:** `lib/statsUtils.ts` 내부에 `getCalendarWeekRanges`, `getGoalWeekRanges` 등의 순수 함수를 구현하여, 렌더링 시점에 즉시 상태를 도출하도록 설계했습니다. DB 스키마를 단순하게 유지하면서도 유연한 주기 설정을 구현했습니다.

### 2. TanStack Query + Zustand 역할 분리

서버 상태와 UI 상태의 성격이 다르기 때문에 **TanStack Query**와 **Zustand**를 역할에 맞게 분리했습니다.

- **TanStack Query:** 팀, 목표, 체크인, 통계처럼 Supabase에서 읽고 쓰는 서버 상태를 캐시하고 무효화합니다.
- **Zustand:** 인증 세션, 화면 내부 UI 상태, 로그아웃 시 크로스-스토어 리셋처럼 앱 로컬 상태만 담당합니다.
- **운영 규칙:** query key와 invalidate 원칙은 [`src/queries/queryKeys.ts`](src/queries/queryKeys.ts)에서 중앙 관리합니다.

### 3. 실시간 카메라 인증 (Real-time Verification)

**"지금 이 순간의 노력만 인정합니다."**

- **Policy:** 사용자는 목표를 수행한 **직후**에 앱 내 카메라로 촬영해야만 인증할 수 있습니다.
- **Constraints:**
  - 앨범 업로드 불가: 미리 찍어둔 사진이나 외부 이미지 사용 원천 차단
  - 지연 인증 불가: 자정이 지나면 인증 불가
- **Purpose:** 거짓 인증을 방지하고, 수행 직후 보상 제공으로 행동 강화 효과를 극대화합니다.

### 4. 낙관적 업데이트 (Optimistic Updates)로 UX 개선

사용자가 '좋아요(Reaction)'를 누를 때, 서버 응답을 기다리는 딜레이 없이 즉시 반영합니다.

- **Implementation:** 서버 요청 전 로컬 상태를 먼저 업데이트하여 UI를 즉시 변경합니다.
- **Rollback:** 서버 요청 실패 시를 대비한 에러 핸들링으로 데이터 정합성을 유지합니다.

```typescript
// toggleReaction — 낙관적 업데이트 패턴
const isReacted = reactions.find(r => r.user_id === userId);
// 1. UI 즉시 반영 (temp ID 사용)
set({ memberDateCheckins: isReacted ? remove : add });
// 2. DB 비동기 반영
try { await supabase.insert_or_delete(); }
catch (e) { /* 롤백 */ }
```

### 5. 게이미피케이션 알고리즘 (Mountain Progress)

사용자의 달성률을 시각적인 '산 위치'로 변환합니다. **패스(pass)는 분모에서 제외**하여 전략적 패스 활용을 장려합니다.

```typescript
function getPosition(done: number, total: number, pass: number): MountainPosition {
  const effective = total - pass;   // 패스 제외
  const ratio = done / effective;
  if (ratio >= 1.0)  return 'summit';  // 정상 (100%)
  if (ratio >= 0.34) return 'middle';  // 중턱
  return 'base';                        // 베이스캠프
}
```

### 6. N+1 쿼리 최적화

팀원 × 목표 수만큼 발생하던 개별 DB 쿼리를 **배치 쿼리 1회 + Map 집계**로 최적화했습니다.

```typescript
// 이번 주 모든 weekly 목표의 done 체크인을 한 번에 조회
const { data: weekCheckins } = await supabase
  .from('checkins').select('goal_id')
  .eq('user_id', uid).eq('status', 'done')
  .gte('date', monday).lte('date', sunday)
  .in('goal_id', weeklyGoalIds);

// Map으로 집계
const weekDoneMap = new Map<string, number>();
weekCheckins?.forEach(c =>
  weekDoneMap.set(c.goal_id, (weekDoneMap.get(c.goal_id) ?? 0) + 1)
);
```

<br/>

## 디렉토리 구조

```
src/
├── components/      # 재사용 가능한 UI 컴포넌트
│   ├── ui/          # 원자 컴포넌트 (Button, Card, Badge 등)
│   ├── home/        # 홈 탭 전용 (MountainProgress 등)
│   ├── calendar/    # 캘린더 탭 전용
│   ├── stats/       # 통계 차트·카드
│   └── mypage/      # 마이페이지 전용
├── design/          # 디자인 시스템 (tokens, recipes)
├── hooks/           # 커스텀 훅
├── lib/             # 외부 라이브러리 설정 (Supabase, dayjs, statsUtils)
├── navigation/      # React Navigation 설정
├── queries/         # TanStack Query hooks / mutations / queryKeys
├── screens/         # 주요 화면 (Home, Calendar, Stats, MyPage, Auth...)
├── services/        # Supabase 쿼리 순수 함수
├── stores/          # Zustand 로컬 UI 상태 (auth, team, goal, stats)
├── types/           # TypeScript 타입 (domain.ts, navigation.ts)
└── utils/           # 유틸리티 (notifications 등)
```

<br/>

## 시작하기

```bash
# 1. 저장소 클론
git clone https://github.com/username/anotherday.git

# 2. 의존성 설치
yarn install

# 3. 환경변수 설정 (.env)
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# 4. 개발 서버 실행
npx expo start
```

<br/>

## 문서

- [개발 설계 문서 (DESIGN.md)](DESIGN.md) — 아키텍처, 데이터 모델, 핵심 알고리즘 상세
- [기획서 (기획.md)](기획.md) — 비즈니스 로직 및 UX 설계 원칙

<br/>

## 회고

이 프로젝트를 통해 **데이터 모델링의 중요성**과 **사용자 경험 중심의 상태 관리**에 대해 깊이 고민할 수 있었습니다. 특히 TanStack Query와 Zustand를 역할에 맞게 분리하여 서버 상태와 UI 상태를 명확히 구분하고, Supabase의 RLS와 SECURITY DEFINER RPC를 활용해 보안과 기능성을 동시에 확보하는 과정에서 많은 성장을 이루었습니다.

## 업데이트 예정 기능

- 원격 푸시 알림 (인증 마감 임박, 팀원 응원 알림)
- 연속 달성일(Streak) 표시
- 주간/월간 팀 내 랭킹 시스템
