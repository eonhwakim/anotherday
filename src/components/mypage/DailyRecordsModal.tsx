import React from 'react';
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
// import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import CyberFrame from '../ui/CyberFrame';
import Pill from '../ui/Pill';
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayBg} />
        </TouchableWithoutFeedback>
        <SafeBlurView style={styles.sheet}>
          {/* 핸들 바 */}
          <View style={styles.handleBar} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={{ width: 28 }} />
            <Text style={styles.headerTitle}>{formattedDate} 기록</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
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
                          <Image
                            source={{ uri: member.profileImageUrl }}
                            style={styles.memberAvatarImg}
                          />
                        ) : (
                          <Ionicons name="person" size={16} color="rgba(255,255,255,0.50)" />
                        )}
                      </View>
                      <Text style={styles.memberName}>{member.nickname}</Text>
                    </View>

                    {!member.goals || member.goals.length === 0 ? (
                      <Text style={styles.emptyGoalText}>루틴이 없습니다.</Text>
                    ) : (
                      <CyberFrame
                        style={styles.memberCardFrame}
                        contentStyle={styles.memberCardContent}
                      >
                        {member.goals.map((goal, index) => {
                          const checkin = member.checkins.find((c) => c.goal_id === goal.goalId);
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
                            // statusText = '진행중';
                            badgeStyle = styles.badgeInProgress;
                          }

                          return (
                            <View
                              key={goal.goalId}
                              style={[
                                styles.goalRow,
                                index !== member.goals.length - 1 && styles.goalRowBorder,
                              ]}
                            >
                              <View style={styles.goalInfo}>
                                <Text style={styles.goalName} numberOfLines={1}>
                                  ∙ {goal.name}
                                </Text>
                                <Text style={styles.goalFreq}>
                                  {goal.frequency === 'daily' ? '매일' : `주 ${goal.targetCount}회`}
                                </Text>
                              </View>
                              {statusText ? (
                                <Pill
                                  label={statusText}
                                  style={[styles.statusBadge, badgeStyle]}
                                  textStyle={styles.statusText}
                                />
                              ) : null}
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
    backgroundColor: colors.overlayBackdrop,
  },
  overlayBg: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.sheetOverlay,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    maxHeight: '75%',
    paddingTop: spacing[3],
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.handleTint,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  headerTitle: {
    ...typography.titleMd,
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: spacing[5],
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[10],
    fontSize: 15,
  },
  membersContainer: {
    gap: spacing[6],
  },
  memberSection: {
    gap: spacing[3],
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 4,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.avatarGlass,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
  },
  memberName: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.text,
  },
  emptyGoalText: {
    color: 'rgba(15, 15, 15, 0.43)',
    fontSize: 13,
    paddingLeft: 36,
  },
  memberCardFrame: {
    marginBottom: spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.69)',
  },
  memberCardContent: {
    padding: 0,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[2],
  },
  goalRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  goalInfo: {
    flex: 1,
    paddingRight: 16,
  },
  goalName: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  goalFreq: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusText: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: '#fff',
  },
  badgeSuccess: {
    backgroundColor: colors.statusSuccessBg,
    borderColor: colors.statusSuccessBorder,
  },
  badgePass: {
    backgroundColor: colors.statusPassBg,
    borderColor: colors.statusPassBorder,
  },
  badgeMissed: {
    backgroundColor: colors.statusErrorBg,
    borderColor: colors.statusErrorBorder,
  },
  badgeFuture: {
    backgroundColor: colors.statusFutureBg,
    borderColor: colors.statusFutureBorder,
  },
  badgeInProgress: {
    borderWidth: 0,
  },
});
