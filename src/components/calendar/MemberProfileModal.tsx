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
  Alert,
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
          goalFailMap[gid] = (goalFailMap[gid] || 0) + 1;
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
    const max = dailyPercents.length > 0 ? Math.round(Math.max(...dailyPercents)) : 0;
    const min = dailyPercents.length > 0 ? Math.round(Math.min(...dailyPercents)) : 0;

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

    return { doneTotal, passTotal, avg, max, min, goalStats };
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
                <Text style={styles.cardTitle}>{currentMonthLabel} 통계</Text>

                {/* Achievement rates */}
                <View style={styles.statsRow}>
                  <StatItem label="평균 달성률" value={`${monthlyStats.avg}%`} icon="analytics" color="#fff" />
                  <StatItem label="최고" value={`${monthlyStats.max}%`} icon="arrow-up" color="#4ADE80" />
                  <StatItem label="최저" value={`${monthlyStats.min}%`} icon="arrow-down" color="#EF4444" />
                </View>

                {/* Done / Pass counts */}
                <View style={[styles.statsRow, { marginTop: 16 }]}>
                  <StatItem 
                    label="체크인" 
                    value={`${monthlyStats.passTotal} 패스 ${monthlyStats.doneTotal} 완료`} 
                    icon="checkmark-circle" 
                    color="#fff" 
                  />
                </View>

                {/* Goal-specific stats */}
                {monthlyStats.goalStats.length > 0 && (
                  <View style={styles.goalStatsSection}>
                    <Text style={styles.goalStatsTitle}>목표별 현황</Text>
                    {monthlyStats.goalStats.map((gs) => (
                      <View key={gs.goalId} style={styles.goalStatRow}>
                        <Text style={styles.goalStatName} numberOfLines={1}>{gs.name}</Text>
                        <View style={styles.goalStatBadges}>
                          {gs.pass > 0 && <Text style={styles.goalStatPass}>{gs.pass}패스</Text>}
                          <Text style={styles.goalStatDone}>{gs.done}완료</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%', // 초기 높이 확보 (데이터 로딩 중 깜빡임 방지)
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  nickname: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  memberInfo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    flex: 1, // 전체 공간 차지
    justifyContent: 'center', // 중앙 정렬
  },
  scrollContent: {
    // flex: 1 removed to prevent collapse in auto-height container
  },
  statsCard: {
    padding: 20,
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
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
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
});
