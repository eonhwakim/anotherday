import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { handleServiceError } from '../../lib/serviceError';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { useDeleteTeamMutation, useLeaveTeamMutation } from '../../queries/teamMutations';
import { useTeamMembersQuery } from '../../queries/teamQueries';
import SectionHeader from '../../components/ui/SectionHeader';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { colors, ds, radius, spacing } from '../../design/recipes';
import GradientBackground from '../../components/ui/GradientBackground';
import PageHeader from '../../components/ui/PageHeader';

type TeamMemberScreenRouteProp = RouteProp<RootStackParamList, 'TeamMember'>;

export default function TeamMemberScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TeamMemberScreenRouteProp>();
  const { teamId } = route.params;
  const { user } = useAuthStore();
  const { teams } = useTeamStore();
  const deleteTeamMutation = useDeleteTeamMutation(user?.id);
  const leaveTeamMutation = useLeaveTeamMutation(user?.id);
  const {
    data: members = [],
    isLoading,
    refetch,
  } = useTeamMembersQuery(teamId, {
    detailed: true,
  });

  const currentTeamInfo = teams.find((t) => t.id === teamId);
  const teamName = currentTeamInfo?.name ?? '';
  const myRole = currentTeamInfo?.role;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === 'leader' && b.role !== 'leader') return -1;
      if (a.role !== 'leader' && b.role === 'leader') return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [members]);

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
            try {
              await deleteTeamMutation.mutateAsync({ teamId });
              navigation.goBack();
            } catch (e) {
              handleServiceError(e);
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
            try {
              await leaveTeamMutation.mutateAsync({ teamId });
              navigation.goBack();
            } catch (e) {
              handleServiceError(e);
              Alert.alert('오류', '팀 탈퇴에 실패했습니다. 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  };

  return (
    <GradientBackground curve>
      <SafeAreaView style={ds.safe} edges={['top']}>
        <ScrollView
          style={ds.scroll}
          contentContainerStyle={ds.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader title="팀 관리" onBack={() => navigation.goBack()} />
          <View style={{ marginTop: spacing[4] }}>
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
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
                  <View style={styles.teamProfileRow as ViewStyle}>
                    <View>
                      {/* @ts-ignore */}
                      <Avatar
                        uri={currentTeamInfo?.profile_image_url ?? null}
                        size={56}
                        icon="people"
                      />
                    </View>
                    <View style={styles.teamProfileInfo}>
                      <Text style={styles.teamProfileName}>{teamName || '팀 이름'}</Text>
                      <Text style={styles.teamProfileHint}>
                        {myRole === 'leader' ? '탭하여 팀 프로필 설정' : '리더만 수정 가능'}
                      </Text>
                    </View>
                    {myRole === 'leader' && (
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>

                {currentTeamInfo?.invite_code && (
                  <View style={styles.inviteCardFrame}>
                    <View style={styles.inviteCardContent}>
                      <View style={styles.inviteTextBlock}>
                        <Text style={styles.inviteLabel}>참여 코드</Text>
                        <Text style={styles.inviteCode}>{currentTeamInfo.invite_code}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.inviteCopyBtn}
                        onPress={async () => {
                          await Clipboard.setStringAsync(currentTeamInfo.invite_code);
                          Alert.alert('복사 완료', '참여 코드가 클립보드에 복사되었습니다.');
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="copy-outline" size={18} color={colors.primary} />
                        <Text style={styles.inviteCopyText}>복사</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.section as ViewStyle}>
                  <SectionHeader title={`팀 멤버 (${sortedMembers.length})`} />
                  {sortedMembers.map((member) => (
                    <View key={member.id} style={styles.memberCardFrame}>
                      <View style={styles.memberRow}>
                        <View style={styles.memberProfile}>
                          <Avatar uri={member.user.profile_image_url} size={48} />
                          <View style={styles.memberMeta}>
                            <View style={styles.memberRoleRow}>
                              <Text style={styles.nickname}>{member.user.nickname}</Text>
                              {member.role === 'leader' ? (
                                <Badge label="LEADER" tone="leader" />
                              ) : (
                                <Badge label="MEMBER" tone="member" />
                              )}
                            </View>
                            {(member.user.name || member.user.gender || member.user.age) && (
                              <Text style={styles.memberDetail}>
                                {[
                                  member.user.name || '',
                                  member.user.gender || '',
                                  member.user.age ? `${member.user.age}세` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' / ')}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {myRole && (
                  <View style={styles.dangerZone}>
                    <TouchableOpacity
                      onPress={myRole === 'leader' ? handleDeleteTeam : handleLeaveTeam}
                      style={styles.dangerLinkWrap}
                      activeOpacity={0.6}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={myRole === 'leader' ? '팀 삭제' : '팀 탈퇴'}
                    >
                      <Text style={styles.dangerLink}>
                        {myRole === 'leader' ? '팀 삭제' : '팀 탈퇴'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  /** 다른 탭과 같은 반투명 흰 카드 규격 */
  teamProfileRow: {
    ...(ds.rowCenter as ViewStyle),
    gap: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  teamProfileInfo: {
    flex: 1,
  },
  teamProfileName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.text,
    marginBottom: 3,
  },
  teamProfileHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  inviteCardFrame: {
    marginBottom: spacing[6],
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  inviteCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[4],
  },
  inviteTextBlock: {
    flex: 1,
  },
  inviteLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textFaint,
    marginBottom: 3,
  },
  inviteCode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },
  inviteCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.chipNeutral,
  },
  inviteCopyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  section: ds.section as ViewStyle,
  memberCardFrame: {
    marginBottom: spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing[3] + 2,
  },
  memberRow: {
    ...(ds.rowBetween as ViewStyle),
  },
  memberProfile: {
    ...(ds.rowCenter as ViewStyle),
    gap: spacing[3],
    flex: 1,
  },
  memberMeta: {
    flex: 1,
  },
  memberRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.text,
  },
  memberDetail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  dangerZone: {
    marginTop: spacing[5],
    marginBottom: spacing[2],
  },
  /** 팀 삭제·탈퇴는 카드가 아니라 조용한 텍스트 링크로 */
  dangerLinkWrap: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  dangerLink: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
