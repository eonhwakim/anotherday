import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
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
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import BaseCard from '../../components/ui/BaseCard';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { colors, ds, radius, spacing, typography } from '../../design/recipes';

type TeamMemberScreenRouteProp = RouteProp<RootStackParamList, 'TeamMember'>;

export default function TeamMemberScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TeamMemberScreenRouteProp>();
  const { teamId } = route.params;
  const { user } = useAuthStore();
  const { teams } = useTeamStore();
  const deleteTeamMutation = useDeleteTeamMutation(user?.id);
  const leaveTeamMutation = useLeaveTeamMutation(user?.id);
  const { data: members = [], isLoading, refetch } = useTeamMembersQuery(teamId, {
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={teamName || '팀 멤버'} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content}>
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
                <BaseCard
                  glassOnly
                  style={styles.teamProfileFrame}
                  contentStyle={styles.teamProfileRow as ViewStyle}
                  padded={false}
                >
                <View style={styles.teamAvatarWrap}>
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
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                )}
              </BaseCard>
            </TouchableOpacity>

            <View style={styles.section as ViewStyle}>
              <SectionHeader title={`팀 멤버 (${sortedMembers.length})`} />
              {sortedMembers.map((member) => (
                <BaseCard
                  glassOnly
                  key={member.id}
                  style={styles.memberCardFrame}
                  contentStyle={styles.memberCardContent}
                  padded={false}
                >
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
                </BaseCard>
              ))}
            </View>

            {myRole && (
              <View style={styles.dangerZone}>
                <View style={styles.dangerDivider} />
                {myRole === 'leader' ? (
                  <TouchableOpacity onPress={handleDeleteTeam}>
                    <BaseCard
                      glassOnly
                      style={styles.dangerFrame}
                      contentStyle={styles.dangerBtn}
                      padded={false}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={styles.dangerBtnText}>팀 삭제</Text>
                    </BaseCard>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleLeaveTeam}>
                    <BaseCard
                      glassOnly
                      style={styles.dangerFrame}
                      contentStyle={styles.dangerBtn}
                      padded={false}
                    >
                      <Ionicons name="exit-outline" size={16} color="#EF4444" />
                      <Text style={styles.dangerBtnText}>팀 탈퇴</Text>
                    </BaseCard>
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
  safe: ds.screen as ViewStyle,
  content: {
    flex: 1,
    padding: spacing[4],
  },
  teamProfileFrame: {
    marginBottom: spacing[4],
    borderRadius: radius.lg,
  },
  teamProfileRow: {
    ...(ds.rowCenter as ViewStyle),
    gap: spacing[4],
    padding: spacing[5],
  },
  teamAvatarWrap: {},
  teamProfileInfo: {
    flex: 1,
  },
  teamProfileName: {
    ...typography.titleSm,
    color: colors.text,
    marginBottom: 2,
  },
  teamProfileHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: ds.section as ViewStyle,
  memberCardFrame: {
    marginBottom: spacing[3],
    borderRadius: radius.md,
  },
  memberCardContent: {
    padding: spacing[3],
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
    ...typography.titleSm,
    color: colors.text,
    fontWeight: '600',
  },
  memberDetail: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'none',
    marginTop: 4,
  },
  dangerZone: {
    marginTop: 8,
    marginBottom: 8,
  },
  dangerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.borderMuted,
    marginBottom: spacing[4],
  },
  dangerFrame: {
    borderRadius: radius.md,
  },
  dangerBtn: {
    ...(ds.rowCenter as ViewStyle),
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: spacing[5],
  },
  dangerBtnText: {
    ...(typography.bodyStrong as TextStyle),
    color: colors.error,
  },
});
