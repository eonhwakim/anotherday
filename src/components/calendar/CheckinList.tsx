import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CheckinWithGoal, Goal, UserGoal } from '../../types/domain';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

interface CheckinListProps {
  checkins: CheckinWithGoal[];
  date: string;
  goals?: Goal[]; // 전체 목표 목록 (옵션)
  myGoals?: UserGoal[]; // 내 목표 매핑 정보 (옵션)
}

/**
 * 선택한 날짜의 체크인 목록 + 미달성 목표
 */
export default function CheckinList({
  checkins,
  date,
  goals = [],
  myGoals = [],
}: CheckinListProps) {
  const formatted = dayjs(date).format('M월 D일');
  const isFuture = dayjs(date).isAfter(dayjs(), 'day');

  // 1. 내 활성 목표 ID 목록 추출
  // (날짜가 created_at 이후인 것만 필터링하면 좋지만, MVP에서는 일단 현재 활성 목표 기준)
  const myActiveGoalIds = myGoals.map((ug) => ug.goal_id);

  // 2. 해당 날짜에 수행했어야 할 목표 리스트 구성
  // (이미 체크인된 것 + 체크인 안 된 것 모두 포함)
  const combinedList = myActiveGoalIds.map((goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    const checkin = checkins.find((c) => c.goal_id === goalId);
    
    return {
      goalId,
      goalName: goal?.name ?? '알 수 없는 목표',
      checkin, // 있을 수도 있고 없을 수도 있음
    };
  });

  // 3. 체크인 목록에는 있지만, 현재 내 목표 목록에는 없는 경우 (과거 목표 등) 추가
  checkins.forEach((c) => {
    if (!myActiveGoalIds.includes(c.goal_id)) {
      combinedList.push({
        goalId: c.goal_id,
        goalName: c.goal?.name ?? '삭제된 목표',
        checkin: c,
      });
    }
  });

  if (combinedList.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.dateTitle}>{formatted} 기록</Text>
        <Text style={styles.emptyText}>설정된 목표가 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.dateTitle}>
        {formatted} 기록
      </Text>
      {combinedList.map((item, idx) => {
        const { checkin, goalName } = item;
        const isDone = !!checkin;
        const isPass = checkin?.status === 'pass' || checkin?.memo?.startsWith('[패스]');

        return (
          <View key={`${item.goalId}-${idx}`} style={[styles.item, !isDone && styles.itemPending]}>
            {/* 아이콘 / 썸네일 */}
            {isDone ? (
              checkin.photo_url ? (
                <Image source={{ uri: checkin.photo_url }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.checkIcon, isPass ? styles.iconPass : styles.iconSuccess]}>
                  <Ionicons 
                    name={isPass ? 'pause' : 'checkmark'} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
              )
            ) : (
              <View style={styles.checkIconPending}>
                <Ionicons name="ellipse-outline" size={24} color={COLORS.textSecondary} />
              </View>
            )}

            <View style={styles.info}>
              <Text style={[styles.goalName, !isDone && styles.textPending]}>
                {goalName}
              </Text>
              
              {isDone ? (
                <>
                  <Text style={styles.time}>
                    {dayjs(checkin.created_at).format('HH:mm')} · {isPass ? '패스' : '완료'}
                  </Text>
                  {checkin.memo && (
                    <Text style={styles.memo} numberOfLines={1}>
                      {checkin.memo}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.statusText}>
                  {isFuture ? '예정' : '미완료'}
                </Text>
              )}
            </View>
          </View>
        );
      })}
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
    alignItems: 'center',
  },
  itemPending: {
    backgroundColor: '#F7FAFC',
    borderColor: '#EDF2F7',
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSuccess: {
    backgroundColor: COLORS.success,
  },
  iconPass: {
    backgroundColor: COLORS.warning,
  },
  checkIconPending: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
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
  textPending: {
    color: COLORS.textSecondary,
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  memo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '500',
  },
});
