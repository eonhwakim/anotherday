/** 산 위치 임계값 (달성률 기준) */
export const MOUNTAIN_THRESHOLDS = {
  MIDDLE: 0.34,
  SUMMIT: 1.0,
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
