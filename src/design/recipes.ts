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
  //----
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export { colors, radius, shadows, spacing, typography };
