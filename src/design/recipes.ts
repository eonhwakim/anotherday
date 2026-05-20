import { StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing, typography } from './tokens';

export const ds = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 68,
  },
  /** Tab Navigator 화면용 — absolute 탭바에 가리지 않도록 하단 여백 */
  tabScrollContent: {
    paddingBottom: 120,
  },
  //앱 전체 타이틀
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  //큰 타이틀
  bigTitle: {
    ...typography.titleLg,
    color: colors.text,
  },
  //카드 타이틀
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.darkGreen,
  },
  titleMd: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.text,
    marginBottom: spacing[3],
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  //목록 헤더 세션
  headerSection: {
    marginBottom: spacing[4],
  },
  //목록 헤더 타이틀
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  //뒤로가기가 있는 페이지 헤더 타이틀
  headerTitleNav: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  //selectableOption
  selectableOption: {
    borderRadius: radius.md,
  },
  selectableOptionActive: {
    backgroundColor: colors.white80,
    borderTopColor: colors.white,
    borderLeftColor: colors.borderMuted,
    borderBottomColor: colors.primaryStrong,
    borderWidth: 0.6,
    shadowColor: colors.primary,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'visible',
  },
  selectableOptionContent: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  selectableOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectableOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  //------

  iconButton: {
    padding: spacing[1],
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[5],
    paddingVertical: spacing[4],
    backgroundColor: colors.screen,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.screen,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.brandSm,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.glass,
  },
  cardPadding: {
    padding: spacing[4],
  },
  softCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dividerTop: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeLeader: {
    paddingHorizontal: spacing[1] + 2,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.brandLight,
  },
  badgeLeaderText: {
    ...typography.badge,
    color: colors.primary,
  },
  badgeMember: {
    paddingHorizontal: spacing[1] + 2,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  badgeMemberText: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  badgeFrequency: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: spacing[1] + 1,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },
  badgeFrequencyText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statDone: {
    fontSize: 11,
    color: colors.successBright,
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    paddingHorizontal: spacing[1] + 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statPass: {
    fontSize: 11,
    color: '#E8960A',
    backgroundColor: 'rgba(255,181,71,0.10)',
    paddingHorizontal: spacing[1] + 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statFail: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
    backgroundColor: 'rgba(239,68,68,0.08)',
    paddingHorizontal: spacing[1] + 2,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export { colors, radius, shadows, spacing, typography };
