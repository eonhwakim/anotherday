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
  allTeamGoals?: Goal[]; // 전체 팀 목표 (추천/자동완성용)
  myGoals: UserGoal[];
  onAdd: (name: string, frequency: GoalFrequency, targetCount: number | null) => Promise<boolean>;
  onRemove: (goalId: string) => void;
  // 추가: 이번 달 한마디 관련 props
  monthlyResolution?: string;
  onUpdateResolution?: (text: string) => Promise<void>;
}

/** 주기 표시 텍스트 */
function freqLabel(ug: UserGoal): string {
  if (ug.frequency === 'daily') return '매일';
  if (ug.frequency === 'weekly_count' && ug.target_count) return `주 ${ug.target_count}회`;
  return '매일';
}

export default function GoalSetting({
  teamGoals = [],
  allTeamGoals = [],
  myGoals = [],
  onAdd,
  onRemove,
  monthlyResolution = '',
  onUpdateResolution,
}: GoalSettingProps) {
  const [newGoal, setNewGoal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [targetCount, setTargetCount] = useState(3); // 주 N회 기본값
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 이번 달 한마디 상태
  const [resolution, setResolution] = useState(monthlyResolution);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [isSavingResolution, setIsSavingResolution] = useState(false);

  // monthlyResolution prop이 변경되면 내부 상태도 업데이트
  React.useEffect(() => {
    setResolution(monthlyResolution);
  }, [monthlyResolution]);

  const handleSaveResolution = async () => {
    if (!onUpdateResolution) return;
    setIsSavingResolution(true);
    try {
      await onUpdateResolution(resolution);
      setIsEditingResolution(false);
    } catch (e) {
      Alert.alert('저장 실패', '한마디 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingResolution(false);
    }
  };

  // ── 추천 태그 (내가 아직 선택하지 않은 팀 목표 중 랜덤 5개) ──
  const recommendedGoals = React.useMemo(() => {
    const myGoalIds = new Set((myGoals || []).map(ug => ug.goal_id));
    const candidates = (allTeamGoals || []).filter(g => !myGoalIds.has(g.id));
    // 셔플 후 5개
    return candidates.sort(() => 0.5 - Math.random()).slice(0, 5);
  }, [allTeamGoals, myGoals]);

  // ── 자동완성 목록 (입력값에 포함되는 목표) ──
  const suggestions = React.useMemo(() => {
    if (!newGoal.trim()) return [];
    const lowerInput = newGoal.trim().toLowerCase();
    // 이미 내 목록에 있는 건 제외하고 추천
    const myGoalIds = new Set((myGoals || []).map(ug => ug.goal_id));
    
    return (allTeamGoals || [])
      .filter(g => 
        g.name.toLowerCase().includes(lowerInput) && 
        !myGoalIds.has(g.id)
      )
      .slice(0, 3); // 최대 3개만
  }, [newGoal, allTeamGoals, myGoals]);

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
      setShowSuggestions(false);
      setFrequency('daily');
      setTargetCount(3);
    } else {
      Alert.alert('등록 실패', '목표를 저장하지 못했습니다.\n잠시 후 다시 시도해주세요.');
    }
  };

  const handleSelectSuggestion = (goalName: string) => {
    setNewGoal(goalName);
    setShowSuggestions(false);
    // 바로 추가하지 않고 입력창에 채워줌 (주기 설정 등을 위해)
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
          <Ionicons name="flag" size={18} color="#FF6B3D" />
        </View>
        <Text style={styles.title}>목표 설정</Text>
      </View>
      <Text style={styles.subtitle}>
        목표를 추가하면 오늘부터 이번 달 말까지 적용됩니다
      </Text>

      {/* ── 이번 달 한마디 (목표) ── */}
      {onUpdateResolution && (
        <View style={styles.resolutionSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>이번 달 한마디(목표)</Text>
          </View>
          
          {isEditingResolution ? (
            <View style={styles.resolutionEditBox}>
              <TextInput
                style={styles.resolutionInput}
                value={resolution}
                onChangeText={setResolution}
                placeholder="이번 달의 다짐이나 목표를 적어보세요"
                placeholderTextColor="rgba(26,26,26,0.30)"
                maxLength={50}
                autoFocus
              />
              <View style={styles.resolutionActions}>
                <TouchableOpacity 
                  style={styles.resolutionCancelBtn}
                  onPress={() => {
                    setResolution(monthlyResolution);
                    setIsEditingResolution(false);
                  }}
                  disabled={isSavingResolution}
                >
                  <Text style={styles.resolutionCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.resolutionSaveBtn}
                  onPress={handleSaveResolution}
                  disabled={isSavingResolution}
                >
                  {isSavingResolution ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.resolutionSaveText}>저장</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.resolutionBox}
              onPress={() => setIsEditingResolution(true)}
            >
              <Text style={[styles.resolutionText, !resolution && styles.placeholderText]}>
                {resolution || '이번 달의 다짐이나 목표를 적어보세요.'}
              </Text>
              <Ionicons name="pencil" size={14} color={COLORS.textSecondary} style={styles.reviewIcon} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── 2. 인기 태그 (추천 목표) ── */}
      {/* {recommendedGoals.length > 0 && (
        <View style={styles.recommendSection}>
          <Text style={styles.recommendTitle}>🔥 팀원들이 도전 중인 목표</Text>
          <View style={styles.recommendChips}>
            {recommendedGoals.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.recommendChip}
                onPress={() => handleSelectSuggestion(g.name)}
              >
                <Text style={styles.recommendChipText}>#{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )} */}

      {/* ── 새 목표 입력 & 1. 자동완성 ── */}
      <View style={{ zIndex: 10 }}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="새 목표 (예: 운동 30분)"
            placeholderTextColor="rgba(26,26,26,0.30)"
            value={newGoal}
            onChangeText={(text) => {
              setNewGoal(text);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // 클릭 이벤트 처리를 위해 약간의 딜레이
              setTimeout(() => setShowSuggestions(false), 200);
            }}
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

        {/* 자동완성 드롭다운 */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(g.name)}
              >
                <Ionicons name="search-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.suggestionText}>{g.name}</Text>
                <Text style={styles.suggestionSub}>기존 목표</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── 반복 주기 선택 ── */}
      <View style={styles.freqRow}>
        <TouchableOpacity
          style={[styles.freqBtn, frequency === 'daily' && styles.freqBtnActive]}
          onPress={() => setFrequency('daily')}
        >
          <Ionicons name="refresh" size={14} color={frequency === 'daily' ? '#FF6B3D' : 'rgba(26,26,26,0.40)'} />
          <Text style={[styles.freqText, frequency === 'daily' && styles.freqTextActive]}>매일</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.freqBtn, frequency === 'weekly_count' && styles.freqBtnActive]}
          onPress={() => setFrequency('weekly_count')}
        >
          <Ionicons name="calendar-outline" size={14} color={frequency === 'weekly_count' ? '#FF6B3D' : 'rgba(26,26,26,0.40)'} />
          <Text style={[styles.freqText, frequency === 'weekly_count' && styles.freqTextActive]}>주 N회</Text>
        </TouchableOpacity>
      </View>

      {/* ── 주 N회 선택 ── */}
      {frequency === 'weekly_count' && (
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>주</Text>
          {[1, 2, 3, 4, 5, 6].map((n) => (
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

      {/* ── 등록된 목표 목록 ── */}
      {(() => {
        const registeredGoals = teamGoals || [];
        if (registeredGoals.length === 0) {
          return (
            <View style={styles.emptyBox}>
              <Ionicons name="bulb-outline" size={28} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                아직 등록된 목표가 없어요{'\n'}위에서 새 목표를 추가해보세요!
              </Text>
            </View>
          );
        }
        return (
          <>
            <Text style={styles.sectionLabel}>
              등록된 목표 (길게 누름: 삭제)
            </Text>
            <Text style={styles.hintLabel}>
              주 N회 목표는 캘린더 → 인증하기에서 패스로 오늘 제외할 수 있어요
            </Text>
            <View style={styles.goalList}>
              {registeredGoals.map((goal, index) => {
                const ug = getMyGoal(goal.id);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={styles.goalRow}
                    onLongPress={() => handleLongPress(goal)}
                    activeOpacity={0.7}
                    delayLongPress={500}
                  >
                    <View style={styles.goalNumIcon}>
                      <Text style={styles.goalNumText}>{index + 1}</Text>
                    </View>
                    <View style={styles.goalRowContent}>
                      <Text style={styles.goalRowName}>{goal.name}</Text>
                      {ug && (
                        <Text style={styles.goalRowFreq}>{freqLabel(ug)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16, padding: 24, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)',
    shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconCircle: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 61, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: 'rgba(26,26,26,0.50)', marginBottom: 20, lineHeight: 20, fontWeight: '500' },

  resolutionSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  resolutionBox: {
    backgroundColor: '#FFFAF7', padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
  },
  resolutionText: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  reviewIcon: { marginTop: 2, opacity: 0.5 },
  placeholderText: { color: 'rgba(26,26,26,0.30)' },
  resolutionEditBox: { gap: 8 },
  resolutionInput: {
    backgroundColor: '#FFFAF7', padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.30)',
    fontSize: 14, color: '#1A1A1A',
  },
  resolutionActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  resolutionCancelBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6,
    backgroundColor: 'rgba(26,26,26,0.05)',
  },
  resolutionCancelText: { fontSize: 13, color: 'rgba(26,26,26,0.6)', fontWeight: '600' },
  resolutionSaveBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6,
    backgroundColor: '#FF6B3D', minWidth: 60, alignItems: 'center',
  },
  resolutionSaveText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: '#FFFAF7',
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1A1A', fontWeight: '500',
  },
  addBtn: {
    width: 52, height: 52, borderRadius: 8,
    backgroundColor: '#FF6B3D', borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.30)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: 'rgba(255, 107, 61, 0.25)', borderColor: 'rgba(255, 107, 61, 0.15)' },

  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  freqBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#FFFAF7', borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)',
  },
  freqBtnActive: { backgroundColor: 'rgba(255, 107, 61, 0.08)', borderColor: 'rgba(255, 107, 61, 0.25)' },
  freqText: { fontSize: 13, fontWeight: '600', color: 'rgba(26,26,26,0.40)' },
  freqTextActive: { color: '#FF6B3D' },

  countRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, justifyContent: 'center',
  },
  countLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(26,26,26,0.40)', marginHorizontal: 6 },
  countBtn: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFAF7', borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)',
  },
  countBtnActive: { backgroundColor: 'rgba(255, 107, 61, 0.08)', borderColor: 'rgba(255, 107, 61, 0.25)' },
  countBtnText: { fontSize: 15, fontWeight: '700', color: 'rgba(26,26,26,0.40)' },
  countBtnTextActive: { color: '#FF6B3D' },

  emptyBox: {
    alignItems: 'center', paddingVertical: 32, gap: 12, borderRadius: 8,
    backgroundColor: '#FFFAF7', borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)',
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 14, color: 'rgba(26,26,26,0.45)', textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  sectionLabel: { fontSize: 12, color: 'rgba(26,26,26,0.45)', marginBottom: 8, fontWeight: '600', letterSpacing: 0.3 },
  hintLabel: { fontSize: 11, color: 'rgba(26,26,26,0.40)', marginBottom: 12, lineHeight: 16 },
  goalList: { gap: 0 },
  goalNumIcon: {
    width: 18,
    height: 18,
    borderRadius: 14,
    backgroundColor: '#FF6B3D',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,26,26,0.06)',
  },
  goalRowContent: { flex: 1 },
  goalRowName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  goalRowFreq: { fontSize: 12, color: 'rgba(26,26,26,0.45)', marginTop: 2 },

  recommendSection: { marginBottom: 16 },
  recommendTitle: { fontSize: 12, color: '#E8960A', fontWeight: '600', marginBottom: 8 },
  recommendChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recommendChip: {
    backgroundColor: 'rgba(255,181,71,0.10)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,181,71,0.20)',
  },
  recommendChipText: { fontSize: 12, color: 'rgba(26,26,26,0.70)', fontWeight: '500' },

  suggestionsBox: {
    position: 'absolute', top: 56, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.15)',
    shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 8,
    elevation: 5, overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 107, 61, 0.06)',
  },
  suggestionText: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  suggestionSub: { fontSize: 11, color: 'rgba(26,26,26,0.40)' },
});
