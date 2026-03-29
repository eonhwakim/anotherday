import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { COLORS } from '../../constants/defaults';
import { TeamMemberWithUser } from '../../types/domain';
import CyberFrame from '../../components/ui/CyberFrame';

type TeamMemberScreenRouteProp = RouteProp<RootStackParamList, 'TeamMember'>;

export default function TeamMemberScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TeamMemberScreenRouteProp>();
  const { teamId } = route.params;
  const { user } = useAuthStore();
  const { teams, deleteTeam, leaveTeam, fetchTeams } = useTeamStore();

  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');

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
        .select(`
          *,
          user:users(id, nickname, profile_image_url, name, gender, age)
        `)
        .eq('team_id', teamId);

      if (membersError) throw membersError;
      
      const memberList = (membersData as TeamMemberWithUser[]) || [];
      const sortedMembers = memberList.sort((a, b) => {
        if (a.role === 'leader' && b.role !== 'leader') return -1;
        if (a.role !== 'leader' && b.role === 'leader') return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setMembers(sortedMembers);
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [teamId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteTeam = () => {
    Alert.alert(
      '팀 삭제',
      `"${teamName}" 팀을 삭제하면 팀원 모두의 목표와 기록이 사라집니다.\n정말 삭제하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            const ok = await deleteTeam(teamId, user.id);
            if (ok) {
              await fetchTeams(user.id);
              navigation.goBack();
            } else {
              Alert.alert('오류', '팀 삭제에 실패했습니다. 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  };

  const handleLeaveTeam = () => {
    Alert.alert(
      '팀 탈퇴',
      `"${teamName}" 팀에서 탈퇴하시겠어요?\n탈퇴 후에는 팀의 목표와 기록을 볼 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            const ok = await leaveTeam(teamId, user.id);
            if (ok) {
              await fetchTeams(user.id);
              navigation.goBack();
            } else {
              Alert.alert('오류', '팀 탈퇴에 실패했습니다. 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teamName || '팀 멤버'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* 팀 프로필 카드 (프로필 수정처럼) */}
            <TouchableOpacity
              onPress={() => {
                if (myRole === 'leader') {
                  navigation.navigate('TeamProfileEdit', { teamId });
                }
              }}
              activeOpacity={myRole === 'leader' ? 0.7 : 1}
              disabled={myRole !== 'leader'}
            >
              <CyberFrame style={styles.teamProfileFrame} contentStyle={styles.teamProfileRow} glassOnly={false}>
                <View style={styles.teamAvatarWrap}>
                  {/* @ts-ignore */}
                  {currentTeamInfo?.profile_image_url ? (
                    <Image
                      // @ts-ignore
                      source={{ uri: currentTeamInfo.profile_image_url }}
                      style={styles.teamAvatar}
                    />
                  ) : (
                    <View style={[styles.teamAvatar, styles.teamAvatarPlaceholder]}>
                      <Ionicons name="people" size={28} color={COLORS.primaryLight} />
                    </View>
                  )}
                </View>
                <View style={styles.teamProfileInfo}>
                  <Text style={styles.teamProfileName}>{teamName || '팀 이름'}</Text>
                  <Text style={styles.teamProfileHint}>
                    {myRole === 'leader' ? '탭하여 팀 프로필 설정' : '리더만 수정 가능'}
                  </Text>
                </View>
                {myRole === 'leader' && (
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                )}
              </CyberFrame>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>팀 멤버 ({members.length})</Text>
              {members.map((member) => (
                <CyberFrame key={member.id} style={styles.memberCardFrame} contentStyle={styles.memberCardContent} glassOnly={false}>
                  <View style={styles.memberRow}>
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
                          ) : (
                            <View style={styles.memberBadge}>
                              <Text style={styles.memberText}>MEMBER</Text>
                            </View>
                          )}
                        </View>
                        {/* @ts-ignore */}
                        {(member.user.name || member.user.gender || member.user.age) && (
                          <Text style={styles.memberDetail}>
                            {/* @ts-ignore */}
                            {[member.user.name, member.user.gender, member.user.age ? `${member.user.age}세` : null]
                              .filter(Boolean)
                              .join(' / ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </CyberFrame>
              ))}
            </View>

            {myRole && (
              <View style={styles.dangerZone}>
                <View style={styles.dangerDivider} />
                {myRole === 'leader' ? (
                  <TouchableOpacity onPress={handleDeleteTeam}>
                    <CyberFrame style={styles.dangerFrame} contentStyle={styles.dangerBtn} glassOnly={false}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={styles.dangerBtnText}>팀 삭제</Text>
                    </CyberFrame>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleLeaveTeam}>
                    <CyberFrame style={styles.dangerFrame} contentStyle={styles.dangerBtn} glassOnly={false}>
                      <Ionicons name="exit-outline" size={16} color="#EF4444" />
                      <Text style={styles.dangerBtnText}>팀 탈퇴</Text>
                    </CyberFrame>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF', // 흰색 배경으로 통일
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(132, 128, 128, 0.1)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  teamProfileFrame: {
    marginBottom: 16,
    borderRadius: 16,
  },
  teamProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  teamAvatarWrap: {},
  teamAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  teamAvatarPlaceholder: {
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamProfileInfo: {
    flex: 1,
  },
  teamProfileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  teamProfileHint: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.45)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  memberCardFrame: {
    marginBottom: 12,
    borderRadius: 12,
  },
  memberCardContent: {
    padding: 12,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
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
  memberDetail: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.50)',
    marginTop: 4,
  },
  dangerZone: {
    marginTop: 8,
    marginBottom: 8,
  },
  dangerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(132, 128, 128, 0.1)',
    marginBottom: 16,
  },
  dangerFrame: {
    borderRadius: 12,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});
