import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
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

interface CheckinModalProps {
  visible: boolean;
  date: string;
  goals: Goal[];
  checkins: Checkin[];
  onClose: () => void;
  onCheckinDone?: () => void;
}

export default function CheckinModal({
  visible,
  date,
  goals,
  checkins,
  onClose,
  onCheckinDone,
}: CheckinModalProps) {
  const user = useAuthStore((s) => s.user);
  const createCheckin = useGoalStore((s) => s.createCheckin);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'pass'>('list');
  const [passReason, setPassReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedGoalId(null);
      setMode('list');
      setPassReason('');
      setIsLoading(false);
    }
  }, [visible]);

  const isFuture = dayjs(date).isAfter(dayjs(), 'day');
  const isPast = dayjs(date).isBefore(dayjs(), 'day');
  const formattedDate = dayjs(date).format('M월 D일 (ddd)');

  const isGoalDone = (goalId: string) =>
    checkins.some((c) => c.goal_id === goalId);

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

  const enterPassMode = (goalId: string) => {
    setSelectedGoalId(goalId);
    setMode('pass');
    setPassReason('');
  };

  const handlePassSubmit = async () => {
    if (!user || !selectedGoalId) return;
    if (!passReason.trim()) {
      Alert.alert('사유를 작성해주세요', '패스 사유를 입력해야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await createCheckin({
        userId: user.id,
        goalId: selectedGoalId,
        date,
        memo: `[패스] ${passReason.trim()}`,
        status: 'pass',
      });

      if (success) {
        Alert.alert('패스 완료', '사유가 기록되었어요.');
        onCheckinDone?.();
        onClose();
      } else {
        Alert.alert('알림', '이미 인증이 완료된 목표입니다.');
      }
    } catch {
      Alert.alert('오류', '처리 중 문제가 발생했어요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setMode('list');
    setSelectedGoalId(null);
    setPassReason('');
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
            {mode === 'pass' ? (
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={COLORS.text}
                />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}
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
          ) : mode === 'list' ? (
            <ScrollView style={styles.body} bounces={false}>
              {isFuture ? (
                <Text style={styles.emptyText}>
                  미래 날짜는 인증할 수 없어요
                </Text>
              ) : goals.length === 0 ? (
                <Text style={styles.emptyText}>
                  설정된 목표가 없어요
                </Text>
              ) : (
                goals.map((goal) => {
                  const done = isGoalDone(goal.id);
                  const checkin = checkins.find(
                    (c) => c.goal_id === goal.id,
                  );
                  const isPass = checkin?.memo?.startsWith('[패스]');
                  const isMissed = isPast && !done;

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
                              : isMissed
                                ? 'close-circle'
                                : 'ellipse-outline'
                          }
                          size={22}
                          color={
                            done
                              ? isPass
                                ? COLORS.warning
                                : COLORS.success
                              : isMissed
                                ? '#EF4444'
                                : COLORS.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.goalName,
                            done && styles.goalNameDone,
                            isMissed && styles.goalNameMissed,
                          ]}
                        >
                          {goal.name}
                        </Text>
                      </View>

                      {done ? (
                        <Text
                          style={[
                            styles.statusBadge,
                            isPass
                              ? styles.badgePass
                              : styles.badgeSuccess,
                          ]}
                        >
                          {isPass ? '패스' : '성공'}
                        </Text>
                      ) : isMissed ? (
                        <Text
                          style={[styles.statusBadge, styles.badgeMissed]}
                        >
                          미달
                        </Text>
                      ) : (
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={styles.successBtn}
                            onPress={() => handleSuccess(goal.id)}
                          >
                            <Ionicons
                              name="camera"
                              size={15}
                              color="#FFFFFF"
                            />
                            <Text style={styles.successBtnText}>
                              성공
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.passBtn}
                            onPress={() => enterPassMode(goal.id)}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={15}
                              color={COLORS.warning}
                            />
                            <Text style={styles.passBtnText}>패스</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          ) : (
            <View style={styles.body}>
              <Text style={styles.passTitle}>패스 사유 작성</Text>
              <Text style={styles.passSubtitle}>
                오늘 이 목표를 패스하는 이유를 적어주세요
              </Text>
              <TextInput
                style={styles.passInput}
                placeholder="예) 몸이 안 좋아서 쉬었어요"
                placeholderTextColor={COLORS.textMuted}
                value={passReason}
                onChangeText={setPassReason}
                multiline
                maxLength={200}
                autoFocus
              />
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !passReason.trim() && styles.submitBtnDisabled,
                ]}
                onPress={handlePassSubmit}
                disabled={!passReason.trim()}
              >
                <Text style={styles.submitBtnText}>패스 제출</Text>
              </TouchableOpacity>
            </View>
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
  },
  goalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
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

  passTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  passSubtitle: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.50)',
    marginBottom: 16,
  },
  passInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#FF6B3D',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.35,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
