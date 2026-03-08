import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import dayjs from '../../lib/dayjs';
import { supabase } from '../../lib/supabaseClient';
import { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { COLORS } from '../../constants/defaults';
import { TeamMemberWithUser, MonthlyResolution, MonthlyRetrospective, UserGoal, Checkin } from '../../types/domain';
import Button from '../../components/common/Button';

type TeamDetailScreenRouteProp = RouteProp<RootStackParamList, 'TeamDetail'>;

interface MemberStats {
  totalGoals: number;
  doneCount: number;
  passCount: number;
  missedCount: number;
  completionRate: number;
}

interface MemberGoalStatus {
  goalId: string;
  name: string;
  frequency: 'daily' | 'weekly_count';
  targetCount: number | null;
  done: number;
  pass: number;
  fail: number;
  total: number;
}

export default function TeamDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TeamDetailScreenRouteProp>();
  const { teamId } = route.params;
  const { user } = useAuthStore();
  const { teams, deleteTeam, fetchTeams } = useTeamStore();

  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [retrospectives, setRetrospectives] = useState<Record<string, string>>({});
  const [memberStats, setMemberStats] = useState<Record<string, MemberStats>>({});
  const [memberGoals, setMemberGoals] = useState<Record<string, MemberGoalStatus[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  
  // 수정 기능 제거: 모달 및 상태값 삭제
  // const [editResModalVisible, setEditResModalVisible] = useState(false);
  // const [editResText, setEditResText] = useState('');
  // const [editRetroModalVisible, setEditRetroModalVisible] = useState(false);
  // const [editRetroText, setEditRetroText] = useState('');

  const currentTeamInfo = teams.find(t => t.id === teamId);
  const myRole = currentTeamInfo?.role;

  useEffect(() => {
    if (currentTeamInfo) {
      setTeamName(currentTeamInfo.name);
    }
  }, [currentTeamInfo]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`*, user:users(id, nickname, profile_image_url)`)
        .eq('team_id', teamId);
      if (membersError) throw membersError;
      
      const memberList = membersData as TeamMemberWithUser[];
      const sortedMembers = memberList.sort((a, b) => {
        if (a.role === 'leader' && b.role !== 'leader') return -1;
        if (a.role !== 'leader' && b.role === 'leader') return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setMembers(sortedMembers);

      const { data: resData, error: resError } = await supabase
        .from('monthly_resolutions')
        .select('*')
        .eq('team_id', teamId)
        .eq('year_month', yearMonth);
      if (resError) throw resError;
      const resMap: Record<string, string> = {};
      resData?.forEach((r: MonthlyResolution) => { resMap[r.user_id] = r.content; });
      setResolutions(resMap);

      const { data: retroData, error: retroError } = await supabase
        .from('monthly_retrospectives')
        .select('*')
        .eq('team_id', teamId)
        .eq('year_month', yearMonth);
      if (retroError) throw retroError;
      const retroMap: Record<string, string> = {};
      retroData?.forEach((r: MonthlyRetrospective) => { retroMap[r.user_id] = r.content; });
      setRetrospectives(retroMap);

      const memberIds = memberList.map(m => m.user_id);
      const { data: teamGoalsData } = await supabase.from('goals').select('*').eq('team_id', teamId);
      const teamGoalsMap = new Map(teamGoalsData?.map(g => [g.id, g.name]));

      const startOfMonth = `${yearMonth}-01`;
      const endOfMonth = dayjs(startOfMonth).endOf('month').format('YYYY-MM-DD');

      const { data: userGoalsData } = await supabase
        .from('user_goals')
        .select('*')
        .in('user_id', memberIds)
        .eq('is_active', true);
      const teamUserGoals = (userGoalsData as UserGoal[] || []).filter(ug => {
        if (!teamGoalsMap.has(ug.goal_id)) return false;
        if (ug.start_date && ug.start_date > endOfMonth) return false;
        return true;
      });

      const { data: checkinsData } = await supabase
        .from('checkins')
        .select('*')
        .in('user_id', memberIds)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);
      const checkins = checkinsData as Checkin[] || [];

      const stats: Record<string, MemberStats> = {};
      const goalsStatus: Record<string, MemberGoalStatus[]> = {};
      const todayStr = dayjs().format('YYYY-MM-DD');

      memberIds.forEach(uid => {
        const myGoals = teamUserGoals.filter(g => g.user_id === uid);
        const myCheckins = checkins.filter(c => c.user_id === uid);
        const relevantCheckins = myCheckins.filter(c => myGoals.some(g => g.goal_id === c.goal_id));
        const doneCount = relevantCheckins.filter(c => c.status === 'done').length;
        const passCount = relevantCheckins.filter(c => c.status === 'pass').length;

        const myGoalStatuses: MemberGoalStatus[] = myGoals.map(ug => {
          const gCheckins = relevantCheckins.filter(c => c.goal_id === ug.goal_id);
          const gDone = gCheckins.filter(c => c.status === 'done').length;
          const gExplicitPass = gCheckins.filter(c => c.status === 'pass').length;
          const goalStart = ug.start_date && ug.start_date > startOfMonth ? ug.start_date : startOfMonth;
          const countEnd = todayStr < endOfMonth ? todayStr : endOfMonth;
          const activeDays = goalStart <= countEnd ? dayjs(countEnd).diff(dayjs(goalStart), 'day') : 0;
          const noCheckinDays = Math.max(0, activeDays - gDone - gExplicitPass);
          // 매일 목표: 미인증 = 미달 / 주N회 목표: 미인증 = 자동 패스
          const isWeekly = ug.frequency === 'weekly_count';
          const gPass = gExplicitPass + (isWeekly ? noCheckinDays : 0);
          const gFail = isWeekly ? 0 : noCheckinDays;
          return {
            goalId: ug.goal_id,
            name: teamGoalsMap.get(ug.goal_id) || 'Unknown',
            frequency: ug.frequency || 'daily',
            targetCount: ug.target_count,
            done: gDone,
            pass: gPass,
            fail: gFail,
            total: activeDays,
          };
        });
        
        goalsStatus[uid] = myGoalStatuses;
        const totalMissed = myGoalStatuses.reduce((sum, g) => sum + g.fail, 0);
        stats[uid] = {
          totalGoals: myGoals.length,
          doneCount,
          passCount,
          missedCount: totalMissed,
          completionRate: 0,
        };
      });
      
      setMemberStats(stats);
      setMemberGoals(goalsStatus);
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [teamId, yearMonth, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // 수정 기능 제거: 저장 핸들러 삭제
  // const handleSaveResolution = ...
  // const handleSaveRetrospective = ...

  const goToPrevMonth = () => setYearMonth((prev) => dayjs(`${prev}-01`).subtract(1, 'month').format('YYYY-MM'));
  const goToNextMonth = () => setYearMonth((prev) => dayjs(`${prev}-01`).add(1, 'month').format('YYYY-MM'));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teamName || '팀 상세'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPrevMonth}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{dayjs(`${yearMonth}-01`).format('YYYY년 M월')}</Text>
        <TouchableOpacity onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>팀 멤버 ({members.length})</Text>
              {members.map((member) => {
                const isMe = member.user_id === user?.id;
                const resolution = resolutions[member.user_id];
                const retrospective = retrospectives[member.user_id];
                const stats = memberStats[member.user_id];
                const goals = memberGoals[member.user_id] || [];

                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberHeader}>
                      <View style={styles.memberProfile}>
                        {member.user.profile_image_url ? (
                          <Image source={{ uri: member.user.profile_image_url }} style={styles.avatar} />
                        ) : (
                          <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.nickname}>{member.user.nickname}</Text>
                            {member.role === 'leader' ? (
                              <View style={styles.leaderBadge}><Text style={styles.leaderText}>LEADER</Text></View>
                            ) : (
                              <View style={styles.memberBadge}><Text style={styles.memberText}>MEMBER</Text></View>
                            )}
                          </View>
                          <View style={styles.statsRow}>
                            <Text style={styles.statsText}>
                              완료 {stats?.doneCount ?? 0} · 패스 {stats?.passCount ?? 0}{(stats?.missedCount ?? 0) > 0 ? ` · 미달 ${stats.missedCount}` : ''}
                            </Text>
                          </View>
                          <View style={styles.resolutionBox}>
                            <Text style={[styles.resolutionText, !resolution && styles.placeholderText]}>
                              {resolution ? `"${resolution}"` : '아직 한마디가 없어요'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('MemberStats', {
                          userId: member.user_id,
                          teamId: teamId,
                          nickname: member.user.nickname,
                        })}
                        style={styles.detailBtn}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={styles.detailBtnText}>상세보기</Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.goalsList}>
                      <Text style={styles.goalsLabel}>목표</Text>
                      {goals.length > 0 ? (
                        goals.map((g) => (
                          <View key={g.goalId} style={styles.goalItem}>
                            <View style={styles.goalNameRow}>
                              <View style={styles.freqBadge}>
                                <Text style={styles.freqBadgeText}>
                                  {g.frequency === 'weekly_count' && g.targetCount ? `주${g.targetCount}회` : '매일'}
                                </Text>
                              </View>
                              <Text style={styles.goalName}>{g.name}</Text>
                            </View>
                            <View style={styles.goalStats}>
                              <Text style={styles.goalDone}>{g.done}완료</Text>
                              {g.pass > 0 && <Text style={styles.goalPass}>{g.pass}패스</Text>}
                              {g.fail > 0 && <Text style={styles.goalFail}>{g.fail}미달</Text>}
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyGoalsText}>설정된 목표가 없습니다.</Text>
                      )}
                    </View>

                    {retrospective ? (
                      <View style={styles.retroSection}>
                        <Text style={styles.retroLabel}>월간 회고</Text>
                        <View style={styles.retroBox}>
                          <Text style={styles.retroText}>{retrospective}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 모달 제거됨 */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFAF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 107, 61, 0.10)' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 16, backgroundColor: '#FFFAF7' },
  monthText: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  memberCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)', shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8, paddingLeft: 8 },
  detailBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  memberProfile: { flexDirection: 'row', gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 107, 61, 0.08)' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  nickname: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  leaderBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FF6B3D', backgroundColor: 'rgba(255, 107, 61, 0.10)' },
  leaderText: { fontSize: 10, fontWeight: '800', color: '#FF6B3D' },
  memberBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(26,26,26,0.25)' },
  memberText: { fontSize: 10, fontWeight: '800', color: 'rgba(26,26,26,0.45)' },
  statsRow: { marginTop: 2, marginBottom: 4 },
  statsText: { fontSize: 12, color: 'rgba(26,26,26,0.50)', fontWeight: '500' },
  resolutionBox: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  resolutionText: { fontSize: 13, color: 'rgba(26,26,26,0.50)', fontStyle: 'italic' },
  placeholderText: { color: 'rgba(26,26,26,0.30)' },
  goalsList: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 107, 61, 0.08)', gap: 8 },
  goalsLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(26,26,26,0.35)', marginBottom: 2 },
  goalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  goalName: { fontSize: 13, color: '#1A1A1A', flexShrink: 1 },
  freqBadge: { backgroundColor: 'rgba(255, 107, 61, 0.08)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(255, 107, 61, 0.18)' },
  freqBadgeText: { fontSize: 10, fontWeight: '600', color: 'rgba(26,26,26,0.50)' },
  goalStats: { flexDirection: 'row', gap: 6 },
  goalDone: { fontSize: 11, color: '#4ADE80', backgroundColor: 'rgba(74, 222, 128, 0.10)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  goalPass: { fontSize: 11, color: '#E8960A', backgroundColor: 'rgba(255,181,71,0.10)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  goalFail: { fontSize: 11, fontWeight: '700', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  emptyGoalsText: { fontSize: 12, color: 'rgba(26,26,26,0.30)', textAlign: 'center', paddingVertical: 8 },
  retroSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 107, 61, 0.08)' },
  retroLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(26,26,26,0.35)', marginBottom: 4 },
  retroBox: { backgroundColor: '#FFFAF7', padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.10)' },
  retroText: { fontSize: 13, color: '#1A1A1A', lineHeight: 18, flex: 1 },
  dangerZone: { marginTop: 8, marginBottom: 8, alignItems: 'center' },
  dangerDivider: { width: '100%', height: 1, backgroundColor: 'rgba(239,68,68,0.15)', marginBottom: 16 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  dangerBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.15)', shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#FFFAF7', borderRadius: 8, padding: 12, color: '#1A1A1A', fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)' },
  modalButtons: { flexDirection: 'row', gap: 12 },
});
