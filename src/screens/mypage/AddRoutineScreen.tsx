import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { colors } from '../../design/tokens';
import type { GoalFrequency } from '../../types/domain';
import CyberFrame from '../../components/ui/CyberFrame';
import Input from '../../components/common/Input';
import { getCalendarWeekRanges } from '../../lib/statsUtils';
import dayjs from '../../lib/dayjs';

export default function AddRoutineScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const { addGoal, fetchMyGoals, fetchTeamGoals } = useGoalStore();

  const [newGoal, setNewGoal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [targetCount, setTargetCount] = useState(3);
  const [duration, setDuration] = useState<'continuous' | 'this_month'>('continuous');

  const getComputedEndDate = () => {
    const today = dayjs();
    const todayStr = today.format('YYYY-MM-DD');

    // 오늘이 속한 "통계 기준 월"을 찾기 위해 현재 월과 다음 월을 검사합니다.
    const candidates = [today.format('YYYY-MM'), today.add(1, 'month').format('YYYY-MM')];

    let targetMonth = candidates[0];
    let matchedRanges: { s: dayjs.Dayjs; e: dayjs.Dayjs }[] = [];

    for (const monthStr of candidates) {
      const { ranges } = getCalendarWeekRanges(monthStr);
      const isTodayInRanges = ranges.some(
        (r) => r.s.format('YYYY-MM-DD') <= todayStr && r.e.format('YYYY-MM-DD') >= todayStr,
      );
      if (isTodayInRanges) {
        targetMonth = monthStr;
        matchedRanges = ranges;
        break;
      }
    }

    let endDateStr = '';
    if (matchedRanges.length > 0) {
      endDateStr = matchedRanges[matchedRanges.length - 1].e.format('M월 D일');
    } else {
      endDateStr = dayjs(`${targetMonth}-01`).endOf('month').format('M월 D일');
    }

    return { targetMonth, endDateStr };
  };

  const executeAdd = async () => {
    if (!user) return;
    setIsAdding(true);
    const count = frequency === 'weekly_count' ? targetCount : null;

    const success = await addGoal({
      teamId: currentTeam?.id,
      userId: user.id,
      name: newGoal.trim(),
      frequency,
      targetCount: count,
      duration,
    });

    setIsAdding(false);

    if (success) {
      await fetchMyGoals(user.id);
      await fetchTeamGoals(currentTeam?.id ?? '', user.id);

      if (frequency === 'weekly_count') {
        Alert.alert(
          `주 ${targetCount ?? 'N'}회 루틴 등록 완료`,
          '오늘 할 계획이 아니라면 패스 인증을 하면 산을 오를 수 있어요. (미달로 카운팅됩니다.)',
          [{ text: '확인', onPress: () => navigation.goBack() }],
        );
      } else {
        navigation.goBack();
      }
    } else {
      Alert.alert('등록 실패', '루틴을 저장하지 못했습니다.\n잠시 후 다시 시도해주세요.');
    }
  };

  const handleAdd = async () => {
    const name = newGoal.trim();
    if (!name) {
      Alert.alert('루틴을 입력해주세요');
      return;
    }

    if (!user) return;

    if (duration === 'this_month') {
      const { targetMonth, endDateStr } = getComputedEndDate();

      const today = dayjs();
      const calendarMonth = today.format('M월');
      const statMonth = dayjs(`${targetMonth}-01`).format('M월');

      let message = '';
      if (calendarMonth !== statMonth) {
        message = `현재 날짜는 캘린더상 ${calendarMonth}이지만, 통계 주차 규칙(4일 이상 포함)에 따라 ${statMonth} 통계로 편입됩니다.\n\n따라서 이 루틴은 ${statMonth}의 마지막 통계 주차인 [${endDateStr}]까지 적용됩니다. 추가하시겠습니까?`;
      } else {
        message = `월초/월말 통계 주차 편입 규칙에 따라, 이 루틴은 이번 달 마지막 통계 주차인 [${endDateStr}]까지 적용됩니다. 추가하시겠습니까?`;
      }

      Alert.alert('이번달까지 루틴 추가', message, [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: executeAdd },
      ]);
    } else {
      executeAdd();
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
              {/* ── 입력창 ── */}
              <CyberFrame
                style={styles.sectionFrame}
                contentStyle={styles.sectionContent}
                glassOnly={false}
              >
                <Text style={styles.label}>어떤 루틴을 추가할까요?</Text>
                <View style={styles.inputRow}>
                  <Input
                    placeholder="루틴 (예: 운동 30분)"
                    value={newGoal}
                    onChangeText={setNewGoal}
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                    maxLength={30}
                    autoFocus
                  />
                </View>
              </CyberFrame>

              {/* ── 주기 설정 ── */}
              <CyberFrame
                style={styles.sectionFrame}
                contentStyle={styles.sectionContent}
                glassOnly={false}
              >
                <Text style={styles.label}>실천 주기</Text>
                <View style={styles.freqRow}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setFrequency('daily')}
                    activeOpacity={0.7}
                  >
                    <CyberFrame
                      style={[
                        styles.freqBtnFrame,
                        frequency === 'daily' && styles.activeFreqBtnFrame,
                      ]}
                      contentStyle={styles.freqBtnContent}
                      glassOnly={true}
                    >
                      <Text
                        style={[
                          styles.freqBtnText,
                          frequency === 'daily' && styles.freqBtnTextActive,
                        ]}
                      >
                        매일
                      </Text>
                    </CyberFrame>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setFrequency('weekly_count')}
                    activeOpacity={0.7}
                  >
                    <CyberFrame
                      style={[
                        styles.freqBtnFrame,
                        frequency === 'weekly_count' && styles.activeFreqBtnFrame,
                      ]}
                      contentStyle={styles.freqBtnContent}
                      glassOnly={true}
                    >
                      <Text
                        style={[
                          styles.freqBtnText,
                          frequency === 'weekly_count' && styles.freqBtnTextActive,
                        ]}
                      >
                        주 N회
                      </Text>
                    </CyberFrame>
                  </TouchableOpacity>
                </View>

                {frequency === 'weekly_count' && (
                  <CyberFrame
                    style={styles.targetCountFrame}
                    contentStyle={styles.targetCountContent}
                    glassOnly={true}
                  >
                    <Text style={styles.targetCountLabel}>일주일에 몇 번 할까요?</Text>
                    <View style={styles.counterWrap}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setTargetCount(Math.max(1, targetCount - 1))}
                      >
                        <Ionicons name="remove" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{`${targetCount}회`}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setTargetCount(Math.min(6, targetCount + 1))}
                      >
                        <Ionicons name="add" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </CyberFrame>
                )}
              </CyberFrame>

              {/* ── 기간 설정 ── */}
              <CyberFrame
                style={styles.sectionFrame}
                contentStyle={styles.sectionContent}
                glassOnly={false}
              >
                <Text style={styles.label}>언제까지 할까요?</Text>
                <View style={styles.freqRow}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setDuration('continuous')}
                    activeOpacity={0.7}
                  >
                    <CyberFrame
                      style={[
                        styles.freqBtnFrame,
                        duration === 'continuous' && styles.activeFreqBtnFrame,
                      ]}
                      contentStyle={styles.freqBtnContent}
                      glassOnly={true}
                    >
                      <Text
                        style={[
                          styles.freqBtnText,
                          duration === 'continuous' && styles.freqBtnTextActive,
                        ]}
                      >
                        계속
                      </Text>
                    </CyberFrame>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setDuration('this_month')}
                    activeOpacity={0.7}
                  >
                    <CyberFrame
                      style={[
                        styles.freqBtnFrame,
                        duration === 'this_month' && styles.activeFreqBtnFrame,
                      ]}
                      contentStyle={styles.freqBtnContent}
                      glassOnly={true}
                    >
                      <Text
                        style={[
                          styles.freqBtnText,
                          duration === 'this_month' && styles.freqBtnTextActive,
                        ]}
                      >
                        이번달까지
                      </Text>
                    </CyberFrame>
                  </TouchableOpacity>
                </View>
                {duration === 'this_month' && (
                  <Text style={styles.helperText}>
                    💡 월초/월말 부분주가 4일 미만이면 인접 월에 편입되는 규칙에 따라, 추가 시
                    정확한 마지막 주차를 계산해 안내해 드립니다.
                  </Text>
                )}
              </CyberFrame>
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
    backgroundColor: '#FFFFFF',
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
    padding: 16,
  },
  sectionFrame: {
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionContent: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  inputRow: {
    marginBottom: 0,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  freqBtnFrame: {
    borderRadius: 12,
  },
  activeFreqBtnFrame: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopColor: 'rgba(255, 255, 255, 1)',
    borderLeftColor: 'rgba(229, 229, 229, 1)',
    borderBottomColor: 'rgba(255, 135, 61, 0.22)',
    borderWidth: 0.6,
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'visible',
  },
  freqBtnContent: {
    alignItems: 'center',
    paddingVertical: 14,
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
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
  },
  targetCountFrame: {
    borderRadius: 12,
  },
  targetCountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
