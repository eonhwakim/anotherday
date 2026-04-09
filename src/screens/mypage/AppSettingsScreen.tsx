import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import {
  getDailyNotificationEnabled,
  setDailyNotificationEnabled,
  getGoalReminderEnabled,
  setGoalReminderEnabled,
  sendTestNotification,
  sendTestGoalReminderNotification,
} from '../../utils/notifications';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import BaseCard from '../../components/ui/BaseCard';
import { colors, ds, spacing, typography } from '../../design/recipes';

export default function AppSettingsScreen() {
  const navigation = useNavigation();
  const [dailyNoti, setDailyNoti] = useState(true);
  const [goalReminder, setGoalReminder] = useState(true);

  useEffect(() => {
    getDailyNotificationEnabled().then(setDailyNoti);
    getGoalReminderEnabled().then(setGoalReminder);
  }, []);

  const handleToggle = async (val: boolean) => {
    setDailyNoti(val);
    await setDailyNotificationEnabled(val);
  };

  const handleGoalReminderToggle = async (val: boolean) => {
    setGoalReminder(val);
    await setGoalReminderEnabled(val);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="앱 설정" onBack={() => navigation.goBack()} />

      <View style={s.content}>
        <SectionHeader title="알림" subtitle="알림과 리마인더를 한 곳에서 관리해요" />

        <BaseCard glassOnly style={s.rowFrame} contentStyle={s.row} padded={false}>
          <View style={s.rowLeft}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <View style={s.rowText}>
              <Text style={s.rowTitle}>매일 아침 동기부여 알림</Text>
              <Text style={s.rowDesc}>매일 오전 8시, 요일별 응원 메시지를 보내드려요</Text>
            </View>
          </View>
          <Switch
            value={dailyNoti}
            onValueChange={handleToggle}
            ios_backgroundColor="rgba(0,0,0,0.10)"
            trackColor={{ false: 'rgba(0,0,0,0.10)', true: 'rgba(255,107,61,0.35)' }}
            thumbColor={dailyNoti ? colors.primary : '#f4f3f4'}
          />
        </BaseCard>

        <BaseCard glassOnly style={s.rowFrame} contentStyle={s.row} padded={false}>
          <View style={s.rowLeft}>
            <Ionicons name="alarm-outline" size={20} color={colors.text} />
            <View style={s.rowText}>
              <Text style={s.rowTitle}>미인증 목표 리마인더</Text>
              <Text style={s.rowDesc}>오후 9시에 아직 인증하지 않은 목표를 알려드려요</Text>
            </View>
          </View>
          <Switch
            value={goalReminder}
            onValueChange={handleGoalReminderToggle}
            ios_backgroundColor="rgba(0,0,0,0.10)"
            trackColor={{ false: 'rgba(0,0,0,0.10)', true: 'rgba(255,107,61,0.35)' }}
            thumbColor={goalReminder ? colors.primary : '#f4f3f4'}
          />
        </BaseCard>

        {__DEV__ && (
          <TouchableOpacity
            style={s.testBtn}
            onPress={async () => {
              await sendTestNotification();
              Alert.alert('테스트 알림', '5초 후 알림이 도착합니다. 앱을 백그라운드로 보내세요!');
            }}
          >
            <Ionicons name="bug-outline" size={16} color={colors.primary} />
            <Text style={s.testBtnText}>동기부여 알림 테스트 (5초 후)</Text>
          </TouchableOpacity>
        )}
        {__DEV__ && (
          <TouchableOpacity
            style={[s.testBtn, { marginTop: 8 }]}
            onPress={async () => {
              await sendTestGoalReminderNotification();
              Alert.alert(
                '테스트 알림',
                '5초 후 목표 리마인더 알림이 도착합니다. 앱을 백그라운드로 보내세요!',
              );
            }}
          >
            <Ionicons name="bug-outline" size={16} color={colors.primary} />
            <Text style={s.testBtnText}>목표 리마인더 알림 테스트 (5초 후)</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: ds.screen,
  content: { flex: 1, padding: spacing[4] },
  rowFrame: { marginBottom: spacing[3] },
  row: { ...ds.rowBetween, alignItems: 'flex-start', padding: spacing[4] },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    flex: 1,
    marginRight: spacing[3],
  },
  rowText: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.text, marginBottom: 4 },
  rowDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 17 },
  testBtn: {
    ...ds.rowCenter,
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing[4],
    padding: spacing[3],
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderStyle: 'dashed',
  },
  testBtnText: { ...typography.label, color: colors.primary, textTransform: 'none' },
});
