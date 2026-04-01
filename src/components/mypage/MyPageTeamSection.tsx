import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { Team } from '../../types/domain';
import type { TeamWithRole } from '../../stores/teamStore';
import FrameCard from '../ui/FrameCard';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import SectionHeader from '../ui/SectionHeader';
import Avatar from '../ui/Avatar';
import EmptyState from '../ui/EmptyState';
import { colors, radius, spacing } from '../../design/recipes';

interface MyPageTeamSectionProps {
  teams: TeamWithRole[];
  currentTeam: Team | null;
  onOpenTeamMember: (team: TeamWithRole) => void;
  onSelectTeam: (team: TeamWithRole) => void;
}

export default function MyPageTeamSection({
  teams,
  currentTeam,
  onOpenTeamMember,
  onSelectTeam,
}: MyPageTeamSectionProps) {
  return (
    <FrameCard style={styles.sectionFrame} contentStyle={styles.sectionCard} padded={false}>
      <SectionHeader title="소속 팀" />

      {teams.length === 0 ? (
        <EmptyState message="소속된 팀이 없습니다." />
      ) : (
        teams.map((team) => (
          <TouchableOpacity
            key={team.id}
            onPress={() => onOpenTeamMember(team)}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.teamItemFrame,
                currentTeam?.id === team.id && styles.activeTeamItemFrame,
              ]}
              contentStyle={styles.teamItemContent}
              glassOnly={true}
              padded={false}
            >
              <TouchableOpacity onPress={() => onSelectTeam(team)} style={styles.teamImageWrap}>
                {/* @ts-ignore */}
                <Avatar uri={team.profile_image_url ?? null} size={44} icon="people" />
              </TouchableOpacity>
              <View style={styles.teamInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={[styles.teamName, currentTeam?.id === team.id && styles.activeTeamText]}
                  >
                    {team.name}
                  </Text>
                  {team.role === 'leader' ? (
                    <Badge label="LEADER" tone="leader" />
                  ) : (
                    <Badge label="MEMBER" tone="member" />
                  )}
                </View>
                <Text style={styles.inviteCode}>초대코드: {team.invite_code}</Text>
              </View>
              {currentTeam?.id === team.id && (
                <TouchableOpacity
                  onPress={async (e) => {
                    e.stopPropagation();
                    await Clipboard.setStringAsync(team.invite_code);
                    Alert.alert('복사 완료', '초대 코드가 클립보드에 복사되었습니다.');
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="clipboard-outline" size={18} color={colors.primaryLight} />
                </TouchableOpacity>
              )}
            </Card>
          </TouchableOpacity>
        ))
      )}
    </FrameCard>
  );
}

const styles = StyleSheet.create({
  sectionFrame: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    borderRadius: radius.lg,
  },
  sectionCard: {
    padding: spacing[5],
  },
  teamImageWrap: {},
  teamItemFrame: {
    marginBottom: 8,
    borderRadius: radius.md,
  },
  activeTeamItemFrame: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopColor: 'rgba(255, 255, 255, 1)',
    borderLeftColor: 'rgba(229, 229, 229, 1)',
    borderBottomColor: 'rgba(255, 135, 61, 0.22)',
    borderColor: colors.brandMid,
    borderWidth: 0.6,
    shadowColor: '#929292ff',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'visible',
  },
  teamItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  activeTeamText: {
    color: colors.primary,
    fontWeight: '700',
  },
  inviteCode: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
