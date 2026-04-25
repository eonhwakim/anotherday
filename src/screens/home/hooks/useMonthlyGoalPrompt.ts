import React, { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from '../../../lib/dayjs';
import { handleServiceError } from '../../../lib/serviceError';
import { getCalendarWeekRanges } from '../../../lib/statsUtils';
import { useExtendGoalsForNewMonthMutation } from '../../../queries/goalMutations';
import { useExtendableGoalsForMonthQuery } from '../../../queries/goalQueries';

const getMonthlyPromptStorageKey = (monthStr: string) => `monthly_goal_prompt_v1_${monthStr}`;

export function useMonthlyGoalPrompt(params: { currentTeamId?: string; userId?: string }) {
  const { currentTeamId, userId } = params;
  const [showMonthlyPrompt, setShowMonthlyPrompt] = React.useState(false);
  const [promptNewMonth, setPromptNewMonth] = React.useState('');

  const extendGoalsForNewMonthMutation = useExtendGoalsForNewMonthMutation({
    userId,
    teamId: currentTeamId,
  });
  const { data: extendableGoals = [], isFetched: isExtendableGoalsFetched } =
    useExtendableGoalsForMonthQuery(userId, promptNewMonth || undefined);

  React.useEffect(() => {
    if (!userId) return;

    const checkMonthlyPrompt = async () => {
      try {
        const today = dayjs();
        const todayStr = today.format('YYYY-MM-DD');
        const candidates = [today.format('YYYY-MM'), today.add(1, 'month').format('YYYY-MM')];

        let matchedMonth: string | null = null;
        for (const monthStr of candidates) {
          const { ranges } = getCalendarWeekRanges(monthStr);
          if (ranges.length > 0 && ranges[0].s.format('YYYY-MM-DD') === todayStr) {
            matchedMonth = monthStr;
            break;
          }
        }

        if (!matchedMonth) return;

        const alreadyShown = await AsyncStorage.getItem(getMonthlyPromptStorageKey(matchedMonth));
        if (alreadyShown) return;

        setPromptNewMonth(matchedMonth);
      } catch (e) {
        console.error('[MonthlyPrompt] Error:', e);
      }
    };

    checkMonthlyPrompt();
  }, [userId]);

  React.useEffect(() => {
    if (!promptNewMonth || showMonthlyPrompt || !isExtendableGoalsFetched) return;

    if (extendableGoals.length === 0) {
      setPromptNewMonth('');
      return;
    }

    const timer = setTimeout(() => setShowMonthlyPrompt(true), 800);
    return () => clearTimeout(timer);
  }, [extendableGoals.length, isExtendableGoalsFetched, promptNewMonth, showMonthlyPrompt]);

  const handleMonthlyPromptContinue = useCallback(async () => {
    if (!userId || !promptNewMonth) return;
    try {
      const ok = await extendGoalsForNewMonthMutation.mutateAsync({
        newMonthStr: promptNewMonth,
      });
      if (!ok) return;

      await AsyncStorage.setItem(getMonthlyPromptStorageKey(promptNewMonth), 'shown');
      setShowMonthlyPrompt(false);
      setPromptNewMonth('');
    } catch (e) {
      handleServiceError(e);
    }
  }, [extendGoalsForNewMonthMutation, promptNewMonth, userId]);

  const handleMonthlyPromptNewPlan = useCallback(async () => {
    if (promptNewMonth) {
      await AsyncStorage.setItem(getMonthlyPromptStorageKey(promptNewMonth), 'shown');
    }
    setShowMonthlyPrompt(false);
    setPromptNewMonth('');
  }, [promptNewMonth]);

  return {
    extendableGoals,
    handleMonthlyPromptContinue,
    handleMonthlyPromptNewPlan,
    promptNewMonth,
    showMonthlyPrompt,
  };
}
