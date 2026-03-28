import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import { COLORS } from '../../constants/defaults';
import type { GoalFrequency } from '../../types/domain';

export default function AddRoutineScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const { addGoal, fetchMyGoals, fetchTeamGoals } = useGoalStore();

  const [newGoal, setNewGoal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [targetCount, setTargetCount] = useState(3);

  const handleAdd = async () => {
    const name = newGoal.trim();
    if (!name) {
      Alert.alert('루틴을 입력해주세요');
      return;
    }

    if (!user) return;

    setIsAdding(true);
    const count = frequency === 'weekly_count' ? targetCount : null;
    
    const success = await addGoal({
      teamId: currentTeam?.id,
      userId: user.id,
      name,
      frequency,
      targetCount: count,
    });
    
    setIsAdding(false);

    if (success) {
      await fetchMyGoals(user.id);
      await fetchTeamGoals(currentTeam?.id ?? '', user.id);

      if (frequency === 'weekly_count') {
        Alert.alert(
          `주 ${targetCount ?? 'N'}회 루틴 등록 완료`,
          '오늘 할 계획이 아니라면 패스 인증을 하면 산을 오를 수 있어요. (미달로 카운팅됩니다.)',
          [{ text: '확인', onPress: () => navigation.goBack() }]
        );
      } else {
        navigation.goBack();
      }
    } else {
      Alert.alert('등록 실패', '루틴을 저장하지 못했습니다.\n잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* ── 헤더 ── */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>루틴 추가</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
              <Text style={styles.label}>어떤 루틴을 추가할까요?</Text>
              
              {/* ── 입력창 ── */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="루틴 (예: 운동 30분)"
                  placeholderTextColor="rgba(26,26,26,0.30)"
                  value={newGoal}
                  onChangeText={setNewGoal}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                  maxLength={30}
                  autoFocus
                />
              </View>

              {/* ── 주기 설정 ── */}
              <View style={styles.freqSection}>
                <Text style={styles.label}>실천 주기</Text>
                <View style={styles.freqRow}>
                  <TouchableOpacity
                    style={[styles.freqBtn, frequency === 'daily' && styles.freqBtnActive]}
                    onPress={() => setFrequency('daily')}
                  >
                    <Text style={[styles.freqBtnText, frequency === 'daily' && styles.freqBtnTextActive]}>
                      매일
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.freqBtn, frequency === 'weekly_count' && styles.freqBtnActive]}
                    onPress={() => setFrequency('weekly_count')}
                  >
                    <Text style={[styles.freqBtnText, frequency === 'weekly_count' && styles.freqBtnTextActive]}>
                      주 N회
                    </Text>
                  </TouchableOpacity>
                </View>

                {frequency === 'weekly_count' && (
                  <View style={styles.targetCountRow}>
                    <Text style={styles.targetCountLabel}>일주일에 몇 번 할까요?</Text>
                    <View style={styles.counterWrap}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setTargetCount(Math.max(1, targetCount - 1))}
                      >
                        <Ionicons name="remove" size={20} color="#1A1A1A" />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{`${targetCount}회`}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setTargetCount(Math.min(6, targetCount + 1))}
                      >
                        <Ionicons name="add" size={20} color="#1A1A1A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* ── 하단 추가 버튼 ── */}
            <View style={styles.bottomArea}>
              <TouchableOpacity
                style={[styles.submitBtn, !newGoal.trim() && styles.submitBtnDisabled]}
                onPress={handleAdd}
                disabled={!newGoal.trim() || isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>추가하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFAF7',
  },
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  freqSection: {
    marginBottom: 24,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.1)',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  freqBtnActive: {
    borderColor: '#FF6B3D',
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
  },
  freqBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.5)',
  },
  freqBtnTextActive: {
    color: '#FF6B3D',
    fontWeight: '700',
  },
  targetCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.05)',
  },
  targetCountLabel: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  counterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(26,26,26,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 28,
    textAlign: 'center',
  },
  bottomArea: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  submitBtn: {
    backgroundColor: '#FF6B3D',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#FFB59A',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
