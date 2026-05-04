import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import type { GoalFrequency } from '../../types/domain';
import { handleServiceError } from '../../lib/serviceError';
import { colors } from '../../design/tokens';
import { useTeamGoalsQuery } from '../../queries/goalQueries';
import { useAddGoalMutation } from '../../queries/goalMutations';
import BaseCard from '../ui/BaseCard';
import Input from '../common/Input';
import { getCalendarWeekRanges } from '../../lib/statsUtils';
import dayjs from '../../lib/dayjs';
import { typography, spacing } from '../../design/recipes';
interface RoutineComposerProps {
  visible?: boolean;
  onDone?: () => void | Promise<void>;
  autoFocus?: boolean;
  /**
   * BottomSheetModal 등 부모 높이가 콘텐츠에 맞춰질 때: 스크롤 영역을 화면 기준으로 제한.
   * 전체 화면(AddRoutineScreen)에서는 넘기지 않음.
   */
  inModal?: boolean;
}

export default function RoutineComposer({
  visible,
  onDone,
  autoFocus = false,
  inModal = false,
}: RoutineComposerProps) {
  const { height: winH } = useWindowDimensions();
  const scrollMaxHeight = useMemo(() => {
    if (!inModal) return undefined;
    // 시트 maxHeight(75%) 안에서 핸들·헤더·하단 버튼·여백 제외
    return Math.max(170, Math.round(winH * 0.75 - 220));
  }, [inModal, winH]);
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const { data: existingGoals = [] } = useTeamGoalsQuery(currentTeam?.id ?? '', user?.id);
  const addGoalMutation = useAddGoalMutation({
    userId: user?.id,
    teamId: currentTeam?.id,
    existingGoals,
  });

  const [newGoal, setNewGoal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [targetCount, setTargetCount] = useState(3);
  const [duration, setDuration] = useState<'continuous' | 'this_month'>('this_month');

  const resetForm = () => {
    setNewGoal('');
    setIsAdding(false);
    setFrequency('daily');
    setTargetCount(3);
    setDuration('this_month');
  };

  useEffect(() => {
    if (visible) resetForm();
  }, [visible]);

  const currentMonthGuide = useMemo(() => {
    const today = dayjs();
    const todayStr = today.format('YYYY-MM-DD');
    const candidates = [today.format('YYYY-MM'), today.add(1, 'month').format('YYYY-MM')];

    let targetMonth = candidates[0];
    let matchedRanges: { s: dayjs.Dayjs; e: dayjs.Dayjs }[] = [];

    for (const monthStr of candidates) {
      const { ranges } = getCalendarWeekRanges(monthStr);
      const isTodayInRanges = ranges.some(
        (range) =>
          range.s.format('YYYY-MM-DD') <= todayStr && range.e.format('YYYY-MM-DD') >= todayStr,
      );
      if (isTodayInRanges) {
        targetMonth = monthStr;
        matchedRanges = ranges;
        break;
      }
    }

    const endDateStr =
      matchedRanges.length > 0
        ? matchedRanges[matchedRanges.length - 1].e.format('M월 D일')
        : dayjs(`${targetMonth}-01`).endOf('month').format('M월 D일');

    return { targetMonth, endDateStr };
  }, []);

  const finishSuccess = async () => {
    resetForm();
    await onDone?.();
  };

  const executeAdd = async () => {
    if (!user) return;
    setIsAdding(true);

    try {
      const success = await addGoalMutation.mutateAsync({
        teamId: currentTeam?.id,
        userId: user.id,
        name: newGoal.trim(),
        frequency,
        targetCount: frequency === 'weekly_count' ? targetCount : null,
        duration,
      });

      if (!success) {
        Alert.alert('등록 실패', '루틴을 저장하지 못했습니다.\n잠시 후 다시 시도해주세요.');
        return;
      }

      if (frequency === 'weekly_count') {
        Alert.alert(
          `주 ${targetCount ?? 'N'}회 루틴 등록 완료`,
          '오늘 할 계획이 아니라면 [패스] 인증을 해서 100%를 달성해요!',
          [{ text: '확인', onPress: finishSuccess }],
        );
        return;
      }

      await finishSuccess();
    } catch (e) {
      handleServiceError(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAdd = async () => {
    Keyboard.dismiss();
    const name = newGoal.trim();
    if (!name) {
      Alert.alert('루틴을 입력해주세요');
      return;
    }

    if (!user) return;

    if (duration === 'this_month') {
      const { targetMonth, endDateStr } = currentMonthGuide;
      const today = dayjs();
      const calendarMonth = today.format('M월');
      const statMonth = dayjs(`${targetMonth}-01`).format('M월');

      const message =
        calendarMonth !== statMonth
          ? `현재 날짜는 캘린더상 ${calendarMonth}이지만, 통계 주차 규칙(4일 이상 포함)에 따라 ${statMonth} 통계로 편입됩니다.\n\n따라서 이 루틴은 ${statMonth}의 마지막 통계 주차인 [${endDateStr}]까지 적용됩니다. 추가하시겠습니까?`
          : `월초/월말 통계 주차 편입 규칙에 따라,\n이 루틴은 이번 달 마지막 통계 주차인\n[${endDateStr}]까지 적용됩니다. 추가하시겠습니까?`;

      Alert.alert('이번달까지 루틴 추가', message, [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: executeAdd },
      ]);
      return;
    }

    await executeAdd();
  };

  return (
    <View style={inModal ? styles.rootModal : styles.rootScreen}>
      <ScrollView
        style={[
          inModal ? styles.scrollInModal : styles.scrollScreen,
          scrollMaxHeight != null && { maxHeight: scrollMaxHeight },
        ]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bounces={false}
      >
        <View style={styles.sectionFrame}>
          <Text style={styles.firstLabel}>어떤 루틴을 추가할까요?</Text>
          <Text style={styles.helperText}>* 루틴을 추가하면 오늘부터 적용됩니다</Text>
          <Input
            placeholder="루틴 (예: 운동 30분)"
            value={newGoal}
            onChangeText={setNewGoal}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            maxLength={30}
            autoFocus={autoFocus}
          />
        </View>

        <View style={styles.sectionFrame}>
          <Text style={styles.label}>실천 주기</Text>
          <View style={styles.freqRow}>
            <SelectableCard
              label="매일"
              active={frequency === 'daily'}
              onPress={() => setFrequency('daily')}
            />
            <SelectableCard
              label="주 N회"
              active={frequency === 'weekly_count'}
              onPress={() => setFrequency('weekly_count')}
            />
          </View>

          {frequency === 'weekly_count' ? (
            <>
              <BaseCard
                style={styles.targetCountFrame}
                contentStyle={styles.targetCountContent}
                glassOnly
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
              </BaseCard>
              <Text style={styles.helperText}>
                * 오늘 계획이 없는 주 N회 루틴은 패스 인증으로 관리할 수 있어요.
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.sectionFrame}>
          <Text style={styles.label}>언제까지 할까요?</Text>
          <View style={styles.freqRow}>
            <SelectableCard
              label="계속"
              active={duration === 'continuous'}
              onPress={() => setDuration('continuous')}
            />
            <SelectableCard
              label="이번달까지"
              active={duration === 'this_month'}
              onPress={() => setDuration('this_month')}
            />
          </View>
          {duration === 'this_month' ? (
            <Text style={styles.helperText}>
              * 월초와 월말의 부분주가 4일 미만이면 인접 월에 편입되는 규칙에 따라 마지막 주차를
              계산해 적용합니다.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.submitBtn, (!newGoal.trim() || isAdding) && styles.submitBtnDisabled]}
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
  );
}

function SelectableCard({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.selectableTouchable} onPress={onPress} activeOpacity={0.7}>
      <BaseCard
        style={[styles.freqBtnFrame, active && styles.activeFreqBtnFrame]}
        contentStyle={styles.freqBtnContent}
        glassOnly
      >
        <Text style={[styles.freqBtnText, active && styles.freqBtnTextActive]}>{label}</Text>
      </BaseCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rootScreen: {
    flex: 1,
  },
  rootModal: {
    alignSelf: 'stretch',
  },
  scrollScreen: {
    flex: 1,
  },
  scrollInModal: {
    alignSelf: 'stretch',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sectionFrame: {
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionContent: {
    padding: 20,
  },
  firstLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  selectableTouchable: {
    flex: 1,
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
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
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
    flex: 1,
    paddingRight: 12,
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
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
