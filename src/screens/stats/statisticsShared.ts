import { StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../design/tokens';
import { ds, radius } from '../../design/recipes';
import dayjs from '../../lib/dayjs';
import { getCalendarWeekRanges } from '../../lib/statsUtils';

export function endedDateLabel(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).format('M.D')} ~ ${dayjs(endDate).format('M.D')}`;
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
    marginBottom: 16,
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
    marginBottom: 16,
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
  //-----------

  // teamMemberNameBox: { flex: 1 },

  // teamMemberScoreTextGray: { fontSize: 12, fontWeight: '500', color: 'rgba(26,26,26,0.4)' },
  // teamMemberGoalList: {
  //   marginTop: 8,
  //   gap: 10,
  // },
  // teamMemberGoalRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  // },
  // teamMemberGoalInfo: {
  //   // flex: 1,
  //   // paddingLeft: 12,
  // },
  // // teamMemberGoalName: {
  // //   fontSize: 14,
  // //   fontWeight: '600',
  // //   color: '#1A1A1A',
  // //   marginBottom: 2,
  // // },
  // // teamMemberGoalTarget: {
  // //   fontSize: 11,
  // //   color: 'rgba(26,26,26,0.5)',
  // // },
  // teamMemberGoalCount: {
  //   fontSize: 12,
  //   fontWeight: '700',
  // },
  // // teamMemberGoalEndedDate: {
  // //   fontSize: 12,
  // //   fontWeight: '600',
  // //   color: 'rgba(26,26,26,0.45)',
  // // },

  // chartFrame: { marginHorizontal: spacing[4], marginTop: 8, marginBottom: 8 },
  // chartContent: { paddingVertical: spacing[4], paddingHorizontal: spacing[4], gap: spacing[3] },
  // chartRow: ds.rowCenter,
  // chartLabelBox: { width: 70, ...ds.rowCenter, gap: spacing[1] + 2 },
  // chartRank: { fontSize: 20, fontWeight: '700', color: colors.textFaint, width: 20 },
  // chartName: { ...typography.label, color: colors.text, textTransform: 'none', flex: 1 },
  // chartNameMe: { color: colors.primary, fontWeight: '800' },
  // chartBarBg: {
  //   flex: 1,
  //   height: 12,
  //   backgroundColor: 'rgba(0,0,0,0.04)',
  //   borderRadius: 6,
  //   overflow: 'hidden',
  //   marginHorizontal: 10,
  // },
  // chartBarFill: { height: '100%', borderRadius: 6 },
  // chartRateText: {
  //   width: 38,
  //   textAlign: 'right',
  //   ...typography.label,
  //   color: colors.text,
  //   textTransform: 'none',
  // },
  // chartRateTextMe: { color: colors.primary, fontWeight: '800' },

  // cardRateRow: {
  //   ...ds.rowBetween,
  //   paddingHorizontal: 18,
  //   paddingVertical: 18,
  // },
  // cardRateLabel: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  // rateBig: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  // rateMedium: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  // rateEmpty: {
  //   ...typography.label,
  //   color: colors.textFaint,
  //   fontWeight: '500',
  //   textTransform: 'none',
  // },

  // memberNameRow: { ...ds.rowCenter, gap: spacing[1] + 2 },
  // memberRankText: { fontSize: 20, fontWeight: '700', color: colors.textFaint, width: 20 },
  // memberNickname: { fontSize: 15, fontWeight: '700', color: colors.text },

  // goalRow: { ...ds.rowCenter, marginBottom: 8 },
  // goalInfo: { flex: 1, ...ds.rowCenter },
  // myGoalChip: {
  //   ...ds.rowCenter,
  //   backgroundColor: 'rgba(255,255,255,0.72)',
  //   paddingHorizontal: 10,
  //   paddingVertical: 5,
  //   borderRadius: 20,
  //   flexWrap: 'wrap',
  //   gap: 4,
  // },
  // myGoalChipText: { ...typography.label, color: colors.text, textTransform: 'none' },
  // myGoalChipFreq: { ...typography.caption, color: colors.textSecondary },
  // goalRateWrap: { ...ds.rowCenter, gap: 4 },
  // goalRate: { fontSize: 14, fontWeight: '800' },
  // goalRateGray: { ...typography.caption, color: colors.textFaint, fontWeight: '500' },

  // reviewHeaderRow: {
  //   ...ds.rowBetween,
  //   marginBottom: 8,
  // },

  // placeholder: { color: colors.textMuted },
});
