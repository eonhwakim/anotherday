import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Goal, UserGoal } from '../../types/domain';
import FrameCard from '../ui/FrameCard';
import CyberFrame from '../ui/CyberFrame';
import { colors, radius, spacing, typography } from '../../design/recipes';

interface GoalSettingProps {
  teamGoals: Goal[];
  myGoals: UserGoal[];
  onRemove: (goalId: string) => void;
  monthlyResolution?: string;
}

function freqLabel(ug: UserGoal): string {
  if (ug.frequency === 'daily') return '매일';
  if (ug.frequency === 'weekly_count' && ug.target_count) return `주 ${ug.target_count}회`;
  return '매일';
}

export default function GoalSetting({
  teamGoals = [],
  myGoals = [],
  onRemove,
  monthlyResolution = '',
}: GoalSettingProps) {
  const getMyGoal = (goalId: string) => myGoals.find((ug) => ug.goal_id === goalId);

  const handleLongPress = (goal: Goal) => {
    Alert.alert('목표 삭제', `"${goal.name}" 목표를 삭제할까요?\n인증 기록은 유지됩니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onRemove(goal.id) },
    ]);
  };

  return (
    <FrameCard style={styles.cardFrame} contentStyle={styles.cardContent} padded={false}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>목표 설정</Text>
      </View>
      <Text style={styles.subtitle}>목표를 추가하면 오늘부터 적용됩니다</Text>

      <View style={styles.resolutionSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>이번 달 한마디</Text>
        </View>

        <CyberFrame
          style={[styles.innerCard, styles.brightGlass]}
          contentStyle={styles.resolutionBox}
          glassOnly
        >
          <Text style={[styles.resolutionText, !monthlyResolution && styles.placeholderText]}>
            {monthlyResolution ? monthlyResolution : '이번 달의 다짐이나 목표를 적어보세요.'}
          </Text>
        </CyberFrame>
      </View>

      {teamGoals.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="bulb-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            아직 등록된 목표가 없어요{'\n'}아래 플러스 버튼으로 루틴을 추가해보세요!
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>등록된 루틴 (길게 누름: 삭제)</Text>
            <Text style={styles.hintLabel}>
              주 N회 목표는 오늘 수행하지 않을 경우 ‘패스’로 인증해 주세요
            </Text>
          </View>
          <View style={styles.goalList}>
            {teamGoals.map((goal, index) => {
              const userGoal = getMyGoal(goal.id);

              return (
                <TouchableOpacity
                  key={goal.id}
                  onLongPress={() => handleLongPress(goal)}
                  activeOpacity={0.7}
                  delayLongPress={500}
                >
                  <CyberFrame
                    style={[styles.goalRowFrame, styles.brightGlass]}
                    contentStyle={styles.goalRowContentBox}
                    glassOnly
                  >
                    <View style={styles.goalNumIcon}>
                      <Text style={styles.goalNumText}>{index + 1}</Text>
                    </View>
                    <View style={styles.goalRowContent}>
                      <Text style={styles.goalRowName}>{goal.name}</Text>
                      {userGoal && <Text style={styles.goalRowFreq}>{freqLabel(userGoal)}</Text>}
                    </View>
                  </CyberFrame>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </FrameCard>
  );
}

const styles = StyleSheet.create({
  cardFrame: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  cardContent: {
    padding: spacing[6],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1] + 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing[6] + 2,
    lineHeight: 20,
  },
  brightGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resolutionSection: {
    marginBottom: spacing[5] - 2,
  },
  sectionHeader: {
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  innerCard: {
    borderRadius: radius.md,
  },
  resolutionBox: {
    padding: spacing[3] + 2,
  },
  resolutionText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  section: {
    marginTop: spacing[3],
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandLight,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  hintLabel: {
    ...typography.caption,
    color: colors.textFaint,
    marginTop: spacing[1] + 2,
    marginBottom: spacing[3],
    lineHeight: 16,
  },
  goalList: {
    gap: spacing[2] + 2,
  },
  goalNumIcon: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.screen,
  },
  goalRowFrame: {
    borderRadius: radius.md,
  },
  goalRowContentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[4],
  },
  goalRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  goalRowName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  goalRowFreq: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'none',
  },
});
