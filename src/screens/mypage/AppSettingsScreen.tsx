import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/defaults';
import { Alert } from 'react-native';
import {
  getDailyNotificationEnabled,
  setDailyNotificationEnabled,
  getGoalReminderEnabled,
  setGoalReminderEnabled,
  sendTestNotification,
  sendTestGoalReminderNotification,
} from '../../utils/notifications';

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
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>앱 설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        <Text style={s.sectionTitle}>알림</Text>

        <View style={s.row}>
          <View style={s.rowLeft}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
            <View style={s.rowText}>
              <Text style={s.rowTitle}>매일 아침 동기부여 알림</Text>
              <Text style={s.rowDesc}>매일 오전 8시, 요일별 응원 메시지를 보내드려요</Text>
            </View>
          </View>
          <Switch
            value={dailyNoti}
            onValueChange={handleToggle}
            trackColor={{ false: 'rgba(0,0,0,0.10)', true: 'rgba(255,107,61,0.35)' }}
            thumbColor={dailyNoti ? '#FF6B3D' : '#f4f3f4'}
          />
        </View>

        <View style={[s.row, { marginTop: 12 }]}>
          <View style={s.rowLeft}>
            <Ionicons name="alarm-outline" size={20} color={COLORS.text} />
            <View style={s.rowText}>
              <Text style={s.rowTitle}>미인증 목표 리마인더</Text>
              <Text style={s.rowDesc}>오후 9시에 아직 인증하지 않은 목표를 알려드려요</Text>
            </View>
          </View>
          <Switch
            value={goalReminder}
            onValueChange={handleGoalReminderToggle}
            trackColor={{ false: 'rgba(0,0,0,0.10)', true: 'rgba(255,107,61,0.35)' }}
            thumbColor={goalReminder ? '#FF6B3D' : '#f4f3f4'}
          />
        </View>

        {__DEV__ && (
          <TouchableOpacity
            style={s.testBtn}
            onPress={async () => {
              await sendTestNotification();
              Alert.alert('테스트 알림', '5초 후 알림이 도착합니다. 앱을 백그라운드로 보내세요!');
            }}
          >
            <Ionicons name="bug-outline" size={16} color="#FF6B3D" />
            <Text style={s.testBtnText}>동기부여 알림 테스트 (5초 후)</Text>
          </TouchableOpacity>
        )}
        {__DEV__ && (
          <TouchableOpacity
            style={[s.testBtn, { marginTop: 8 }]}
            onPress={async () => {
              await sendTestGoalReminderNotification();
              Alert.alert('테스트 알림', '5초 후 목표 리마인더 알림이 도착합니다. 앱을 백그라운드로 보내세요!');
            }}
          >
            <Ionicons name="bug-outline" size={16} color="#FF6B3D" />
            <Text style={s.testBtnText}>목표 리마인더 알림 테스트 (5초 후)</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F6F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,107,61,0.10)' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(26,26,26,0.45)', marginBottom: 12, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,61,0.08)' },
  rowLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, marginRight: 12 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  rowDesc: { fontSize: 12, color: 'rgba(26,26,26,0.45)', lineHeight: 17 },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,107,61,0.25)', borderStyle: 'dashed' },
  testBtnText: { fontSize: 13, fontWeight: '600', color: '#FF6B3D' },
});
