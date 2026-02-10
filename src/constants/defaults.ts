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
  MIDDLE: 0.34,
  SUMMIT: 1.0,
} as const;

/** 앱 색상 팔레트 (Black + Liquid Glass) */
export const COLORS = {
  primary: '#FFFFFF',
  primaryDark: '#E0E0E0',
  primaryLight: 'rgba(255,255,255,0.70)',
  secondary: '#FFFFFF',
  secondaryDark: '#F0F0F0',

  background: '#000000',
  backgroundLight: '#060606',
  surface: '#0A0A0A',
  surfaceLight: '#141414',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.45)',
  textMuted: 'rgba(255,255,255,0.20)',

  border: 'rgba(255,255,255,0.04)',
  borderLight: 'rgba(255,255,255,0.10)',

  success: '#FFFFFF',
  warning: '#FFB547',
  error: '#FF6B6B',

  accent: '#FFFFFF',
  accentYellow: '#FFD93D',

  // 홀로그래픽 컬러 (호환용)
  holoCyan: '#FFFFFF',
  holoMint: '#FFFFFF',
  holoPink: '#FFFFFF',
  holoLavender: '#FFFFFF',

  // 리퀴드 글래스
  glass: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassLight: 'rgba(255,255,255,0.06)',

  // 호환용
  sky: '#000000',
  grass: '#0A0A0A',
  wood: '#141414',
  cloud: 'rgba(255,255,255,0.03)',
} as const;

/** 계절별 테마 (Holographic Neon) */
export const SEASON_THEMES = {
  spring: {
    name: '봄',
    sky: '#080820',
    mountain: '#1A2A5C',
    grass: '#0D1E4A',
    accent: '#FF69B4',
    icon: 'flower-outline',
    particle: '✦',
  },
  summer: {
    name: '여름',
    sky: '#081620',
    mountain: '#0A4A3C',
    grass: '#0D3A2E',
    accent: '#00F0D4',
    icon: 'sunny-outline',
    particle: '◆',
  },
  autumn: {
    name: '가을',
    sky: '#150A08',
    mountain: '#3A2A1A',
    grass: '#2E1E0D',
    accent: '#FFB547',
    icon: 'leaf-outline',
    particle: '▲',
  },
  winter: {
    name: '겨울',
    sky: '#050510',
    mountain: '#0F0F28',
    grass: '#0A0A20',
    accent: '#A29BFE',
    icon: 'snow-outline',
    particle: '❖',
  },
};
