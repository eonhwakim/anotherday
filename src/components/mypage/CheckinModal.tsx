import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
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
  const formattedDate = dayjs(date).format('M월 D일 (ddd)');

  const isGoalDone = (goalId: string) =>
    checkins.some((c) => c.goal_id === goalId);

  const handleSuccess = async (goalId: string) => {
    if (!user) return;
    setSelectedGoalId(goalId);
    setIsLoading(true);

    try {
      const imageUri = await takePhoto();
      if (!imageUri) {
        setIsLoading(false);
        setSelectedGoalId(null);
        return;
      }

      const photoUrl = await uploadCheckinPhoto(user.id, imageUri);

      const success = await createCheckin({
        userId: user.id,
        goalId,
        date,
        photoUrl,
      });

      if (success) {
        Alert.alert('인증 완료!', '사진 인증이 완료되었어요.');
        onCheckinDone?.();
        onClose();
      } else {
        Alert.alert('알림', '이미 인증이 완료된 목표입니다.');
      }
    } catch {
      Alert.alert('오류', '인증 중 문제가 발생했어요.');
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

                  return (
                    <View
                      key={goal.id}
                      style={[
                        styles.goalRow,
                        done && styles.goalRowDone,
                      ]}
                    >
                      <View style={styles.goalInfo}>
                        <Ionicons
                          name={
                            done
                              ? isPass
                                ? 'remove-circle'
                                : 'checkmark-circle'
                              : 'ellipse-outline'
                          }
                          size={22}
                          color={
                            done
                              ? isPass
                                ? COLORS.warning
                                : COLORS.success
                              : COLORS.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.goalName,
                            done && styles.goalNameDone,
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
                      ) : (
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={styles.successBtn}
                            onPress={() => handleSuccess(goal.id)}
                          >
                            <Ionicons
                              name="camera"
                              size={15}
                              color="#fff"
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: COLORS.backgroundLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '75%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.glassBorder,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
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
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
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
    color: COLORS.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
  },

  // ── 목표 행 ──
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  goalRowDone: {
    backgroundColor: 'rgba(0,210,160,0.06)',
    borderColor: 'rgba(0,210,160,0.15)',
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
    color: COLORS.text,
  },
  goalNameDone: {
    color: COLORS.success,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(0,210,160,0.15)',
    color: COLORS.success,
  },
  badgePass: {
    backgroundColor: 'rgba(255,181,71,0.15)',
    color: COLORS.warning,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  successBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  passBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,181,71,0.3)',
    backgroundColor: 'rgba(255,181,71,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  passBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
  },

  // ── 패스 사유 ──
  passTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  passSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  passInput: {
    backgroundColor: COLORS.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: COLORS.warning,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitBtnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
