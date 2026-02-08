import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CheckinWithGoal } from '../../types/domain';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

interface CheckinListProps {
  checkins: CheckinWithGoal[];
  date: string;
}

/**
 * 선택한 날짜의 체크인 목록
 */
export default function CheckinList({ checkins, date }: CheckinListProps) {
  const formatted = dayjs(date).format('M월 D일');

  if (checkins.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.dateTitle}>{formatted} 인증 기록</Text>
        <Text style={styles.emptyText}>이 날짜의 인증 기록이 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.dateTitle}>
        {formatted} 인증 기록 ({checkins.length}개)
      </Text>
      {checkins.map((checkin) => (
        <View key={checkin.id} style={styles.item}>
          {/* 사진 썸네일 */}
          {checkin.photo_url ? (
            <Image
              source={{ uri: checkin.photo_url }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
            </View>
          )}

          <View style={styles.info}>
            <Text style={styles.goalName}>
              {checkin.goal?.name ?? '목표'}
            </Text>
            <Text style={styles.time}>
              {dayjs(checkin.created_at).format('HH:mm')}
            </Text>
            {checkin.memo && (
              <Text style={styles.memo} numberOfLines={2}>
                {checkin.memo}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  checkIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  goalName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  memo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
