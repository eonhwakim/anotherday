import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, Checkin } from '../../types/domain';
import { useAuthStore } from '../../stores/authStore';
import { takePhoto } from '../../services/checkinService';
import { colors } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import { handleServiceError } from '../../lib/serviceError';
import {
  useDeleteCheckinMutation,
  useCreateCheckinMutation,
  useCreatePhotoCheckinMutation,
} from '../../queries/goalMutations';
import { useTeamStore } from '../../stores/teamStore';
import Chip from '../ui/Chip';
import BaseCard from '../ui/BaseCard';
import BottomSheetModal from '../ui/BottomSheetModal';

interface GoalWithFrequency {
  goal: Goal;
  frequency: 'daily' | 'weekly_count';
  targetCount?: number | null; // 주 N회일 때 N
  weeklyDoneCount?: number; // 이번 주 완료 횟수
}

interface CheckinModalProps {
  visible: boolean;
  goalsWithFrequency: GoalWithFrequency[];
  checkins: Checkin[];
  onClose: () => void;
  onCheckinDone?: () => void;
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
  const createCheckinMutation = useCreateCheckinMutation({
    userId: user?.id,
    teamId: currentTeamId,
  });
  const createPhotoCheckinMutation = useCreatePhotoCheckinMutation({
    userId: user?.id,
    teamId: currentTeamId,
  });
  const deleteCheckinMutation = useDeleteCheckinMutation({
    userId: user?.id,
    teamId: currentTeamId,
  });

  const [isLoading, setIsLoading] = useState(false);

  const today = dayjs().format('YYYY-MM-DD');
  const formattedDate = dayjs(today).format('M월 D일 (ddd)');

  const isGoalDone = (goalId: string) => checkins.some((c) => c.goal_id === goalId);
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

  /** 주 N회 목표 패스 취소 */
  const handleCancelPass = async (checkinId: string) => {
    try {
      await runWithLoading(async () => {
        await deleteCheckinMutation.mutateAsync(checkinId);
        await refreshAfterMutation();
      });
    } catch (e) {
      handleServiceError(e);
    }
  };

