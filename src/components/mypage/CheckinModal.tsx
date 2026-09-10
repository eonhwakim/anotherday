import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, numericFont, radius, spacing, typography } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import { handleServiceError } from '../../lib/serviceError';
import {
  useCreateCheckinMutation,
  useCreatePhotoCheckinMutation,
  useDeleteCheckinMutation,
} from '../../queries/goalMutations';
import { pickImage, takePhoto } from '../../services/checkinService';

import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';

import type { Checkin, Goal } from '../../types/domain';

import BottomSheetModal from '../ui/BottomSheetModal';

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
      imageUri = __DEV__ ? await pickImage() : await takePhoto();
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

  const totalCount = goalsWithFrequency.length;
  const doneCount = goalsWithFrequency.filter((item) =>
    isGoalDoneToday(item.goal.id, checkins),
  ).length;
  const progressRatio = totalCount > 0 ? doneCount / totalCount : 0;
  const allDone = totalCount > 0 && doneCount >= totalCount;

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      titleAlign="left"
      title={<Text style={styles.headerTitle}>오늘 인증</Text>}
      disableClose={isLoading}
    >
      {totalCount === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="checkmark-done-outline" size={22} color={colors.textFaint} />
          </View>
          <Text style={styles.emptyText}>오늘 인증할 목표가 없어요</Text>
        </View>
      ) : (
        <>
          {/* 진행 요약 — 지금 몇 개 남았는지 한 줄로 */}
          <View style={styles.summary}>
            <View style={styles.summaryTextRow}>
              <Text style={styles.summaryLabel}>
                {allDone ? '오늘 목표를 전부 인증했어요' : `${totalCount - doneCount}개 남았어요`}
              </Text>
              <Text style={styles.summaryCount}>
                {doneCount}/{totalCount}
              </Text>
            </View>
            <View style={styles.summaryTrack}>
              <View
                style={[
                  styles.summaryFill,
                  allDone && styles.summaryFillDone,
                  { width: `${Math.min(progressRatio * 100, 100)}%` },
                ]}
              />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {goalsWithFrequency.map((item, index) => (
              <GoalCheckinRow
                key={item.goal.id}
                item={item}
                checkins={checkins}
                showDivider={index > 0}
                onCancelPass={handleCancelPass}
                onPassToggle={handlePassToggle}
                onSuccess={handleSuccess}
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* 처리 중에는 목록을 그대로 두고 위에 덮는다 (레이아웃이 튀지 않도록) */}
      {isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      ) : null}
    </BottomSheetModal>
  );
}

interface GoalCheckinRowProps {
  item: GoalWithFrequency;
  checkins: Checkin[];
  /** 위쪽 구분선 표시 (목록 첫 항목은 false) */
  showDivider: boolean;
  onCancelPass: (checkinId: string) => void;
  onPassToggle: (goalId: string) => void;
  onSuccess: (goalId: string) => void;
}

function GoalCheckinRow({
  item,
  checkins,
  showDivider,
  onCancelPass,
  onPassToggle,
  onSuccess,
}: GoalCheckinRowProps) {
  const { goal, frequency, targetCount, weeklyDoneCount = 0 } = item;

  const done = isGoalDoneToday(goal.id, checkins);
  const checkin = checkins.find((c) => c.goal_id === goal.id);
  const isPass = checkin?.status === 'pass';
  const isWeekly = frequency === 'weekly_count';
  const isSuccess = done && !isPass;

  const freqLabel = isWeekly ? `주 ${targetCount ?? 0}회` : '매일';
  const weeklyProgress =
    isWeekly && targetCount != null ? ` · ${weeklyDoneCount}/${targetCount}` : '';

  const weeklyPass =
    isWeekly && targetCount != null
      ? getWeeklyPassState(targetCount, weeklyDoneCount, done || isPass)
      : null;

  const usedPasses = weeklyPass
    ? weeklyPass.totalPasses - Math.max(0, weeklyPass.remainingPasses)
    : 0;

  return (
    <View style={[styles.row, showDivider && styles.rowDivided]}>
      {/* 상태 표시 — 아이콘 하나로 완료/패스/대기를 구분 */}
      <View
        style={[
          styles.statusDot,
          isSuccess && styles.statusDotDone,
          isPass && styles.statusDotPass,
        ]}
      >
        {isSuccess ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
        {isPass ? <Ionicons name="remove" size={13} color={colors.white} /> : null}
      </View>

      <View style={styles.rowTextBlock}>
        <Text
          style={[styles.goalName, done && styles.goalNameDone]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {goal.name}
        </Text>
        <Text style={styles.metaText}>
          {freqLabel}
          {weeklyProgress}
          {isPass && weeklyPass ? ` · 패스 ${usedPasses}/${weeklyPass.totalPasses}` : ''}
        </Text>
      </View>

      {done || isPass ? (
        <View style={styles.actionRow}>
          <View style={[styles.statusBadge, isPass ? styles.badgePass : styles.badgeSuccess]}>
            <Text style={[styles.statusBadgeText, isPass && styles.statusBadgeTextPass]}>
              {isPass ? '패스' : '완료'}
            </Text>
          </View>
          {isWeekly && isPass && checkin ? (
            <Pressable
              onPress={() => onCancelPass(checkin.id)}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="패스 취소"
            >
              <Text style={styles.ghostBtnText}>취소</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.actionRow}>
          {isWeekly && weeklyPass ? (
            <Pressable
              onPress={() => {
                if (!weeklyPass.isPassDisabled) onPassToggle(goal.id);
              }}
              disabled={weeklyPass.isPassDisabled}
              style={({ pressed }) => [
                styles.ghostBtn,
                pressed && styles.pressed,
                weeklyPass.isPassDisabled && styles.ghostBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="패스"
            >
              <Text
                style={[
                  styles.ghostBtnText,
                  weeklyPass.isPassDisabled && styles.ghostBtnTextDisabled,
                ]}
              >
                패스
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => onSuccess(goal.id)}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${goal.name} 사진으로 인증`}
          >
            <Ionicons name="camera" size={13} color={colors.white} />
            <Text style={styles.primaryBtnText}>인증</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.text,
  },
  summary: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  summaryTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryCount: {
    ...typography.body,
    ...numericFont,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryTrack: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  summaryFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primaryWarm,
  },
  summaryFillDone: {
    backgroundColor: colors.successBright,
  },
  body: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: 14,
  },
  rowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  statusDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.25,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  statusDotPass: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  rowTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 20,
    color: colors.text,
  },
  goalNameDone: {
    color: colors.textSecondary,
  },
  metaText: {
    ...typography.caption,
    ...numericFont,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexShrink: 0,
  },
  /** 주 행동 — 사진 인증 */
  primaryBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  /** 보조 행동 — 패스 / 취소 */
  ghostBtn: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnDisabled: {
    borderColor: 'transparent',
    backgroundColor: colors.chipNeutral,
  },
  ghostBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  ghostBtnTextDisabled: {
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
  statusBadge: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
  },
  badgePass: {
    backgroundColor: 'rgba(255, 181, 71, 0.20)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  statusBadgeTextPass: {
    color: '#B27300',
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  emptyIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.chipNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
