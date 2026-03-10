import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/defaults';

const STORAGE_KEY = 'notification_daily_enabled';
const GOAL_REMINDER_STORAGE_KEY = 'notification_goal_reminder_enabled';
const GOAL_REMINDER_HOUR = 21;
const GOAL_REMINDER_MINUTE = 0;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// expo-notifications weekday: 1=Sunday, 2=Monday, ... 7=Saturday
const DAILY_MESSAGES: Record<number, string[]> = {
  2: [ // 월요일
    '새로운 한 주가 시작됐어요! 정상을 향해 한 걸음씩 올라가볼까요?',
    '월요일 시작! 이번 주도 함께 올라가봐요.',
    '새로운 루트가 열렸어요! 이번 주 목표, 하나씩 도장 찍어볼까요?',
  ],
  3: [ // 화요일
    '어제의 한 걸음이 오늘의 발판이에요. 계속 올라가볼까요?',
    '화요일, 페이스를 잡아가는 날! 오늘도 한 발짝 더.',
    '첫주의 2일차! 어제보다 조금 더 높은 곳을 향해 올라가볼까요?',
  ],
  4: [ // 수요일
    '한 주의 중간 지점! 여기서 멈추기엔 아까워요.',
    '수요일 도착! 절반을 넘었어요, 힘내봐요.',
    '오늘도 잊지말고 인증해서 목표를 채워가봐요!',
  ],
  5: [ // 목요일
    '목요일, 정상이 보이기 시작해요! 조금만 더 힘내볼까요?',
    '거의 다 왔어요! 오늘도 꾸준히 한 걸음.',
    '오늘도 잊지말고 인증해서 목표를 채워가봐요!',
  ],
  6: [ // 금요일
    '금요일이에요! 이번 주 마지막 스퍼트, 한번 달려볼까요?',
    '한 주의 마무리가 다가와요. 멋지게 마무리해봐요!',
    '오늘도 잊지말고 인증해서 목표를 채워가봐요!',
  ],
  7: [ // 토요일
    '토요일에도 한 걸음! 꾸준함이 정상을 만들어요.',
    '주말이지만 목표는 쉬지 않아요. 가볍게 도전해볼까요?',
    '여유로운 토요일, 목표 하나 달성하고 뿌듯한 하루 보내요!',
  ],
  1: [ // 일요일
    '일요일, 한 주의 마지막 날! 이번 주를 멋지게 마무리해봐요.',
    '오늘까지 달성하면 완벽한 한 주! 마지막 힘을 내봐요.',
    '이번 주 등반의 마지막 구간이에요. 깃발을 꽂아볼까요?',
  ],
};

const GOAL_REMINDER_MESSAGES = [
  '오늘 아직 인증하지 않은 목표가 있어요!',
  '자정 전에 인증을 완료해볼까요?',
  '목표 달성까지 조금만 더 힘내봐요!',
];

function pickMessage(weekday: number): string {
  const pool = DAILY_MESSAGES[weekday] ?? DAILY_MESSAGES[2];
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.primary,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function cancelDailyNotifications(): Promise<void> {
  for (let wd = 1; wd <= 7; wd++) {
    await Notifications.cancelScheduledNotificationAsync(`daily-weekday-${wd}`).catch(() => {});
  }
}

export async function scheduleDailyNotifications(): Promise<void> {
  const enabled = await getDailyNotificationEnabled();
  if (!enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await cancelDailyNotifications();

  const weekdays = [1, 2, 3, 4, 5, 6, 7];
  for (const weekday of weekdays) {
    await Notifications.scheduleNotificationAsync({
      identifier: `daily-weekday-${weekday}`,
      content: {
        title: 'Anotherday',
        body: pickMessage(weekday),
        sound: true,
        color: COLORS.primary,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: 8,
        minute: 0,
      },
    });
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getDailyNotificationEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEY);
  return val !== 'false';
}

export async function setDailyNotificationEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  if (enabled) {
    await scheduleDailyNotifications();
  } else {
    await cancelDailyNotifications();
  }
}

// ─── 미인증 목표 리마인더 ─────────────────────────────────────

export async function getGoalReminderEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(GOAL_REMINDER_STORAGE_KEY);
  return val !== 'false';
}

export async function setGoalReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(GOAL_REMINDER_STORAGE_KEY, enabled ? 'true' : 'false');
  if (!enabled) {
    await cancelGoalReminderNotification();
  }
}

export async function cancelGoalReminderNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('goal-reminder').catch(() => {});
}

/**
 * 미인증 목표 리마인더를 스케줄링한다.
 * 오늘 9시(PM)에 아직 인증하지 않은 목표 목록을 알림으로 보낸다.
 * 이미 9시가 지났거나 모든 목표를 완료한 경우 알림을 취소한다.
 */
export async function scheduleGoalReminderNotification(
  uncompletedGoalNames: string[],
): Promise<void> {
  const enabled = await getGoalReminderEnabled();
  if (!enabled || uncompletedGoalNames.length === 0) {
    await cancelGoalReminderNotification();
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await cancelGoalReminderNotification();

  const now = new Date();
  const trigger = new Date();
  trigger.setHours(GOAL_REMINDER_HOUR, GOAL_REMINDER_MINUTE, 0, 0);

  if (now >= trigger) return;

  const secondsUntil = Math.floor((trigger.getTime() - now.getTime()) / 1000);
  if (secondsUntil <= 0) return;

  const count = uncompletedGoalNames.length;
  const goalList = uncompletedGoalNames.slice(0, 3).join(', ');
  const suffix = count > 3 ? ` 외 ${count - 3}개` : '';
  const title = GOAL_REMINDER_MESSAGES[Math.floor(Math.random() * GOAL_REMINDER_MESSAGES.length)];
  const body = `${goalList}${suffix} — 오늘 안에 인증해봐요 💪`;

  await Notifications.scheduleNotificationAsync({
    identifier: 'goal-reminder',
    content: {
      title,
      body,
      sound: true,
      color: COLORS.primary,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntil,
    },
  });
}

/** DEV ONLY: 5초 후 테스트 알림 (오늘 요일 메시지) */
export async function sendTestNotification(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const jsDay = new Date().getDay();
  const expoWeekday = jsDay === 0 ? 1 : jsDay + 1;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Anotherday (테스트)',
      body: pickMessage(expoWeekday),
      sound: true,
      color: COLORS.primary,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}

/** DEV ONLY: 5초 후 목표 리마인더 테스트 알림 */
export async function sendTestGoalReminderNotification(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '아직 인증하지 않은 목표가 있어요!',
      body: '운동, 독서 — 오늘 안에 인증해봐요 💪',
      sound: true,
      color: COLORS.primary,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}
