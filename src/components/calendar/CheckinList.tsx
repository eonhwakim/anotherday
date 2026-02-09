import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CheckinWithGoal, Goal, UserGoal } from '../../types/domain';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

interface CheckinListProps {
  checkins: CheckinWithGoal[];
  date: string;
  goals?: Goal[];
  myGoals?: UserGoal[];
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

  const myActiveGoalIds = myGoals.map((ug) => ug.goal_id);

  const combinedList = myActiveGoalIds.map((goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    const checkin = checkins.find((c) => c.goal_id === goalId);
    
    return {
      goalId,
      goalName: goal?.name ?? '알 수 없는 목표',
      checkin,
    };
  });

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
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,245,255,0.05)',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,255,0.14)',
    borderTopColor: 'rgba(255,105,180,0.10)',
    borderBottomColor: 'rgba(162,155,254,0.14)',
    gap: 12,
    alignItems: 'center',
    shadowColor: 'rgba(0,245,255,0.5)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  itemPending: {
    backgroundColor: 'rgba(162,155,254,0.03)',
    borderColor: 'rgba(162,155,254,0.08)',
    borderTopColor: 'rgba(162,155,254,0.08)',
    borderBottomColor: 'rgba(162,155,254,0.08)',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
  },
  checkIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSuccess: {
    backgroundColor: 'rgba(0,255,178,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,178,0.28)',
    shadowColor: 'rgba(0,255,178,0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  iconPass: {
    backgroundColor: 'rgba(255,181,71,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,181,71,0.30)',
    shadowColor: 'rgba(255,181,71,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  checkIconPending: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: 'rgba(162,155,254,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.12)',
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
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
