import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, Checkin } from '../../types/domain';
import { useGoalStore } from '../../stores/goalStore';
import { useAuthStore } from '../../stores/authStore';
import { takePhoto, uploadCheckinPhoto } from '../../services/checkinService';
import { COLORS } from '../../constants/defaults';
import dayjs from '../../lib/dayjs';

interface GoalWithFrequency {
  goal: Goal;
  frequency: 'daily' | 'weekly_count';
  isExcluded?: boolean; // 오늘 제외(패스) 상태
  targetCount?: number | null; // 주 N회일 때 N
  weeklyDoneCount?: number; // 이번 주 완료 횟수
}

interface CheckinModalProps {
  visible: boolean;
  date: string;
  goalsWithFrequency: GoalWithFrequency[];
  checkins: Checkin[];
  onClose: () => void;
  onCheckinDone?: () => void;
}

export default function CheckinModal({
  visible,
  date,
  goalsWithFrequency,
  checkins,
  onClose,
  onCheckinDone,
}: CheckinModalProps) {
  const user = useAuthStore((s) => s.user);
  const createCheckin = useGoalStore((s) => s.createCheckin);
  const deleteCheckin = useGoalStore((s) => s.deleteCheckin);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedGoalId(null);
      setIsLoading(false);
    }
  }, [visible]);

  const isFuture = dayjs(date).isAfter(dayjs(), 'day');
  const isPast = dayjs(date).isBefore(dayjs(), 'day');
  const isToday = !isFuture && !isPast;
  const formattedDate = dayjs(date).format('M월 D일 (ddd)');

  const isGoalDone = (goalId: string) =>
    checkins.some((c) => c.goal_id === goalId);

  /** 체크인 취소 (성공/패스 모두 삭제) */
  const handleCancelCheckin = async (checkinId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await deleteCheckin(checkinId);
      onCheckinDone?.();
    } catch (e) {
      console.error('[Checkin] handleCancelCheckin error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  /** 주 N회 목표: 패스 토글 (체크인 생성/삭제) */
  const handlePassToggle = async (goalId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 패스 체크인 생성
      await createCheckin({
        userId: user.id,
        goalId,
        date,
        status: 'pass',
      });
      onCheckinDone?.();
    } catch (e) {
      console.error('[Checkin] handlePassToggle error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async (goalId: string) => {
    if (!user) return;
    setSelectedGoalId(goalId);

    // 1) 카메라 촬영 (모달 외부에서 실행 — 카메라 UI가 먼저 나와야 함)
    let imageUri: string | null = null;
    try {
      imageUri = await takePhoto();
    } catch (cameraErr: any) {
      console.error('[Checkin] 카메라 오류:', cameraErr);
      Alert.alert('카메라 오류', '카메라를 실행할 수 없습니다.\n앱 설정에서 카메라 권한을 확인해주세요.');
      setSelectedGoalId(null);
      return;
    }

    if (!imageUri) {
      // 사용자가 취소했거나 권한 없음
      setSelectedGoalId(null);
      return;
    }

    // 2) 이제부터 로딩 표시
    setIsLoading(true);

    try {
      // 3) 사진 업로드 (실패해도 체크인은 진행)
      let photoUrl: string | null = null;
      try {
        photoUrl = await uploadCheckinPhoto(user.id, imageUri);
      } catch (uploadErr) {
        console.warn('[Checkin] 사진 업로드 실패, 사진 없이 진행:', uploadErr);
      }

      // 4) 체크인 생성
      const success = await createCheckin({
        userId: user.id,
        goalId,
        date,
        photoUrl,
      });

      if (success) {
        Alert.alert('인증 완료!', photoUrl ? '사진 인증이 완료되었어요.' : '인증이 완료되었어요. (사진 업로드 실패)');
        onCheckinDone?.();
        onClose();
      } else {
        Alert.alert('알림', '이미 인증이 완료된 목표입니다.');
      }
    } catch (e: any) {
      console.error('[Checkin] handleSuccess error:', e);
      Alert.alert('오류', `인증 처리 중 문제가 발생했어요.\n${e?.message ?? ''}`);
    } finally {
      setIsLoading(false);
      setSelectedGoalId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayBg} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet}>
          {/* 핸들 바 */}
          <View style={styles.handleBar} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={{ width: 28 }} />
            <Text style={styles.headerTitle}>{formattedDate}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primaryLight} />
              <Text style={styles.loadingText}>처리 중...</Text>
            </View>
          ) : (
            <ScrollView style={styles.body} bounces={false}>
              {goalsWithFrequency.length === 0 ? (
                <Text style={styles.emptyText}>
                  {isFuture ? '예정된 목표가 없어요' : '설정된 목표가 없어요'}
                </Text>
              ) : (
                <>
                  {!isToday && (
                    <View style={styles.readOnlyBanner}>
                      <Ionicons name="eye-outline" size={14} color="rgba(26,26,26,0.45)" />
                      <Text style={styles.readOnlyText}>
                        {isFuture ? '미래 날짜 — 예정된 목표 미리보기' : '지난 기록 보기'}
                      </Text>
                    </View>
                  )}
                  {goalsWithFrequency.map(({ goal, frequency, isExcluded, targetCount, weeklyDoneCount = 0 }) => {
                    const done = isGoalDone(goal.id);
                    const checkin = checkins.find(
                      (c) => c.goal_id === goal.id,
                    );
                    const isPass = checkin?.status === 'pass';
                    
                    const isWeekly = frequency === 'weekly_count';
                    // 매일 목표: 과거 미인증 = 미달 / 주N회 목표: 과거 미인증 = 자동패스
                    const isMissed = isPast && !done && !isPass && !isWeekly;
                    const isAutoPass = isPast && !done && !isPass && isWeekly;
                    
                    const freqLabel = isWeekly
                      ? `주 ${targetCount ?? 0}회`
                      : '매일';
                    const weeklyProgress = isWeekly && targetCount != null
                      ? ` (${weeklyDoneCount} / ${targetCount})`
                      : '';

                    return (
                      <View
                        key={goal.id}
                        style={[
                          styles.goalRow,
                          done && styles.goalRowDone,
                          isMissed && styles.goalRowMissed,
                        ]}
                      >
                        <View style={styles.goalInfo}>
                          <Ionicons
                            name={
                              done
                                ? isPass
                                  ? 'remove-circle'
                                  : 'checkmark-circle'
                                : isPass || isAutoPass
                                  ? 'remove-circle'
                                  : isFuture
                                    ? 'time-outline'
                                    : 'ellipse-outline'
                            }
                            size={22}
                            color={
                              done
                                ? COLORS.success
                                : isPass || isAutoPass
                                  ? COLORS.warning
                                  : isFuture
                                    ? 'rgba(255, 107, 61, 0.4)'
                                    : COLORS.textSecondary
                            }
                          />
                          <View style={styles.goalNameRow}>
                            <Text
                              style={[
                                styles.goalName,
                                done && styles.goalNameDone,
                                isMissed && styles.goalNameMissed,
                              ]}
                              numberOfLines={2}
                              ellipsizeMode="tail"
                            >
                              {goal.name}
                            </Text>
                            <Text style={styles.freqLabel}>
                              {freqLabel}{weeklyProgress}
                            </Text>
                          </View>
                        </View>

                        {/* 상태 표시 / 액션 버튼 */}
                        {done || isPass ? (
                          <View style={styles.actionRow}>
                            <Text
                              style={[
                                styles.statusBadge,
                                isPass ? styles.badgePass : styles.badgeSuccess,
                              ]}
                            >
                              {isPass ? '패스함' : '성공'}
                            </Text>
                            {isToday && isWeekly && isPass && (
                              <TouchableOpacity
                                style={styles.passBtn}
                                onPress={() => handleCancelCheckin(checkin!.id)}
                              >
                                <Ionicons name="refresh" size={15} color={COLORS.warning} />
                                <Text style={[styles.passBtnText, { color: COLORS.warning }]}>취소</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : isAutoPass ? (
                          <Text style={[styles.statusBadge, styles.badgePass]}>자동패스</Text>
                        ) : isMissed ? (
                          <Text style={[styles.statusBadge, styles.badgeMissed]}>미달</Text>
                        ) : isFuture ? (
                          <Text style={[styles.statusBadge, styles.badgeFuture]}>예정</Text>
                        ) : isToday ? (
                          <View style={styles.actionRow}>
                            <TouchableOpacity
                              style={styles.successBtn}
                              onPress={() => handleSuccess(goal.id)}
                            >
                              <Ionicons name="camera" size={15} color="#FFFFFF" />
                              <Text style={styles.successBtnText}>성공</Text>
                            </TouchableOpacity>
                            {isWeekly && (
                              <TouchableOpacity
                                style={styles.passBtn}
                                onPress={() => handlePassToggle(goal.id)}
                              >
                                <Ionicons name="close-circle-outline" size={15} color={COLORS.warning} />
                                <Text style={styles.passBtnText}>패스</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayBg: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFAF7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '75%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 107, 61, 0.15)',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 107, 61, 0.20)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 61, 0.08)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  backBtn: { padding: 4 },
  closeBtn: { padding: 4 },
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

  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.10)',
  },
  goalRowDone: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.18)',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  freqLabel: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.5)',
  },
  goalNameDone: {
    color: 'rgba(26,26,26,0.45)',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
    alignSelf: 'center',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(239, 122, 68, 0.08)',
    color: '#FF6B3D',
    borderColor: 'rgba(239,68,68,0.18)',
  },
  badgePass: {
    backgroundColor: 'rgba(255,181,71,0.10)',
    color: '#E8960A',
    borderColor: 'rgba(255,181,71,0.20)',
  },
  badgeMissed: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    color: '#EF4444',
    borderColor: 'rgba(239,68,68,0.18)',
  },
  badgeFuture: {
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    color: 'rgba(255, 107, 61, 0.65)',
    borderColor: 'rgba(255, 107, 61, 0.15)',
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26,26,26,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  readOnlyText: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.45)',
    fontWeight: '500',
  },
  goalRowMissed: {
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderColor: 'rgba(239,68,68,0.12)',
  },
  goalNameMissed: {
    color: 'rgba(26,26,26,0.35)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B3D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  successBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  passBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.15)',
    backgroundColor: 'rgba(255, 107, 61, 0.04)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  passBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.50)',
  },
});
