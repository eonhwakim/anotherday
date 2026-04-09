import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../design/tokens';
import dayjs from '../../lib/dayjs';

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const COLUMN_CHART_HEIGHT = 160;
/** 팀 주간 요일 셀 트랙 높이 (아래→위 fill 애니메이션과 동일 값 유지) */
const MEMBER_CELL_HEIGHT = 46;

export interface WeeklyStatusDay {
  label: string;
  rate: number | null;
  state?: 'active' | 'inactive' | 'future';
}

export interface WeeklyStatusMemberRow {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  rate: number | null;
  isMe?: boolean;
  days: WeeklyStatusDay[];
}

interface GoalStatusLike {
  goalId: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface CheckinStatusLike {
  goal_id: string;
  status: string;
  date: string;
}

type Props =
  | {
      variant: 'columns';
      title: string;
      icon?: string;
      days: WeeklyStatusDay[];
      animationKey?: string | number;
    }
  | {
      variant: 'members';
      title: string;
      icon?: string;
      members: WeeklyStatusMemberRow[];
      animationKey?: string | number;
    };

export function buildWeeklyStatusDays({
  weekStart,
  goals,
  checkins,
  today = dayjs().format('YYYY-MM-DD'),
}: {
  weekStart: string;
  goals: GoalStatusLike[];
  checkins: CheckinStatusLike[];
  today?: string;
}): WeeklyStatusDay[] {
  return WEEKDAY_LABELS.map((label, index) => {
    const date = dayjs(weekStart).add(index, 'day').format('YYYY-MM-DD');

    if (dayjs(date).isAfter(dayjs(today), 'day')) {
      return { label, rate: null, state: 'future' };
    }

    const activeGoals = goals.filter((goal) => {
      if (goal.startDate && date < goal.startDate) return false;
      if (goal.endDate && date > goal.endDate) return false;
      return true;
    });

    if (activeGoals.length === 0) {
      return { label, rate: null, state: 'inactive' };
    }

    const activeGoalIds = new Set(activeGoals.map((goal) => goal.goalId));
    const doneGoalIds = new Set(
      checkins
        .filter(
          (checkin) =>
            checkin.date === date &&
            checkin.status === 'done' &&
            activeGoalIds.has(checkin.goal_id),
        )
        .map((checkin) => checkin.goal_id),
    );
    const passGoalIds = new Set(
      checkins
        .filter(
          (checkin) =>
            checkin.date === date &&
            checkin.status === 'pass' &&
            activeGoalIds.has(checkin.goal_id),
        )
        .map((checkin) => checkin.goal_id),
    );

    const validGoalsCount = activeGoals.length - passGoalIds.size;

    return {
      label,
      rate: validGoalsCount > 0 ? Math.round((doneGoalIds.size / validGoalsCount) * 100) : 0,
      state: 'active',
    };
  });
}

export function averageWeeklyStatus(days: WeeklyStatusDay[]) {
  const activeRates = days
    .filter((day) => day.state === 'active' && typeof day.rate === 'number')
    .map((day) => day.rate as number);

  if (activeRates.length === 0) return null;

  return Math.round(activeRates.reduce((sum, rate) => sum + rate, 0) / activeRates.length);
}

export default function WeeklyStatusChart(props: Props) {
  const dataDependency =
    props.variant === 'columns'
      ? props.days.map((day) => `${day.label}:${day.rate ?? 'x'}:${day.state ?? 'x'}`).join('|')
      : props.members
          .map(
            (member) =>
              `${member.id}:${member.rate ?? 'x'}:${member.days
                .map((day) => `${day.rate ?? 'x'}:${day.state ?? 'x'}`)
                .join(',')}`,
          )
          .join('|');

  const animationSignature = useMemo(() => {
    return `${String(props.animationKey ?? 'base')}::${props.variant}::${dataDependency}`;
  }, [dataDependency, props.animationKey, props.variant]);

  const { containerStyle, drawProgress } = useWeeklyStatusAnimation(animationSignature, {
    /** 나만의 주간: 카드 입장 + 막대 스프링은 ColumnChart 자체에서 처리 */
    animateContainer: props.variant === 'columns',
    /** 팀 주간: 카드는 고정, 월→일 막대만 drawProgress로 차오름 */
    runDrawProgress: props.variant === 'members',
  });

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <View style={styles.titleRow}>
        {props.icon ? <Text style={styles.titleIcon}>{props.icon}</Text> : null}
        <Text style={styles.title}>{props.title}</Text>
      </View>

      {props.variant === 'columns' ? (
        <ColumnChart days={props.days} animationSignature={animationSignature} />
      ) : (
        <MemberRowsChart members={props.members} drawProgress={drawProgress} />
      )}
    </Animated.View>
  );
}

