import { StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing, typography } from './tokens';

export const ds = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  pagePadding: {
    paddingHorizontal: spacing[4],
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
  headerTitle: {
    ...typography.titleLg,
    color: colors.text,
  },
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
