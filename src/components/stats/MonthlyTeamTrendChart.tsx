import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Image } from 'react-native';
import { colors, radius, spacing, typography } from '../../design/tokens';
import { statisticsSharedStyles as sharedStyles } from '../../screens/stats/statisticsShared';
import type { MemberDetail } from '../../services/statsService';
import BaseCard from '../ui/BaseCard';

interface Props {
  members: MemberDetail[];
}

export default function MonthlyTeamTrendChart({ members }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [members, anim]);

  if (!members || members.length === 0) return null;

  const maxWeeks = Math.max(...members.map((m) => m.weeklyRates?.length || 0));
  if (maxWeeks === 0) return null;

  return (
    <BaseCard glassOnly style={sharedStyles.section}>
      <View style={sharedStyles.cardHeader}>
        <Text style={sharedStyles.cardName}>주차별 달성률 비교</Text>
      </View>
      <View>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft} />
          <View style={styles.headerWeeks}>
            {Array.from({ length: maxWeeks }).map((_, i) => (
              <Text key={i} style={styles.weekLabel}>
                {i + 1}주차
              </Text>
            ))}
          </View>
        </View>

        {/* Member Rows */}
        {members.map((member, mIdx) => (
          <Animated.View
            key={member.userId}
            style={[
              styles.memberRow,
              {
                opacity: anim.interpolate({
                  inputRange: [0, 0.2 + mIdx * 0.1, 0.6 + mIdx * 0.1],
                  outputRange: [0, 0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 0.2 + mIdx * 0.1, 0.6 + mIdx * 0.1],
                      outputRange: [8, 8, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.memberIdentity}>
              {member.profileImageUrl ? (
                <View style={[styles.avatar, member.isMe && styles.avatarMe]}>
                  <Image source={{ uri: member.profileImageUrl }} style={styles.avatarImage} />
                </View>
              ) : (
                <View style={[styles.avatar, member.isMe && styles.avatarMe]}>
                  <Text style={[styles.avatarText, member.isMe && styles.avatarTextMe]}>
                    {member.nickname.slice(0, 1)}
                  </Text>
                </View>
              )}
              <Text
                style={[styles.memberName, member.isMe && styles.memberNameMe]}
                numberOfLines={1}
              >
                {member.nickname}
              </Text>
            </View>
            <View style={styles.cellsRow}>
              {member.weeklyRates.map((w, wIdx) => {
                const totalCells = members.length * maxWeeks;
                const cellOrder = wIdx * members.length + mIdx;
                const start = 0.1 + (0.6 * cellOrder) / Math.max(totalCells - 1, 1);
                const end = Math.min(start + 0.3, 1);

                const scaleInterpolate = anim.interpolate({
                  inputRange: [0, start, end],
                  outputRange: [0.8, 0.8, 1],
                  extrapolate: 'clamp',
                });

                const opacityInterpolate = anim.interpolate({
                  inputRange: [0, start, end],
                  outputRange: [0, 0, 1],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={w.week}
                    style={[
                      styles.cellBlock,
                      {
                        backgroundColor: getCellColor(w.rate),
                        opacity: opacityInterpolate,
                        transform: [{ scale: scaleInterpolate }],
                      },
                    ]}
                  >
                    {w.rate !== null ? (
                      <Text
                        style={[styles.cellRateText, { color: w.rate >= 60 ? '#FFF' : '#4B5563' }]}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                      >
                        {w.rate}
                      </Text>
                    ) : (
                      <Text style={styles.cellRateEmpty}>-</Text>
                    )}
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        ))}
      </View>
    </BaseCard>
  );
}

function getCellColor(rate: number | null) {
  if (rate === null) return '#EFF1F5';
  if (rate >= 85) return colors.primary;
  if (rate >= 60) return 'rgba(255, 107, 61, 0.82)';
  if (rate >= 30) return 'rgba(255, 107, 61, 0.34)';
  if (rate > 0) return 'rgba(255, 107, 61, 0.22)';
  return '#EFF1F5';
}

const styles = StyleSheet.create({
  chart: {
    marginTop: spacing[8],
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  headerLeft: {
    width: 48,
    marginRight: spacing[3],
  },
  headerWeeks: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  memberIdentity: {
    width: 48,
    marginRight: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.24)',
  },
  avatarMe: {
    backgroundColor: 'rgba(255, 107, 61, 0.18)',
    borderColor: 'rgba(255, 107, 61, 0.45)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  avatarTextMe: {
    color: colors.primaryDark,
  },
  memberName: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  memberNameMe: {
    color: colors.primaryDark,
  },
  cellsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  cellBlock: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellRateText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cellRateEmpty: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A0A7B4',
  },
});
