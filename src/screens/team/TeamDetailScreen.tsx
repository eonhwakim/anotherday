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
  const { teams } = useTeamStore();

  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({}); // userId -> content
  const [retrospectives, setRetrospectives] = useState<Record<string, string>>({}); // userId -> content
  const [memberStats, setMemberStats] = useState<Record<string, MemberStats>>({});
  const [memberGoals, setMemberGoals] = useState<Record<string, MemberGoalStatus[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');

  // Resolution Edit
  const [editResModalVisible, setEditResModalVisible] = useState(false);
  const [editResText, setEditResText] = useState('');

  // Retrospective Edit
  const [editRetroModalVisible, setEditRetroModalVisible] = useState(false);
  const [editRetroText, setEditRetroText] = useState('');

  const currentTeamInfo = teams.find(t => t.id === teamId);

  useEffect(() => {
    if (currentTeamInfo) {
      setTeamName(currentTeamInfo.name);
    }
  }, [currentTeamInfo]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          user:users(id, nickname, profile_image_url)
        `)
        .eq('team_id', teamId);

      if (membersError) throw membersError;
      
      const memberList = membersData as TeamMemberWithUser[];
      // Sort: Leader first, then created_at
      const sortedMembers = memberList.sort((a, b) => {
        if (a.role === 'leader' && b.role !== 'leader') return -1;
        if (a.role !== 'leader' && b.role === 'leader') return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setMembers(sortedMembers);

      // 2. Fetch Resolutions
      const { data: resData, error: resError } = await supabase
        .from('monthly_resolutions')
        .select('*')
        .eq('team_id', teamId)
        .eq('year_month', yearMonth);

      if (resError) throw resError;
      
      const resMap: Record<string, string> = {};
      resData?.forEach((r: MonthlyResolution) => {
        resMap[r.user_id] = r.content;
      });
      setResolutions(resMap);

      // 3. Fetch Retrospectives
      const { data: retroData, error: retroError } = await supabase
        .from('monthly_retrospectives')
        .select('*')
        .eq('team_id', teamId)
        .eq('year_month', yearMonth);

      if (retroError) throw retroError;

      const retroMap: Record<string, string> = {};
      retroData?.forEach((r: MonthlyRetrospective) => {
        retroMap[r.user_id] = r.content;
      });
      setRetrospectives(retroMap);

      // 4. Fetch Goals & Checkins for Stats
      // We need goals for all members
      const memberIds = memberList.map(m => m.user_id);
      
      // Fetch Team Goals (to get names)
      const { data: teamGoalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('team_id', teamId);
      const teamGoalsMap = new Map(teamGoalsData?.map(g => [g.id, g.name]));

      const startOfMonth = `${yearMonth}-01`;
      const endOfMonth = dayjs(startOfMonth).endOf('month').format('YYYY-MM-DD');

      // Fetch User Goals
      const { data: userGoalsData } = await supabase
        .from('user_goals')
        .select('*')
        .in('user_id', memberIds)
        .eq('is_active', true); // Assuming we only care about active goals
      
      // Filter user goals that belong to this team (via goal_id -> team_id check)
      // Since user_goals doesn't have team_id, we check if goal_id is in teamGoalsMap
      const teamUserGoals = (userGoalsData as UserGoal[] || []).filter(ug => {
        if (!teamGoalsMap.has(ug.goal_id)) return false;
        // start_date가 조회하는 월의 마지막 날보다 뒤라면(미래) 표시하지 않음
        if (ug.start_date && ug.start_date > endOfMonth) return false;
        return true;
      });

      // Fetch Checkins for the month
      
      const { data: checkinsData } = await supabase
        .from('checkins')
        .select('*')
        .in('user_id', memberIds)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);
        
      const checkins = checkinsData as Checkin[] || [];

      // Calculate Stats
      const stats: Record<string, MemberStats> = {};
      const goalsStatus: Record<string, MemberGoalStatus[]> = {};

      memberIds.forEach(uid => {
        const myGoals = teamUserGoals.filter(g => g.user_id === uid);
        const myCheckins = checkins.filter(c => c.user_id === uid);
        
        // Filter checkins for myGoals only
        const relevantCheckins = myCheckins.filter(c => myGoals.some(g => g.goal_id === c.goal_id));
        
        const doneCount = relevantCheckins.filter(c => c.status === 'done').length;
        const passCount = relevantCheckins.filter(c => c.status === 'pass').length;
        
        // Total expected is hard to calculate perfectly without knowing start dates for each goal vs month days
        // For MVP, let's just use done / (done + pass + fail?) or just show counts.
        // Let's use a simple completion rate based on days passed? 
        // Or just show "Done: X, Pass: Y"
        
        // Calculate per goal with missed days
        const todayStr = dayjs().format('YYYY-MM-DD');
        const myGoalStatuses: MemberGoalStatus[] = myGoals.map(ug => {
          const gCheckins = relevantCheckins.filter(c => c.goal_id === ug.goal_id);
          const gDone = gCheckins.filter(c => c.status === 'done').length;
          const gPass = gCheckins.filter(c => c.status === 'pass').length;

          // 미달 계산: 활성 일수 - 완료 - 패스 (오늘까지만)
          const goalStart = ug.start_date && ug.start_date > startOfMonth ? ug.start_date : startOfMonth;
          const countEnd = todayStr < endOfMonth ? todayStr : endOfMonth;
          // goalStart부터 countEnd까지의 일수 (오늘은 아직 진행중이므로 제외)
          const activeDays = goalStart <= countEnd
            ? dayjs(countEnd).diff(dayjs(goalStart), 'day') // 오늘 제외
            : 0;
          const gFail = Math.max(0, activeDays - gDone - gPass);

          return {
            goalId: ug.goal_id,
            name: teamGoalsMap.get(ug.goal_id) || 'Unknown',
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveResolution = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('monthly_resolutions')
        .upsert({
          user_id: user.id,
          team_id: teamId,
          year_month: yearMonth,
          content: editResText.trim(),
        }, { onConflict: 'user_id, team_id, year_month' });

      if (error) throw error;
      
      setEditResModalVisible(false);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '저장 중 오류가 발생했습니다.');
    }
  };

  const handleSaveRetrospective = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('monthly_retrospectives')
        .upsert({
          user_id: user.id,
          team_id: teamId,
          year_month: yearMonth,
          content: editRetroText.trim(),
        }, { onConflict: 'user_id, team_id, year_month' });

      if (error) throw error;
      
      setEditRetroModalVisible(false);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '저장 중 오류가 발생했습니다.');
    }
  };

  const goToPrevMonth = () => {
    setYearMonth((prev) => dayjs(`${prev}-01`).subtract(1, 'month').format('YYYY-MM'));
  };
  const goToNextMonth = () => {
    setYearMonth((prev) => dayjs(`${prev}-01`).add(1, 'month').format('YYYY-MM'));
  };

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
            {/* 1. Members List */}
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
                              <View style={styles.leaderBadge}>
                                <Text style={styles.leaderText}>LEADER</Text>
                              </View>
                            ) : 
                            <View style={styles.memberBadge}>
                                <Text style={styles.memberText}>MEMBER</Text>
                              </View>
                            }
                          </View>
                          
                          {/* Stats Summary */}
                          <View style={styles.statsRow}>
                            <Text style={styles.statsText}>
                              완료 {stats?.doneCount ?? 0} · 패스 {stats?.passCount ?? 0}{(stats?.missedCount ?? 0) > 0 ? ` · 미달 ${stats.missedCount}` : ''}
                            </Text>
                          </View>

                          {/* Resolution Display */}
                          <TouchableOpacity 
                            disabled={!isMe}
                            onPress={() => {
                              setEditResText(resolution || '');
                              setEditResModalVisible(true);
                            }}
                            style={styles.resolutionBox}
                          >
                            <Text style={[
                              styles.resolutionText, 
                              !resolution && styles.placeholderText
                            ]}>
                              {resolution ? `"${resolution}"` : (isMe ? '이번 달 나의 한마디를 남겨보세요' : '아직 한마디가 없어요')}
                            </Text>
                            {isMe && <Ionicons name="pencil" size={12} color={COLORS.textMuted} />}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Goals List (Always Visible) */}
                    <View style={styles.goalsList}>
                      {goals.length > 0 ? (
                        goals.map((g) => (
                          <View key={g.goalId} style={styles.goalItem}>
                            <Text style={styles.goalName}>{g.name}</Text>
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

                    {/* Retrospective Display (Only if exists or is me) */}
                    {(retrospective || isMe) && (
                      <View style={styles.retroSection}>
                        <Text style={styles.retroLabel}>월간 회고</Text>
                        <TouchableOpacity 
                          disabled={!isMe}
                          onPress={() => {
                            setEditRetroText(retrospective || '');
                            setEditRetroModalVisible(true);
                          }}
                          style={styles.retroBox}
                        >
                          <Text style={[
                            styles.retroText, 
                            !retrospective && styles.placeholderText
                          ]}>
                            {retrospective || '이번 달 활동은 어떠셨나요? 회고를 작성해주세요.'}
                          </Text>
                          {isMe && <Ionicons name="pencil" size={12} color={COLORS.textMuted} />}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Resolution Modal */}
      <Modal
        visible={editResModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditResModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>나의 한마디</Text>
            <TextInput
              style={styles.input}
              value={editResText}
              onChangeText={setEditResText}
              placeholder="이번 달 다짐을 적어주세요"
              placeholderTextColor={COLORS.textMuted}
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <Button title="취소" variant="secondary" onPress={() => setEditResModalVisible(false)} style={{ flex: 1 }} />
              <Button title="저장" onPress={handleSaveResolution} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Retrospective Modal */}
      <Modal
        visible={editRetroModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditRetroModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>월간 회고</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={editRetroText}
              onChangeText={setEditRetroText}
              placeholder="이번 달 활동을 돌아보며 회고를 작성해주세요"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={500}
            />
            <View style={styles.modalButtons}>
              <Button title="취소" variant="secondary" onPress={() => setEditRetroModalVisible(false)} style={{ flex: 1 }} />
              <Button title="저장" onPress={handleSaveRetrospective} style={{ flex: 1 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  memberCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberProfile: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
  statsRow: {
    marginTop: 2,
    marginBottom: 4,
  },
  statsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  resolutionBox: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resolutionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  expandBtn: {
    padding: 4,
  },
  goalsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalName: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  goalStats: {
    flexDirection: 'row',
    gap: 6,
  },
  goalDone: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goalPass: {
    fontSize: 11,
    color: '#FFB547',
    backgroundColor: 'rgba(255,181,71,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goalFail: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptyGoalsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  retroSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  retroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  retroBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  retroText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    flex: 1,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    width: '100%',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
