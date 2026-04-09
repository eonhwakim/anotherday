import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BaseCard from './BaseCard';
import { colors } from '../../design/recipes';

/** 상단 3요약 카드 — 내용과 무관하게 동일 크기 유지 */
const SUMMARY_CARD_HEIGHT = 84;

const ICON_SIZE = 18;

/** 월간 MVP 이름만 길 때 — 이 Text에만 폰트 축소 */
const mvpNamesShrink = {
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.22,
} as const;

const androidTightText =
  Platform.OS === 'android' ? ({ includeFontPadding: false } as const) : ({} as const);

interface Props {
  rate: number | null;
  prevRate: number | null;
  centerValue: string | null;
  centerLabel: string;
  rateLabel: string;
}

export default function MonthlySummaryCards({
  rate,
  prevRate,
  centerValue,
  centerLabel,
  rateLabel,
}: Props) {
  const diffFromPrev = rate !== null && prevRate !== null ? rate - prevRate : null;

  return (
    <View style={styles.topCardsRow}>
      <BaseCard
        glassOnly
        padded={false}
        style={styles.topCard}
        contentStyle={styles.topCardContent}
      >
        <View style={styles.cardColumn}>
          <Ionicons
            name="trending-up"
            size={ICON_SIZE}
            color={colors.primary}
            style={styles.topCardIcon}
          />
          <View style={styles.valueSlot}>
            <Text
              style={[styles.sideCardValue, { color: colors.primary }]}
              numberOfLines={1}
              {...androidTightText}
            >
              {rate !== null ? `${rate}%` : '-'}
            </Text>
          </View>
          <Text style={styles.topCardLabel} numberOfLines={2} {...androidTightText}>
            {rateLabel}
          </Text>
        </View>
      </BaseCard>

      <BaseCard
        glassOnly
        padded={false}
        style={styles.topCard}
        contentStyle={styles.topCardContent}
      >
        <View style={styles.cardColumn}>
          <Ionicons
            name="ribbon-outline"
            size={ICON_SIZE}
            color={colors.warning}
            style={styles.topCardIcon}
          />
          <View style={styles.valueSlot}>
            <Text
              style={[styles.mvpCardValue, { color: colors.warning }]}
              numberOfLines={4}
              {...androidTightText}
              {...mvpNamesShrink}
            >
              {centerValue ? centerValue : '-'}
            </Text>
          </View>
          <Text style={styles.topCardLabel} numberOfLines={2} {...androidTightText}>
            {centerLabel}
          </Text>
        </View>
      </BaseCard>

      <BaseCard
        glassOnly
        padded={false}
        style={styles.topCard}
        contentStyle={styles.topCardContent}
      >
        <View style={styles.cardColumn}>
          <Ionicons
            name={diffFromPrev !== null && diffFromPrev < 0 ? 'arrow-down' : 'arrow-up'}
            size={ICON_SIZE}
            color={diffFromPrev !== null && diffFromPrev < 0 ? colors.error : colors.success}
            style={styles.topCardIcon}
          />
          <View style={styles.valueSlot}>
            <Text
              style={[styles.sideCardValue, { color: colors.success }]}
              numberOfLines={1}
              {...androidTightText}
            >
              {diffFromPrev !== null ? `${diffFromPrev > 0 ? '+' : ''}${diffFromPrev}%` : '-'}
            </Text>
          </View>
          <Text style={styles.topCardLabel} numberOfLines={2} {...androidTightText}>
            전월 대비
          </Text>
        </View>
      </BaseCard>
    </View>
  );
}

const styles = StyleSheet.create({
  topCardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 16,
    height: SUMMARY_CARD_HEIGHT,
  },
  topCard: {
    flex: 1,
    height: SUMMARY_CARD_HEIGHT,
    maxHeight: SUMMARY_CARD_HEIGHT,
    paddingVertical: 4,
  },
  topCardContent: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  /** padded={false} 대신 카드 높이에 맞는 얇은 패딩 (기본 14px×2는 88 안에 과다) */
  cardColumn: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  /** 남는 세로 — 좌·우는 퍼센트, 가운데는 MVP 이름(이름만 축소 가능) */
  valueSlot: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    justifyContent: 'center',
  },
  topCardIcon: {
    alignSelf: 'center',
    flexShrink: 0,
  },
  /** 좌·우 카드 숫자 — 고정 크기(축소 없음) */
  sideCardValue: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  /** 월간 MVP 이름 — adjustsFontSizeToFit 적용 대상 */
  mvpCardValue: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  topCardLabel: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
    flexShrink: 0,
    marginTop: 1,
  },
});
