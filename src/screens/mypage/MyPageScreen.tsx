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
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  const currentMonthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');

  // ── 월간 통계 계산 ──
  const monthlyStats = React.useMemo(() => {
    const checkins = monthlyCheckins ?? [];
    const goals = myGoals ?? [];
    const allGoals = teamGoals ?? [];
    const startDate = `${yearMonth}-01`;
    const today = dayjs().format('YYYY-MM-DD');
    const daysInMonth = dayjs(startDate).daysInMonth();

    const doneTotal = checkins.filter((c) => c.status === 'done').length;
    const passTotal = checkins.filter((c) => c.status === 'pass').length;

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
      const done = dayCheckins.filter((c) => c.status === 'done').length;
      const pass = dayCheckins.filter((c) => c.status === 'pass').length;
      const effectiveTotal = totalForDay - pass;
      const pct = effectiveTotal > 0 ? (done / effectiveTotal) * 100 : (done > 0 ? 100 : 0);
      dailyPercents.push(pct);

      // 목표별 통계
      todayGoals.forEach((ug) => {
        const gid = ug.goal_id;
        const c = dayCheckins.find((ci) => ci.goal_id === gid);
        if (c?.status === 'done') {
          goalDoneMap[gid] = (goalDoneMap[gid] || 0) + 1;
        } else if (c?.status === 'pass') {
          goalPassMap[gid] = (goalPassMap[gid] || 0) + 1;
          if (c.memo) passReasons.push(c.memo);
        } else {
          goalFailMap[gid] = (goalFailMap[gid] || 0) + 1;
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
    (myGoals || []).some((ug) => {
      if (ug.goal_id !== g.id) return false;
      // start_date 이전이면 해당 날짜에 목표 없음
      if (ug.start_date && selectedDate < ug.start_date) return false;
      return true;
    }),
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
                  loadData();
                }}
              >
                <Ionicons
                  name={currentTeam?.id === team.id ? "people-circle" : "people-outline"}
                  size={22}
                  color={currentTeam?.id === team.id ? COLORS.primaryLight : COLORS.textSecondary}
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
                  <Ionicons name="checkmark" size={18} color={COLORS.primaryLight} />
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

          {/* 달성률 요약 */}
          <View style={styles.statsRow}>
            <StatItem label="평균 달성률" value={`${monthlyStats.avg}%`} icon="analytics" color="#fff" />
            <StatItem label="최고" value={`${monthlyStats.max}%`} icon="arrow-up" color="#4ADE80" />
            <StatItem label="최저" value={`${monthlyStats.min}%`} icon="arrow-down" color="#EF4444" />
          </View>

          {/* DONE / PASS 카운트 */}
          <View style={[styles.statsRow, { marginTop: 16 }]}>
            <StatItem label="완료" value={`${monthlyStats.doneTotal}회`} icon="checkmark-circle" color="#fff" />
            <StatItem label="패스" value={`${monthlyStats.passTotal}/5`} icon="pause-circle" color="#FFB547" />
            <StatItem label="소속 팀" value={`${teams?.length ?? 0}개`} icon="people" color="rgba(255,255,255,0.60)" />
          </View>

          {/* 목표별 통계 */}
          {monthlyStats.goalStats.length > 0 && (
            <View style={styles.goalStatsSection}>
              <Text style={styles.goalStatsTitle}>목표별 현황</Text>
              {monthlyStats.goalStats.map((gs) => (
                <View key={gs.goalId} style={styles.goalStatRow}>
                  <Text style={styles.goalStatName} numberOfLines={1}>{gs.name}</Text>
                  <View style={styles.goalStatBadges}>
                    <Text style={styles.goalStatDone}>{gs.done}완료</Text>
                    {gs.pass > 0 && <Text style={styles.goalStatPass}>{gs.pass}패스</Text>}
                    {gs.fail > 0 && <Text style={styles.goalStatFail}>{gs.fail}미달</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* PASS 사유 TOP3 */}
          {monthlyStats.topReasons.length > 0 && (
            <View style={styles.passReasonsSection}>
              <Text style={styles.goalStatsTitle}>패스 사유 TOP</Text>
              {monthlyStats.topReasons.map(([reason, count], idx) => (
                <View key={idx} style={styles.passReasonRow}>
                  <Text style={styles.passReasonRank}>{idx + 1}</Text>
                  <Text style={styles.passReasonText} numberOfLines={1}>{reason}</Text>
                  <Text style={styles.passReasonCount}>{count}회</Text>
                </View>
              ))}
            </View>
          )}
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
      <View style={[styles.statIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
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
  statsCard: {
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
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
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
  logoutSection: {
    paddingHorizontal: 16,
    marginTop: 8,
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

  // ── 목표별 통계 ──
  goalStatsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  goalStatsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  goalStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  goalStatName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
    flex: 1,
    marginRight: 8,
  },
  goalStatBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  goalStatDone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalStatPass: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFB547',
    backgroundColor: 'rgba(255,181,71,0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalStatFail: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // ── PASS 사유 ──
  passReasonsSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  passReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  passReasonRank: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.30)',
    width: 16,
    textAlign: 'center',
  },
  passReasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    flex: 1,
  },
  passReasonCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB547',
  },
});
