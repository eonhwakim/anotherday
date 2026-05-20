import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  type SwitchProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import GradientBackground from '../../components/ui/GradientBackground';
import PageHeader from '../../components/ui/PageHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import BaseCard from '../../components/ui/BaseCard';
import { SelectableCard, SelectableCardGroup } from '../../components/ui/SelectableCard';
import { colors, ds, spacing, typography } from '../../design/recipes';
import { useSettingsStore, type BackgroundTheme } from '../../stores/settingsStore';
import {
  getDailyNotificationEnabled,
  setDailyNotificationEnabled,
  getGoalReminderEnabled,
  setGoalReminderEnabled,
  sendTestNotification,
  sendTestGoalReminderNotification,
} from '../../utils/notifications';

const SWITCH_TRACK = { false: 'rgba(0,0,0,0.10)', true: 'rgba(255,107,61,0.35)' } as const;

const THEME_OPTIONS: { value: BackgroundTheme; label: string }[] = [
  { value: 'mountain', label: '산' },
  { value: 'racing', label: '레이싱' },
  { value: 'climbing', label: '암벽' },
];

interface SettingSwitchRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: SwitchProps['onValueChange'];
}

function SettingSwitchRow({
  icon,
  title,
  description,
  value,
  onValueChange,
}: SettingSwitchRowProps) {
  return (
    <BaseCard glassOnly style={styles.rowFrame} contentStyle={styles.row} padded={false}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={colors.text} />
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowDesc}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        ios_backgroundColor={SWITCH_TRACK.false}
        trackColor={SWITCH_TRACK}
        thumbColor={value ? colors.primary : '#f4f3f4'}
      />
    </BaseCard>
  );
}

export default function AppSettingsScreen() {
  const navigation = useNavigation();
  const [dailyNoti, setDailyNoti] = useState(true);
  const [goalReminder, setGoalReminder] = useState(true);
  const { backgroundTheme, setBackgroundTheme } = useSettingsStore();

  useEffect(() => {
    void getDailyNotificationEnabled().then(setDailyNoti);
    void getGoalReminderEnabled().then(setGoalReminder);
  }, []);

  const handleDailyNotiToggle = async (enabled: boolean) => {
    setDailyNoti(enabled);
    await setDailyNotificationEnabled(enabled);
  };

  const handleGoalReminderToggle = async (enabled: boolean) => {
    setGoalReminder(enabled);
    await setGoalReminderEnabled(enabled);
  };

  return (
    <GradientBackground curve>
      <SafeAreaView style={ds.safe} edges={['top']}>
        <ScrollView
          style={ds.scroll}
          contentContainerStyle={ds.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader title="앱 설정" onBack={() => navigation.goBack()} />

          <SectionHeader
            title="알림"
            subtitle="알림과 리마인더를 한 곳에서 관리해요"
            style={styles.sectionHeader}
          />

          <SettingSwitchRow
            icon="notifications-outline"
            title="매일 아침 동기부여 알림"
            description="매일 오전 8시, 요일별 응원 메시지를 보내드려요"
            value={dailyNoti}
            onValueChange={handleDailyNotiToggle}
          />

          <SettingSwitchRow
            icon="alarm-outline"
            title="미인증 목표 리마인더"
            description="오후 9시에 아직 인증하지 않은 목표를 알려드려요"
            value={goalReminder}
            onValueChange={handleGoalReminderToggle}
          />

          <SectionHeader
            title="화면 설정"
            subtitle="앱의 배경 테마를 선택하세요"
            style={styles.sectionHeader}
          />

          <BaseCard glassOnly style={styles.rowFrame} contentStyle={styles.themeCard} padded={false}>
            <View style={styles.themeHeader}>
              <Ionicons name="image-outline" size={20} color={colors.text} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>홈 화면 배경 테마</Text>
                <Text style={styles.rowDesc}>
                  팀원들의 진행 상황을 보여주는 배경을 선택하세요
                </Text>
              </View>
            </View>

            <SelectableCardGroup style={styles.themeOptions}>
              {THEME_OPTIONS.map((option) => (
                <SelectableCard
                  key={option.value}
                  label={option.label}
                  active={backgroundTheme === option.value}
                  onPress={() => setBackgroundTheme(option.value)}
                />
              ))}
            </SelectableCardGroup>
          </BaseCard>

          {__DEV__ ? (
            <View style={styles.devSection}>
              <DevTestButton
                label="동기부여 알림 테스트 (5초 후)"
                onPress={async () => {
                  await sendTestNotification();
                  Alert.alert(
                    '테스트 알림',
                    '5초 후 알림이 도착합니다. 앱을 백그라운드로 보내세요!',
                  );
                }}
              />
              <DevTestButton
                label="목표 리마인더 알림 테스트 (5초 후)"
                onPress={async () => {
                  await sendTestGoalReminderNotification();
                  Alert.alert(
                    '테스트 알림',
                    '5초 후 목표 리마인더 알림이 도착합니다. 앱을 백그라운드로 보내세요!',
                  );
                }}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function DevTestButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.testBtn} onPress={onPress}>
      <Ionicons name="bug-outline" size={16} color={colors.primary} />
      <Text style={styles.testBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: spacing[6],
  },
  rowFrame: {
    marginBottom: spacing[3],
  },
  row: {
    ...ds.rowBetween,
    alignItems: 'flex-start',
    padding: spacing[4],
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    flex: 1,
    marginRight: spacing[3],
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    marginBottom: 4,
  },
  rowDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  themeCard: {
    padding: spacing[4],
    gap: spacing[4],
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  themeOptions: {
    marginBottom: 0,
  },
  devSection: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
  testBtn: {
    ...ds.rowCenter,
    justifyContent: 'center',
    gap: 6,
    padding: spacing[3],
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderStyle: 'dashed',
  },
  testBtnText: {
    ...typography.label,
    color: colors.primary,
    textTransform: 'none',
  },
});
