import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { handleServiceError } from '../../lib/serviceError';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useCreateTeamMutation, useJoinTeamMutation } from '../../queries/teamMutations';
import { useUserTeamsQuery } from '../../queries/teamQueries';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import { colors, ds, spacing, typography } from '../../design/recipes';

import Input from '../../components/common/Input';
import GlassModal from '../../components/ui/GlassModal';
import MyPageProfileCard from '../../components/mypage/MyPageProfileCard';
import ScreenBackground from '../../components/ui/ScreenBackground';
import BaseCard from '../../components/ui/BaseCard';

const ROW_ICON = '#4A4A4A';
const CHEVRON = '#BDBDBD';
const DIVIDER = 'rgba(0,0,0,0.06)';

type Ion = React.ComponentProps<typeof Ionicons>['name'];

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  showDivider,
}: {
  icon: Ion;
  title: string;
  subtitle: string;
  onPress: () => void;
  showDivider: boolean;
}) {
  return (
    <>
      <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.65}>
        <View style={styles.iconCol}>
          <Ionicons name={icon} size={22} color={ROW_ICON} />
        </View>
        <View style={styles.settingsTextWrap}>
          <Text style={styles.settingsTitle}>{title}</Text>
          <Text style={styles.settingsSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={CHEVRON} />
      </TouchableOpacity>
      {showDivider ? <View style={styles.settingsDivider} /> : null}
    </>
  );
}

export default function MyPageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuthStore();
  const { teams, currentTeam, selectTeam } = useTeamStore();
  const teamsQuery = useUserTeamsQuery(user?.id);
  const createTeamMutation = useCreateTeamMutation(user?.id);
  const joinTeamMutation = useJoinTeamMutation(user?.id);

  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation: tabNavigation, scrollRef });

  const [teamModalType, setTeamModalType] = useState<'create' | 'join' | null>(null);
  const [teamInputValue, setTeamInputValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      void teamsQuery.refetch();
    }, [teamsQuery]),
  );

  const handleOpenTeamModal = (type: 'create' | 'join') => {
    if (teams.length >= 1) {
      Alert.alert('알림', '현재는 팀을 1개까지만 생성/참가할 수 있습니다.');
      return;
    }
    setTeamModalType(type);
  };

  const handleTeamManagement = () => {
    if (currentTeam) {
      navigation.navigate('TeamMember', { teamId: currentTeam.id });
      return;
    }
    Alert.alert('팀 관리', '팀이 없어요. 어떻게 진행할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '팀 만들기', onPress: () => handleOpenTeamModal('create') },
      { text: '코드로 참가', onPress: () => handleOpenTeamModal('join') },
    ]);
  };

  const handleCreateTeam = async () => {
    if (!user || !teamInputValue.trim()) return;
    try {
      const team = await createTeamMutation.mutateAsync({
        name: teamInputValue.trim(),
      });
      if (team) {
        Alert.alert('성공', '팀이 생성되었습니다!', [
          {
            text: '확인',
            onPress: () => {
              setTeamModalType(null);
              setTeamInputValue('');
            },
          },
        ]);
      } else {
        Alert.alert('실패', '팀 생성 중 오류가 발생했습니다.');
      }
    } catch (e) {
      handleServiceError(e);
    }
  };

  const handleJoinTeam = async () => {
    if (!user || !teamInputValue.trim()) return;
    try {
      const team = await joinTeamMutation.mutateAsync({
        inviteCode: teamInputValue.trim(),
      });
      if (team) {
        selectTeam(team);
        Alert.alert('환영합니다!', `${team.name} 팀에 합류하셨습니다.`, [
          {
            text: '확인',
            onPress: () => {
              setTeamModalType(null);
              setTeamInputValue('');
            },
          },
        ]);
      } else {
        Alert.alert('실패', '초대 코드가 올바르지 않거나 팀을 찾을 수 없습니다.');
      }
    } catch (e) {
      handleServiceError(e);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={ds.pagePadding as ViewStyle}>
            <View style={styles.header}>
              <Text style={ds.headerTitle as TextStyle}>마이페이지</Text>
            </View>

            <MyPageProfileCard user={user} onPress={() => navigation.navigate('ProfileEdit')} />

            <BaseCard glassOnly padded={false} style={styles.section}>
              <SettingsRow
                icon="notifications-outline"
                title="알림 설정"
                subtitle="루틴 리마인더"
                onPress={() => navigation.navigate('AppSettings')}
                showDivider
              />
              <SettingsRow
                icon="people-outline"
                title="팀 관리"
                subtitle="팀 생성 및 참가"
                onPress={handleTeamManagement}
                showDivider
              />
              <SettingsRow
                icon="help-circle-outline"
                title="도움말"
                subtitle="자주 묻는 질문"
                onPress={() => Alert.alert('도움말', 'FAQ는 곧 제공될 예정이에요.')}
                showDivider={false}
              />
            </BaseCard>

            <BaseCard glassOnly padded={false}>
              <TouchableOpacity
                style={styles.logoutCard}
                onPress={handleLogout}
                activeOpacity={0.65}
                accessibilityRole="button"
                accessibilityLabel="로그아웃"
              >
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </BaseCard>
          </View>
        </ScrollView>

        <GlassModal
          visible={!!teamModalType}
          title={teamModalType === 'create' ? '새로운 팀 만들기' : '초대 코드 입력'}
          onClose={() => {
            setTeamModalType(null);
            setTeamInputValue('');
          }}
          onConfirm={teamModalType === 'create' ? handleCreateTeam : handleJoinTeam}
          confirmText={teamModalType === 'create' ? '생성하기' : '참가하기'}
        >
          <Input
            label={teamModalType === 'create' ? '팀 이름' : '초대 코드'}
            placeholder={teamModalType === 'create' ? '멋진 팀 이름' : '6자리 코드 입력'}
            value={teamInputValue}
            onChangeText={setTeamInputValue}
            autoCapitalize={teamModalType === 'join' ? 'characters' : 'none'}
          />
        </GlassModal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  header: {
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  iconCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTextWrap: {
    flex: 1,
  },
  settingsTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  settingsSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginLeft: spacing[4] + 28 + spacing[3],
    marginRight: spacing[4],
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4] + 2,
    paddingHorizontal: spacing[4],
  },
  logoutText: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.error,
  },
  section: {
    marginBottom: spacing[4],
  },
});
