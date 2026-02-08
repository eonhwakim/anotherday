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
import type { Goal, UserGoal } from '../../types/domain';
import { COLORS } from '../../constants/defaults';

interface GoalSettingProps {
  teamGoals: Goal[];
  myGoals: UserGoal[];
  onToggle: (goalId: string) => void;
  onAdd: (name: string) => Promise<boolean>;
  onRemove: (goalId: string) => void;
}

/**
 * 한달 목표 설정 (3D Clay 스타일)
 */
export default function GoalSetting({
  teamGoals = [],
  myGoals = [],
  onToggle,
  onAdd,
  onRemove,
}: GoalSettingProps) {
  const [newGoal, setNewGoal] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isSelected = (goalId: string) =>
    (myGoals || []).some((ug) => ug.goal_id === goalId);

  const handleAdd = async () => {
    const name = newGoal.trim();
    if (!name) {
      Alert.alert('목표를 입력해주세요');
      return;
    }

    setIsAdding(true);
    const success = await onAdd(name);
    setIsAdding(false);

    if (success) {
      setNewGoal('');
    } else {
      Alert.alert('등록 실패', '목표를 저장하지 못했습니다.\n네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.');
    }
  };

  const handleLongPress = (goal: Goal) => {
    Alert.alert(
      '목표 삭제',
      `"${goal.name}" 목표를 삭제할까요?\n이 목표의 인증 기록은 유지됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onRemove(goal.id),
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.titleRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="flag" size={20} color="#fff" />
        </View>
        <Text style={styles.title}>한달 목표 설정</Text>
      </View>
      <Text style={styles.subtitle}>
        도전할 목표를 추가하고, 탭하여 이번 달 실행 여부를 선택하세요
      </Text>

      {/* ── 새 목표 입력 ── */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="새 목표 입력 (예: 독서 30분)"
          placeholderTextColor={COLORS.textSecondary}
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
            style={[
              styles.addBtn,
              !newGoal.trim() && styles.addBtnDisabled,
            ]}
            onPress={handleAdd}
            disabled={!newGoal.trim()}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 기존 목표 목록 ── */}
      {(teamGoals || []).length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons
            name="bulb-outline"
            size={32}
            color={COLORS.textSecondary}
          />
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
                    size={20}
                    color={active ? '#fff' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {goal.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* 선택 현황 */}
          <Text style={styles.selectionInfo}>
            {(myGoals || []).length}개 선택됨
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 32,
    marginBottom: 20,
    // Clay Shadow
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
    fontWeight: '500',
  },

  // ── 입력 ──
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F4F8', // 아주 연한 회색 (파인 느낌)
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Button Shadow
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnDisabled: {
    backgroundColor: '#CBD5E0',
    shadowOpacity: 0,
  },

  // ── 빈 상태 ──
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
    borderRadius: 24,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#EDF2F7',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },

  // ── 목표 칩 ──
  sectionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#fff',
    // Chip Shadow
    shadowColor: '#A0AEC0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTextActive: {
    color: '#fff',
  },
  selectionInfo: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'right',
  },
});
