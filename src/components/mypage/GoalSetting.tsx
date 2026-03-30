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
import CyberFrame from '../ui/CyberFrame';

interface GoalSettingProps {
  teamGoals: Goal[];
  allTeamGoals?: Goal[]; // 전체 팀 목표 (추천/자동완성용)
  myGoals: UserGoal[];
  onAdd: (name: string, frequency: GoalFrequency, targetCount: number | null) => Promise<boolean>;
  onRemove: (goalId: string) => void;
  // 추가: 이번 달 한마디 관련 props
  monthlyResolution?: string;
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
}: GoalSettingProps) {
  const [newGoal, setNewGoal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [targetCount, setTargetCount] = useState(3); // 주 N회 기본값
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [resolution, setResolution] = useState(monthlyResolution);

  // monthlyResolution prop이 변경되면 내부 상태도 업데이트
  React.useEffect(() => {
    setResolution(monthlyResolution);
  }, [monthlyResolution]);

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
    <CyberFrame style={styles.cardFrame} contentStyle={styles.cardContent} glassOnly={false}>
      {/* 헤더 */}
      <View style={styles.titleRow}>
        {/* <Ionicons name="flag" size={18} color="#FF6B3D" /> */}
        <Text style={styles.title}>목표 설정</Text>
      </View>
      <Text style={styles.subtitle}>
        목표를 추가하면 오늘부터 적용됩니다
      </Text>

      {/* ── 이번 달 한마디 (목표) ── */}
      <View style={styles.resolutionSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>이번 달 한마디</Text>
        </View>
        
        <CyberFrame style={[styles.resolutionFrame, styles.brightGlass]} contentStyle={styles.resolutionBox} glassOnly={true}>
          <Text style={[styles.resolutionText, !monthlyResolution && styles.placeholderText]}>
            {monthlyResolution ? monthlyResolution : '이번 달의 다짐이나 목표를 적어보세요.'}
          </Text>
        </CyberFrame>
      </View>

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
      {/* <View style={styles.dividerSection} /> */}

      {/* ── 등록된 목표 목록 ── */}
      {(() => {
        const registeredGoals = teamGoals || [];
        if (registeredGoals.length === 0) {
          return (
            <View style={styles.emptyBox}>
              <Ionicons name="bulb-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                아직 등록된 목표가 없어요{'\n'}위에서 새 목표를 추가해보세요!
              </Text>
            </View>
          );
        }
        return (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
              등록된 목표 (길게 누름: 삭제)
              </Text>
              <Text style={styles.hintLabel}>
                주 N회 목표는 → 패스로 인증하면 오늘 제외할 수 있어요
              </Text>
            </View>
            <View style={styles.goalList}>
              {registeredGoals.map((goal, index) => {
                const ug = getMyGoal(goal.id);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    onLongPress={() => handleLongPress(goal)}
                    activeOpacity={0.7}
                    delayLongPress={500}
                  >
                    <CyberFrame style={[styles.goalRowFrame, styles.brightGlass]} contentStyle={styles.goalRowContentBox} glassOnly={true}>
                      <View style={styles.goalNumIcon}>
                        <Text style={styles.goalNumText}>{index + 1}</Text>
                      </View>
                      <View style={styles.goalRowContent}>
                        <Text style={styles.goalRowName}>{goal.name}</Text>
                        {ug && (
                          <Text style={styles.goalRowFreq}>{freqLabel(ug)}</Text>
                        )}
                      </View>
                    </CyberFrame>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        );
      })()}
    </CyberFrame>
  );
}

const styles = StyleSheet.create({
  cardFrame: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  cardContent: {
    padding: 24,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  subtitle: { fontSize: 12, color: 'rgba(26,26,26,0.50)', marginBottom: 26, lineHeight: 20, fontWeight: '400' },

  // 밝은 글래스모피즘 오버라이드 스타일
  brightGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  resolutionSection: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  resolutionFrame: { borderRadius: 12 },
  resolutionBox: {
    padding: 14,
  },
  section: { marginTop: 12 },
  resolutionText: { fontSize: 14, color: '#1A1A1A' },
  placeholderText: { color: 'rgba(26,26,26,0.30)' },
  dividerSection: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 107, 61, 0.12)' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: '#FFFAF7',
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)', borderRadius: 4,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#1A1A1A', fontWeight: '500',
  },
  addBtn: {
    width: 52, height: 52, borderRadius: 4,
    backgroundColor: '#FF6B3D', borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.30)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: 'rgba(255, 107, 61, 0.25)', borderColor: 'rgba(255, 107, 61, 0.15)' },

  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  freqBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 4,
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

  hintLabel: { fontSize: 12, color: 'rgba(26,26,26,0.40)', marginTop:6 ,marginBottom: 12, lineHeight: 16 },
  goalList: { gap: 10 },
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
  goalRowFrame: {
    borderRadius: 12,
  },
  goalRowContentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  goalRowContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  goalRowName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  goalRowFreq: { fontSize: 13, color: 'rgba(26,26,26,0.45)', marginTop: 1 },

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
