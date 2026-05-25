import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import { handleServiceError } from '../../lib/serviceError';
import {
  useCreateCheckinMutation,
  useCreatePhotoCheckinMutation,
  useDeleteCheckinMutation,
} from '../../queries/goalMutations';
import { takePhoto } from '../../services/checkinService';

import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';

import type { Checkin, Goal } from '../../types/domain';

import BottomSheetModal from '../ui/BottomSheetModal';
import BaseCard from '../ui/BaseCard';
import Chip from '../ui/Chip';

export interface GoalWithFrequency {
  goal: Goal;
  frequency: 'daily' | 'weekly_count';
  targetCount?: number | null;
  weeklyDoneCount?: number;
}

interface CheckinModalProps {
  visible: boolean;
  goalsWithFrequency: GoalWithFrequency[];
  checkins: Checkin[];
  onClose: () => void;
  onCheckinDone?: () => void;
}

interface WeeklyPassState {
  totalPasses: number;
  remainingPasses: number;
  isPassDisabled: boolean;
}

const TODAY = () => dayjs().format('YYYY-MM-DD');

function isGoalDoneToday(goalId: string, checkins: Checkin[]) {
  return checkins.some((checkin) => checkin.goal_id === goalId);
}

/** 주 N회 목표: 이번 주 남은 패스 가능 횟수 */
function getWeeklyPassState(
  targetCount: number,
  weeklyDoneCount: number,
  checkedInToday: boolean,
): WeeklyPassState {
  const totalPasses = 7 - targetCount;
  const weekEnd = dayjs().endOf('isoWeek').startOf('day');
  const todayStart = dayjs().startOf('day');
  const remainingDays = Math.max(0, weekEnd.diff(todayStart, 'day') + 1);
  const availableDays = remainingDays - (checkedInToday ? 1 : 0);
  const maxTotalCheckins = weeklyDoneCount + availableDays;
  const remainingPasses = maxTotalCheckins - targetCount;

  return {
    totalPasses,
    remainingPasses,
    isPassDisabled: remainingPasses <= 0,
  };
}

function useCheckinModalMutations(userId?: string, teamId?: string) {
  const mutationContext = { userId, teamId };
  return {
    createCheckin: useCreateCheckinMutation(mutationContext),
    createPhotoCheckin: useCreatePhotoCheckinMutation(mutationContext),
    deleteCheckin: useDeleteCheckinMutation(mutationContext),
  };
}

export default function CheckinModal({
  visible,
  goalsWithFrequency,
  checkins,
  onClose,
  onCheckinDone,
}: CheckinModalProps) {
  const user = useAuthStore((s) => s.user);
  const currentTeamId = useTeamStore((s) => s.currentTeam?.id);
  const { createCheckin, createPhotoCheckin, deleteCheckin } = useCheckinModalMutations(
    user?.id,
    currentTeamId,
  );

  const [isLoading, setIsLoading] = useState(false);

  const today = TODAY();
  const formattedDate = dayjs(today).format('M월 D일 (ddd)');

  const refreshAfterMutation = async () => {
    await onCheckinDone?.();
  };

  const runWithLoading = async (task: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await task();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPass = async (checkinId: string) => {
    try {
      await runWithLoading(async () => {
        await deleteCheckin.mutateAsync(checkinId);
        await refreshAfterMutation();
      });
    } catch (e) {
      handleServiceError(e);
    }
  };

  const handlePassToggle = async (goalId: string) => {
    if (!user) return;

    try {
      await runWithLoading(async () => {
        const created = await createCheckin.mutateAsync({
          userId: user.id,
          goalId,
          date: today,
          status: 'pass',
        });
        if (!created) {
          Alert.alert('알림', '이미 체크인된 목표입니다.');
          return;
        }
        await refreshAfterMutation();
      });
    } catch (e) {
      handleServiceError(e);
    }
  };

  const handleSuccess = async (goalId: string) => {
    if (!user) return;

    let imageUri: string | null = null;
    try {
      imageUri = await takePhoto();
    } catch (cameraErr) {
      handleServiceError(cameraErr);
      return;
    }

    if (!imageUri) return;

    try {
      onClose();
      const result = await createPhotoCheckin.mutateAsync({
        userId: user.id,
        goalId,
        imageUri,
        date: today,
      });

      if (result.status === 'created') {
        void refreshAfterMutation();
        return;
      }

      if (result.status === 'duplicate') {
        Alert.alert('알림', '이미 인증이 완료된 목표입니다.');
      }
    } catch (e) {
      handleServiceError(e);
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={formattedDate}
      disableClose={isLoading}
    >
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} bounces={false}>
          {goalsWithFrequency.length === 0 ? (
            <Text style={styles.emptyText}>오늘 인증할 목표가 없어요</Text>
          ) : (
            goalsWithFrequency.map((item) => (
              <GoalCheckinCard
                key={item.goal.id}
                item={item}
                checkins={checkins}
                onCancelPass={handleCancelPass}
                onPassToggle={handlePassToggle}
                onSuccess={handleSuccess}
              />
            ))
          )}
        </ScrollView>
      )}
    </BottomSheetModal>
  );
}

