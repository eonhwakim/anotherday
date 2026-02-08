import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useGoalStore } from '../../stores/goalStore';
import GoalSetting from '../../components/mypage/GoalSetting';
import MonthlyGoalCalendar from '../../components/mypage/MonthlyGoalCalendar';
import CheckinModal from '../../components/mypage/CheckinModal';
import Button from '../../components/common/Button';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

export default function MyPageScreen() {
  const { user, signOut } = useAuthStore();
  const { teams, currentTeam, fetchTeams } = useTeamStore();
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
    if (ok) await fetchMonthlyCheckins(user.id, yearMonth);
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
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={32} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{user?.nickname ?? '-'}</Text>
            <Text style={styles.email}>{user?.email ?? '-'}</Text>
          </View>
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

        {/* ── 소속 팀 목록 ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>소속 팀</Text>
          {(teams || []).length === 0 ? (
            <Text style={styles.emptyText}>소속된 팀이 없어요</Text>
          ) : (
            teams.map((team) => (
              <View key={team.id} style={styles.teamItem}>
                <Ionicons
                  name="people-circle"
                  size={24}
                  color={COLORS.primary}
                />
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <Text style={styles.inviteCode}>
                    초대코드: {team.invite_code}
                  </Text>
                </View>
              </View>
            ))
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
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
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
});
