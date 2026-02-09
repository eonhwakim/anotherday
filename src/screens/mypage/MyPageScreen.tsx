import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import { joinTeamByCode } from '../../services/teamService';
import GoalSetting from '../../components/mypage/GoalSetting';
import MonthlyGoalCalendar from '../../components/mypage/MonthlyGoalCalendar';
import CheckinModal from '../../components/mypage/CheckinModal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

export default function MyPageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuthStore();
  const { teams, currentTeam, fetchTeams, createTeam, selectTeam } = useTeamStore();
  const {
    teamGoals,
    myGoals,
    todayCheckins,
    monthlyCheckins,
    fetchTeamGoals,
    fetchMyGoals,
    fetchTodayCheckins,
    fetchMonthlyCheckins,
    toggleUserGoal,
    addGoal,
    removeTeamGoal,
    isLoading,
  } = useGoalStore();

  // ── 캘린더 월 상태 ──
  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));

  // ── 체크인 모달 상태 ──
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  // ── 팀 관리 모달 상태 ──
  const [teamModalType, setTeamModalType] = useState<'create' | 'join' | null>(null);
  const [teamInputValue, setTeamInputValue] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);

  /** 데이터 로드 */
  const loadData = useCallback(async () => {
    if (!user) return;

    await fetchTeams(user.id);
    const team = useTeamStore.getState().currentTeam;
    const teamId = team?.id ?? '';

    await Promise.all([
      fetchTeamGoals(teamId, user.id),
      fetchMyGoals(user.id),
      fetchTodayCheckins(user.id),
      fetchMonthlyCheckins(user.id, yearMonth),
    ]);
  }, [user, yearMonth]);

  // 탭 포커스 시마다 새로고침
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  /** 월 이동 */
  const goToPrevMonth = () => {
    setYearMonth((prev) =>
      dayjs(`${prev}-01`).subtract(1, 'month').format('YYYY-MM'),
    );
  };
  const goToNextMonth = () => {
    setYearMonth((prev) =>
      dayjs(`${prev}-01`).add(1, 'month').format('YYYY-MM'),
    );
  };

  /** 목표 토글 */
  const handleToggleGoal = async (goalId: string) => {
    if (!user) return;
    await toggleUserGoal(user.id, goalId);
    await fetchMonthlyCheckins(user.id, yearMonth);
  };

  /** 새 목표 추가 */
  const handleAddGoal = async (name: string): Promise<boolean> => {
    if (!user) return false;
    // 팀이 없으면 개인 목표로 추가 (teamId 생략)
    const activeTeam = useTeamStore.getState().currentTeam;
    const ok = await addGoal({
      teamId: activeTeam?.id, // undefined 면 개인 목표
      userId: user.id,
      name,
    });
    if (ok) {
      // 즉시 UI 업데이트를 위해 데이터 다시 로드
      await fetchMyGoals(user.id);
      // activeTeam이 없어도 fetchTeamGoals를 호출해야 개인 목표가 리스트에 뜸
      await fetchTeamGoals(activeTeam?.id ?? '', user.id);
      await fetchMonthlyCheckins(user.id, yearMonth);
    }
    return ok;
  };

  /** 목표 삭제 */
  const handleRemoveGoal = async (goalId: string) => {
    if (!user) return;
    const activeTeam = useTeamStore.getState().currentTeam;
    // 팀이 없으면 teamId='' 처리
    await removeTeamGoal(activeTeam?.id ?? '', user.id, goalId);
    await fetchMonthlyCheckins(user.id, yearMonth);
  };

  /** 캘린더 날짜 탭 → 모달 열기 */
  const handleDayPress = (date: string) => {
    setSelectedDate(date);
    setModalVisible(true);
  };

  /** 체크인 완료 후 새로고침 */
  const handleCheckinDone = async () => {
    if (!user) return;
    await fetchMonthlyCheckins(user.id, yearMonth);
    await fetchTodayCheckins(user.id);
    
    // 홈 화면의 산 진행률 업데이트를 위해 멤버 진행상황도 갱신
    const activeTeam = useTeamStore.getState().currentTeam;
    await useGoalStore.getState().fetchMemberProgress(activeTeam?.id, user.id);
  };

  /** 팀 생성 */
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

  /** 팀 참가 */
  const handleJoinTeam = async () => {
    if (!user || !teamInputValue.trim()) return;
    setTeamLoading(true);

    try {
      const team = await joinTeamByCode(teamInputValue.trim(), user.id);
      if (team) {
        // 스토어 업데이트
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

  /** 로그아웃 */
  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  // ── 통계용 계산 ──
  const currentMonthLabel = dayjs().format('YYYY년 M월');
  const todayCompleted = todayCheckins?.length ?? 0;
  const monthlyTotal = monthlyCheckins?.length ?? 0;
  const monthlySuccessCount = monthlyCheckins?.filter(
    (c) => c.photo_url != null,
  ).length ?? 0;
  const monthlyPassCount = monthlyCheckins?.filter((c) =>
    c.memo?.startsWith('[패스]'),
  ).length ?? 0;

  // 모달에 전달할 데이터
  const selectedDateGoals = (teamGoals || []).filter((g) =>
    (myGoals || []).some((ug) => ug.goal_id === g.id),
  );
  const selectedDateCheckins = (monthlyCheckins || []).filter(
    (c) => c.date === selectedDate,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.screenTitle}>마이페이지</Text>

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
              <Ionicons name="person" size={32} color="#fff" />
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
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* ── 소속 팀 목록 및 관리 ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>소속 팀</Text>
            <View style={styles.teamActions}>
              <TouchableOpacity 
                style={styles.teamActionBtn} 
                onPress={() => setTeamModalType('create')}
              >
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.teamActionText}>팀 생성</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.teamActionBtn}
                onPress={() => setTeamModalType('join')}
              >
                <Ionicons name="enter-outline" size={20} color={COLORS.primary} />
                <Text style={styles.teamActionText}>팀 참가</Text>
              </TouchableOpacity>
            </View>
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
                  loadData(); // 팀 변경 시 데이터 리로드
                }}
              >
                <Ionicons
                  name={currentTeam?.id === team.id ? "people-circle" : "people-outline"}
                  size={24}
                  color={currentTeam?.id === team.id ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.teamInfo}>
                  <Text style={[
                    styles.teamName,
                    currentTeam?.id === team.id && styles.activeTeamText
                  ]}>
                    {team.name} {currentTeam?.id === team.id && '(현재)'}
                  </Text>
                  <Text style={styles.inviteCode}>
                    초대코드: {team.invite_code}
                  </Text>
                </View>
                {currentTeam?.id === team.id && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── 한달 목표 설정 ── */}
        <GoalSetting
          teamGoals={teamGoals || []}
          myGoals={myGoals || []}
          onToggle={handleToggleGoal}
          onAdd={handleAddGoal}
          onRemove={handleRemoveGoal}
        />

        {/* ── 이번 달 달성 현황 (캘린더) ── */}
        {(myGoals || []).length > 0 && (
          <MonthlyGoalCalendar
            yearMonth={yearMonth}
            nickname={user?.nickname ?? '나'}
            teamGoals={teamGoals || []}
            myGoals={myGoals || []}
            checkins={monthlyCheckins || []}
            onDayPress={handleDayPress}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
          />
        )}

        {/* ── 월간 통계 ── */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>{currentMonthLabel} 통계</Text>
          <View style={styles.statsRow}>
            <StatItem
              label="오늘 달성"
              value={`${todayCompleted}개`}
              icon="checkmark-circle"
              color={COLORS.success}
            />
            <StatItem
              label="이번 달 성공"
              value={`${monthlySuccessCount}개`}
              icon="camera"
              color={COLORS.primary}
            />
            <StatItem
              label="패스"
              value={`${monthlyPassCount}회`}
              icon="pause-circle"
              color={COLORS.warning}
            />
            <StatItem
              label="소속 팀"
              value={`${teams?.length ?? 0}개`}
              icon="people"
              color={COLORS.primaryLight}
            />
          </View>
        </View>

        {/* ── 로그아웃 ── */}
        <View style={styles.logoutSection}>
          <Button
            title="로그아웃"
            variant="outline"
            onPress={handleLogout}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── 체크인 모달 ── */}
      <CheckinModal
        visible={modalVisible}
        date={selectedDate}
        goals={selectedDateGoals}
        checkins={selectedDateCheckins}
        onClose={() => setModalVisible(false)}
        onCheckinDone={handleCheckinDone}
      />

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
                onPress={() => {
                  setTeamModalType(null);
                  setTeamInputValue('');
                }}
                style={styles.cancelBtn}
                textStyle={{ color: COLORS.text }}
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

function StatItem({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
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
  },
  teamActionText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeTeamItem: {
    backgroundColor: 'rgba(141, 110, 99, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  activeTeamText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  inviteCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
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
    backgroundColor: '#F5F5F5',
  },
  confirmBtn: {
    flex: 1,
  },
});
