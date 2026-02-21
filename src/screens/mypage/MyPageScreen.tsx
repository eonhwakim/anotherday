import React, { useState, useCallback } from 'react';
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

import MonthlyStatsCard from '../../components/common/MonthlyStatsCard';

export default function MyPageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, deleteAccount } = useAuthStore();
  const { teams, currentTeam, fetchTeams, createTeam, selectTeam } = useTeamStore();
  const {
    teamGoals,
    myGoals,
    monthlyCheckins,
    fetchTeamGoals,
    fetchMyGoals,
    fetchTodayCheckins,
    fetchMonthlyCheckins,
    toggleUserGoal,
    addGoal,
    removeTeamGoal,
  } = useGoalStore();

  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [teamModalType, setTeamModalType] = useState<'create' | 'join' | null>(null);
  const [teamInputValue, setTeamInputValue] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

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

  const handleToggleGoal = async (goalId: string) => {
    if (!user) return;
    await toggleUserGoal(user.id, goalId);
    await fetchMonthlyCheckins(user.id, yearMonth);
  };

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
      await fetchMonthlyCheckins(user.id, yearMonth);
    }
    return ok;
  };

  const handleRemoveGoal = async (goalId: string) => {
    if (!user) return;
    const activeTeam = useTeamStore.getState().currentTeam;
    await removeTeamGoal(activeTeam?.id ?? '', user.id, goalId);
    await fetchMonthlyCheckins(user.id, yearMonth);
  };

  const handleDayPress = (date: string) => {
    setSelectedDate(date);
    setModalVisible(true);
  };

  const handleCheckinDone = async () => {
    if (!user) return;
    await fetchMonthlyCheckins(user.id, yearMonth);
    await fetchTodayCheckins(user.id);
    const activeTeam = useTeamStore.getState().currentTeam;
    await useGoalStore.getState().fetchMemberProgress(activeTeam?.id, user.id);
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

  const currentMonthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');

  // ── 현재 팀에 해당하는 목표만 필터링 ──
  // myGoals에는 유저의 모든 목표가 들어있으므로, 현재 선택된 팀(currentTeam/teamGoals)에 속한 것만 추려야 함.
  const currentTeamUserGoals = React.useMemo(() => {
    // teamGoals가 로드되지 않았거나 선택된 팀이 없으면 빈 배열
    if (!teamGoals || teamGoals.length === 0) return [];
    if (!myGoals) return [];

    // teamGoals에 존재하는 goal_id를 가진 myGoals만 필터
    // (teamGoals는 이미 fetchTeamGoals(teamId)로 현재 팀 것만 가져온 상태)
    const teamGoalIds = new Set(teamGoals.map((g) => g.id));
    return myGoals.filter((ug) => teamGoalIds.has(ug.goal_id));
  }, [teamGoals, myGoals]);

  // ── 마이페이지 목표설정에 보여줄 목표 (본인 것만) ──
  // teamGoals에는 팀 전체 목표가 포함되므로, GoalSetting에는
  // 본인이 만든 목표 + 본인이 이미 선택한 목표만 보여줌
  const myVisibleGoals = React.useMemo(() => {
    if (!teamGoals || !user) return [];
    const selectedGoalIds = new Set((myGoals ?? []).map((ug) => ug.goal_id));
    return teamGoals.filter(
      (g) => g.owner_id === user.id || selectedGoalIds.has(g.id),
    );
  }, [teamGoals, myGoals, user]);

  // ── 월간 통계 계산 ──
  const monthlyStats = React.useMemo(() => {
    // 체크인도 현재 팀 목표에 해당하는 것만 필터링 필요
    // (monthlyCheckins는 user_id, yyyy-mm 기준이라 모든 팀 체크인이 섞여있을 수 있음)
    // 다만, 아래 로직에서 goals(currentTeamUserGoals)를 순회하며 체크인을 찾으므로
    // goals만 잘 필터링되어 있다면 통계는 맞게 나옴.
    // 하지만 doneTotal, passTotal 같은 전체 합계는 checkins 전체를 reduce하므로 필터링 필요.

    const goals = currentTeamUserGoals;
    const allGoals = teamGoals ?? [];
    
    // 유효한 goal_id 집합
    const validGoalIds = new Set(goals.map(g => g.goal_id));
    
    // 현재 팀 목표에 대한 체크인만 추출
    const checkins = (monthlyCheckins ?? []).filter(c => validGoalIds.has(c.goal_id));

    const startDate = `${yearMonth}-01`;
    const today = dayjs().format('YYYY-MM-DD');
    const daysInMonth = dayjs(startDate).daysInMonth();

    // 패스 판별 헬퍼 (status='pass' 또는 memo가 '[패스]'로 시작하면 패스)
    const isPass = (c: any) => c.status === 'pass' || (c.memo && c.memo.startsWith('[패스]'));
    const isDone = (c: any) => !isPass(c);

    const doneTotal = checkins.filter(isDone).length;
    const passTotal = checkins.filter(isPass).length;

    // 날짜별 퍼센트 계산 (PASS 제외)
    const dailyPercents: number[] = [];
    const goalDoneMap: Record<string, number> = {};
    const goalPassMap: Record<string, number> = {};
    const goalFailMap: Record<string, number> = {};
    const passReasons: string[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (dateStr > today) break;

      const dayIdx = dayjs(dateStr).day();
      const todayGoals = goals.filter((ug) => {
        // start_date 이전은 목표가 없던 날
        if (ug.start_date && dateStr < ug.start_date) return false;
        if (ug.frequency === 'daily') return true;
        if (ug.frequency === 'weekly_count') return true;
        return true;
      });
      const totalForDay = todayGoals.length;
      if (totalForDay === 0) continue;

      const dayCheckins = checkins.filter((c) => c.date === dateStr);
      const done = dayCheckins.filter(isDone).length;
      const pass = dayCheckins.filter(isPass).length;
      const effectiveTotal = totalForDay - pass;
      const pct = effectiveTotal > 0 ? (done / effectiveTotal) * 100 : (done > 0 ? 100 : 0);
      dailyPercents.push(pct);

      // 목표별 통계
      todayGoals.forEach((ug) => {
        const gid = ug.goal_id;
        const c = dayCheckins.find((ci) => ci.goal_id === gid);
        if (!c) {
          goalFailMap[gid] = (goalFailMap[gid] || 0) + 1;
        } else if (isPass(c)) {
          goalPassMap[gid] = (goalPassMap[gid] || 0) + 1;
          if (c.memo) passReasons.push(c.memo);
        } else {
          goalDoneMap[gid] = (goalDoneMap[gid] || 0) + 1;
        }
      });
    }

    // PASS 사유 TOP3
    const reasonCounts: Record<string, number> = {};
    passReasons.forEach((r) => {
      const cleaned = r.replace(/^\[패스\]\s*/, '').trim();
      if (cleaned) reasonCounts[cleaned] = (reasonCounts[cleaned] || 0) + 1;
    });
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const avg = dailyPercents.length > 0
      ? Math.round(dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length)
      : 0;
    const max = dailyPercents.length > 0 ? Math.round(Math.max(...dailyPercents)) : 0;
    const min = dailyPercents.length > 0 ? Math.round(Math.min(...dailyPercents)) : 0;

    // 목표별 상세 통계
    const goalStats = goals.map((ug) => {
      const goal = allGoals.find((g) => g.id === ug.goal_id);
      return {
        goalId: ug.goal_id,
        name: goal?.name ?? '알 수 없음',
        done: goalDoneMap[ug.goal_id] || 0,
        pass: goalPassMap[ug.goal_id] || 0,
        fail: goalFailMap[ug.goal_id] || 0,
      };
    });

    return { doneTotal, passTotal, avg, max, min, goalStats, topReasons };
  }, [monthlyCheckins, myGoals, teamGoals, yearMonth]);

  // 선택한 날짜에 유효한 목표만 필터 (start_date 이후만)
  const selectedDateGoals = (teamGoals || []).filter((g) =>
    currentTeamUserGoals.some((ug) => {
      if (ug.goal_id !== g.id) return false;
      // start_date 이전이면 해당 날짜에 목표 없음
      if (ug.start_date && selectedDate < ug.start_date) return false;
      return true;
    }),
  );
  const selectedDateCheckins = (monthlyCheckins || []).filter(
    (c) => c.date === selectedDate && currentTeamUserGoals.some(g => g.goal_id === c.goal_id),
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
            <View style={styles.teamActions}>
              <TouchableOpacity 
                style={styles.teamActionBtn} 
                onPress={() => setTeamModalType('create')}
              >
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primaryLight} />
                <Text style={styles.teamActionText}>팀 생성</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.teamActionBtn}
                onPress={() => setTeamModalType('join')}
              >
                <Ionicons name="enter-outline" size={18} color={COLORS.primaryLight} />
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
                  navigation.navigate('TeamDetail', { teamId: team.id });
                }}
              >
                <TouchableOpacity 
                  onPress={() => {
                    selectTeam(team);
                    loadData(); // 팀 변경 시 데이터 새로고침
                  }}
                >
                  <Ionicons
                    name={currentTeam?.id === team.id ? "aperture" : "aperture-outline"}
                    size={22}
                    color={currentTeam?.id === team.id ? COLORS.primaryLight : COLORS.textSecondary}
                  />
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
          allTeamGoals={teamGoals || []} // 전체 팀 목표 전달 (추천용)
          myGoals={currentTeamUserGoals}
          onToggle={handleToggleGoal}
          onAdd={handleAddGoal}
          onRemove={handleRemoveGoal}
        />
        {/* ── 이번 달 달성 현황 (캘린더) ── */}
        {currentTeamUserGoals.length > 0 && (
          <>
          <Text style={{ color: '#ff9a9e', fontSize: 12, fontWeight: 'bold', textAlign: 'center', margin: 10 }}>오늘 날짜를 클릭하여 인증을 하세요</Text>
          <MonthlyGoalCalendar
            yearMonth={yearMonth}
            nickname={user?.nickname ?? '나'}
            teamGoals={teamGoals || []}
            myGoals={currentTeamUserGoals}
            checkins={monthlyCheckins || []} // 캘린더 내부에서 매칭하므로 원본 넘겨도 되지만, 필터링된게 안전함. 
                                             // 단, MonthlyGoalCalendar는 checkins prop을 받아서 날짜별로 매핑함.
                                             // 여기서 필터링 안해도 캘린더 내부 로직이 goalId 기준이면 괜찮음.
                                             // 일관성을 위해 필터링된거 넘기는게 좋으나, 
                                             // monthlyStats에서 만든 filtered checkins는 useMemo 안에 있어서 접근 불가.
                                             // 그냥 monthlyCheckins 넘겨도 캘린더는 myGoals(filtered) 기준으로 마킹하는지 확인 필요.
                                             // MonthlyGoalCalendar를 보면 checkins.filter(c => myGoals.some(...)) 로직이 있다면 OK.
            onDayPress={handleDayPress}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
          />
          </>
        )}

        {/* ── 월간 통계 ── */}
        <TouchableOpacity
          onPress={() => {
            if (!user) return;
            navigation.navigate('MemberStats', {
              userId: user.id,
              teamId: currentTeam?.id,
              nickname: user.nickname,
            });
          }}
          activeOpacity={0.8}
        >
          <MonthlyStatsCard 
            monthLabel={currentMonthLabel}
            stats={monthlyStats}
            teamCount={teams?.length}
            showArrow
          />
        </TouchableOpacity>

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

          <View style={styles.accountDivider} />

          <TouchableOpacity style={styles.accountRow} onPress={handleDeleteAccount}>
            <View style={styles.accountRowLeft}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.accountRowText, { color: '#FF6B6B' }]}>계정 삭제 (Delete Account)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,107,107,0.4)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.accountDeleteHint}>
          계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
        </Text>

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
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
    marginBottom: 16,
    shadowColor: 'rgba(255,255,255,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
    shadowColor: 'rgba(255,255,255,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  teamActionText: {
    fontSize: 12,
    color: COLORS.primaryLight,
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
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  activeTeamItem: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
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
    color: COLORS.secondary,
    fontWeight: '700',
  },
  inviteCode: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  accountSection: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  accountSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
    color: COLORS.text,
  },
  accountDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 16,
  },
  accountDeleteHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'rgba(10,10,10,0.96)',
    width: '100%',
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: 'rgba(255,255,255,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 6,
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
  },
  confirmBtn: {
    flex: 1,
  },
  leaderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'red',
  },
  leaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'red',
  },
  memberBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'green',
  },
  memberText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'green',
  },
});
