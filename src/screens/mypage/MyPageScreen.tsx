import React, { useState, useCallback, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
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
import GoalSetting from '../../components/mypage/GoalSetting';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import dayjs from '../../lib/dayjs';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/defaults';

export default function MyPageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, deleteAccount } = useAuthStore();
  const { teams, currentTeam, fetchTeams, createTeam, selectTeam } = useTeamStore();
  const {
    teamGoals,
    myGoals,
    lastMonthGoals,
    fetchTeamGoals,
    fetchMyGoals,
    fetchLastMonthGoals,
    copyGoalsFromLastMonth,
    fetchTodayCheckins,
    addGoal,
    removeTeamGoal,
  } = useGoalStore();

  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);

  React.useEffect(() => {
    const unsubscribe = tabNavigation.addListener('tabPress', () => {
      if (tabNavigation.isFocused()) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
        lastTapRef.current = now;
      }
    });
    return unsubscribe;
  }, [tabNavigation]);

  const [teamModalType, setTeamModalType] = useState<'create' | 'join' | null>(null);
  const [teamInputValue, setTeamInputValue] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);

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
      let q = supabase
        .from('monthly_resolutions')
        .select('content')
        .eq('user_id', u.id)
        .eq('year_month', yearMonth);
      q = team ? q.eq('team_id', team.id) : q.is('team_id', null);
      const { data } = await q.maybeSingle();
      const content = data?.content || '';
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
      fetchTodayCheckins(user.id),
    ]);
    await loadResolution();
  }, [user, loadResolution]);

  // 팀 변경 시 한마디 다시 로드
  React.useEffect(() => {
    loadResolution();
  }, [currentTeam?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // ── 월초 목표 이월 확인 ──
  React.useEffect(() => {
    // 이번 달 목표가 없고(myGoals.length === 0), 지난 달 만료된 목표가 있다면(lastMonthGoals.length > 0)
    if (lastMonthGoals.length > 0 && myGoals.length === 0) {
      Alert.alert(
        '새로운 달이 시작되었습니다! 🌙',
        '지난 달 목표를 이번 달에도 그대로 진행하시겠습니까?',
        [
          {
            text: '아니오, 새로 정할래요',
            style: 'cancel',
            onPress: () => {
              // 다시 묻지 않도록 상태 비움 (새로고침 전까지 안 물어봄)
              useGoalStore.setState({ lastMonthGoals: [] });
            },
          },
          {
            text: '네, 이어할래요',
            onPress: async () => {
              if (user) {
                await copyGoalsFromLastMonth(user.id);
                Alert.alert('목표가 연장되었습니다', '이번 달도 화이팅하세요! 🔥');
              }
            },
          },
        ],
      );
    }
  }, [lastMonthGoals, myGoals, user]);

  const handleAddGoal = async (
    name: string,
    frequency: 'daily' | 'weekly_count' = 'daily',
    targetCount: number | null = null,
  ): Promise<boolean> => {
    if (!user) return false;
    const activeTeam = useTeamStore.getState().currentTeam;
    const ok = await addGoal({
      teamId: activeTeam?.id,
      userId: user.id,
      name,
      frequency,
      targetCount,
    });
    if (ok) {
      await fetchMyGoals(user.id);
      await fetchTeamGoals(activeTeam?.id ?? '', user.id);

      if (frequency === 'weekly_count') {
        Alert.alert(
          `주 ${targetCount ?? 'N'}회 목표 등록 완료`,
          '오늘 할 계획이 아니라면 패스 인증을 하면 산을 오를 수 있어요. (미달로 카운팅됩니다.)',
        );
      }
    }
    return ok;
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
      let sel = supabase
        .from('monthly_resolutions')
        .select('id')
        .eq('user_id', u.id)
        .eq('year_month', yearMonth);
      sel = team ? sel.eq('team_id', team.id) : sel.is('team_id', null);
      const { data: row, error: selErr } = await sel.maybeSingle();
      if (selErr) throw selErr;

      if (row) {
        const { error } = await supabase
          .from('monthly_resolutions')
          .update({ content: text })
          .eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('monthly_resolutions').insert({
          user_id: u.id,
          team_id: team?.id ?? null,
          year_month: yearMonth,
          content: text,
        });
        if (error) throw error;
      }

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
    setTeamLoading(true);
    try {
      const team = await createTeam(teamInputValue.trim(), user.id);
      if (team) {
        Alert.alert('성공', '팀이 생성되었습니다!', [
          { text: '확인', onPress: () => {
            setTeamModalType(null);
            setTeamInputValue('');
            loadData();
          }}
        ]);
      } else {
        Alert.alert('실패', '팀 생성 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '알 수 없는 오류가 발생했습니다.');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!user || !teamInputValue.trim()) return;
    setTeamLoading(true);
    try {
      const team = await joinTeamByCode(teamInputValue.trim(), user.id);
      if (team) {
        selectTeam(team);
        await fetchTeams(user.id);
        Alert.alert('환영합니다!', `${team.name} 팀에 합류하셨습니다.`, [
          { text: '확인', onPress: () => {
            setTeamModalType(null);
            setTeamInputValue('');
            loadData();
          }}
        ]);
      } else {
        Alert.alert('실패', '초대 코드가 올바르지 않거나 팀을 찾을 수 없습니다.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '팀 참가 중 오류가 발생했습니다.');
    } finally {
      setTeamLoading(false);
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
        } 
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '계정을 삭제하면 모든 데이터(목표, 인증 기록, 팀 정보 등)가 영구적으로 삭제되며 복구할 수 없습니다.\n\n정말 삭제하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제하기',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '최종 확인',
              '이 작업은 되돌릴 수 없습니다. 계정을 삭제할까요?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '영구 삭제',
                  style: 'destructive',
                  onPress: async () => {
                    const success = await deleteAccount();
                    if (!success) {
                      Alert.alert('오류', '계정 삭제에 실패했습니다. 다시 시도해주세요.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  // ── 현재 팀에 해당하는 나의 목표만 필터링 ──
  const currentTeamUserGoals = React.useMemo(() => {
    if (!teamGoals || teamGoals.length === 0) return [];
    if (!myGoals || !user) return [];

    const myOwnedGoalIds = new Set(
      teamGoals.filter((g) => g.owner_id === user.id).map((g) => g.id),
    );
    return myGoals.filter((ug) => myOwnedGoalIds.has(ug.goal_id));
  }, [teamGoals, myGoals, user]);

  // ── 마이페이지 목표설정에 보여줄 목표 (user_goals에도 존재하는 것만) ──
  const myVisibleGoals = React.useMemo(() => {
    if (!teamGoals || !user) return [];
    const activeGoalIds = new Set(myGoals.map(ug => ug.goal_id));
    return teamGoals.filter((g) => g.owner_id === user.id && activeGoalIds.has(g.id));
  }, [teamGoals, myGoals, user]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView 
        ref={scrollRef} 
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.screenTitle}>마이페이지</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AppSettings')} style={{ padding: 14 }}>
            <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── 프로필 카드 ── */}
        <TouchableOpacity 
          style={styles.profileCard}
          onPress={() => navigation.navigate('ProfileEdit')}
        >
          <View style={styles.avatarLarge}>
            {user?.profile_image_url ? (
              <Image 
                source={{ uri: user.profile_image_url }} 
                style={{ width: 56, height: 56, borderRadius: 28 }} 
              />
            ) : (
              <Ionicons name="person" size={28} color={COLORS.primaryLight} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{user?.nickname ?? '-'}</Text>
            {(user?.name || user?.gender || user?.age) && (
              <Text style={styles.detailText}>
                {[user.name, user.gender, user.age ? `${user.age}세` : null]
                  .filter(Boolean)
                  .join(' / ')}
              </Text>
            )}
            <Text style={styles.email}>{user?.email ?? '-'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* ── 소속 팀 목록 및 관리 ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>소속 팀</Text>
          </View>

          
          {(teams || []).length === 0 ? (
            <Text style={styles.emptyText}>소속된 팀이 없어요. 팀을 만들거나 참가해보세요!</Text>
          ) : (
            teams.map((team) => (
              <TouchableOpacity 
                key={team.id} 
                style={[
                  styles.teamItem, 
                  currentTeam?.id === team.id && styles.activeTeamItem
                ]}
                onPress={() => {
                  selectTeam(team);
                  navigation.navigate('TeamMember', { teamId: team.id });
                }}
              >
                <TouchableOpacity 
                  onPress={() => {
                    selectTeam(team);
                    loadData(); // 팀 변경 시 데이터 새로고침
                  }}
                  style={styles.teamImageWrap}
                >
                  {team.profile_image_url ? (
                    <Image
                      source={{ uri: team.profile_image_url }}
                      style={styles.teamCardImage}
                    />
                  ) : (
                    <View style={[styles.teamCardImage, styles.teamCardImagePlaceholder]}>
                      <Ionicons name="people" size={20} color={COLORS.primaryLight} />
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.teamInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[
                      styles.teamName,
                      currentTeam?.id === team.id && styles.activeTeamText
                    ]}>
                      {team.name}
                    </Text>
                    {team.role === 'leader' ? (
                      <View style={styles.leaderBadge}>
                        <Text style={styles.leaderText}>LEADER</Text>
                      </View>
                    ) : (
                      <View style={styles.memberBadge}>
                        <Text style={styles.memberText}>MEMBER</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.inviteCode}>
                    초대코드: {team.invite_code}
                  </Text>
                </View>
                {currentTeam?.id === team.id && (
                  <TouchableOpacity 
                    onPress={async (e) => {
                      e.stopPropagation();
                      await Clipboard.setStringAsync(team.invite_code);
                      Alert.alert('복사 완료', '초대 코드가 클립보드에 복사되었습니다.');
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="clipboard-outline" size={18} color={COLORS.primaryLight} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}
          </View>

        {/* ── 한달 목표 설정 ── */}
        <GoalSetting
          teamGoals={myVisibleGoals}
          allTeamGoals={teamGoals || []}
          myGoals={currentTeamUserGoals}
          onAdd={handleAddGoal}
          onRemove={handleRemoveGoal}
          monthlyResolution={monthlyResolution}
        />

        {/* ── 계정 관리 ── */}
        <View style={styles.accountSection}>
          <Text style={styles.accountSectionTitle}>계정 관리</Text>

          <TouchableOpacity style={styles.accountRow} onPress={handleLogout}>
            <View style={styles.accountRowLeft}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.accountRowText}>로그아웃</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── 플로팅 버튼 (+) ── */}
      {!fabMenuVisible && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => setFabMenuVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* ── FAB 메뉴 모달 ── */}
      <Modal
        visible={fabMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFabMenuVisible(false)}
      >
        <View style={styles.fabOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setFabMenuVisible(false)}
          />
          
          <View style={styles.fabMenuContainer}>
            <View style={styles.fabMenuSection}>
              <TouchableOpacity 
                style={styles.fabMenuItem}
                onPress={() => { setFabMenuVisible(false); handleOpenTeamModal('create'); }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#1A1A1A" />
                <Text style={styles.fabMenuText}>팀 생성</Text>
              </TouchableOpacity>
              <View style={styles.fabMenuDivider} />
              <TouchableOpacity 
                style={styles.fabMenuItem}
                onPress={() => { setFabMenuVisible(false); handleOpenTeamModal('join'); }}
              >
                <Ionicons name="enter-outline" size={20} color="#1A1A1A" />
                <Text style={styles.fabMenuText}>팀 참가</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.fabMenuSection}>
              <TouchableOpacity 
                style={styles.fabMenuItem}
                onPress={() => { 
                  setFabMenuVisible(false); 
                  setResolutionInput(monthlyResolution);
                  setResolutionModalVisible(true); 
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#1A1A1A" />
                <Text style={styles.fabMenuText}>한마디 추가</Text>
              </TouchableOpacity>
              <View style={styles.fabMenuDivider} />
              <TouchableOpacity 
                style={styles.fabMenuItem}
                onPress={() => { 
                  setFabMenuVisible(false); 
                  navigation.navigate('AddRoutine');
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#1A1A1A" />
                <Text style={styles.fabMenuText}>루틴 추가</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 모달 내부에도 동일한 X 버튼을 배치하여 어두운 배경 위로 올라오게 함 */}
          <TouchableOpacity 
            style={[styles.floatingButton, styles.floatingButtonClose]}
            onPress={() => setFabMenuVisible(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── 한마디 추가 모달 ── */}
      <Modal
        visible={resolutionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResolutionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>이번 달 한마디</Text>
            <Input
              placeholder="이번 달의 다짐이나 목표를 적어보세요"
              value={resolutionInput}
              onChangeText={setResolutionInput}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <Button
                title="취소"
                variant="secondary"
                onPress={() => setResolutionModalVisible(false)}
                style={styles.cancelBtn}
              />
              <Button
                title="저장"
                onPress={async () => {
                  const ok = await handleUpdateResolution(resolutionInput);
                  if (ok) setResolutionModalVisible(false);
                }}
                style={styles.confirmBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 팀 생성/참가 모달 ── */}
      <Modal
        visible={!!teamModalType}
        transparent
        animationType="fade"
        onRequestClose={() => setTeamModalType(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {teamModalType === 'create' ? '새로운 팀 만들기' : '초대 코드 입력'}
            </Text>
            
            <Input
              label={teamModalType === 'create' ? '팀 이름' : '초대 코드'}
              placeholder={teamModalType === 'create' ? '멋진 팀 이름' : '6자리 코드 입력'}
              value={teamInputValue}
              onChangeText={setTeamInputValue}
              autoCapitalize={teamModalType === 'join' ? 'characters' : 'none'}
            />

            <View style={styles.modalButtons}>
              <Button
                title="취소"
                variant="secondary"
                onPress={() => {
                  setTeamModalType(null);
                  setTeamInputValue('');
                }}
                style={styles.cancelBtn}
              />
              <Button
                title={teamModalType === 'create' ? '생성하기' : '참가하기'}
                onPress={teamModalType === 'create' ? handleCreateTeam : handleJoinTeam}
                loading={teamLoading}
                style={styles.confirmBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFAF7',
  },
  scroll: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 4,
    gap: 16,
    marginBottom: 16,
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 4,
    marginBottom: 16,
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
    color: '#FF6B3D',
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
    color: '#FF6B3D',
    fontWeight: '700',
  },
  inviteCode: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.35)',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  accountSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 4,
  },
  accountSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.45)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  accountDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    marginHorizontal: 16,
  },
  accountDeleteHint: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.35)',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.15)',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1,
  },
  leaderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF6B3D',
    backgroundColor: 'rgba(255, 107, 61, 0.10)',
  },
  leaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B3D',
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
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B3D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  floatingButtonClose: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    // 모달 안에서 위치를 잡기 위해 명시적으로 지정
    bottom: 110,
    right: 20,
  },
  
  // ── FAB 메뉴 모달 ──
  fabOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  fabMenuContainer: {
    position: 'absolute',
    right: 20,
    bottom: 180, // 플로팅 버튼 위로 뜨도록
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
