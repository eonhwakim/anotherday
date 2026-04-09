export const colors = {
  brand: '#FF6B3D',
  brandLight: 'rgba(255, 107, 61, 0.12)',
  brandMid: 'rgba(255, 107, 61, 0.22)',
  brandWarm: '#FF9A5C',
  brandSoft: '#FFB380',
  brandPale: '#fcc8a4',

  primary: '#FF6B3D',
  primaryDark: '#E85A2C',
  primaryLight: 'rgba(255, 107, 61, 0.65)',
  primaryStrong: 'rgba(255, 107, 61, 0.18)',

  background: 'rgba(255, 255, 255, 0.45)',
  white: '#FFFFFF',
  screen: {
    colors: ['#F6A07A', '#F8C7B0', '#FBEEE7', '#F7F2ED'],
    locations: [0, 0.18, 0.42, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  surface: '#FFFAF7',
  surfaceSoft: '#FFF7F3',
  surfaceLight: '#FFF2EC',

  text: '#1A1A1A',
  textSecondary: 'rgba(26, 26, 26, 0.50)',
  textMuted: 'rgba(26, 26, 26, 0.30)',
  textFaint: 'rgba(26, 26, 26, 0.35)',

  border: 'rgba(255, 107, 61, 0.08)',
  borderMuted: 'rgba(75, 74, 74, 0.12)',

  success: '#22C55E',
  successBright: '#4ADE80',
  warning: '#FFB547',
  error: '#EF4444',
  yellow: '#FFD93D',
  blue: '#3B82F6',
  sauvignonBlush: '#FFF7F3',
  shadow: '#000000',

  holoMint: '#A8FFDB',
  holoPink: '#FF6EC7',
  holoLavender: '#C77DFF',
  holoRed: '#fc5c7d',
  holoCyan: '#6EE7F9',

  overlayBackdrop: 'rgba(0, 0, 0, 0.45)',
  sheetOverlay: 'rgba(255, 255, 255, 0.85)',
  handleTint: 'rgba(255, 255, 255, 0.20)',
  avatarGlass: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255, 255, 255, 0.90)',
  borderFaint: 'rgba(255, 255, 255, 0.05)',

  statusSuccessBg: 'rgba(74, 222, 128, 0.43)',
  statusSuccessBorder: 'rgba(74, 222, 128, 0.30)',
  statusPassBg: 'rgba(232, 162, 10, 0.45)',
  statusPassBorder: 'rgba(232, 150, 10, 0.30)',
  statusErrorBg: 'rgba(255, 68, 58, 0.35)',
  statusErrorBorder: 'rgba(255, 69, 58, 0.30)',
  statusFutureBg: 'rgba(39, 38, 38, 0.24)',
  statusFutureBorder: 'rgba(255, 255, 255, 0.10)',
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 24,
  pill: 999,
} as const;

export const typography = {
  titleLg: {
    fontSize: 26,
    fontWeight: '800' as const,
  },
  titleMd: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  titleSm: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800' as const,
  },
} as const;

export const shadows = {
  brandSm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  brandMd: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  button: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  glass: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
} as const;
