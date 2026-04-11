# Another Day: 오늘의 100%를 완성하는 목표 앱

> **"혼자 하면 작심삼일, 함께 하면 정상까지."**
>
> 팀원들과 함께 목표를 달성하며 산을 오르는 게이미피케이션 습관 형성 플랫폼
>
> [앱스토어 링크](https://apps.apple.com/kr/app/%EC%96%B4%EB%82%98%EB%8D%94%EB%8D%B0%EC%9D%B4/id6759189268)

<br/>

## 📱 프로젝트 소개

**Another Day**는 개인의 목표 달성 과정을 시각화하고, 팀원들과 공유하여 지속적인 동기를 부여하는 모바일 애플리케이션입니다.

단순히 체크리스트를 지우는 지루한 과정에서 벗어나, 달성률에 따라 **베이스캠프 → 중턱 → 정상**으로 이동하는 '산 오르기' 메타포를 적용했습니다. 사용자는 팀원들의 등반 과정을 실시간으로 확인하고 서로 응원(Reaction)하며 함께 성장하는 경험을 할 수 있습니다.

### 핵심 기능 요약

| 기능 | 설명 |
| --- | --- |
| **산 오르기 시각화** | 달성률에 따라 베이스캠프 → 중턱 → 정상으로 캐릭터 이동 |
| **팀 기반 목표 관리** | 초대 코드로 팀 생성/참여, 팀원 간 목표 공유 |
| **사진 인증 체크인** | 카메라 촬영 기반 실시간 목표 인증 (앨범 업로드 차단) |
| **유연한 목표 주기** | 매일 / 주 N회 빈도 설정 지원 |
| **리액션 시스템** | 팀원 체크인에 대한 응원/격려 반응 |
| **캘린더 & 통계** | 월별 달성 현황, 주간/월간 리포트 |
| **푸시 알림** | 매일 동기부여 메시지 + 미완료 목표 리마인더 (오후 9시) |
| **월간 목표 이월** | 이전 달 목표를 다음 달로 복사/연장 |
| **월간 다짐 & 회고** | 월 시작 시 다짐, 월 말 회고 작성 |

<br/>

## 🛠 Tech Stack

| Category | Technology |
| --- | --- |
| **Frontend** | ![React Native](https://img.shields.io/badge/React_Native_0.81-20232A?style=flat&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) ![Expo](https://img.shields.io/badge/Expo_SDK_54-000020?style=flat&logo=expo&logoColor=white) |
| **State Management** | ![Zustand](https://img.shields.io/badge/Zustand_v5-orange?style=flat&logo=react&logoColor=white) |
| **Backend / DB** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) (Auth + PostgreSQL + Storage + RPC) |
| **Styling** | React Native StyleSheet, SVG, Expo Vector Icons, LinearGradient, BlurView |
| **Date** | dayjs (ISO 8601 주 계산, 한국어 로케일) |
| **Notifications** | expo-notifications (로컬 스케줄링) |
| **Build & Deploy** | EAS Build, Expo Updates (OTA) |

<br/>

## 📸 Preview (Screenshots)

<img src="https://github.com/user-attachments/assets/a4daa6b0-fc4a-4359-bb0d-80398536bc11" width="350" height="750" />&nbsp;&nbsp;
<img src="https://github.com/user-attachments/assets/52e5c773-d7b2-4ca6-8e35-35bcd51efa38" width="350" height="750" />&nbsp;&nbsp;
<img src="https://github.com/user-attachments/assets/f6f294ad-6142-4ebd-a033-9dba50dfc63e" width="350" height="750" />&nbsp;&nbsp;
<img src="https://github.com/user-attachments/assets/46372094-9d2e-4d89-b877-bfd21ca8de6b" width="350" height="750" />&nbsp;&nbsp;

<br/>

## 🏗 Architecture Overview

### 전체 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    React Native App                  │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│  │  Screens  │→ │Components │→ │  Design System │   │
│  │ (5 Tabs)  │  │ (UI/Logic)│  │ (Tokens/Theme)│   │
│  └─────┬─────┘  └───────────┘  └───────────────┘   │
│        │                                            │
│  ┌─────▼─────────────────────────────────┐          │
│  │         Zustand Stores (4개)           │          │
│  │  authStore │ teamStore │ goalStore │   │          │
│  │            │           │ statsStore   │          │
│  └─────┬─────────────────────────────────┘          │
│        │                                            │
│  ┌─────▼─────────────────────────────────┐          │
│  │         Service Layer (7개)            │          │
│  │  auth │ team │ goal │ checkin │ stats  │          │
│  │       │ monthly │ user                │          │
│  └─────┬─────────────────────────────────┘          │
│        │                                            │
└────────┼────────────────────────────────────────────┘
         │
┌────────▼────────────────────────────────────────────┐
│                    Supabase                          │
│  ┌──────┐  ┌──────────┐  ┌─────────┐  ┌────────┐   │
│  │ Auth │  │PostgreSQL │  │ Storage │  │  RPC   │   │
│  │      │  │  (RLS)   │  │ (Photos)│  │Functions│  │
│  └──────┘  └──────────┘  └─────────┘  └────────┘   │
└─────────────────────────────────────────────────────┘
```

### 네비게이션 구조

```
RootNavigator (NativeStack)
├── [비인증] AuthStack
│   ├── LoginScreen
│   └── RegisterScreen
│
└── [인증됨] AppTabs (BottomTabNavigator) + Modal Screens
    ├── 🏠 HomeTab → HomeScreen (오늘의 목표 + 산 시각화)
    ├── 📅 CalendarTab → CalendarScreen (월별 달력 + 일별 체크인 요약)
    ├── 📊 StatsTab → StatisticsScreen (주간/월간 통계 + 회고)
    ├── 👤 MyPageTab → MyPageScreen (프로필, 팀, 목표 설정)
    │
    └── Stack Screens (모달/푸시):
        ├── ProfileEdit (프로필 수정)
        ├── AppSettings (앱 설정)
        ├── AddRoutine (목표 추가)
        ├── TeamDetail (팀 상세)
        ├── TeamMember (팀원 정보)
        ├── TeamProfileEdit (팀 프로필 수정)
        └── MemberStats (팀원 통계)
```

<br/>

## 🔄 주요 사용자 플로우

### Flow 1: 인증 및 초기 설정

```
회원가입/로그인
  → restoreSession()
  → ensureProfile() (프로필 자동 생성)
  → fetchTeams() (팀 목록 로드)
  → scheduleDailyNotifications() (알림 스케줄링)
  → AppTabs 진입
```

### Flow 2: 일일 체크인 (핵심 루프)

```
[홈 화면] 오늘의 목표 리스트 확인
  → 목표 탭 → CheckinModal 오픈
  → takePhoto() (카메라 촬영)
  → uploadCheckinPhoto() (Supabase Storage 업로드)
  → createCheckin({ status: 'done', photo_url })
  → todayCheckins 갱신
  → memberProgress 재계산 (산 위치 이동)
  → 미완료 목표에 대해 9PM 리마인더 스케줄링
```

### Flow 3: 팀원 상호작용

```
[캘린더 화면] 날짜 선택
  → fetchMemberDateCheckins(selectedDate)
  → 팀원별 체크인 사진/메모 조회
  → 리액션(응원) 토글
    → 낙관적 업데이트 (UI 즉시 변경)
    → 서버 비동기 처리
    → 실패 시 롤백
```

### Flow 4: 월 전환 처리

```
월말 접근 시 → MonthlyGoalPromptModal 표시
  → 이전 달 목표 조회 (fetchExtendableGoalsForMonth)
  → 선택지:
    ├── extendGoalsForNewMonth() (기존 목표 연장)
    └── copyGoalsFromLastMonth() (이전 달 목표 복사)
  → 새 user_goals 생성 (start_date, end_date 갱신)
```

### 시퀀스 다이어그램: 체크인 프로세스

```
User            App(Screen)        goalStore         checkinService      Supabase
 │                 │                   │                   │                │
 │  목표 탭 클릭    │                   │                   │                │
 │────────────────>│                   │                   │                │
 │                 │  CheckinModal     │                   │                │
 │                 │  열기             │                   │                │
 │  카메라 촬영     │                   │                   │                │
 │────────────────>│                   │                   │                │
 │                 │                   │  takePhoto()      │                │
 │                 │                   │──────────────────>│                │
 │                 │                   │  photo URI        │                │
 │                 │                   │<──────────────────│                │
 │                 │                   │                   │                │
 │  인증 확인 클릭  │                   │                   │                │
 │────────────────>│  createCheckin()  │                   │                │
 │                 │──────────────────>│                   │                │
 │                 │                   │  uploadPhoto()    │                │
 │                 │                   │──────────────────>│  Storage       │
 │                 │                   │                   │───────────────>│
 │                 │                   │                   │  photo_url     │
 │                 │                   │                   │<───────────────│
 │                 │                   │                   │                │
 │                 │                   │  INSERT checkin   │                │
 │                 │                   │──────────────────────────────────>│
 │                 │                   │                   │   OK           │
 │                 │                   │<──────────────────────────────────│
 │                 │                   │                   │                │
 │                 │                   │  fetchTodayCheckins()             │
 │                 │                   │──────────────────────────────────>│
 │                 │                   │  fetchMemberProgress()            │
 │                 │                   │──────────────────────────────────>│
 │                 │  UI 갱신          │                   │                │
 │                 │  (산 위치 이동)    │                   │                │
 │  결과 확인      │<──────────────────│                   │                │
 │<────────────────│                   │                   │                │
```

<br/>

## 💡 Key Features & Technical Challenges

### 1. 복잡한 목표 주기 관리와 비즈니스 로직

단순한 '매일 반복'뿐만 아니라 **'주 N회'** 목표를 지원하기 위해 복잡한 날짜 계산 로직이 필요했습니다.

- **Challenge:** 특정 날짜가 주 N회 목표의 성공 범위에 포함되는지, 이번 주에 몇 번 더 해야 하는지 실시간으로 계산해야 했습니다.
- **Solution:** `goalStore.ts` 내부에 `getWeekDoneCount`, `isGoalActiveOnDate` 등의 순수 함수를 구현하여, 렌더링 시점에 즉시 상태를 도출하도록 설계했습니다.
- **주간 계산:** ISO 8601 기준 월~일 주 단위로 집계하며, 월 경계에 걸친 부분 주(partial week)는 인접 월에 병합 처리합니다.

| 목표 유형 | 규칙 | 패스 처리 |
| --- | --- | --- |
| **매일 (daily)** | 주 7일 모두 완료 필수 | 불가 (미완료 = 실패) |
| **주 N회 (weekly_count)** | ISO 주 내 N회 완료 | 가능 (명시적 패스 or 자동 패스) |

### 2. Zustand를 활용한 효율적인 상태 관리

Redux의 보일러플레이트를 줄이고, 직관적인 상태 관리를 위해 **Zustand v5**를 도입했습니다.

- **Store 분리:** `authStore` / `teamStore` / `goalStore` / `statsStore` 4개로 관심사 분리
- **Cross-Store Reset:** 로그인/로그아웃 시 모든 스토어를 동기적으로 초기화하여 사용자 간 데이터 누출 방지
- **Selector 최적화:** 캘린더 렌더링 시 필요한 데이터만 구독하여 불필요한 리렌더링 방지
- **직접 접근:** `getState()`를 통해 React 외부(서비스 레이어)에서도 스토어 상태에 접근 가능

### 3. 실시간 카메라 인증 (Real-time Verification)

**"지금 이 순간의 노력만 인정합니다."**

- **Policy:** 사용자는 목표를 수행한 **직후**에 앱 내 카메라로 촬영해야만 인증할 수 있습니다.
- **Constraints:**
  - 앨범 업로드 불가 — 미리 찍어둔 사진이나 인터넷 사진 사용을 원천 차단
  - 지연 인증 불가 — 목표 수행 시간이 지나면 인증할 수 없음
- **Purpose:** 거짓 인증을 방지하고, 습관 형성의 골든 타임인 '수행 직후'에 보상을 제공하여 행동 강화 효과를 극대화

### 4. 낙관적 업데이트 (Optimistic Updates)

사용자가 리액션을 누르거나 체크인할 때, 서버 응답을 기다리지 않고 UI를 즉시 반영합니다.

```typescript
// src/stores/statsStore.ts
toggleReaction: async (checkinId, user) => {
  // 1. 이전 상태 백업
  const prev = get().memberDateCheckins;

  // 2. UI 즉시 업데이트 (낙관적 업데이트)
  set({ memberDateCheckins: nextMemberCheckins });

  try {
    // 3. 서버 비동기 요청
    await toggleReaction(checkinId, user.id);
  } catch (e) {
    // 4. 실패 시 롤백
    set({ memberDateCheckins: prev });
  }
}
```

### 5. 게이미피케이션 — 산 오르기 시각화 (Mountain Progress)

달성률을 시각적인 '산 위치'로 변환하여 성취감을 극대화합니다.

| 구간 | 달성률 | 시각 효과 |
| --- | --- | --- |
| Base Camp | 0 ~ 33% | 산 아래 출발 지점 |
| Middle | 34 ~ 99% | 산 중턱 등반 중 |
| Summit | 100% | 정상 도달 |

- SVG 기반 산 렌더링 + 그래디언트 애니메이션
- 계절별 테마 변화 (Spring / Summer / Autumn / Winter)
- 팀원 전체의 산 위치를 한 화면에서 실시간 확인 가능

### 6. 푸시 알림 시스템

- **매일 동기부여 메시지:** 요일별 랜덤 메시지 발송
- **목표 리마인더:** 오후 9시에 미완료 목표 리스트 알림
- **설정 관리:** AsyncStorage 기반 opt-in/opt-out 토글
- **구현:** expo-notifications 로컬 스케줄링 (서버 불필요)

<br/>

## 📊 데이터 모델

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  users   │────<│ team_members │>────│  teams   │
│          │     │ (role: leader│     │(invite_  │
│          │     │  / member)   │     │  code)   │
└────┬─────┘     └──────────────┘     └────┬─────┘
     │                                      │
     │           ┌──────────┐               │
     │           │  goals   │───────────────┘
     │           │(team_id, │
     │           │ owner_id)│
     │           └────┬─────┘
     │                │
     │    ┌───────────▼──────────┐
     ├───>│     user_goals       │
     │    │(frequency, target_   │
     │    │ count, start/end)    │
     │    └──────────────────────┘
     │
     │    ┌──────────────────────┐     ┌───────────┐
     ├───>│      checkins        │────<│ reactions  │
     │    │(date, photo_url,     │     │(user_id)  │
     │    │ memo, status)        │     └───────────┘
     │    └──────────────────────┘
     │
     │    ┌──────────────────────┐
     ├───>│ monthly_resolutions  │  (월간 다짐)
     │    └──────────────────────┘
     │    ┌──────────────────────┐
     └───>│monthly_retrospectives│  (월간 회고)
          └──────────────────────┘
```

<br/>

## 📂 Directory Structure

```
src/
├── components/
│   ├── calendar/         # 캘린더 전용 컴포넌트
│   ├── home/             # 홈 화면 (Mountain, TodayGoalList, Modals)
│   ├── mypage/           # 마이페이지 (프로필, 목표 설정, 팀 섹션)
│   ├── stats/            # 통계 (주간 리포트, 회고 모달)
│   ├── common/           # 재사용 폼 입력 (Button, Input)
│   └── ui/               # 디자인 시스템 (Card, Avatar, Badge 등)
│
├── constants/            # 상수 (산 임계값, 계절 테마)
├── design/               # 디자인 토큰 (색상, 간격, 타이포, 그림자)
│
├── hooks/                # 커스텀 훅 (탭 더블탭 스크롤)
├── lib/                  # 라이브러리 설정 (Supabase, dayjs, ServiceError)
│
├── navigation/
│   ├── RootNavigator.tsx # 인증 기반 분기
│   ├── AuthStack.tsx     # 로그인/회원가입
│   └── AppTabs.tsx       # 하단 탭 네비게이션
│
├── screens/
│   ├── auth/             # LoginScreen, RegisterScreen
│   ├── home/             # HomeScreen
│   ├── calendar/         # CalendarScreen
│   ├── stats/            # StatisticsScreen
│   ├── mypage/           # MyPageScreen + 편집 화면들
│   └── team/             # 팀 상세, 팀원 통계
│
├── services/             # Supabase API 레이어 (7개 서비스)
├── stores/               # Zustand 스토어 (4개)
├── types/                # TypeScript 타입 (domain.ts, navigation.ts)
└── utils/                # 유틸리티 (notifications.ts)
```

<br/>

## 🚀 Getting Started

```bash
# 1. Repository Clone
git clone https://github.com/username/anotherday.git

# 2. Install Dependencies
npm install

# 3. Environment Setup
cp .env.example .env
# SUPABASE_URL, SUPABASE_ANON_KEY 설정

# 4. Run Project
npx expo start
```

<br/>

## 🗓 업데이트 로그

- 푸시 알림 기능 (매일 동기부여 + 미완료 목표 리마인더)
- 캘린더 화면 목표 추적 및 팀원 체크인 조회
- 산 오르기 시각화 그래디언트 효과 및 애니메이션 개선
- 플로팅 버튼 레이아웃 최적화
- 월간 목표 이월 및 복사 기능

<br/>

## 📝 Retrospective (회고)

이 프로젝트를 통해 **"데이터 모델링의 중요성"**과 **"사용자 경험 중심의 상태 관리"**에 대해 깊이 고민할 수 있었습니다. 특히 Supabase와 Zustand를 결합하여 실시간성을 보장하면서도 클라이언트의 성능을 최적화하는 과정에서 많은 성장을 이루었습니다.

핵심 교훈:
- **ISO 8601 주 계산**의 복잡성 — 월 경계 처리, 부분 주 병합 등 날짜 로직이 비즈니스 로직의 핵심이 됨
- **낙관적 업데이트 + 롤백 패턴**으로 UX 반응성과 데이터 정합성을 동시에 확보
- **Cross-Store Reset 패턴**으로 멀티 유저 환경에서의 상태 격리 보장
- **카메라 전용 인증** 정책으로 습관 형성의 행동 심리학적 효과 극대화