function useWeeklyStatusAnimation(
  signature: string,
  options: { animateContainer: boolean; runDrawProgress: boolean },
) {
  const { animateContainer, runDrawProgress } = options;
  const containerProgress = useRef(new Animated.Value(animateContainer ? 0 : 1)).current;
  const drawProgress = useRef(new Animated.Value(runDrawProgress ? 0 : 1)).current;

  useEffect(() => {
    containerProgress.setValue(animateContainer ? 0 : 1);
    if (runDrawProgress) {
      drawProgress.setValue(0);
    } else {
      drawProgress.setValue(1);
    }

    /* 팀 멤버 차트: 카드 래퍼는 움직이지 않고 요일 막대만 순서대로 */
    if (!animateContainer && runDrawProgress) {
      const onlyBars = Animated.sequence([
        Animated.delay(40),
        Animated.timing(drawProgress, {
          toValue: 1,
          duration: 990,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]);
      onlyBars.start();
      return () => onlyBars.stop();
    }

    /* 주간 막대(columns): 카드 입장만 — 막대는 ColumnBarItem 스프링 */
    if (animateContainer && !runDrawProgress) {
      const onlyCard = Animated.sequence([
        Animated.parallel([
          Animated.timing(containerProgress, {
            toValue: 0.72,
            duration: 170,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(0),
        ]),
        Animated.spring(containerProgress, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 155,
          mass: 0.9,
        }),
      ]);
      onlyCard.start();
      return () => onlyCard.stop();
    }

    /* 예비: 둘 다 켜진 경우(현재 미사용) */
    const drawBlock = runDrawProgress
      ? Animated.sequence([
          Animated.delay(120),
          Animated.timing(drawProgress, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ])
      : Animated.delay(0);

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(containerProgress, {
          toValue: 0.72,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        drawBlock,
      ]),
      Animated.spring(containerProgress, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 155,
        mass: 0.9,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [animateContainer, containerProgress, drawProgress, runDrawProgress, signature]);

  return {
    drawProgress,
    containerStyle: {
      opacity: containerProgress,
      transform: [
        {
          translateY: containerProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        },
        {
          scale: containerProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    },
  };
}

function ColumnChart({
  days,
  animationSignature,
}: {
  days: WeeklyStatusDay[];
  animationSignature: string;
}) {
  const maxValue = useMemo(() => {
    const rates = days
      .filter((day) => day.state === 'active' && typeof day.rate === 'number')
      .map((day) => day.rate as number);
    return Math.max(...rates, 100);
  }, [days]);

  return (
    <View style={[styles.columnChartArea, { height: COLUMN_CHART_HEIGHT }]}>
      {[0, 1, 2, 3].map((line) => (
        <View key={line} />
      ))}

      <View style={styles.columnChart}>
        {days.map((day, index) => (
          <ColumnBarItem
            key={`${day.label}-${index}`}
            day={day}
            index={index}
            total={days.length}
            maxValue={maxValue}
            animationSignature={animationSignature}
          />
        ))}
      </View>
    </View>
  );
}

/** 막대는 height라 네이티브 드라이버 불가 — 막대마다 스프링으로 iOS 느낌의 튕김 */
function ColumnBarItem({
  day,
  index,
  total,
  maxValue,
  animationSignature,
}: {
  day: WeeklyStatusDay;
  index: number;
  total: number;
  maxValue: number;
  animationSignature: string;
}) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const staggerMs = getColumnStaggerMs(index, total);

  const targetHeight =
    day.state === 'active' && typeof day.rate === 'number' && day.rate > 0
      ? ((COLUMN_CHART_HEIGHT - 40) * day.rate) / maxValue
      : 0;

  useEffect(() => {
    heightAnim.stopAnimation();
    heightAnim.setValue(0);

    const anim = Animated.sequence([
      Animated.delay(staggerMs),
      Animated.spring(heightAnim, {
        toValue: targetHeight,
        useNativeDriver: false,
        friction: 7,
        tension: 112,
        velocity: 0,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [animationSignature, heightAnim, staggerMs, targetHeight]);

  const isFull = day.rate === 100;
  const fillStyle =
    day.state === 'future' || day.state === 'inactive' || day.rate === null
      ? styles.columnFillMuted
      : isFull
        ? styles.columnFillFull
        : styles.columnFillDefault;

  return (
    <View style={styles.columnItem}>
      <Text style={styles.columnRate}>{day.rate === null ? '-' : `${day.rate}%`}</Text>
      <View style={styles.columnTrack}>
        <Animated.View
          style={[
            styles.columnFill,
            {
              height: heightAnim,
            },
            fillStyle,
          ]}
        />
      </View>
      <Text style={styles.columnLabel}>{day.label}</Text>
    </View>
  );
}

function getColumnStaggerMs(index: number, total: number) {
  if (total <= 1) return 40;
  const maxStagger = 220;
  return Math.round((maxStagger * index) / (total - 1));
}

/** 멤버×요일 셀 스태거 구간 길이 (drawProgress 0~1 기준) */
const MEMBER_CELL_ANIM_WINDOW = 0.17;

function MemberRowsChart({
  members,
  drawProgress,
}: {
  members: WeeklyStatusMemberRow[];
  drawProgress: Animated.Value;
}) {
  const totalCells = Math.max(members.length * 7, 1);

  return (
    <View style={styles.memberChart}>
      {members.map((member, memberIndex) => {
        /* 월요일 열이 먼저 차오르므로, 행 헤더는 해당 멤버의 월요일 셀과 같은 타이밍 */
        const mondayRange = getStaggerRange(memberIndex, totalCells, MEMBER_CELL_ANIM_WINDOW);
        const rowOpacity = drawProgress.interpolate({
          inputRange: [0, mondayRange.start, mondayRange.end],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });
        const rowTranslate = drawProgress.interpolate({
          inputRange: [0, mondayRange.start, mondayRange.end],
          outputRange: [8, 8, 0],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={member.id}
            style={[
              styles.memberRow,
              {
                opacity: rowOpacity,
                transform: [{ translateY: rowTranslate }],
              },
            ]}
          >
            <View style={styles.memberHeader}>
              <View style={styles.memberIdentity}>
                <MemberAvatar
                  name={member.name}
                  imageUrl={member.profileImageUrl}
                  isMe={member.isMe}
                />
                <Text style={[styles.memberName, member.isMe && styles.memberNameMe]}>
                  {member.name}
                </Text>
              </View>
              <Text style={styles.memberRate}>
                {member.rate === null ? '-' : `${member.rate}%`}
              </Text>
            </View>

            <View style={styles.memberCells}>
              {member.days.map((day, dayIndex) => {
                /* 요일 열 우선: 월(0) 전 멤버 → 화(1) 전 멤버 → … → 일(6) */
                const cellOrder = dayIndex * members.length + memberIndex;
                const cellRange = getStaggerRange(cellOrder, totalCells, MEMBER_CELL_ANIM_WINDOW);
                const cellFillHeight = drawProgress.interpolate({
                  inputRange: [0, cellRange.start, cellRange.end],
                  outputRange: [0, 0, MEMBER_CELL_HEIGHT],
                  extrapolate: 'clamp',
                });
                const labelFadeStart = cellRange.start + (cellRange.end - cellRange.start) * 0.5;
                const labelOpacity = drawProgress.interpolate({
                  inputRange: [0, labelFadeStart, cellRange.end],
                  outputRange: [0, 0, 1],
                  extrapolate: 'clamp',
                });

                return (
                  <View key={`${member.id}-${day.label}-${dayIndex}`} style={styles.memberCellItem}>
                    <View style={styles.memberCellTrack}>
                      <Animated.View
                        style={[
                          styles.memberCellFill,
                          {
                            height: cellFillHeight,
                            backgroundColor: getMemberCellColor(day),
                          },
                        ]}
                      />
                      {day.rate !== null && day.state === 'active' && (
                        <Animated.View
                          style={[styles.memberCellTextWrap, { opacity: labelOpacity }]}
                        >
                          <Text
                            style={[
                              styles.memberCellRateText,
                              { color: day.rate >= 60 ? '#FFFFFF' : '#4B5563' },
                            ]}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                          >
                            {day.rate}
                          </Text>
                        </Animated.View>
                      )}
                    </View>
                    <Animated.Text style={[styles.memberCellLabel, { opacity: labelOpacity }]}>
                      {day.label}
                    </Animated.Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function getStaggerRange(index: number, total: number, windowSize: number) {
  if (total <= 1) {
    return { start: 0.06, end: 0.06 + windowSize };
  }

  const usable = Math.max(0.72 - windowSize, 0.12);
  const start = 0.06 + (usable * index) / (total - 1);
  return {
    start,
    end: Math.min(start + windowSize, 1),
  };
}

function getMemberCellColor(day: WeeklyStatusDay) {
  if (day.state === 'future' || day.state === 'inactive' || day.rate === null) {
    return '#D9DEE6';
  }

  if (day.rate >= 85) return colors.primary;
  if (day.rate >= 60) return 'rgba(255, 107, 61, 0.82)';
  if (day.rate >= 30) return 'rgba(255, 107, 61, 0.34)';
  if (day.rate > 0) return 'rgba(255, 107, 61, 0.22)';
  return '#D9DEE6';
}

function MemberAvatar({
  name,
  imageUrl,
  isMe,
}: {
  name: string;
  imageUrl?: string | null;
  isMe?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!imageUrl && !imageFailed;

  if (showImage) {
    return (
      <View style={[styles.memberAvatar, memberAvatarRingStyle(isMe)]}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.memberAvatarImage}
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.memberAvatar, memberAvatarFallbackStyle(isMe)]}>
      <Text style={[styles.memberAvatarText, isMe && styles.memberAvatarTextMe]}>
        {name.slice(0, 1)}
      </Text>
    </View>
  );
}

function memberAvatarRingStyle(isMe?: boolean) {
  return {
    borderWidth: 1,
    borderColor: isMe ? 'rgba(255, 107, 61, 0.45)' : 'rgba(255, 107, 61, 0.24)',
  };
}

function memberAvatarFallbackStyle(isMe?: boolean) {
  return isMe ? styles.memberAvatarMe : null;
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  titleIcon: {
    fontSize: 16,
  },
  title: {
    ...typography.titleMd,
    color: colors.text,
  },
  columnChartArea: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  columnChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  columnItem: {
    flex: 1,
    alignItems: 'center',
  },
  columnRate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  columnTrack: {
    width: 40,
    height: COLUMN_CHART_HEIGHT - 40,
    justifyContent: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  columnFill: {
    width: '100%',
    borderRadius: 12,
  },
  columnFillDefault: {
    backgroundColor: 'rgba(255, 107, 61, 0.35)',
  },
  columnFillFull: {
    backgroundColor: '#FF6B3D',
  },
  columnFillMuted: {
    backgroundColor: 'transparent',
  },
  columnLabel: {
    marginTop: spacing[2],
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  memberChart: {
    gap: spacing[6],
  },
  memberRow: {
    gap: spacing[3],
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
    paddingRight: spacing[3],
  },
  memberAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarMe: {
    backgroundColor: 'rgba(255, 107, 61, 0.18)',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  memberAvatarTextMe: {
    color: colors.primaryDark,
  },
  memberName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  memberNameMe: {
    color: colors.primaryDark,
  },
  memberRate: {
    ...typography.titleSm,
    color: colors.primary,
  },
  memberCells: {
    flexDirection: 'row',
    gap: 6,
  },
  memberCellItem: {
    flex: 1,
    alignItems: 'center',
  },
  memberCellTrack: {
    width: '100%',
    height: MEMBER_CELL_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: '#EFF1F5',
    overflow: 'hidden',
  },
  memberCellFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.sm,
  },
  memberCellTextWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCellRateText: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberCellLabel: {
    marginTop: spacing[2],
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A7B4',
  },
});
