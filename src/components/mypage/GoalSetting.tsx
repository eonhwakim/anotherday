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
 * 한달 목표 설정 (Neo Glass Style)
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
          <Ionicons name="flag" size={18} color="#fff" />
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
            style={[
              styles.addBtn,
              !newGoal.trim() && styles.addBtnDisabled,
            ]}
            onPress={handleAdd}
            disabled={!newGoal.trim()}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 기존 목표 목록 ── */}
      {(teamGoals || []).length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons
            name="bulb-outline"
            size={28}
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
                    size={18}
                    color={active ? COLORS.secondary : COLORS.textSecondary}
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
    backgroundColor: 'rgba(255,105,180,0.04)',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,105,180,0.14)',
    borderTopColor: 'rgba(0,245,255,0.12)',
    borderBottomColor: 'rgba(162,155,254,0.14)',
    shadowColor: 'rgba(255,105,180,0.5)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '500',
  },

  // ── 입력 ──
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(162,155,254,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(162,155,254,0.14)',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnDisabled: {
    backgroundColor: COLORS.surfaceLight,
    shadowOpacity: 0,
  },

  // ── 빈 상태 ──
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(162,155,254,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(162,155,254,0.10)',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  // ── 목표 칩 ──
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,245,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,255,0.12)',
    borderTopColor: 'rgba(255,105,180,0.08)',
    borderBottomColor: 'rgba(162,155,254,0.12)',
    shadowColor: 'rgba(0,245,255,0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  chipActive: {
    backgroundColor: 'rgba(0,255,136,0.10)',
    borderColor: 'rgba(0,255,178,0.35)',
    borderTopColor: 'rgba(0,245,255,0.25)',
    borderBottomColor: 'rgba(0,255,178,0.30)',
    shadowColor: 'rgba(0,255,178,0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipTextActive: {
    color: COLORS.secondary,
  },
  selectionInfo: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'right',
  },
});