  /** 주 N회 목표: 패스 토글 (체크인 생성/삭제) */
  const handlePassToggle = async (goalId: string) => {
    if (!user) return;
    try {
      await runWithLoading(async () => {
        const created = await createCheckinMutation.mutateAsync({
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

    if (!imageUri) {
      return;
    }

    try {
      await runWithLoading(async () => {
        const result = await createPhotoCheckinMutation.mutateAsync({
          userId: user.id,
          goalId,
          imageUri,
          date: today,
        });

        if (result.status === 'created') {
          Alert.alert('인증 완료!', '사진 인증이 완료되었어요.');
          await refreshAfterMutation();
          onClose();
          return;
        }

        if (result.status === 'duplicate') {
          Alert.alert('알림', '이미 인증이 완료된 목표입니다.');
        }
      });
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
            goalsWithFrequency.map(({ goal, frequency, targetCount, weeklyDoneCount = 0 }) => {
              const done = isGoalDone(goal.id);
              const checkin = checkins.find((c) => c.goal_id === goal.id);
              const isPass = checkin?.status === 'pass';
              const isWeekly = frequency === 'weekly_count';
              const freqLabel = isWeekly ? `주 ${targetCount ?? 0}회` : '매일';
              const weeklyProgress =
                isWeekly && targetCount != null ? ` (${weeklyDoneCount} / ${targetCount})` : '';

              let remainingPasses = 0;
              let totalPasses = 0;
              let isPassDisabled = false;

              // 주간 패스 가능 여부 계산 로직(7일 중 남은 패스 가능 일수 계산)
              if (isWeekly && targetCount != null) {
                totalPasses = 7 - targetCount;
                // 이번 주 남은 요일 계산
                const weekEnd = dayjs().endOf('isoWeek').startOf('day');
                const todayStart = dayjs().startOf('day');
                const remainingDays = Math.max(0, weekEnd.diff(todayStart, 'day') + 1);

                // 오늘 이미 체크인(완료/패스) 했는지 여부
                const checkedInToday = done || isPass;
                const availableDays = remainingDays - (checkedInToday ? 1 : 0);

                const maxTotalCheckins = (weeklyDoneCount || 0) + availableDays;
                remainingPasses = maxTotalCheckins - targetCount;

                // 남은 패스권이 없으면 패스 버튼 비활성화
                if (remainingPasses <= 0) {
                  isPassDisabled = true;
                }
              }

              return (
                <BaseCard
                  glassOnly
                  key={goal.id}
                  style={[
                    styles.goalFrame,
                    done && !isPass && styles.goalRowDone,
                    isPass && styles.goalRowPass,
                  ]}
                  contentStyle={styles.goalFrameContent}
                >
                  <View style={styles.goalInfo}>
                    <Ionicons
                      name={
                        done ? (isPass ? 'remove-circle' : 'checkmark-circle') : 'ellipse-outline'
                      }
                      size={22}
                      color={
                        done ? (isPass ? colors.warning : colors.success) : colors.textSecondary
                      }
                    />
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
                        <View style={{ alignItems: 'center' }}>
                          <Text style={[styles.statusBadge, styles.badgePass]}>패스</Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '500',
                              marginTop: 0,
                              color: colors.warning,
                            }}
                          >
                            ({totalPasses - Math.max(0, remainingPasses)}/{totalPasses})
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.statusBadge, styles.badgeSuccess]}>성공</Text>
                      )}
                      {isWeekly && isPass && (
                        <Chip
                          label="취소"
                          icon={<Ionicons name="refresh" size={15} color={colors.warning} />}
                          onPress={() => handleCancelPass(checkin!.id)}
                          style={styles.passBtn}
                          textStyle={[styles.passBtnText, { color: colors.warning }]}
                        />
                      )}
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Chip
                        label="성공"
                        icon={<Ionicons name="camera" size={16} color={colors.primary} />}
                        onPress={() => handleSuccess(goal.id)}
                        style={styles.successBtn}
                        textStyle={styles.successBtnText}
                      />
                      {isWeekly && (
                        <Chip
                          label={
                            <Text style={{ textAlign: 'center' }}>
                              패스
                              {/* <Text style={{ fontSize: 10, fontWeight: '500' }}>
                                ({totalPasses - Math.max(0, remainingPasses)}/{totalPasses})
                              </Text> */}
                            </Text>
                          }
                          numberOfLines={2}
                          icon={
                            <Ionicons
                              name="close-circle-outline"
                              size={16}
                              color={isPassDisabled ? colors.textMuted : colors.warning}
                            />
                          }
                          onPress={() => {
                            if (!isPassDisabled) handlePassToggle(goal.id);
                          }}
                          style={[styles.passBtn, isPassDisabled && styles.passBtnDisabled]}
                          textStyle={[
                            styles.passBtnText,
                            isPassDisabled && { color: colors.textMuted },
                          ]}
                        />
                      )}
                    </View>
                  )}
                </BaseCard>
              );
            })
          )}
        </ScrollView>
      )}
    </BottomSheetModal>
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
    backgroundColor: 'rgba(255, 255, 255, 0.45)', // 투명도를 좀 더 낮춰 유리 느낌 강화
    borderColor: 'rgba(255, 232, 199, 0.9)',
    shadowColor: '#ff5b2aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  goalRowPass: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderColor: 'rgba(255, 232, 199, 0.9)',
    shadowColor: '#FFB547',
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
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  freqLabel: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.5)',
  },
  goalNameDone: {
    color: 'rgba(26,26,26,0.45)',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
    borderWidth: 0,
  },
  badgeSuccess: {
    color: '#FF6B3D',
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
    backgroundColor: 'rgba(255, 255, 255, 0.45)', // 투명도 부여
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)', // 빛나는 테두리
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20, // 둥근 형태
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  successBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B3D', // 글씨 색상 브랜드 컬러로
  },
  passBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#FFB547',
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
  passBtnDisabled: {
    borderColor: 'rgba(26,26,26,0.1)',
    backgroundColor: 'rgba(26,26,26,0.05)',
    shadowOpacity: 0,
    elevation: 0,
  },
});
