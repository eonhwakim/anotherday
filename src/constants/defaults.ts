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

/** 앱 색상 팔레트 (Holographic Dark) */
export const COLORS = {
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  primaryLight: '#A29BFE',
  secondary: '#fcfc03',//'#00F0D4',
  secondaryDark: '#F0F0FF',

  background: '#050510',      // 딥 블랙 (더 깊게)
  backgroundLight: '#0A0A1A',
  surface: '#0F0F28',         // 어두운 표면
  surfaceLight: '#181840',

  text: '#F0F0FF',
  textSecondary: 'rgba(240,240,255,0.50)',
  textMuted: 'rgba(240,240,255,0.22)',

  border: 'rgba(255,255,255,0.04)',
  borderLight: 'rgba(255,255,255,0.10)',

  success: '#00FFB2',         // 네온 민트 (더 생생)
  warning: '#FFB547',
  error: '#FF6B6B',

  accent: '#FF69B4',          // 핫핑크 (더 생생)
  accentYellow: '#FFD93D',

  // 홀로그래픽 컬러 (이리데센트 효과)
  holoCyan: '#00F5FF',
  holoMint: '#00FF88',
  holoPink: '#FF69B4',
  holoLavender: '#A29BFE',

  // 유리 효과
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.06)',
  glassLight: 'rgba(255,255,255,0.08)',

  // 호환용
  sky: '#050510',
  grass: '#0F0F28',
  wood: '#181840',
  cloud: 'rgba(255,255,255,0.04)',
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
