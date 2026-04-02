import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import { joinTeamByCode } from '../../services/teamService';
import { getMonthlyResolution, saveMonthlyResolution } from '../../services/monthlyService';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import dayjs from '../../lib/dayjs';
import { colors, ds, spacing, typography } from '../../design/recipes';

import FrameCard from '../../components/ui/FrameCard';
import Input from '../../components/common/Input';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';

import GlassModal from '../../components/ui/GlassModal';
import GoalSetting from '../../components/mypage/GoalSetting';
import MyPageProfileCard from '../../components/mypage/MyPageProfileCard';
import MyPageTeamSection from '../../components/mypage/MyPageTeamSection';
import MyPageFabMenu from '../../components/mypage/MyPageFabMenu';

export default function MyPageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuthStore();
  const { teams, currentTeam, fetchTeams, createTeam, selectTeam } = useTeamStore();
  const {
    teamGoals,
    myGoals,
    monthGoals,
    fetchTeamGoals,
    fetchMyGoals,
    fetchMyGoalsForMonth,
    fetchTodayCheckins,
    endTeamGoal,
    removeTeamGoal,
  } = useGoalStore();

  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation: tabNavigation, scrollRef });

  const [teamModalType, setTeamModalType] = useState<'create' | 'join' | null>(null);
  const [teamInputValue, setTeamInputValue] = useState('');
  const [monthlyResolution, setMonthlyResolution] = useState('');
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [resolutionInput, setResolutionInput] = useState('');

  const loadResolution = useCallback(async () => {
    // fetchTeams 직후 등 리렌더 전에 호출될 수 있으므로 스토어에서 읽음
    const u = useAuthStore.getState().user;
    const team = useTeamStore.getState().currentTeam;
    if (!u) {
      setMonthlyResolution('');
      setResolutionInput('');
      return;
    }
    const yearMonth = dayjs().format('YYYY-MM');
    try {
      const content = await getMonthlyResolution(u.id, yearMonth, team?.id ?? null);
      setMonthlyResolution(content);
      setResolutionInput(content);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    await fetchTeams(user.id);
    const team = useTeamStore.getState().currentTeam;
    const teamId = team?.id ?? '';
    await Promise.all([
      fetchTeamGoals(teamId, user.id),
      fetchMyGoals(user.id),
      fetchMyGoalsForMonth(user.id, dayjs().format('YYYY-MM')),
      fetchTodayCheckins(user.id),
    ]);
    await loadResolution();
  }, [
    user,
    fetchTeams,
    fetchTeamGoals,
    fetchMyGoals,
    fetchMyGoalsForMonth,
    fetchTodayCheckins,
    loadResolution,
  ]);

  // 팀 변경 시 한마디 다시 로드
  React.useEffect(() => {
    loadResolution();
  }, [currentTeam?.id, loadResolution]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleEndGoal = async (goalId: string) => {
    if (!user) return;
    const activeTeam = useTeamStore.getState().currentTeam;
    await endTeamGoal(activeTeam?.id ?? '', user.id, goalId);
  };

  const handleRemoveGoal = async (goalId: string) => {
    if (!user) return;
    const activeTeam = useTeamStore.getState().currentTeam;
    await removeTeamGoal(activeTeam?.id ?? '', user.id, goalId);
  };

  const handleUpdateResolution = async (text: string): Promise<boolean> => {
    const u = useAuthStore.getState().user;
    const team = useTeamStore.getState().currentTeam;
    if (!u) return false;
    const yearMonth = dayjs().format('YYYY-MM');
    try {
      const ok = await saveMonthlyResolution({
        userId: u.id,
        yearMonth,
        content: text,
        teamId: team?.id ?? null,
      });
      if (!ok) throw new Error('save failed');

      setMonthlyResolution(text);
      setResolutionInput(text);
      await loadResolution();
      return true;
    } catch (e) {
      console.error(e);
      Alert.alert('저장 실패', '한마디 저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  const handleCreateTeam = async () => {
    if (!user || !teamInputValue.trim()) return;
    try {
      const team = await createTeam(teamInputValue.trim(), user.id);
      if (team) {
        Alert.alert('성공', '팀이 생성되었습니다!', [
          {
            text: '확인',
            onPress: () => {
              setTeamModalType(null);
              setTeamInputValue('');
              loadData();
            },
          },
        ]);
      } else {
        Alert.alert('실패', '팀 생성 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '알 수 없는 오류가 발생했습니다.');
    }
  };

  const handleJoinTeam = async () => {
    if (!user || !teamInputValue.trim()) return;
    try {
      const team = await joinTeamByCode(teamInputValue.trim(), user.id);
      if (team) {
        selectTeam(team);
        await fetchTeams(user.id);
        Alert.alert('환영합니다!', `${team.name} 팀에 합류하셨습니다.`, [
          {
            text: '확인',
            onPress: () => {
              setTeamModalType(null);
              setTeamInputValue('');
              loadData();
            },
          },
        ]);
      } else {
        Alert.alert('실패', '초대 코드가 올바르지 않거나 팀을 찾을 수 없습니다.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '팀 참가 중 오류가 발생했습니다.');
    }
  };

  const handleOpenTeamModal = (type: 'create' | 'join') => {
    if (teams.length >= 1) {
      Alert.alert('알림', '현재는 팀을 1개까지만 생성/참가할 수 있습니다.');
      return;
    }
    setTeamModalType(type);
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

  // ── 현재 팀에 해당하는 나의 목표만 필터링 ──
  const currentTeamUserGoals = React.useMemo(() => {
    if (!teamGoals || teamGoals.length === 0) return [];
    if (!monthGoals || !user) return [];

    const myOwnedGoalIds = new Set(
      teamGoals.filter((g) => g.owner_id === user.id).map((g) => g.id),
    );
    return monthGoals.filter((ug) => myOwnedGoalIds.has(ug.goal_id));
  }, [teamGoals, monthGoals, user]);

  // ── 마이페이지 목표설정에 보여줄 목표 (user_goals에도 존재하는 것만) ──
  const myVisibleGoals = React.useMemo(() => {
    if (!teamGoals || !user) return [];
    const activeGoalIds = new Set(currentTeamUserGoals.map((ug) => ug.goal_id));
    return teamGoals.filter((g) => g.owner_id === user.id && activeGoalIds.has(g.id));
  }, [teamGoals, currentTeamUserGoals, user]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="마이페이지"
          right={
            <TouchableOpacity
              onPress={() => navigation.navigate('AppSettings')}
              style={styles.headerButton}
            >
              <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          }
        />
        <ScrollView ref={scrollRef} style={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ── 프로필 카드 ── */}
          <MyPageProfileCard user={user} onPress={() => navigation.navigate('ProfileEdit')} />

          {/* ── 한달 목표 설정 ── */}
          <GoalSetting
            teamGoals={myVisibleGoals}
            myGoals={currentTeamUserGoals}
            onEnd={handleEndGoal}
            onRemove={handleRemoveGoal}
            monthlyResolution={monthlyResolution}
          />

          <MyPageTeamSection
            teams={teams}
            currentTeam={currentTeam}
            onOpenTeamMember={(team) => {
              selectTeam(team);
              navigation.navigate('TeamMember', { teamId: team.id });
            }}
            onSelectTeam={(team) => {
              selectTeam(team);
              loadData();
            }}
          />

          {/* ── 계정 관리 ── */}
          <FrameCard style={styles.sectionFrame} contentStyle={styles.accountSection} padded={false}>
            <SectionHeader title="계정 관리" subtitle="로그아웃과 계정 설정을 관리해요" inset />

            <TouchableOpacity style={styles.accountRow} onPress={handleLogout}>
              <View style={styles.accountRowLeft}>
                <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.accountRowText}>로그아웃</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </FrameCard>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── 플로팅 버튼 (+) ── */}
        {!fabMenuVisible && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => setFabMenuVisible(true)}
            activeOpacity={0.8}
          >
            <Image
              source={require('../../../assets/plus-btn.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        <MyPageFabMenu
          visible={fabMenuVisible}
          onClose={() => setFabMenuVisible(false)}
          onCreateTeam={() => {
            setFabMenuVisible(false);
            handleOpenTeamModal('create');
          }}
          onJoinTeam={() => {
            setFabMenuVisible(false);
            handleOpenTeamModal('join');
          }}
          onAddResolution={() => {
            setFabMenuVisible(false);
            setResolutionInput(monthlyResolution);
            setResolutionModalVisible(true);
          }}
          onAddRoutine={() => {
            setFabMenuVisible(false);
            navigation.navigate('AddRoutine');
          }}
        />

        {/* ── 한마디 추가 모달 ── */}
        <GlassModal
          visible={resolutionModalVisible}
          title="이번 달 한마디"
          onClose={() => setResolutionModalVisible(false)}
          onConfirm={async () => {
            const ok = await handleUpdateResolution(resolutionInput);
            if (ok) setResolutionModalVisible(false);
          }}
        >
          <Input
            placeholder="이번 달의 다짐이나 목표를 적어보세요"
            value={resolutionInput}
            onChangeText={setResolutionInput}
            autoFocus
            maxLength={50}
          />
        </GlassModal>

        {/* ── 팀 생성/참가 모달 ── */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screen },
  safe: ds.screen,
  scroll: { flex: 1 },
  headerButton: { padding: spacing[1] },
  profileFrame: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 61, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.25)',
  },
  profileInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.50)',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.35)',
  },
  sectionFrame: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  sectionCard: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamActions: {
    flexDirection: 'row',
    gap: 12,
  },
  teamActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.15)',
  },
  teamActionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(26,26,26,0.45)',
    textAlign: 'center',
    paddingVertical: 12,
  },
  teamImageWrap: {},
  teamCardImage: {
    width: 44,
    height: 34,
    borderRadius: 22,
  },
  teamCardImagePlaceholder: {
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamItemFrame: {
    marginBottom: 8,
    borderRadius: 12,
  },
  activeTeamItemFrame: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // 불투명도가 높은 흰색 유리 느낌
    borderTopColor: 'rgba(255, 255, 255, 1)', // 좌상단은 빛을 받아 하얗게 빛남
    borderLeftColor: 'rgba(229, 229, 229, 1)',
    borderBottomColor: 'rgba(255, 135, 61, 0.22)',
    borderWidth: 0.6,
    shadowColor: '#929292ff',
    shadowOffset: { width: 1, height: 1 }, // 우하단으로 넓게 퍼지는 빛 번짐
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'visible', // 글로우 효과가 잘리지 않도록
  },
  teamItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  activeTeamItem: {
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.22)',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  activeTeamText: {
    color: colors.primary,
    fontWeight: '700',
  },
  inviteCode: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.35)',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  accountSection: {
    paddingHorizontal: 0,
    paddingVertical: spacing[2],
  },
  accountRow: {
    ...ds.rowBetween,
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
  },
  accountRowLeft: {
    ...ds.rowCenter,
    gap: 10,
  },
  accountRowText: {
    ...typography.bodyStrong,
    fontWeight: '500',
    color: colors.text,
  },

  leaderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 107, 61, 0.10)',
  },
  leaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  memberBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.25)',
  },
  memberText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(26,26,26,0.45)',
  },

  // ── 플로팅 버튼 ──
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonClose: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    borderRadius: 40,
    width: 64,
    height: 64,
    // 모달 안에서 위치를 잡기 위해 명시적으로 지정
    bottom: 120,
    right: 24,
  },

  // ── FAB 메뉴 모달 ──
  fabOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  fabMenuContainer: {
    position: 'absolute',
    right: 20,
    bottom: 200, // 플로팅 버튼 위로 뜨도록
    width: 200,
  },
  fabMenuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  fabMenuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  fabMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
