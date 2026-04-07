import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Chip from '../ui/Chip';
import dayjs from '../../lib/dayjs';
import type { CheckinWithGoal, MemberCheckinSummary, ReactionWithUser } from '../../types/domain';
import { colors, spacing, typography } from '../../design/tokens';

export type OpenPhotoHandler = (params: { url: string; checkinId: string }) => void;

export interface MemberGoalRowItem {
  goalId: string;
  name: string;
  frequency: 'daily' | 'weekly_count' | string;
  targetCount?: number | null;
}

interface MemberGoalRowProps {
  goal: MemberGoalRowItem;
  checkin: CheckinWithGoal | undefined;
  /** 같은 목표를 인증한 다른 멤버 (사진이 없을 때 placeholder 분기에 사용) */
  authenticators: MemberCheckinSummary[];
  selectedDate: string;
  /** 상위에서 명시적으로 미래로 강제할 때 사용. 기본은 selectedDate 비교로 판정. */
  forceFuture?: boolean;
  /** 사진이 없는 체크인 아래에 반응 스티커 표시 여부 */
  showReactions?: boolean;
  onOpenPhoto?: OpenPhotoHandler;
  /** 행 사이 구분선 표시 (마지막 행에서 false) */
  showBottomBorder?: boolean;
}

/** 체크인 + 날짜 위치로 표시 상태 결정 */
type StatusKind = 'done' | 'pass' | 'missed' | 'future' | 'inProgress' | 'none';

function resolveStatus(
  checkin: CheckinWithGoal | undefined,
  selectedDate: string,
  forceFuture?: boolean,
): { kind: StatusKind; label: string } {
  const today = dayjs().format('YYYY-MM-DD');
  const isFuture = forceFuture || selectedDate > today;
  const isToday = selectedDate === today;
  const isPast = selectedDate < today;

  if (isFuture) return { kind: 'future', label: '예정' };
  if (checkin?.status === 'done') return { kind: 'done', label: '완료' };
  if (checkin?.status === 'pass') return { kind: 'pass', label: '패스' };
  if (isPast) return { kind: 'missed', label: '미달' };
  if (isToday) return { kind: 'inProgress', label: '' };
  return { kind: 'none', label: '' };
}

const BADGE_STYLE_BY_KIND: Record<StatusKind, object> = {
  done: { backgroundColor: colors.statusSuccessBg, borderColor: colors.statusSuccessBorder },
  pass: { backgroundColor: colors.statusPassBg, borderColor: colors.statusPassBorder },
  missed: { backgroundColor: colors.statusErrorBg, borderColor: colors.statusErrorBorder },
  future: { backgroundColor: colors.statusFutureBg, borderColor: colors.statusFutureBorder },
  inProgress: { borderWidth: 0 },
  none: {},
};

/** 같은 목표를 인증한(완료/패스) 멤버 목록 — placeholder 아이콘 분기용 */
export function membersAuthenticatedForGoal(
  allMembers: MemberCheckinSummary[],
  goalId: string,
): MemberCheckinSummary[] {
  return allMembers.filter((m) =>
    m.checkins.some((c) => c.goal_id === goalId && (c.status === 'done' || c.status === 'pass')),
  );
}

/** 사진 / 일시정지 / X 아이콘 lead art */
function GoalLeadArt({
  checkin,
  authenticators,
  onOpenPhoto,
}: {
  checkin: CheckinWithGoal | undefined;
  authenticators: MemberCheckinSummary[];
  onOpenPhoto?: OpenPhotoHandler;
}) {
  if (checkin?.photo_url && onOpenPhoto) {
    return (
      <View style={styles.goalLeadArt}>
        <View style={styles.goalPhotoColumn}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onOpenPhoto({ url: checkin.photo_url!, checkinId: checkin.id })}
            style={styles.goalPhotoTouchable}
          >
            <View style={styles.goalPhotoWrap}>
              <Image source={{ uri: checkin.photo_url }} style={styles.goalPhoto} />
              <View style={styles.zoomIcon}>
                <Ionicons name="expand" size={10} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.goalLeadArt}>
      <View style={styles.goalLeadPlaceholder}>
        <Ionicons
          name={authenticators.length > 0 ? 'pause' : 'close'}
          size={18}
          color="rgba(26, 26, 26, 0.29)"
        />
      </View>
    </View>
  );
}

