import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, UserGoal, GoalFrequency } from '../../types/domain';
import { COLORS } from '../../constants/defaults';

interface GoalSettingProps {
  teamGoals: Goal[];
  myGoals: UserGoal[];
  onToggle: (goalId: string) => void;
  onAdd: (name: string, frequency: GoalFrequency, targetCount: number | null) => Promise<boolean>;
  onRemove: (goalId: string) => void;
}

/** 주기 표시 텍스트 */
function freqLabel(ug: UserGoal): string {
  if (ug.frequency === 'daily') return '매일';
  if (ug.frequency === 'weekly_count' && ug.target_count) return `주 ${ug.target_count}회`;
  return '매일';
}

export default function GoalSetting({
  teamGoals = [],
  myGoals = [],
  onToggle,
  onAdd,
  onRemove,
}: GoalSettingProps) {
  const [newGoal, setNewGoal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [targetCount, setTargetCount] = useState(3); // 주 N회 기본값

  const isSelected = (goalId: string) =>
    (myGoals || []).some((ug) => ug.goal_id === goalId);

  const getMyGoal = (goalId: string) =>
    (myGoals || []).find((ug) => ug.goal_id === goalId);

  const handleAdd = async () => {
    const name = newGoal.trim();
    if (!name) {
      Alert.alert('목표를 입력해주세요');
      return;
    }

    setIsAdding(true);
    const count = frequency === 'weekly_count' ? targetCount : null;
    const success = await onAdd(name, frequency, count);
    setIsAdding(false);

    if (success) {
      setNewGoal('');
      setFrequency('daily');
      setTargetCount(3);
    } else {
      Alert.alert('등록 실패', '목표를 저장하지 못했습니다.\n잠시 후 다시 시도해주세요.');
    }
  };

  const handleLongPress = (goal: Goal) => {
    Alert.alert(
      '목표 삭제',
      `"${goal.name}" 목표를 삭제할까요?\n인증 기록은 유지됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => onRemove(goal.id) },
      ],
    );
  };

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.titleRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="flag" size={18} color="#fff" />
        </View>
        <Text style={styles.title}>목표 설정</Text>
      </View>
      <Text style={styles.subtitle}>
        목표를 추가하면 오늘부터 이번 달 말까지 적용됩니다
      </Text>

      {/* ── 새 목표 입력 ── */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="새 목표 (예: 운동 30분)"
          placeholderTextColor={COLORS.textMuted}
          value={newGoal}
          onChangeText={setNewGoal}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          maxLength={30}
        />
        {isAdding ? (
          <View style={styles.addBtn}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, !newGoal.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newGoal.trim()}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 반복 주기 선택 ── */}
      <View style={styles.freqRow}>
        <TouchableOpacity
          style={[styles.freqBtn, frequency === 'daily' && styles.freqBtnActive]}
          onPress={() => setFrequency('daily')}
        >
          <Ionicons name="refresh" size={14} color={frequency === 'daily' ? '#fff' : 'rgba(255,255,255,0.45)'} />
          <Text style={[styles.freqText, frequency === 'daily' && styles.freqTextActive]}>매일</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.freqBtn, frequency === 'weekly_count' && styles.freqBtnActive]}
          onPress={() => setFrequency('weekly_count')}
        >
          <Ionicons name="calendar-outline" size={14} color={frequency === 'weekly_count' ? '#fff' : 'rgba(255,255,255,0.45)'} />
          <Text style={[styles.freqText, frequency === 'weekly_count' && styles.freqTextActive]}>주 N회</Text>
        </TouchableOpacity>
      </View>

      {/* ── 주 N회 선택 ── */}
      {frequency === 'weekly_count' && (
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>주</Text>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.countBtn, targetCount === n && styles.countBtnActive]}
              onPress={() => setTargetCount(n)}
            >
              <Text style={[styles.countBtnText, targetCount === n && styles.countBtnTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.countLabel}>회</Text>
        </View>
      )}

      {/* ── 기존 목표 목록 ── */}
      {(teamGoals || []).length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="bulb-outline" size={28} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            아직 등록된 목표가 없어요{'\n'}위에서 새 목표를 추가해보세요!
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>
            등록된 목표 (탭: 선택/해제 · 길게 누름: 삭제)
          </Text>
          <View style={styles.chips}>
            {(teamGoals || []).map((goal) => {
              const active = isSelected(goal.id);
              const ug = getMyGoal(goal.id);
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => onToggle(goal.id)}
                  onLongPress={() => handleLongPress(goal)}
                  activeOpacity={0.7}
                  delayLongPress={500}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={active ? '#fff' : COLORS.textSecondary}
                  />
                  <View>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {goal.name}
                    </Text>
                    {active && ug && (
                      <Text style={styles.chipSchedule}>{freqLabel(ug)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.selectionInfo}>{(myGoals || []).length}개 선택됨</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16, padding: 24, borderRadius: 8, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: 'rgba(255,255,255,0.06)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 3,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconCircle: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20, lineHeight: 20, fontWeight: '500' },

  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.text, fontWeight: '500',
  },
  addBtn: {
    width: 52, height: 52, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' },

  // ── 반복 주기 ──
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  freqBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  freqBtnActive: { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.20)' },
  freqText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  freqTextActive: { color: '#FFFFFF' },

  // ── 주 N회 선택 ──
  countRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20, justifyContent: 'center',
  },
  countLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.50)', marginHorizontal: 4 },
  countBtn: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  countBtnActive: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.28)' },
  countBtnText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  countBtnTextActive: { color: '#FFFFFF' },

  // ── 빈 상태 ──
  emptyBox: {
    alignItems: 'center', paddingVertical: 32, gap: 12, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  // ── 목표 칩 ──
  sectionLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12, fontWeight: '600', letterSpacing: 0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.20)',
    shadowColor: 'rgba(255,255,255,0.10)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 8,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.70)' },
  chipTextActive: { color: '#FFFFFF' },
  chipSchedule: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.40)', marginTop: 2 },
  selectionInfo: { fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: '700', marginTop: 14, textAlign: 'right' },
});
