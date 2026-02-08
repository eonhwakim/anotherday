// ─── 기본값 & 상수 ─────────────────────────────────────────────

/** MVP 기본 목표 목록 (하드코딩) */
export const DEFAULT_GOALS = [
  { name: '운동', emoji: '💪' },
  { name: '코딩테스트', emoji: '💻' },
  { name: '8시 기상', emoji: '⏰' },
] as const;

/** MVP 기본 팀 이름 */
export const DEFAULT_TEAM_NAME = '어나더데이 팀';

/** 산 위치 임계값 (달성률 기준) */
export const MOUNTAIN_THRESHOLDS = {
  /** 0% ~ 33% → base */
  MIDDLE: 0.34,
  /** 34% ~ 99% → middle, 100% → summit */
  SUMMIT: 1.0,
} as const;

/** 앱 색상 팔레트 (Cozy Forest / Hand-drawn Style) */
export const COLORS = {
  primary: '#8D6E63',      // 따뜻한 갈색 (나무/흙)
  primaryDark: '#5D4037',  // 진한 갈색 (테두리/텍스트)
  secondary: '#AED581',    // 부드러운 연두색 (풀/잎)
  background: '#F1F8E9',   // 아주 연한 민트/하늘 (배경)
  surface: '#FFF8E1',      // 크림색 (종이/카드)
  text: '#4E342E',         // 짙은 고동색 (가독성)
  textSecondary: '#8D6E63', // 연한 갈색
  border: '#6D4C41',       // 손그림 느낌의 테두리 색
  success: '#81C784',      // 차분한 초록
  warning: '#FFD54F',      // 따뜻한 노랑
  error: '#E57373',        // 파스텔 레드

  // 테마 전용
  sky: '#E1F5FE',          // 맑은 하늘색
  grass: '#C5E1A5',        // 잔디색
  wood: '#D7CCC8',         // 밝은 나무색
  cloud: '#FFFFFF',        // 구름
} as const;

/** 계절별 테마 (자연스러운 톤) */
export const SEASON_THEMES = {
  spring: {
    name: '봄',
    sky: '#E1F5FE',
    mountain: '#C5E1A5', // 연두색 언덕
    grass: '#AED581',    // 조금 더 진한 풀색
    accent: '#F8BBD0',   // 벚꽃
    icon: 'flower-outline',
    particle: '🌸',
  },
  summer: {
    name: '여름',
    sky: '#B3E5FC',
    mountain: '#81C784', // 진한 녹색
    grass: '#66BB6A',    // 더 진한 녹색
    accent: '#FFF59D',   // 햇살
    icon: 'sunny-outline',
    particle: '🌿',
  },
  autumn: {
    name: '가을',
    sky: '#FFF3E0',
    mountain: '#FFCC80', // 주황색 언덕
    grass: '#FFB74D',    // 갈색 풀
    accent: '#FFAB91',   // 단풍
    icon: 'leaf-outline',
    particle: '🍂',
  },
  winter: {
    name: '겨울',
    sky: '#E8EAF6',
    mountain: '#F5F5F5', // 눈 덮인 언덕
    grass: '#E0E0E0',    // 눈 쌓인 바닥
    accent: '#90CAF9',   // 얼음
    icon: 'snow-outline',
    particle: '❄️',
  },
};
