import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/defaults';
import { useGoalStore } from '../../stores/goalStore';
import { useTeamStore } from '../../stores/teamStore';
import dayjs from '../../lib/dayjs';
import { supabase } from '../../lib/supabaseClient';

interface MemberProfileModalProps {
  visible: boolean;
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  onClose: () => void;
}

export default function MemberProfileModal({
  visible,
  userId,
  nickname,
  profileImageUrl,
  onClose,
}: MemberProfileModalProps) {
  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));
  const [loading, setLoading] = useState(false);
  const { teamGoals, fetchMonthlyCheckins, fetchMyGoals, fetchTeamGoals } = useGoalStore();
  const { currentTeam } = useTeamStore();
  
  const [monthlyCheckins, setMonthlyCheckins] = useState<any[]>([]);
  const [myGoals, setMyGoals] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<{
    name: string | null;
    gender: string | null;
    age: number | null;
  } | null>(null);

  const loadMemberData = async (mounted: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const tid = currentTeam?.id ?? '';

      // Execute fetches in parallel with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const [_, __, ___, userData] = await Promise.race([
        Promise.all([
          fetchMonthlyCheckins(userId, yearMonth),
          fetchMyGoals(userId),
          fetchTeamGoals(tid, userId),
          supabase.from('users').select('name, gender, age').eq('id', userId).single()
        ]),
        timeoutPromise
      ]) as any;
      
      // Get data from store after fetching
      const store = useGoalStore.getState();
      setMonthlyCheckins(store.monthlyCheckins || []);
      setMyGoals(store.myGoals || []);

      if (userData && userData.data) {
        setUserInfo(userData.data);
      }
    } catch (error) {
      console.error('Failed to load member data:', error);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (visible && userId) {
      // Alert.alert('Modal Mounted', `User: ${userId}`);
      loadMemberData(mounted);
    }
    return () => { mounted = false; };
  }, [visible, userId, yearMonth]);

  // Calculate monthly stats
  const monthlyStats = React.useMemo(() => {
    const checkins = monthlyCheckins ?? [];
    const goals = myGoals ?? [];
    const allGoals = teamGoals ?? [];
    const startDate = `${yearMonth}-01`;
    const today = dayjs().format('YYYY-MM-DD');
    const daysInMonth = dayjs(startDate).daysInMonth();

    // 패스 판별 헬퍼 (status='pass' 또는 memo가 '[패스]'로 시작하면 패스)
    const isPass = (c: any) => c.status === 'pass' || (c.memo && c.memo.startsWith('[패스]'));
    const isDone = (c: any) => !isPass(c);

    const doneTotal = checkins.filter(isDone).length;
    const passTotal = checkins.filter(isPass).length;

    const dailyPercents: number[] = [];
    const goalDoneMap: Record<string, number> = {};
    const goalPassMap: Record<string, number> = {};
    const goalFailMap: Record<string, number> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(startDate).date(d).format('YYYY-MM-DD');
      if (dateStr > today) break;

      const todayGoals = goals.filter((ug) => {
        if (ug.start_date && dateStr < ug.start_date) return false;
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

      todayGoals.forEach((ug) => {
        const gid = ug.goal_id;
        const c = dayCheckins.find((ci) => ci.goal_id === gid);
        if (!c) {
          // 매일 목표: 미달 / 주N회 목표: 자동 패스
          if (ug.frequency === 'weekly_count') {
            goalPassMap[gid] = (goalPassMap[gid] || 0) + 1;
          } else {
            goalFailMap[gid] = (goalFailMap[gid] || 0) + 1;
          }
        } else if (isPass(c)) {
          goalPassMap[gid] = (goalPassMap[gid] || 0) + 1;
        } else {
          goalDoneMap[gid] = (goalDoneMap[gid] || 0) + 1;
        }
      });
    }

    const avg = dailyPercents.length > 0
      ? Math.round(dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length)
      : 0;

    const goalStats = goals.map((ug) => {
      const goal = allGoals.find((g) => g.id === ug.goal_id);
      return {
        goalId: ug.goal_id,
        name: goal?.name ?? '알 수 없음',
        frequency: ug.frequency as 'daily' | 'weekly_count' | undefined,
        targetCount: ug.target_count as number | null | undefined,
        done: goalDoneMap[ug.goal_id] || 0,
        pass: goalPassMap[ug.goal_id] || 0,
        fail: goalFailMap[ug.goal_id] || 0,
      };
    });

    const failTotal = goalStats.reduce((sum, gs) => sum + gs.fail, 0);

    let bestGoal: { name: string; rate: number; doneCount: number } | null = null;
    let worstGoal: { name: string; rate: number; failCount: number } | null = null;
    if (goalStats.length > 0) {
      const withRate = goalStats.map(gs => {
        const total = gs.done + gs.fail;
        return { ...gs, rate: total > 0 ? Math.round((gs.done / total) * 100) : (gs.done > 0 ? 100 : 0) };
      });
      const best = withRate.reduce((a, b) => a.rate >= b.rate ? a : b);
      bestGoal = { name: best.name, rate: best.rate, doneCount: best.done };
      const worstWithRate = withRate.reduce((a, b) => a.fail >= b.fail ? a : b);
      if (worstWithRate.fail > 0) worstGoal = { name: worstWithRate.name, rate: worstWithRate.rate, failCount: worstWithRate.fail };
    }

    return { doneTotal, passTotal, failTotal, avg, bestGoal, worstGoal, goalStats };
  }, [monthlyCheckins, myGoals, teamGoals, yearMonth]);

  const currentMonthLabel = dayjs(`${yearMonth}-01`).format('YYYY년 M월');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={24} color={COLORS.primaryLight} />
                )}
              </View>
              <View>
                <Text style={styles.nickname}>{nickname}</Text>
                {userInfo && (
                  <Text style={styles.memberInfo}>
                    {[
                      userInfo.name,
                      userInfo.gender === 'male' || userInfo.gender === 'M' ? '남' : userInfo.gender === 'female' || userInfo.gender === 'F' ? '여' : userInfo.gender,
                      userInfo.age ? `${userInfo.age}세` : null
                    ].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <ScrollView style={styles.scrollContent}>
              {/* Monthly Stats */}
              <View style={styles.statsCard}>                
                {/* Goal-specific stats */}
                {monthlyStats.goalStats.length > 0 && (
                  <View style={styles.goalStatsSection}>
                    <Text style={styles.goalStatsTitle}>목표별 현황</Text>
                    {monthlyStats.goalStats.map((gs) => (
                      <View key={gs.goalId} style={styles.goalStatRow}>
                        <View style={styles.goalStatNameRow}>
                          {gs.frequency && (
                            <View style={styles.freqBadge}>
                              <Text style={styles.freqBadgeText}>
                                {gs.frequency === 'weekly_count' && gs.targetCount
                                  ? `주${gs.targetCount}회`
                                  : '매일'}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.goalStatName} numberOfLines={1}>{gs.name}</Text>
                        </View>
                        <View style={styles.goalStatBadges}>
                          <Text style={styles.goalStatDone}>{gs.done}완료</Text>
                          {gs.pass > 0 && <Text style={styles.goalStatPass}>{gs.pass}패스</Text>}
                          {gs.fail > 0 && <Text style={styles.goalStatFail}>{gs.fail}미달</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFAF7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '45%',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.15)',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 61, 0.10)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.18)',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  nickname: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  memberInfo: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.50)',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
  },
  statsCard: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  avgSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 107, 61, 0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.10)',
  },
  avgLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.45)',
    marginBottom: 4,
  },
  avgValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B3D',
  },
  bestWorstRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  bestCard: {
    flex: 1,
    backgroundColor: 'rgba(74, 222, 128, 0.06)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
  },
  worstCard: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.12)',
  },
  bestWorstHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  bestWorstLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.45)',
  },
  bestWorstGoalName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  bestWorstValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bestRate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22C55E',
  },
  bestSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
  },
  worstRate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
  worstSub: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(239,68,68,0.60)',
  },
  checkinSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.08)',
    marginBottom: 2,
  },
  checkinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  checkinDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  checkinText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(26,26,26,0.50)',
  },
  checkinCount: {
    fontWeight: '800',
    color: '#1A1A1A',
  },
  checkinDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(26,26,26,0.10)',
    marginHorizontal: 10,
  },
  goalStatsSection: {
    paddingTop: 8,
  },
  goalStatsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.45)',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  goalStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 61, 0.06)',
  },
  goalStatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  goalStatName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.80)',
    flexShrink: 1,
  },
  freqBadge: {
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 61, 0.18)',
  },
  freqBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.50)',
  },
  goalStatBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  goalStatDone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#45a247',
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalStatPass: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E8960A',
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
    backgroundColor: 'rgba(239,68,68,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
