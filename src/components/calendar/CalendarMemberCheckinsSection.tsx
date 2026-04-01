import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CyberFrame from '../ui/CyberFrame';
import dayjs from '../../lib/dayjs';
import type { MemberCheckinSummary } from '../../types/domain';

interface CalendarMemberCheckinsSectionProps {
  members: MemberCheckinSummary[];
  teamName?: string;
  isFuture: boolean;
  onOpenPhoto: (params: { url: string; checkinId: string }) => void;
}

export default function CalendarMemberCheckinsSection({
  members,
  teamName,
  isFuture,
  onOpenPhoto,
}: CalendarMemberCheckinsSectionProps) {
  if (members.length === 0) return null;

  return (
    <View style={styles.memberSection}>
      <Text style={styles.memberSectionTitle}>{teamName ? `${teamName} 멤버` : '내 기록'}</Text>
      {members.map((member) => (
        <CyberFrame
          key={member.userId}
          style={styles.memberCardFrame}
          contentStyle={styles.memberCardContent}
        >
          <View style={styles.memberHeader}>
            <View style={styles.memberAvatar}>
              {member.profileImageUrl ? (
                <Image source={{ uri: member.profileImageUrl }} style={styles.memberAvatarImg} />
              ) : (
                <Ionicons name="person" size={16} color="rgba(255,255,255,0.50)" />
              )}
            </View>
            <Text style={styles.memberName}>{member.nickname}</Text>

            <View style={styles.scoreContainer}>
              <View>
                <View style={styles.scoreLabelRow}>
                  <Text style={styles.scoreLabelText}>완료</Text>
                  <Text style={styles.scoreLabelText}>총목표</Text>
                </View>
                <View style={styles.scoreValueRow}>
                  <Text style={styles.scoreTotalText}>{member.doneCount}</Text>
                  <Text style={styles.scoreSlash}>/</Text>
                  <Text style={styles.scoreTotalText}>{member.totalGoals}</Text>
                </View>
              </View>
            </View>
          </View>

          {member.checkins.length === 0 && (
            <Text style={styles.memberEmpty}>{isFuture ? '예정' : '기록 없음'}</Text>
          )}

          {member.checkins.map((checkin) => {
            const isPass = checkin.status === 'pass';
            const reactions = checkin.reactions || [];

            return (
              <View key={checkin.id} style={styles.checkinRow}>
                {checkin.photo_url ? (
                  <TouchableOpacity
                    onPress={() => onOpenPhoto({ url: checkin.photo_url!, checkinId: checkin.id })}
                  >
                    <Image source={{ uri: checkin.photo_url }} style={styles.checkinThumb} />
                    <View style={styles.zoomIcon}>
                      <Ionicons name="expand" size={10} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.checkinIcon, isPass && styles.checkinIconPass]}>
                    <Ionicons
                      name={isPass ? 'pause' : 'checkmark'}
                      size={18}
                      color={isPass ? '#FFB547' : '#fff'}
                    />
                  </View>
                )}

                <View style={styles.checkinInfo}>
                  <View style={styles.checkinHeaderRow}>
                    <View>
                      <Text style={styles.checkinGoalName}>{checkin.goal?.name ?? '목표'}</Text>
                      <Text style={styles.checkinTime}>
                        {dayjs(checkin.created_at).format('HH:mm')} · {isPass ? '패스' : '완료'}
                      </Text>
                    </View>

                    {reactions.length > 0 && (
                      <View style={styles.reactionContainer}>
                        {reactions.map((r, idx) => (
                          <View
                            key={r.id}
                            style={[
                              styles.reactionSticker,
                              { zIndex: reactions.length - idx, marginLeft: idx > 0 ? -8 : 0 },
                            ]}
                          >
                            {r.user.profile_image_url ? (
                              <Image
                                source={{ uri: r.user.profile_image_url }}
                                style={styles.reactionAvatar}
                              />
                            ) : (
                              <View style={[styles.reactionAvatar, { backgroundColor: '#555' }]}>
                                <Ionicons name="person" size={14} color="#fff" />
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {checkin.memo && (
                    <Text style={styles.checkinMemo} numberOfLines={2}>
                      {checkin.memo}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </CyberFrame>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  memberSection: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  memberSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(26,26,26,0.45)',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  memberCardFrame: {
    marginBottom: 10,
  },
  memberCardContent: {
    padding: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 61, 0.08)',
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.18)',
  },
  memberAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  memberEmpty: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.45)',
    textAlign: 'center',
    paddingVertical: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  scoreLabelRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 2,
    gap: 4,
  },
  scoreLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 107, 61, 0.7)',
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  scoreSlash: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 107, 61, 0.4)',
    marginHorizontal: 4,
  },
  scoreTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(26, 26, 26, 0.6)',
  },
  checkinRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkinThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#FFF2EC',
  },
  zoomIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius: 4,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinIconPass: {
    backgroundColor: 'rgba(255,181,71,0.10)',
    borderColor: 'rgba(255,181,71,0.20)',
  },
  checkinInfo: { flex: 1 },
  checkinHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  checkinGoalName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  checkinTime: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.40)',
    marginTop: 1,
  },
  checkinMemo: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.35)',
    marginTop: 2,
  },
  reactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionSticker: {
    width: 22,
    height: 22,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFAF7',
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
