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

/** 앱 색상 팔레트 (Orange + White Blur) */
export const COLORS = {
  brand: '#FF6B3D',
  brandLight: 'rgba(255, 107, 61, 0.12)',
  brandMid: 'rgba(255, 107, 61, 0.22)',

  primary: '#FF6B3D',
  primaryDark: '#E85A2C',
  primaryLight: 'rgba(255, 107, 61, 0.65)',
  secondary: '#FF6B3D',
  secondaryDark: '#E85A2C',

  background: '#FFFAF7',
  surface: '#FFFFFF',
  surfaceLight: '#FFF2EC',

  text: '#1A1A1A',
  textSecondary: 'rgba(26, 26, 26, 0.50)',
  textMuted: 'rgba(26, 26, 26, 0.30)',

  border: 'rgba(255, 107, 61, 0.10)',
  borderLight: 'rgba(255, 107, 61, 0.18)',

  success: '#FF6B3D',
  warning: '#FFB547',
  error: '#EF4444',

  accent: '#FF6B3D',
  accentYellow: '#FFD93D',

  // 오렌지 글로우 (호환용)
  holoCyan1: '#FF6B3D',
  holoMint1: '#FF9A5C',
  holoPink1: '#FFB380',
  holoLavender1: '#FFCBA4',
  holoPink: '#FF6EC7',
  holoLavender: '#C77DFF',
  holoCyan: '#6EE7F9',
  holoMint: '#A8FFDB',
  holoRed:'#fc5c7d',


  // 글래스 (반투명 오렌지)
  glass: 'rgba(255, 107, 61, 0.06)',
  glassBorder: 'rgba(255, 107, 61, 0.15)',
  glassLight: 'rgba(255, 107, 61, 0.09)',

  // 호환용
  sky: '#FFFAF7',
  grass: '#FFFFFF',
  wood: '#FFF2EC',
  cloud: 'rgba(255, 107, 61, 0.06)',
  mountainLight: '#90D4B0',
  mountain: '#2F7D62',
  mountainDark: '#235E47',
  mountainDarker: '#44a08d',
  ground: '#282828',
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
    particle: '🌸',
    particle2: '✦',
  },
  summer: {
    name: '여름',
    sky: '#081620',
    mountain: '#0A4A3C',
    grass: '#0D3A2E',
    accent: '#00F0D4',
    icon: 'sunny-outline',
    particle: '◆',
    particle2: '✦',
  },
  autumn: {
    name: '가을',
    sky: '#150A08',
    mountain: '#3A2A1A',
    grass: '#2E1E0D',
    accent: '#FFB547',
    icon: 'leaf-outline',
    particle: '🍂',
    particle2: '✦',
  },
  winter: {
    name: '겨울',
    sky: '#050510',
    mountain: '#0F0F28',
    grass: '#0A0A20',
    accent: '#A29BFE',
    icon: 'snow-outline',
    particle: '❄️',
    particle2: '✦',
  },
};
