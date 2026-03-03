import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle as SvgCircle } from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { COLORS } from '../../constants/defaults';
import { useIsFocused } from '@react-navigation/native';

interface TodayGoalListProps {
  members: MemberProgress[];
  currentUserId?: string;
  onAnimationFinish?: () => void;
}

export default function TodayGoalList({ members, currentUserId, onAnimationFinish }: TodayGoalListProps) {
  const isFocused = useIsFocused();

  const totalAll = members.reduce((s, m) => s + m.totalGoals, 0);
  const completedAll = members.reduce((s, m) => s + m.completedGoals, 0);
  const progress = totalAll > 0 ? completedAll / totalAll : 0;

  const getEncouragement = () => {
    if (totalAll === 0) return '목표를\n 추가해봐!';
    if (progress === 0) return '오늘도\n 화이팅!';
    if (progress === 1) return '완벽한\n 하루!';
    const pct = Math.floor(progress * 100);
    if (pct >= 80) return '거의\n 다 왔어!';
    if (pct >= 60) return '절반\n 넘었다!';
    if (pct >= 40) return '좋은\n 페이스!';
    if (pct >= 20) return '좋아\n 계속!';
    return '시작이\n 반이야!';
  };

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const memberAnims = useRef(members.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (members.length !== memberAnims.length) {
      memberAnims.length = 0;
      members.forEach(() => memberAnims.push(new Animated.Value(0)));
    }
  }, [members.length]);

  useEffect(() => {
    if (isFocused) {
      scaleAnim.setValue(0);
      translateYAnim.setValue(0);
      rotateAnim.setValue(0);
      memberAnims.forEach((a) => a.setValue(0));

      setTimeout(() => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.elastic(1.5)), useNativeDriver: true }),
            Animated.timing(translateYAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: true }),
            Animated.timing(rotateAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          ]),
          Animated.delay(800),
          Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
            Animated.spring(translateYAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
            Animated.spring(rotateAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
          ]),
        ]).start(({ finished }) => {
          if (finished && onAnimationFinish) onAnimationFinish();
        });

        Animated.stagger(
          150,
          memberAnims.map((anim) =>
            Animated.timing(anim, {
              toValue: 1,
              duration: 350,
              easing: Easing.out(Easing.back(1.1)),
              useNativeDriver: true,
            }),
          ),
        ).start();
      }, 200);
    }
  }, [isFocused, progress, totalAll]);

  const scale = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] });
  const translateY = translateYAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -250] });
  const translateX = translateYAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] });
  const glowOpacity = scaleAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });

  const sortedMembers = React.useMemo(() => {
    const sorted = [...members];
    sorted.sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return 0;
    });
    return sorted;
  }, [members, currentUserId]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>TODAY'S MISSION</Text>
        <Animated.View
          style={[styles.badgeWrapper, {
            transform: [{ translateX }, { translateY }, { scale }, { rotate }],
            zIndex: 100,
          }]}
        >
          <ThumbBadge text={getEncouragement()} isActive={false} />
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
            <ThumbBadge text={getEncouragement()} isActive={true} />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.trailContainer}>
        {sortedMembers.length === 0 ? (
          <View style={styles.emptyTrail}>
            <Ionicons name="flag-outline" size={24} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyText}>목표를 추가해보세요</Text>
          </View>
        ) : (
          <>
            {/* Vertical trail line */}
            <View style={styles.trailLine} />

            {sortedMembers.map((member, idx) => {
              const isMe = member.userId === currentUserId;
              const allDone = member.totalGoals > 0 && member.completedGoals >= member.totalGoals;
              const animVal = memberAnims[idx] ?? new Animated.Value(1);
              const animOpacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
              const animSlide = animVal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

              return (
                <Animated.View
                  key={member.userId}
                  style={[
                    styles.memberRow,
                    { opacity: animOpacity, transform: [{ translateY: animSlide }] },
                  ]}
                >
                  {/* Trail node */}
                  <View style={[styles.trailNode, allDone && styles.trailNodeDone]}>
                    {member.profileImageUrl ? (
                      <Image source={{ uri: member.profileImageUrl }} style={styles.avatarImg} />
                    ) : (
                      <Text style={[styles.avatarInitial, allDone && styles.avatarInitialDone]}>
                        {member.nickname.charAt(0)}
                      </Text>
                    )}
                    {allDone && (
                      <View style={styles.doneCheckBadge}>
                        <Ionicons name="checkmark" size={8} color="#000" />
                      </View>
                    )}
                  </View>

                  {/* Member goal card */}
                  <View style={[styles.memberCard, isMe && styles.memberCardMe]}>
                    <View style={styles.memberHeader}>
                      <Text style={[styles.memberName, isMe && styles.memberNameMe]} numberOfLines={1}>
                        {member.nickname}{isMe ? ' (나)' : ''}
                      </Text>
                      <Text style={styles.memberCount}>
                        {member.completedGoals}/{member.totalGoals}
                      </Text>
                    </View>

                    {member.goalDetails.length > 0 ? (
                      <View style={styles.goalChips}>
                        {member.goalDetails.map((g) => (
                          <View
                            key={g.goalId}
                            style={[styles.goalChip, g.isDone && styles.goalChipDone]}
                          >
                            {g.isDone && (
                              <Ionicons name="checkmark" size={10} color="#000" style={{ marginRight: 3 }} />
                            )}
                            <Text
                              style={[styles.goalChipText, g.isDone && styles.goalChipTextDone]}
                              numberOfLines={1}
                            >
                              {g.goalName}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noGoalText}>오늘 목표 없음</Text>
                    )}
                  </View>
                </Animated.View>
              );
            })}

            {/* Summit flag */}
            {progress === 1 && members.length > 0 && (
              <View style={styles.summitRow}>
                <View style={styles.trailNodeSummit}>
                  <Ionicons name="flag" size={14} color="#000" />
                </View>
                <Text style={styles.summitText}>모두 완료!</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── 엄지척 배지 (글래스) ───
const THUMB_UP = 'M50 8C50 2 64 2 64 10L66 42 92 42C98 42 102 48 102 54C102 58 100 61 97 62C100 64 102 68 102 72C102 76 100 79 97 80C100 82 102 86 102 90C102 94 99 98 94 98L48 98C42 98 36 94 34 88L26 70C24 66 20 64 16 64L12 64C8 64 6 60 6 56L6 46C6 42 8 40 12 40L34 40C40 40 44 34 46 26Z';
const THUMB_HIGHLIGHT = 'M50 10C50 4 62 4 63 11L64 42 88 42C92 42 96 46 96 50C96 54 94 56 92 57L50 57 50 10Z';

function ThumbBadge({ text, isActive }: { text: string; isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;
  const textColor = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)';

  return (
    <View style={styles.thumbBadge}>
      <Svg width={110} height={106} viewBox="0 0 108 106" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="auroraFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#00F5FF" stopOpacity={String(0.25 * k)} />
            <Stop offset="25%" stopColor="#A855F7" stopOpacity={String(0.20 * k)} />
            <Stop offset="50%" stopColor="#FF69B4" stopOpacity={String(0.22 * k)} />
            <Stop offset="75%" stopColor="#00FF88" stopOpacity={String(0.18 * k)} />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity={String(0.22 * k)} />
          </LinearGradient>
          <LinearGradient id="auroraFill2" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FF69B4" stopOpacity={String(0.12 * k)} />
            <Stop offset="40%" stopColor="#00FF88" stopOpacity={String(0.10 * k)} />
            <Stop offset="100%" stopColor="#A855F7" stopOpacity={String(0.14 * k)} />
          </LinearGradient>
          <LinearGradient id="borderGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#00F5FF" stopOpacity={String(0.70 * k)} />
            <Stop offset="20%" stopColor="#FF69B4" stopOpacity={String(0.55 * k)} />
            <Stop offset="40%" stopColor="#A855F7" stopOpacity={String(0.60 * k)} />
            <Stop offset="60%" stopColor="#00FF88" stopOpacity={String(0.50 * k)} />
            <Stop offset="80%" stopColor="#FFD93D" stopOpacity={String(0.45 * k)} />
            <Stop offset="100%" stopColor="#00F5FF" stopOpacity={String(0.70 * k)} />
          </LinearGradient>
          <LinearGradient id="bloomOuter" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#00F5FF" stopOpacity={String(0.15 * k)} />
            <Stop offset="30%" stopColor="#FF69B4" stopOpacity={String(0.10 * k)} />
            <Stop offset="60%" stopColor="#A855F7" stopOpacity={String(0.12 * k)} />
            <Stop offset="100%" stopColor="#00FF88" stopOpacity={String(0.10 * k)} />
          </LinearGradient>
          <LinearGradient id="bloomMid" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#00F5FF" stopOpacity={String(0.30 * k)} />
            <Stop offset="25%" stopColor="#FF69B4" stopOpacity={String(0.22 * k)} />
            <Stop offset="50%" stopColor="#A855F7" stopOpacity={String(0.25 * k)} />
            <Stop offset="75%" stopColor="#00FF88" stopOpacity={String(0.20 * k)} />
            <Stop offset="100%" stopColor="#00F5FF" stopOpacity={String(0.30 * k)} />
          </LinearGradient>
          <LinearGradient id="highlight" x1="0.2" y1="0" x2="0.8" y2="0.5">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={String(0.18 * k)} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={THUMB_UP} fill="none" stroke="url(#bloomOuter)" strokeWidth={isActive ? 10 : 6} strokeLinejoin="round" />
        <Path d={THUMB_UP} fill="none" stroke="url(#bloomMid)" strokeWidth={isActive ? 5 : 3} strokeLinejoin="round" />
        <Path d={THUMB_UP} fill="url(#auroraFill)" />
        <Path d={THUMB_UP} fill="url(#auroraFill2)" />
        <Path d={THUMB_UP} fill="none" stroke="url(#borderGlow)" strokeWidth={isActive ? 1.6 : 0.9} strokeLinejoin="round" />
        <Path d={THUMB_HIGHLIGHT} fill="url(#highlight)" />
      </Svg>
      <View style={styles.thumbTextWrap}>
        <Text style={[styles.holoText, { color: textColor }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    height: 30,
  },
  title: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  badgeWrapper: { position: 'relative' },
  thumbBadge: {
    width: 110, height: 106,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbTextWrap: {
    position: 'absolute', left: 20, right: 10, top: 44, bottom: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  holoText: {
    fontSize: 13, fontWeight: '800', textAlign: 'center',
    letterSpacing: 0.3, lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // ─── Trail ───
  trailContainer: {
    position: 'relative',
    paddingLeft: 36,
  },
  trailLine: {
    position: 'absolute',
    left: 15,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  emptyTrail: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic',
  },

  // ─── Member row ───
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
  },

  // ─── Trail node (avatar) ───
  trailNode: {
    position: 'absolute',
    left: -36 + 3,
    top: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  trailNodeDone: {
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
  },
  avatarInitialDone: {
    color: 'rgba(255,255,255,0.9)',
  },
  doneCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Member card ───
  memberCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberCardMe: {
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    flex: 1,
  },
  memberNameMe: {
    color: 'rgba(255,255,255,0.85)',
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // ─── Goal chips ───
  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goalChipDone: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  goalChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    maxWidth: 80,
  },
  goalChipTextDone: {
    color: 'rgba(255,255,255,0.9)',
  },
  noGoalText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    fontStyle: 'italic',
  },

  // ─── Summit ───
  summitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
    position: 'relative',
  },
  trailNodeSummit: {
    position: 'absolute',
    left: -36 + 3,
    top: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  summitText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
});
