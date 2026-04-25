import React, { useCallback } from 'react';
import { AppState } from 'react-native';
import dayjs from '../../../lib/dayjs';

export type HomeTimePeriod = 'DAY' | 'SUNSET' | 'NIGHT';

export function useHomeTimePeriod() {
  const [timePeriod, setTimePeriod] = React.useState<HomeTimePeriod>('DAY');

  const updateTime = useCallback(() => {
    const hour = dayjs().hour();
    if (hour >= 5 && hour < 16) setTimePeriod('DAY');
    else if (hour >= 16 && hour < 19) setTimePeriod('SUNSET');
    else setTimePeriod('NIGHT');
  }, []);

  React.useEffect(() => {
    updateTime();
    const timer = setInterval(updateTime, 60000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateTime();
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [updateTime]);

  return {
    timePeriod,
    isDay: timePeriod === 'DAY',
    isSunset: timePeriod === 'SUNSET',
    isNight: timePeriod === 'NIGHT',
    updateTime,
  };
}