/** 체크인 사진이 없을 때 노출되는 반응(좋아요) 아바타 스택 */
function ReactionStack({ reactions }: { reactions: ReactionWithUser[] }) {
  if (reactions.length === 0) return null;
  const shown = reactions.slice(0, 6);

  return (
    <View style={styles.reactionRow}>
      {shown.map((r, idx) => (
        <View
          key={r.id}
          style={[styles.reactionSticker, { zIndex: 6 - idx, marginLeft: idx > 0 ? -6 : 0 }]}
        >
          {r.user.profile_image_url ? (
            <Image source={{ uri: r.user.profile_image_url }} style={styles.reactionAvatar} />
          ) : (
            <View style={[styles.reactionAvatar, styles.reactionAvatarFb]}>
              <Ionicons name="person" size={10} color="#fff" />
            </View>
          )}
        </View>
      ))}
      {reactions.length > 6 ? (
        <Text style={styles.reactionMore}>+{reactions.length - 6}</Text>
      ) : null}
    </View>
  );
}

/**
 * 캘린더 상세에서 한 멤버의 한 목표 행을 표시하는 공통 컴포넌트.
 * - lead art (사진/플레이스홀더)
 * - 목표 이름·빈도
 * - 상태 배지 (완료/패스/미달/예정/진행 중)
 * - 체크인 시각·메모
 * - (옵션) 사진 없는 체크인 아래 반응 스티커
 */
export default function MemberGoalRow({
  goal,
  checkin,
  authenticators,
  selectedDate,
  forceFuture,
  showReactions = false,
  onOpenPhoto,
  showBottomBorder = false,
}: MemberGoalRowProps) {
  const { kind, label } = resolveStatus(checkin, selectedDate, forceFuture);
  const badgeStyle = BADGE_STYLE_BY_KIND[kind];
  const isPass = kind === 'pass';
  const reactions = checkin?.reactions ?? [];

  return (
    <View style={[styles.goalRow, showBottomBorder && styles.goalRowBorder]}>
      <GoalLeadArt checkin={checkin} authenticators={authenticators} onOpenPhoto={onOpenPhoto} />

      <View style={styles.goalMain}>
        <View style={styles.goalTitleRow}>
          <View style={styles.goalInfo}>
            <Text style={styles.goalName} numberOfLines={2}>
              ∙ {goal.name}
            </Text>
            <Text style={styles.goalFreq}>
              {goal.frequency === 'daily' ? '매일' : `주 ${goal.targetCount}회`}
            </Text>
          </View>
          {label ? (
            <Chip
              label={label}
              style={[styles.statusBadge, badgeStyle]}
              textStyle={styles.statusText}
            />
          ) : null}
        </View>

        {checkin ? (
          <Text style={styles.checkinMeta}>
            {dayjs(checkin.created_at).format('HH:mm')} · {isPass ? '패스' : '완료'}
          </Text>
        ) : null}

        {checkin?.memo ? (
          <Text style={styles.checkinMemo} numberOfLines={2}>
            {checkin.memo}
          </Text>
        ) : null}

        {showReactions && !checkin?.photo_url ? <ReactionStack reactions={reactions} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  goalRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  goalLeadArt: {
    width: 46,
    alignItems: 'center',
  },
  goalPhotoColumn: {
    alignItems: 'center',
    width: 42,
  },
  goalPhotoTouchable: {
    alignItems: 'center',
  },
  goalPhotoWrap: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
  },
  goalPhoto: {
    width: 44,
    height: 44,
    borderRadius: 10,
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
  goalLeadPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  goalMain: {
    flex: 1,
    minWidth: 0,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  goalInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  goalName: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  goalFreq: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    ...typography.bodyStrong,
    fontSize: 12,
    color: '#fff',
  },
  checkinMeta: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.40)',
    marginTop: 4,
    marginLeft: 10,
  },
  checkinMemo: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.35)',
    marginTop: 4,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  reactionSticker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFAF7',
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
  },
  reactionAvatar: {
    width: '100%',
    height: '100%',
  },
  reactionAvatarFb: {
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionMore: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
});
