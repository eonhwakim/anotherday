import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../design/tokens';
import type { UserGoal } from '../../types/domain';

interface Props {
  visible: boolean;
  newMonthStr: string; // 'YYYY-MM'
  activeGoals: UserGoal[];
  goalNames: Map<string, string>;
  onContinue: () => void;
  onNewPlan: () => void;
  isSubmitting?: boolean;
}

export default function MonthlyGoalPromptModal({
  visible,
  newMonthStr,
  activeGoals,
  goalNames,
  onContinue,
  onNewPlan,
  isSubmitting = false,
}: Props) {
  const monthNum = parseInt(newMonthStr.split('-')[1], 10);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.emoji}>🗓️</Text>
          <Text style={s.title}>{monthNum}월이 시작됐어요!</Text>
          <Text style={s.subtitle}>지난달 루틴을 이번 달 루틴으로 이어서 가져올까요?</Text>

          {activeGoals.length > 0 && (
            <View style={s.goalsBox}>
              <Text style={s.goalsLabel}>이어올 지난달 루틴</Text>
              {activeGoals.slice(0, 5).map((g) => (
                <View key={g.id} style={s.goalRow}>
                  <Text style={s.goalBullet}>•</Text>
                  <Text style={s.goalName} numberOfLines={1}>
                    {goalNames.get(g.goal_id) ?? '목표'}
                  </Text>
                  <Text style={s.goalFreq}>
                    {g.frequency === 'daily' ? '매일' : `주 ${g.target_count}회`}
                  </Text>
                </View>
              ))}
              {activeGoals.length > 5 && (
                <Text style={s.moreText}>외 {activeGoals.length - 5}개 더</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[s.continueBtn, isSubmitting && s.continueBtnDisabled]}
            onPress={onContinue}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <Text style={s.continueBtnText}>
              {isSubmitting ? '가져오는 중...' : '이어서 하기'}
            </Text>
            <Text style={s.continueBtnSub}>
              지난달 루틴을 복사해서 {monthNum}월 루틴으로 새로 만들어요
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.newPlanBtn, isSubmitting && s.newPlanBtnDisabled]}
            onPress={onNewPlan}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <Text style={s.newPlanBtnText}>새로 계획하기</Text>
            <Text style={s.newPlanBtnSub}>{monthNum}월은 새 목표로 새 출발해요</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  goalsBox: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  goalsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  goalBullet: { fontSize: 14, color: colors.primaryLight, marginRight: 6 },
  goalName: { fontSize: 14, color: '#333', flex: 1, fontWeight: '500' },
  goalFreq: { fontSize: 12, color: '#999', marginLeft: 6 },
  moreText: { fontSize: 12, color: '#aaa', marginTop: 4, textAlign: 'right' },
  continueBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  continueBtnDisabled: {
    opacity: 0.7,
  },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  continueBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  newPlanBtn: {
    width: '100%',
    backgroundColor: '#F3F3F3',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  newPlanBtnDisabled: {
    opacity: 0.55,
  },
  newPlanBtnText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  newPlanBtnSub: { fontSize: 11, color: '#999', marginTop: 3 },
});
