import { StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/design/tokens';
import { ds, radius } from '@/design/recipes';
import dayjs from '@/lib/dayjs';
import { getCalendarWeekRanges } from '@/lib/statsUtils';

export function endedDateLabel(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).locale('ko').format('M.D')} ~ ${dayjs(endDate).locale('ko').format('M.D')}`;
}

export function getWeekLabelParts(weekStart: string) {
  const start = dayjs(weekStart);
  const end = start.add(6, 'day');

  const endOfStartMonth = start.endOf('month');
  const daysInStartMonth = Math.min(endOfStartMonth.diff(start, 'day') + 1, 7);
  const ownerMonth = daysInStartMonth >= 4 ? start : end;
  const monthStr = ownerMonth.format('YYYY-MM');

  const { ranges } = getCalendarWeekRanges(monthStr);
  const index = ranges.findIndex((range) => range.s.format('YYYY-MM-DD') === weekStart);
  const weekOfMonth = index >= 0 ? index + 1 : 1;

  return {
    week: `${ownerMonth.month() + 1}월 ${weekOfMonth}주차`,
    range: `${start.format('M.D')} ~ ${end.format('M.D')}`,
  };
}
export function freqLabel(frequency: string, targetCount: number | null): string {
  return frequency === 'daily' ? '매일' : `주 ${targetCount ?? 1}회`;
}

export const statisticsSharedStyles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    paddingVertical: 16,
  },
  //캘린더 선택 영역
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  selectorBtn: {
    padding: 8,
  },
  labelBox: {
    alignItems: 'center',
    minWidth: 140,
  },
  labelMain: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  labelSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  //빈 카드
  emptySmall: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.30)',
    textAlign: 'center',
    paddingVertical: 16,
  },
  //카드헤더
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  cardName: {
    ...typography.titleMd,
    color: colors.text,
  },
  cardSubText: {
    fontSize: 12,
    color: '#888',
  },
  dividerSection: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  subLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.40)',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  reviewText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
    marginLeft: 8,
  },
  //배찌
  scoreBox: {
    alignItems: 'flex-end',
  },
  badgeClear: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 24,
  },
  badgeTextClear: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  badgeProgress: {
    backgroundColor: 'rgba(26,26,26,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  badgeTextProgress: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.43)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  badgeMissed: {
    backgroundColor: 'rgba(255, 68, 58, 0.35)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  badgeInProgress: {
    backgroundColor: 'rgba(26,26,26,0.03)',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  badgeEnded: {
    backgroundColor: 'rgba(26,26,26,0.03)',
    borderColor: 'rgba(0,0,0,0.08)',
  },
  badgeTextEnded: {
    color: 'rgba(26,26,26,0.55)',
  },
  //집계한마디
  allClearBox: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    marginBottom: 12,
  },
  allClearBoxContent: {
    padding: 16,
    alignItems: 'center',
  },
  allClearEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  allClearTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 4,
  },
  allClearSub: {
    fontSize: 13,
    color: '#166534',
  },
  goalCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  //메달
  teamMemberRank: { width: 20, alignItems: 'center' },
  teamMemberRankText: { fontSize: 18, fontWeight: '700', color: 'rgba(26,26,26,0.4)' },
});
