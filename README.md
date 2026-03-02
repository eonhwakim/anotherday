# Another Day: 오늘의 100%를 완성하는 목표 앱

> **"혼자 하면 작심삼일, 함께 하면 정상까지."**
>
> 팀원들과 함께 목표를 달성하며 산을 오르는 게이미피케이션 습관 형성 플랫폼

<br/>

## 📱 프로젝트 소개

**Another Day**는 개인의 목표 달성 과정을 시각화하고, 팀원들과 공유하여 지속적인 동기를 부여하는 모바일 애플리케이션입니다.

단순히 체크리스트를 지우는 지루한 과정에서 벗어나, 달성률에 따라 **베이스캠프 → 중턱 → 정상**으로 이동하는 '산 오르기' 메타포를 적용했습니다. 사용자는 팀원들의 등반 과정을 실시간으로 확인하고 서로 응원(Reaction)하며 함께 성장하는 경험을 할 수 있습니다.

<br/>

## 🛠 Tech Stack

| Category | Technology |
| --- | --- |
| **Frontend** | ![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) ![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white) |
| **State Management** | ![Zustand](https://img.shields.io/badge/Zustand-orange?style=flat&logo=react&logoColor=white) |
| **Backend / DB** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) |
| **Styling** | React Native StyleSheet, Vector Icons |

<br/>

## 📸 Preview (Screenshots)

| 홈 화면 (산 오르기) | 캘린더 & 리포트 | 목표 설정 |
| :---: | :---: | :---: |
| <img src="" alt="Home Screen" width="200" /> | <img src="" alt="Calendar Screen" width="200" /> | <img src="" alt="Goal Setting" width="200" /> |
| *팀원들의 현재 위치 시각화* | *성공/실패/부분달성 분석* | *주 N회 / 매일 목표 설정* |


<img src="https://github.com/user-attachments/assets/d764eede-65e9-4a74-a4b1-d3f007b8fe42" width="350" height="750" />&nbsp;&nbsp;
<img src="https://github.com/user-attachments/assets/2ce33b12-1f8a-465a-beb9-15dbdf859da4" width="350" height="750" />&nbsp;&nbsp;
<img src="https://github.com/user-attachments/assets/153b1b4e-5973-4bd4-b3f8-3c4c5eeeb185" width="350" height="750" />&nbsp;&nbsp;
<img src="https://github.com/user-attachments/assets/c8e0d52f-03d9-4404-9c37-927445eeb9e0" width="350" height="750" />&nbsp;&nbsp;
<img src="https://github.com/user-attachments/assets/2eda47f3-a664-4690-a32f-7ce1f5f06df4" width="350" height="750" />




<br/>


## 💡 Key Features & Technical Challenges

### 1. 복잡한 목표 주기 관리와 비즈니스 로직
단순한 '매일 반복'뿐만 아니라 **'주 N회'** 목표를 지원하기 위해 복잡한 날짜 계산 로직이 필요했습니다.
- **Challenge:** 특정 날짜가 주 N회 목표의 성공 범위에 포함되는지, 이번 주에 몇 번 더 해야 하는지 실시간으로 계산해야 했습니다.
- **Solution:** `goalStore.ts` 내부에 `getWeekDoneCount`, `isGoalActiveOnDate` 등의 순수 함수를 구현하여, 렌더링 시점에 즉시 상태를 도출하도록 설계했습니다. 이를 통해 DB 스키마를 단순하게 유지하면서도 유연한 주기 설정을 구현했습니다.

### 2. Zustand를 활용한 효율적인 상태 관리
Redux의 보일러플레이트를 줄이고, 직관적인 상태 관리를 위해 **Zustand**를 도입했습니다.
- **Store 구조화:** `teamGoals`(공유 데이터), `myGoals`(개인 데이터), `calendarMarkings`(파생 데이터)로 스토어를 명확히 분리하여 데이터 흐름을 추적하기 쉽게 만들었습니다.
- **Selector 활용:** 캘린더 렌더링 시 필요한 데이터만 구독하여 불필요한 리렌더링을 방지했습니다.

### 3. 실시간 카메라 인증 (Real-time Verification)
**"지금 이 순간의 노력만 인정합니다."**
- **Policy:** 사용자는 목표를 수행한 **직후**에 앱 내 카메라로 촬영해야만 인증할 수 있습니다.
- **Constraints:** 
  - 🚫 **앨범 업로드 불가:** 미리 찍어둔 사진이나 인터넷 사진 사용을 원천 차단합니다.
  - 🚫 **지연 인증 불가:** 목표 수행 시간이 지나면 인증할 수 없습니다.
- **Purpose:** 거짓 인증을 방지하고, 습관 형성의 골든 타임인 '수행 직후'에 보상을 제공하여 행동 강화 효과를 극대화합니다.

### 4. 낙관적 업데이트 (Optimistic Updates)로 UX 개선
사용자가 '좋아요(Reaction)'를 누르거나 '체크인'을 할 때, 서버 응답을 기다리는 동안의 지연 시간을 없애고 싶었습니다.
- **Implementation:** `toggleReaction` 함수에서 서버 요청을 보내기 전, 로컬 상태(`memberDateCheckins`)를 먼저 업데이트하여 UI를 즉시 변경합니다.
- **Rollback:** 만약 서버 요청이 실패할 경우를 대비해 에러 핸들링 로직을 추가하여 데이터 정합성을 유지했습니다.

```typescript
// src/stores/goalStore.ts 예시
toggleReaction: async (checkinId, user) => {
  // 1. UI 즉시 업데이트 (낙관적 업데이트)
  set({ memberDateCheckins: nextMemberCheckins });

  try {
    // 2. 서버 비동기 요청
    await supabase.from('checkin_reactions')...
  } catch (e) {
    // 3. 실패 시 롤백 로직
  }
}
```

### 4. 게이미피케이션 알고리즘 (Mountain Progress)
사용자의 달성률을 시각적인 '산 위치'로 변환하는 알고리즘을 구현했습니다.
- **Logic:** 전체 목표 대비 달성한 목표의 비율을 계산하여 `Base` (0~30%), `Middle` (31~79%), `Summit` (80%~) 구간으로 매핑합니다.
- **Effect:** 수치로만 보이는 달성률을 시각적 위치로 치환하여 사용자의 성취감을 고취시켰습니다.

<br/>

## 📂 Directory Structure

```
src/
├── components/      # 재사용 가능한 UI 컴포넌트
├── constants/       # 상수 및 설정값 (Colors, Thresholds)
├── lib/             # 외부 라이브러리 설정 (Supabase, Dayjs)
├── navigation/      # React Navigation 설정
├── screens/         # 주요 화면 (Home, Calendar, MyPage)
├── stores/          # Zustand 상태 관리 (Business Logic Core)
├── types/           # TypeScript 인터페이스 (Domain Models)
└── utils/           # 유틸리티 함수
```

<br/>

## 🚀 Getting Started

```bash
# 1. Repository Clone
git clone https://github.com/username/anotherday.git

# 2. Install Dependencies
npm install

# 3. Run Project
npx expo start
```

<br/>

## 📝 Retrospective (회고)

이 프로젝트를 통해 **"데이터 모델링의 중요성"**과 **"사용자 경험 중심의 상태 관리"**에 대해 깊이 고민할 수 있었습니다. 특히 Supabase와 Zustand를 결합하여 실시간성을 보장하면서도 클라이언트의 성능을 최적화하는 과정에서 많은 성장을 이루었습니다. 앞으로 푸시 알림 기능과 소셜 기능을 더 고도화할 예정입니다.
