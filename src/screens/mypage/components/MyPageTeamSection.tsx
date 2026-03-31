import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import CyberFrame from '../../../components/ui/CyberFrame';
import { COLORS } from '../../../constants/defaults';
import type { Team } from '../../../types/domain';
import type { TeamWithRole } from '../../../stores/teamStore';

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
    <CyberFrame style={styles.sectionFrame} contentStyle={styles.sectionCard} glassOnly={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.cardTitle}>소속 팀</Text>
      </View>

      {teams.length === 0 ? (
        <Text style={styles.emptyText}>소속된 팀이 없습니다.</Text>
      ) : (
        teams.map((team) => (
          <TouchableOpacity
            key={team.id}
            onPress={() => onOpenTeamMember(team)}
            activeOpacity={0.7}
          >
            <CyberFrame
              style={[
                styles.teamItemFrame,
                currentTeam?.id === team.id && styles.activeTeamItemFrame,
              ]}
              contentStyle={styles.teamItemContent}
              glassOnly={true}
            >
              <TouchableOpacity onPress={() => onSelectTeam(team)} style={styles.teamImageWrap}>
                {/* @ts-ignore */}
                {team.profile_image_url ? (
                  <Image
                    // @ts-ignore
                    source={{ uri: team.profile_image_url }}
                    style={styles.teamCardImage}
                  />
                ) : (
                  <View style={[styles.teamCardImage, styles.teamCardImagePlaceholder]}>
                    <Ionicons name="people" size={20} color={COLORS.primaryLight} />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.teamInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={[styles.teamName, currentTeam?.id === team.id && styles.activeTeamText]}
                  >
                    {team.name}
                  </Text>
                  {team.role === 'leader' ? (
                    <View style={styles.leaderBadge}>
                      <Text style={styles.leaderText}>LEADER</Text>
                    </View>
                  ) : (
                    <View style={styles.memberBadge}>
                      <Text style={styles.memberText}>MEMBER</Text>
                    </View>
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
                  <Ionicons name="clipboard-outline" size={18} color={COLORS.primaryLight} />
                </TouchableOpacity>
              )}
            </CyberFrame>
          </TouchableOpacity>
        ))
      )}
    </CyberFrame>
  );
}

const styles = StyleSheet.create({
  sectionFrame: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionCard: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(26,26,26,0.45)',
    textAlign: 'center',
    paddingVertical: 12,
  },
  teamImageWrap: {},
  teamCardImage: {
    width: 44,
    height: 34,
    borderRadius: 22,
  },
  teamCardImagePlaceholder: {
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamItemFrame: {
    marginBottom: 8,
    borderRadius: 12,
  },
  activeTeamItemFrame: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopColor: 'rgba(255, 255, 255, 1)',
    borderLeftColor: 'rgba(229, 229, 229, 1)',
    borderBottomColor: 'rgba(255, 135, 61, 0.22)',
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
    color: '#1A1A1A',
  },
  activeTeamText: {
    color: '#FF6B3D',
    fontWeight: '700',
  },
  inviteCode: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.35)',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
});
