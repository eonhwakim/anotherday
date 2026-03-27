import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle as SvgCircle, Rect } from 'react-native-svg';
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

  const myMember = members.find(m => m.userId === currentUserId);
  const myCompleted = myMember?.completedGoals ?? 0;
  const myTotal = myMember?.totalGoals ?? 0;
  const myProgress = myTotal > 0 ? myCompleted / myTotal : 0;

  const { badgeState, badgeMembers } = React.useMemo(() => {
    if (!members || members.length === 0) return { badgeState: 'START', badgeMembers: [] };

    // 각 팀원의 달성률(퍼센트)을 먼저 계산합니다.
    const membersWithPct = members.map(m => ({
      ...m,
      pct: m.totalGoals > 0 ? m.completedGoals / m.totalGoals : 0
    }));

    const allCleared = membersWithPct.every(m => m.pct >= 1);
    if (allCleared && membersWithPct.length > 0) {
      return { badgeState: 'ALL_CLEAR', badgeMembers: members };
    }

    const finishers = membersWithPct.filter(m => m.pct >= 1);
    if (finishers.length > 0) {
      return { badgeState: 'FINISHER', badgeMembers: finishers };
    }

    const activeMembers = membersWithPct.filter(m => m.completedGoals > 0);
    if (activeMembers.length === 0) {
      return { badgeState: 'START', badgeMembers: [] };
    }

    // 오직 "달성률(퍼센트)" 기준으로만 내림차순 정렬합니다.
    const sorted = [...activeMembers].sort((a, b) => b.pct - a.pct);
    
    // 가장 높은 달성률을 찾습니다.
    const bestPct = sorted[0].pct;

    // 최고 달성률과 동일한 퍼센트를 가진 모든 사람을 공동 선두로 필터링합니다.
    const top = sorted.filter(m => m.pct === bestPct);

    return { badgeState: 'LEADER', badgeMembers: top };
  }, [members]);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const badgeOpacityAnim = useRef(new Animated.Value(1)).current;

  const memberAnims = useRef(members.map(() => new Animated.Value(0))).current;
  const hasBadgeAnimatedRef = useRef(false);
  const prevFocusedRef = useRef(false);
  const sequenceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const staggerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (members.length !== memberAnims.length) {
      const wasEmpty = memberAnims.length === 0;
      memberAnims.length = 0;
      members.forEach(() => memberAnims.push(new Animated.Value(wasEmpty ? 0 : 1)));
    }
  }, [members.length]);

  useEffect(() => {
    prevFocusedRef.current = isFocused;

    if (!isFocused) {
      hasBadgeAnimatedRef.current = false;
      return;
    }

    if (hasBadgeAnimatedRef.current) {
      memberAnims.forEach((a) => a.setValue(1));
      return;
    }

    sequenceAnimRef.current?.stop();
    staggerAnimRef.current?.stop();
    memberAnims.forEach((a) => a.setValue(1));

    const timeoutId = setTimeout(() => {
      hasBadgeAnimatedRef.current = true;

      scaleAnim.setValue(0);
      translateYAnim.setValue(0);
      rotateAnim.setValue(0);
      badgeOpacityAnim.setValue(1);
      memberAnims.forEach((a) => a.setValue(0));

      const seq = Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.elastic(1.5)), useNativeDriver: true }),
          Animated.timing(translateYAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        Animated.delay(800),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(translateYAnim, { toValue: 2, duration: 700, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 0, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(badgeOpacityAnim, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]);
      sequenceAnimRef.current = seq;
      seq.start(({ finished }) => {
        if (finished && onAnimationFinish) onAnimationFinish();
      });

      const stag = Animated.stagger(
        150,
        memberAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.back(1.1)),
            useNativeDriver: true,
          }),
        ),
      );
      staggerAnimRef.current = stag;
      stag.start();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isFocused, progress, totalAll, badgeState]);

  const { width: screenWidth } = useWindowDimensions();
  const centerTranslateX = -(screenWidth / 2); // 오른쪽 끝에서 화면 중앙으로 이동하기 위한 대략적인 X축 오프셋

  const scale = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] });
  const translateY = translateYAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -250, -420] });
  const translateX = translateYAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, centerTranslateX, centerTranslateX + 80] });
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
        <View>
          <Text style={styles.title}>TODAY'S MISSION</Text>
          <Text style={styles.hintText}>
          오늘 계획이 없는 주 N회 목표를 "인증하기"에서 "패스"하면 달성률이 올라가요!
          </Text>
        </View>
        <Animated.View
          style={[styles.badgeWrapper, {
            opacity: badgeOpacityAnim,
            transform: [{ translateX }, { translateY }, { scale }, { rotate }],
            zIndex: 100,
          }]}
        >
          <DynamicBadge state={badgeState} members={badgeMembers} isActive={false} />
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
            <DynamicBadge state={badgeState} members={badgeMembers} isActive={true} />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.trailContainer}>
        {sortedMembers.length === 0 ? (
          <View style={styles.emptyTrail}>
            <Ionicons name="flag-outline" size={24} color="rgba(26,26,26,0.18)" />
            <Text style={styles.emptyText}>목표를 추가해보세요</Text>
          </View>
        ) : (
          <>
            {/* Rainbow trail line */}
            {/* <RainbowTrailLine /> */}

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
                        {member.goalDetails.map((g) => {
                          const isInactive = g.isActive === false && !g.isDone && !g.isPass;
                          // 패스 상태도 비활성(회색) 스타일 적용
                          const isPassStyle = g.isPass;
                          
                          const chipStyle = [
                            styles.goalChip,
                            isInactive && styles.goalChipInactive,
                            // 패스면 회색(Inactive) 스타일 사용 (테두리 등), 혹은 별도 정의
                            // 사용자 요청: "회색처리된목표(패스)"
                            isPassStyle && styles.goalChipInactive, 
                            g.isDone && styles.goalChipDone,
                          ];
                          const textStyle = [
                            styles.goalChipText,
                            isInactive && styles.goalChipTextInactive,
                            isPassStyle && styles.goalChipTextInactive,
                            g.isDone && styles.goalChipTextDone,
                          ];
                          
                          return (
                            <View key={g.goalId} style={chipStyle}>
                              {g.isDone && (
                                <Ionicons name="checkmark" size={10} color="#ffffff" style={{ marginRight: 3 }} />
                              )}
                              {/* 패스 아이콘은 제거하거나 유지? "회색처리된목표(패스)" 텍스트로 대체 */}
                              <Text style={textStyle} numberOfLines={1}>
                                {g.goalName}{g.isPass ? ' (패스)' : ''}
                              </Text>
                            </View>
                          );
                        })}
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

// ─── 배지 컴포넌트들 ───
const THUMB_UP = 'M50 8C50 2 64 2 64 10L66 42 92 42C98 42 102 48 102 54C102 58 100 61 97 62C100 64 102 68 102 72C102 76 100 79 97 80C100 82 102 86 102 90C102 94 99 98 94 98L48 98C42 98 36 94 34 88L26 70C24 66 20 64 16 64L12 64C8 64 6 60 6 56L6 46C6 42 8 40 12 40L34 40C40 40 44 34 46 26Z';
const THUMB_HIGHLIGHT = 'M50 10C50 4 62 4 63 11L64 42 88 42C92 42 96 46 96 50C96 54 94 56 92 57L50 57 50 10Z';

function DynamicBadge({ state, members, isActive }: { state: string; members: MemberProgress[]; isActive: boolean }) {
  if (state === 'START') return <StartBadge isActive={isActive} />;
  if (state === 'LEADER') return <LeaderBadge members={members} isActive={isActive} />;
  if (state === 'FINISHER') return <FinisherBadge members={members} isActive={isActive} />;
  if (state === 'ALL_CLEAR') return <AllClearBadge isActive={isActive} />;
  return null;
}

function AvatarGroup({ members, size, showName = false }: { members: MemberProgress[]; size: number; showName?: boolean }) {
  const count = members.length;
  const isSingle = count === 1;
  const isMany = count >= 3;

  const actualSize = isSingle ? size * 1.4 : isMany ? size * 0.72 : size;
  const nameSize = isSingle ? 10 : isMany ? 7 : 8;
  const rowGap = showName ? (isMany ? 8 : 14) : (isMany ? 2 : 4);
  const itemGap = showName ? (isMany ? 2 : 8) : -actualSize / 3;
  const nameTagTop = actualSize - (isSingle ? 8 : isMany ? 4 : 6);
  const nameTagMinWidth = isSingle ? actualSize + 4 : isMany ? actualSize + 8 : actualSize + 4;

  const rows: MemberProgress[][] = [];
  let remaining = [...members];
  while (remaining.length > 0) {
    if (remaining.length === 4) {
      rows.push(remaining.slice(0, 2));
      rows.push(remaining.slice(2, 4));
      break;
    }
    if (remaining.length <= 3) {
      rows.push(remaining);
      break;
    }
    rows.push(remaining.slice(0, 3));
    remaining = remaining.slice(3);
  }

  return (
    <View style={{ alignItems: 'center', gap: rowGap }}>
      {rows.map((rowMembers, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.avatarsRow}>
          {rowMembers.map((m, i) => (
            <View key={m.userId} style={{ width: actualSize, alignItems: 'center', marginLeft: i > 0 ? itemGap : 0, zIndex: 10 - i }}>
              <View style={[styles.medalAvatarWrap, { width: actualSize, height: actualSize, borderRadius: actualSize / 2, borderWidth: isMany ? 1.5 : 2 }]}>
                {m.profileImageUrl ? (
                  <Image source={{ uri: m.profileImageUrl }} style={styles.medalAvatarImg} />
                ) : (
                  <View style={styles.medalAvatarFallback}>
                    <Text style={[styles.medalAvatarInitial, { fontSize: actualSize * 0.4 }]}>{m.nickname.charAt(0)}</Text>
                  </View>
                )}
              </View>
              {showName && (
                <View style={{ position: 'absolute', top: nameTagTop, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: isMany ? 4 : 6, paddingHorizontal: 3, paddingVertical: 1, minWidth: nameTagMinWidth, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: nameSize, fontWeight: '700' }}>
                    {m.nickname}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function StartBadge({ isActive }: { isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;
  return (
    <View style={styles.thumbBadge}>
      <Svg width={110} height={110} viewBox="0 0 108 108" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`startGrad_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFD93D" stopOpacity={String(0.3 * k)} />
            <Stop offset="100%" stopColor="#FF9A5C" stopOpacity={String(0.3 * k)} />
          </LinearGradient>
          <LinearGradient id={`startBorder_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFD93D" stopOpacity={String(0.8 * k)} />
            <Stop offset="50%" stopColor="#ef3b36" stopOpacity={String(0.8 * k)} />
            <Stop offset="100%" stopColor="#FF9A5C" stopOpacity={String(0.8 * k)} />
          </LinearGradient>
        </Defs>
        <SvgCircle cx="54" cy="54" r="42" fill={`url(#startGrad_${isActive})`} stroke={`url(#startBorder_${isActive})`} strokeWidth={isActive ? 4 : 2} />
      </Svg>
      <View style={[styles.medalContentWrap, { top: 12, height: 84 }]}>
        <Text style={{ fontSize: 28 }}>🔥</Text>
        <Text style={[styles.holoText, { color: isActive ? '#FFF' : 'rgba(255,255,255,0.7)', marginTop: 2, fontSize: 12 }]}>첫 인증을{'\n'}기다려요!</Text>
      </View>
    </View>
  );
}

function LeaderBadge({ members, isActive }: { members: MemberProgress[]; isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;
  const textColor = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)';

  return (
    <View style={styles.thumbBadge}>
      <Svg width={110} height={106} viewBox="0 0 108 106" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`l_auroraFill_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FF6B3D" stopOpacity={String(0.30 * k)} />
            <Stop offset="25%" stopColor="#FFD93D" stopOpacity={String(0.25 * k)} />
            <Stop offset="50%" stopColor="#FF9A5C" stopOpacity={String(0.28 * k)} />
            <Stop offset="75%" stopColor="#FFB380" stopOpacity={String(0.22 * k)} />
            <Stop offset="100%" stopColor="#FF6B3D" stopOpacity={String(0.30 * k)} />
          </LinearGradient>
          <LinearGradient id={`l_auroraFill2_${isActive}`} x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFD93D" stopOpacity={String(0.15 * k)} />
            <Stop offset="40%" stopColor="#FF9A5C" stopOpacity={String(0.12 * k)} />
            <Stop offset="100%" stopColor="#FF6B3D" stopOpacity={String(0.18 * k)} />
          </LinearGradient>
          <LinearGradient id={`l_borderGlow_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FF6B3D" stopOpacity={String(0.80 * k)} />
            <Stop offset="20%" stopColor="#FFD93D" stopOpacity={String(0.65 * k)} />
            <Stop offset="40%" stopColor="#FF9A5C" stopOpacity={String(0.70 * k)} />
            <Stop offset="60%" stopColor="#FFB380" stopOpacity={String(0.60 * k)} />
            <Stop offset="80%" stopColor="#FFD93D" stopOpacity={String(0.55 * k)} />
            <Stop offset="100%" stopColor="#FF6B3D" stopOpacity={String(0.80 * k)} />
          </LinearGradient>
          <LinearGradient id={`l_bloomOuter_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FF6B3D" stopOpacity={String(0.20 * k)} />
            <Stop offset="30%" stopColor="#FFD93D" stopOpacity={String(0.14 * k)} />
            <Stop offset="60%" stopColor="#FF9A5C" stopOpacity={String(0.16 * k)} />
            <Stop offset="100%" stopColor="#FFB380" stopOpacity={String(0.14 * k)} />
          </LinearGradient>
          <LinearGradient id={`l_bloomMid_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FF6B3D" stopOpacity={String(0.35 * k)} />
            <Stop offset="25%" stopColor="#FFD93D" stopOpacity={String(0.28 * k)} />
            <Stop offset="50%" stopColor="#FF9A5C" stopOpacity={String(0.32 * k)} />
            <Stop offset="75%" stopColor="#FFB380" stopOpacity={String(0.25 * k)} />
            <Stop offset="100%" stopColor="#FF6B3D" stopOpacity={String(0.35 * k)} />
          </LinearGradient>
        </Defs>
        <Path d={THUMB_UP} fill="none" stroke={`url(#l_bloomOuter_${isActive})`} strokeWidth={isActive ? 10 : 6} strokeLinejoin="round" />
        <Path d={THUMB_UP} fill="none" stroke={`url(#l_bloomMid_${isActive})`} strokeWidth={isActive ? 5 : 3} strokeLinejoin="round" />
        <Path d={THUMB_UP} fill={`url(#l_auroraFill_${isActive})`} />
        <Path d={THUMB_UP} fill={`url(#l_auroraFill2_${isActive})`} />
        <Path d={THUMB_UP} fill="none" stroke={`url(#l_borderGlow_${isActive})`} strokeWidth={isActive ? 1.6 : 0.9} strokeLinejoin="round" />
        <Path d={THUMB_HIGHLIGHT} fill={`url(#l_highlight_${isActive})`} />
      </Svg>
      
      <View style={{ position: 'absolute', left: 12, right: 0, top: 48, alignItems: 'center', justifyContent: 'center' }}>
        <AvatarGroup members={members} size={28} showName={true} />
      </View>
      
      <View style={{ position: 'absolute', bottom: -8, left: -5, right: -30, alignItems: 'center' }}>
        <Text style={[styles.holoText, { color: textColor, fontSize: 12, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>
          {members.length > 1 ? '공동 선두!' : '현재 선두!'}
        </Text>
      </View>
    </View>
  );
}

function FinisherBadge({ members, isActive }: { members: MemberProgress[]; isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;

  return (
    <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={120} height={120} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`f_goldGrad_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFE066" stopOpacity={String(0.9 * k)} />
            <Stop offset="30%" stopColor="#FFF7CC" stopOpacity={String(0.95 * k)} />
            <Stop offset="50%" stopColor="#FFD700" stopOpacity={String(0.9 * k)} />
            <Stop offset="80%" stopColor="#FFA500" stopOpacity={String(0.95 * k)} />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity={String(0.9 * k)} />
          </LinearGradient>
          <LinearGradient id={`f_goldBorder_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFD700" stopOpacity={String(1 * k)} />
            <Stop offset="50%" stopColor="#FFA500" stopOpacity={String(1 * k)} />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity={String(1 * k)} />
          </LinearGradient>
          <LinearGradient id={`f_ribbonGrad_${isActive}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFD700" stopOpacity={String(1 * k)} />
            <Stop offset="50%" stopColor="#ffd89b" stopOpacity={String(1 * k)} />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity={String(1 * k)} />
          </LinearGradient>
          <LinearGradient id={`f_ribbonDark_${isActive}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFA500" stopOpacity={String(1 * k)} />
            <Stop offset="50%" stopColor="#ffffff" stopOpacity={String(1 * k)} />
            <Stop offset="100%" stopColor="#CC7000" stopOpacity={String(1 * k)} />
          </LinearGradient>
        </Defs>
        
        {/* Ribbon Tails */}
        <Path d="M 15 75 L 2 75 L 10 85 L 2 95 L 30 95 L 30 75 Z" fill={`url(#f_ribbonDark_${isActive})`} stroke={`url(#f_goldBorder_${isActive})`} strokeWidth={isActive ? 2 : 1} strokeLinejoin="round" />
        <Path d="M 105 75 L 118 75 L 110 85 L 118 95 L 90 95 L 90 75 Z" fill={`url(#f_ribbonDark_${isActive})`} stroke={`url(#f_goldBorder_${isActive})`} strokeWidth={isActive ? 2 : 1} strokeLinejoin="round" />
        
        {/* Main Circle */}
        <SvgCircle cx="60" cy="48" r="44" fill={`url(#f_goldGrad_${isActive})`} stroke={`url(#f_goldBorder_${isActive})`} strokeWidth={isActive ? 6 : 3} />
        
        {/* Ribbon Center Rect */}
        <Rect x="20" y="72" width="80" height="28" rx="4" fill={`url(#f_ribbonGrad_${isActive})`} stroke={`url(#f_goldBorder_${isActive})`} strokeWidth={isActive ? 3 : 1.5} />
      </Svg>
      
      <View style={{ position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' }}>
        <AvatarGroup members={members} size={36} showName={true} />
      </View>
      
      <View style={{ position: 'absolute', top: 78, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: isActive ? '#FFF' : 'rgba(255,255,255,0.7)', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1 }}>
          100% 달성
        </Text>
      </View>
    </View>
  );
}

function AllClearBadge({ isActive }: { isActive: boolean }) {
  const k = isActive ? 1.0 : 0.45;
  return (
    <View style={styles.thumbBadge}>
      <Svg width={110} height={110} viewBox="0 0 108 108" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`a_grad_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#4ADE80" stopOpacity={String(0.3 * k)} />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity={String(0.3 * k)} />
          </LinearGradient>
          <LinearGradient id={`a_border_${isActive}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#4ADE80" stopOpacity={String(0.8 * k)} />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity={String(0.8 * k)} />
          </LinearGradient>
        </Defs>
        <SvgCircle cx="54" cy="54" r="42" fill={`url(#a_grad_${isActive})`} stroke={`url(#a_border_${isActive})`} strokeWidth={isActive ? 4 : 2} />
      </Svg>
      <View style={[styles.medalContentWrap, { top: 12, height: 84 }]}>
        <Text style={{ fontSize: 32 }}>🎉</Text>
        <Text style={[styles.holoText, { color: isActive ? '#FFF' : 'rgba(255,255,255,0.7)', marginTop: 2, fontSize: 14 }]}>모두{'\n'}클리어!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 0 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18,
    height: 30,
  },
  title: {
    fontSize: 13, fontWeight: '700', color: 'rgba(26,26,26,0.45)',
    letterSpacing: 2,
  },
  hintText: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.40)',
    marginTop: 4,
    lineHeight: 15,
  },
  badgeWrapper: { position: 'relative' },
  thumbBadge: {
    width: 110, height: 110,
    alignItems: 'center', justifyContent: 'center',
  },
  medalContentWrap: {
    position: 'absolute', left: 12, right: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFD93D',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalAvatarImg: {
    width: '100%',
    height: '100%',
  },
  medalAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 107, 61, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B3D',
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
    backgroundColor: 'rgba(255, 107, 61, 0.18)',
  },
  emptyTrail: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 13, color: 'rgba(26,26,26,0.40)', fontStyle: 'italic',
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
    backgroundColor: 'rgba(255, 107, 61, 0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 61, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  trailNodeDone: {
    borderColor: '#4ADE80',
    backgroundColor: '#4ADE80',
  },
  avatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 107, 61, 0.65)',
  },
  avatarInitialDone: {
    color: '#FFFFFF',
  },
  doneCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Member card ───
  memberCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  memberCardMe: {
    borderColor: '#FF6B3D',
    backgroundColor: 'rgba(255, 107, 61, 0.05)',
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
    color: 'rgba(26,26,26,0.55)',
    flex: 1,
  },
  memberNameMe: {
    color: '#1A1A1A',
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.35)',
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
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goalChipDone: {
    backgroundColor: '#ff7e5f',
    borderColor: '#ffaf7b',
  },
  goalChipPass: {
    backgroundColor: '#FFB547',
    borderColor: '#F0AB2A',
  },
  goalChipInactive: {
    backgroundColor: 'rgba(26,26,26,0.06)',
    borderColor: 'rgba(26,26,26,0.12)',
  },
  goalChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.50)',
    maxWidth: 80,
  },
  goalChipTextDone: {
    color: '#FFFFFF',
  },
  goalChipTextPass: {
    color: '#FFFFFF',
  },
  goalChipTextInactive: {
    color: 'rgba(26,26,26,0.30)',
  },
  noGoalText: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.30)',
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
    backgroundColor: '#FF6B3D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  summitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B3D',
    letterSpacing: 0.3,
  },
});
