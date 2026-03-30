import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/defaults';
import dayjs from '../../lib/dayjs';
import CyberFrame from '../ui/CyberFrame';
import { MemberCheckinSummary } from '../../types/domain';

const SafeBlurView = Platform.OS === 'android' ? View : View;

interface DailyRecordsModalProps {
  visible: boolean;
  date: string;
  memberRecords: MemberCheckinSummary[];
  onClose: () => void;
}

export default function DailyRecordsModal({
  visible,
  date,
  memberRecords,
  onClose,
}: DailyRecordsModalProps) {
  const formattedDate = dayjs(date).format('M월 D일');
  const today = dayjs().format('YYYY-MM-DD');
  
  const isFuture = date > today;
  const isToday = date === today;
  const isPast = date < today;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayBg} />
        </TouchableWithoutFeedback>
        <SafeBlurView intensity={90} style={styles.sheet}>
          {/* 핸들 바 */}
          <View style={styles.handleBar} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={{ width: 28 }} />
            <Text style={styles.headerTitle}>{formattedDate} 기록</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} bounces={false}>
            {memberRecords.length === 0 ? (
              <Text style={styles.emptyText}>팀원의 기록이 없습니다.</Text>
            ) : (
              <View style={styles.membersContainer}>
                {memberRecords.map((member) => (
                  <View key={member.userId} style={styles.memberSection}>
                    <View style={styles.memberHeader}>
                      <View style={styles.memberAvatar}>
                        {member.profileImageUrl ? (
                          <Image source={{ uri: member.profileImageUrl }} style={styles.memberAvatarImg} />
                        ) : (
                          <Ionicons name="person" size={16} color="rgba(255,255,255,0.50)" />
                        )}
                      </View>
                      <Text style={styles.memberName}>{member.nickname}</Text>
                    </View>

                    {(!member.goals || member.goals.length === 0) ? (
                      <Text style={styles.emptyGoalText}>목표가 없습니다.</Text>
                    ) : (
                      <CyberFrame style={styles.memberCardFrame} contentStyle={styles.memberCardContent}>
                        {member.goals.map((goal, index) => {
                          const checkin = member.checkins.find(c => c.goal_id === goal.goalId);
                          const isDone = checkin?.status === 'done';
                          const isPass = checkin?.status === 'pass';
                          
                          let statusText = '';
                          let badgeStyle = {};
                          
                          if (isFuture) {
                            statusText = '예정';
                            badgeStyle = styles.badgeFuture;
                          } else if (isDone) {
                            statusText = '완료';
                            badgeStyle = styles.badgeSuccess;
                          } else if (isPass) {
                            statusText = '패스';
                            badgeStyle = styles.badgePass;
                          } else if (isPast) {
                            statusText = '미달';
                            badgeStyle = styles.badgeMissed;
                          } else if (isToday) {
                            statusText = '진행중';
                            badgeStyle = styles.badgeInProgress;
                          }

                          return (
                            <View key={goal.goalId} style={[styles.goalRow, index !== member.goals.length - 1 && styles.goalRowBorder]}>
                              <View style={styles.goalInfo}>
                                <Text style={styles.goalName} numberOfLines={1}>∙ {goal.name}</Text>
                                <Text style={styles.goalFreq}>
                                  {goal.frequency === 'daily' ? '매일' : `주 ${goal.targetCount}회`}
                                </Text>
                              </View>
                              <View style={[styles.statusBadge, badgeStyle]}>
                                <Text style={styles.statusText}>{statusText}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </CyberFrame>
                    )}
                  </View>
                ))}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeBlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  membersContainer: {
    gap: 24,
  },
  memberSection: {
    gap: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyGoalText: {
    color: 'rgba(15, 15, 15, 0.43)',
    fontSize: 13,
    paddingLeft: 36,
  },
  memberCardFrame: {
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.69)',
  },
  memberCardContent: {
    padding: 0,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  goalRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  goalInfo: {
    flex: 1,
    paddingRight: 16,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  goalFreq: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.43)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  badgePass: {
    backgroundColor: 'rgba(232, 151, 10, 0.45)',
    borderColor: 'rgba(232, 150, 10, 0.3)',
  },
  badgeMissed: {
    backgroundColor: 'rgba(255, 68, 58, 0.35)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  badgeFuture: {
    backgroundColor: 'rgba(39, 38, 38, 0.24)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeInProgress: {
    backgroundColor: 'rgba(59, 131, 246, 0.33)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
});