interface GoalCheckinCardProps {
  item: GoalWithFrequency;
  checkins: Checkin[];
  onCancelPass: (checkinId: string) => void;
  onPassToggle: (goalId: string) => void;
  onSuccess: (goalId: string) => void;
}

function GoalCheckinCard({
  item,
  checkins,
  onCancelPass,
  onPassToggle,
  onSuccess,
}: GoalCheckinCardProps) {
  const { goal, frequency, targetCount, weeklyDoneCount = 0 } = item;

  const done = isGoalDoneToday(goal.id, checkins);
  const checkin = checkins.find((c) => c.goal_id === goal.id);
  const isPass = checkin?.status === 'pass';
  const isWeekly = frequency === 'weekly_count';

  const freqLabel = isWeekly ? `주 ${targetCount ?? 0}회` : '매일';
  const weeklyProgress =
    isWeekly && targetCount != null ? ` (${weeklyDoneCount}/${targetCount})` : '';

  const weeklyPass =
    isWeekly && targetCount != null
      ? getWeeklyPassState(targetCount, weeklyDoneCount, done || isPass)
      : null;

  const usedPasses = weeklyPass
    ? weeklyPass.totalPasses - Math.max(0, weeklyPass.remainingPasses)
    : 0;

  const statusIcon = done ? (isPass ? 'remove-circle' : 'checkmark-circle') : 'ellipse-outline';
  const statusColor = done ? (isPass ? colors.warning : colors.success) : colors.textSecondary;

  return (
    <BaseCard
      glassOnly
      style={[
        styles.goalFrame,
        done && !isPass && styles.goalRowDone,
        isPass && styles.goalRowPass,
      ]}
      contentStyle={styles.goalFrameContent}
    >
      <View style={styles.goalInfo}>
        <Ionicons name={statusIcon} size={22} color={statusColor} />
        <View style={styles.goalNameRow}>
          <Text
            style={[styles.goalName, done && styles.goalNameDone]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {goal.name}
          </Text>
          <Text style={styles.freqLabel}>
            {freqLabel}
            {weeklyProgress}
          </Text>
        </View>
      </View>

      {done || isPass ? (
        <View style={styles.actionRow}>
          {isPass ? (
            <View style={styles.passStatusWrap}>
              <Text style={[styles.statusBadge, styles.badgePass]}>패스</Text>
              {weeklyPass ? (
                <Text style={styles.passCountText}>
                  ({usedPasses}/{weeklyPass.totalPasses})
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.statusBadge, styles.badgeSuccess]}>성공</Text>
          )}
          {isWeekly && isPass && checkin ? (
            <Chip
              label="취소"
              icon={<Ionicons name="refresh" size={15} color={colors.warning} />}
              onPress={() => onCancelPass(checkin.id)}
              style={styles.passBtn}
              textStyle={[styles.passBtnText, styles.passBtnTextWarning]}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Chip
            label="성공"
            icon={<Ionicons name="camera" size={16} color={colors.primary} />}
            onPress={() => onSuccess(goal.id)}
            style={styles.successBtn}
            textStyle={styles.successBtnText}
          />
          {isWeekly && weeklyPass ? (
            <Chip
              label="패스"
              icon={
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color={weeklyPass.isPassDisabled ? colors.textMuted : colors.warning}
                />
              }
              onPress={() => {
                if (!weeklyPass.isPassDisabled) onPassToggle(goal.id);
              }}
              style={[styles.passBtn, weeklyPass.isPassDisabled && styles.passBtnDisabled]}
              textStyle={[
                styles.passBtnText,
                weeklyPass.isPassDisabled && styles.passBtnTextDisabled,
              ]}
            />
          ) : null}
        </View>
      )}
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(26,26,26,0.50)',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(26,26,26,0.50)',
    textAlign: 'center',
    paddingVertical: 32,
  },
  goalFrame: {
    marginBottom: 12,
    marginTop: 0,
  },
  goalFrameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  goalRowDone: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderColor: 'rgba(255, 232, 199, 0.9)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  goalRowPass: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderColor: 'rgba(255, 232, 199, 0.9)',
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  goalNameRow: {
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  freqLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  goalNameDone: {
    color: 'rgba(26,26,26,0.45)',
  },
  passStatusWrap: {
    alignItems: 'center',
  },
  passCountText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 0,
    color: colors.warning,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
    borderWidth: 0,
  },
  badgeSuccess: {
    color: colors.primary,
  },
  badgePass: {
    color: colors.warning,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  successBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  successBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  passBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  passBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
  },
  passBtnTextWarning: {
    color: colors.warning,
  },
  passBtnTextDisabled: {
    color: colors.textMuted,
  },
  passBtnDisabled: {
    borderColor: 'rgba(26,26,26,0.1)',
    backgroundColor: 'rgba(26,26,26,0.05)',
    shadowOpacity: 0,
    elevation: 0,
  },
});
