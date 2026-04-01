import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import dayjs from '../../lib/dayjs';
import { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { TeamMemberWithUser } from '../../types/domain';
import {
  fetchTeamDetailMonthlyData,
  type TeamDetailMemberGoalStatus,
  type TeamDetailMemberStats,
} from '../../services/statsService';
import { colors, ds, radius, shadows, spacing, typography } from '../../design/recipes';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';

type TeamDetailScreenRouteProp = RouteProp<RootStackParamList, 'TeamDetail'>;

export default function TeamDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TeamDetailScreenRouteProp>();
  const { teamId } = route.params;
  const { user } = useAuthStore();
  const { teams } = useTeamStore();

  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [retrospectives, setRetrospectives] = useState<Record<string, string>>({});
  const [memberStats, setMemberStats] = useState<Record<string, TeamDetailMemberStats>>({});
  const [memberGoals, setMemberGoals] = useState<Record<string, TeamDetailMemberGoalStatus[]>>({});

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');

  const currentTeamInfo = teams.find((t) => t.id === teamId);

  useEffect(() => {
    if (currentTeamInfo) {
      setTeamName(currentTeamInfo.name);
    }
  }, [currentTeamInfo]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchTeamDetailMonthlyData(teamId, yearMonth);
      setMembers(data.members as TeamMemberWithUser[]);
      setResolutions(data.resolutions);
      setRetrospectives(data.retrospectives);
      setMemberStats(data.memberStats);
      setMemberGoals(data.memberGoals);
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

  // 수정 기능 제거: 저장 핸들러 삭제
  // const handleSaveResolution = ...
  // const handleSaveRetrospective = ...

  const goToPrevMonth = () =>
    setYearMonth((prev) => dayjs(`${prev}-01`).subtract(1, 'month').format('YYYY-MM'));
  const goToNextMonth = () =>
    setYearMonth((prev) => dayjs(`${prev}-01`).add(1, 'month').format('YYYY-MM'));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={teamName || '팀 상세'} onBack={() => navigation.goBack()} />

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPrevMonth}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{dayjs(`${yearMonth}-01`).format('YYYY년 M월')}</Text>
        <TouchableOpacity onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.section}>
              <SectionHeader title={`팀 멤버 (${members.length})`} />
              {members.map((member) => {
                const resolution = resolutions[member.user_id];
                const retrospective = retrospectives[member.user_id];
                const stats = memberStats[member.user_id];
                const goals = memberGoals[member.user_id] || [];

                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberHeader}>
                      <View style={styles.memberProfile}>
                        <Avatar uri={member.user.profile_image_url} size={48} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.nickname}>{member.user.nickname}</Text>
                            {member.role === 'leader' ? (
                              <Badge label="LEADER" tone="leader" />
                            ) : (
                              <Badge label="MEMBER" tone="member" />
                            )}
                          </View>
                          <View style={styles.statsRow}>
                            <Text style={styles.statsText}>
                              완료 {stats?.doneCount ?? 0} · 패스 {stats?.passCount ?? 0}
                              {(stats?.missedCount ?? 0) > 0 ? ` · 미달 ${stats.missedCount}` : ''}
                            </Text>
                          </View>
                          <View style={styles.resolutionBox}>
                            <Text
                              style={[styles.resolutionText, !resolution && styles.placeholderText]}
                            >
                              {resolution ? `"${resolution}"` : '아직 한마디가 없어요'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('MemberStats', {
                            userId: member.user_id,
                            teamId: teamId,
                            nickname: member.user.nickname,
                          })
                        }
                        style={styles.detailBtn}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={styles.detailBtnText}>상세보기</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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
                                  {g.frequency === 'weekly_count' && g.targetCount
                                    ? `주${g.targetCount}회`
                                    : '매일'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: ds.screen,
  monthSelector: ds.monthSelector,
  monthText: ds.monthLabel,
  content: { flex: 1, padding: spacing[4] },
  section: ds.section,
  memberCard: {
    ...ds.card,
    ...ds.cardPadding,
    marginBottom: spacing[3],
    borderColor: colors.brandLight,
  },
  memberHeader: { ...ds.rowBetween, alignItems: 'flex-start' },
  detailBtn: { ...ds.rowCenter, gap: 2, paddingVertical: spacing[2], paddingLeft: spacing[2] },
  detailBtnText: { ...typography.label, color: colors.textSecondary, fontWeight: '500' },
  memberProfile: { ...ds.rowCenter, alignItems: 'flex-start', gap: spacing[3], flex: 1 },
  nickname: { ...typography.titleSm, color: colors.text, fontWeight: '600' },
  statsRow: { marginTop: 2, marginBottom: 4 },
  statsText: { ...typography.caption, color: colors.textSecondary },
  resolutionBox: { ...ds.rowCenter, marginTop: 4, gap: spacing[1] + 2 },
  resolutionText: {
    ...typography.label,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textTransform: 'none',
  },
  placeholderText: { color: colors.textMuted },
  goalsList: { ...ds.dividerTop, gap: spacing[2] },
  goalsLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textFaint,
    marginBottom: 2,
  },
  goalItem: ds.rowBetween,
  goalNameRow: { ...ds.rowCenter, gap: spacing[1] + 2, flex: 1, marginRight: spacing[2] },
  goalName: { ...typography.label, color: colors.text, textTransform: 'none', flexShrink: 1 },
  freqBadge: ds.badgeFrequency,
  freqBadgeText: ds.badgeFrequencyText,
  goalStats: { ...ds.rowCenter, gap: spacing[1] + 2 },
  goalDone: ds.statDone,
  goalPass: ds.statPass,
  goalFail: ds.statFail,
  emptyGoalsText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing[2],
  },
  retroSection: ds.dividerTop,
  retroLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textFaint,
    marginBottom: 4,
  },
  retroBox: {
    ...ds.softCard,
    padding: spacing[2] + 2,
    ...ds.rowBetween,
    alignItems: 'flex-start',
  },
  retroText: {
    ...typography.label,
    color: colors.text,
    textTransform: 'none',
    lineHeight: 18,
    flex: 1,
  },
  dangerZone: { marginTop: 8, marginBottom: 8, alignItems: 'center' },
  dangerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(239,68,68,0.15)',
    marginBottom: 16,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  dangerBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.screen,
    width: '100%',
    padding: spacing[6],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.brandMd,
  },
  modalTitle: {
    ...typography.titleMd,
    color: colors.text,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.screen,
    borderRadius: radius.sm,
    padding: spacing[3],
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.brandLight,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
});
