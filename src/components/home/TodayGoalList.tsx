import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { Goal, Checkin } from '../../types/domain';
import { COLORS } from '../../constants/defaults';
import { useIsFocused } from '@react-navigation/native';

interface TodayGoalListProps {
  goals: Goal[];
  checkins: Checkin[];
  onAnimationFinish?: () => void;
}

export default function TodayGoalList({ goals, checkins, onAnimationFinish }: TodayGoalListProps) {
  const isFocused = useIsFocused();
  const total = goals.length;
  const completed = goals.filter((g) => checkins.some((c) => c.goal_id === g.id)).length;
  const progress = total > 0 ? completed / total : 0;

  const getEncouragement = () => {
    if (total === 0) return '얼른\n목표 추가해요!';
    if (progress === 0) return '오늘도\n화이팅!';
    if (progress === 1) return '완벽\n최고!';
    return '잘하고\n있어요!';
  };

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      scaleAnim.setValue(0);
      translateYAnim.setValue(0);
      rotateAnim.setValue(0);
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
      }, 200);
    }
  }, [isFocused, progress, total]);

  const scale = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] });
  const translateY = translateYAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -250] });
  const translateX = translateYAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] });
  const glowOpacity = scaleAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });

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

      <View style={styles.listContainer}>
        {goals.length === 0 ? (
          <Text style={styles.emptyText}>목표를 추가해보세요</Text>
        ) : (
          goals.map((goal) => {
            const isCompleted = checkins.some((c) => c.goal_id === goal.id);
            return (
              <View key={goal.id} style={[styles.goalItem, isCompleted && styles.goalItemDone]}>
                <View style={[styles.checkBox, isCompleted && styles.checkBoxDone]}>
                  {isCompleted && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <Text style={[styles.goalName, isCompleted && styles.goalNameDone]}>
                  {goal.name}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

// ─── 엄지척 배지 (글래스) ───
const THUMB_UP = 'M50 8C50 2 64 2 64 10L66 42 92 42C98 42 102 48 102 54C102 58 100 61 97 62C100 64 102 68 102 72C102 76 100 79 97 80C100 82 102 86 102 90C102 94 99 98 94 98L48 98C42 98 36 94 34 88L26 70C24 66 20 64 16 64L12 64C8 64 6 60 6 56L6 46C6 42 8 40 12 40L34 40C40 40 44 34 46 26Z';
// 상단 반사광 클립용 (살짝 축소한 윗부분)
const THUMB_HIGHLIGHT = 'M50 10C50 4 62 4 63 11L64 42 88 42C92 42 96 46 96 50C96 54 94 56 92 57L50 57 50 10Z';

function ThumbBadge({ text, isActive }: { text: string; isActive: boolean }) {
  const strokeAlpha = isActive ? 0.45 : 0.12;
  const textColor = isActive ? 'rgba(236,238,244,0.95)' : COLORS.textSecondary;

  return (
    <View style={styles.thumbBadge}>
      <Svg width={110} height={106} viewBox="0 0 108 106" style={StyleSheet.absoluteFill}>
        <Defs>
          {/* 글래스 배경 그라디언트 */}
          <LinearGradient id="glassFill" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={isActive ? '0.18' : '0.08'} />
            <Stop offset="40%" stopColor="#D8DAE2" stopOpacity={isActive ? '0.10' : '0.04'} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={isActive ? '0.14' : '0.06'} />
          </LinearGradient>
          {/* 글래스 보더 그라디언트 */}
          <LinearGradient id="glassBorder" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#ECEEF4" stopOpacity={String(strokeAlpha)} />
            <Stop offset="50%" stopColor="#A0A4B0" stopOpacity={String(strokeAlpha * 0.5)} />
            <Stop offset="100%" stopColor="#ECEEF4" stopOpacity={String(strokeAlpha)} />
          </LinearGradient>
        </Defs>
        {/* 메인 글래스 배경 */}
        <Path
          d={THUMB_UP}
          fill="url(#glassFill)"
          stroke="url(#glassBorder)"
          strokeWidth={isActive ? 1.5 : 0.8}
          strokeLinejoin="round"
        />
        {/* 상단 반사광 (유리 하이라이트) */}
        <Path
          d={THUMB_HIGHLIGHT}
          fill="#FFFFFF"
          opacity={isActive ? 0.06 : 0.03}
        />
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
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
  listContainer: { gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  goalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(162,155,254,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(162,155,254,0.18)',
    borderTopColor: 'rgba(0,245,255,0.15)',
    borderBottomColor: 'rgba(255,105,180,0.12)',
    borderRadius: 6, paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: 'rgba(162,155,254,0.6)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  goalItemDone: {
    backgroundColor: 'rgba(0,255,136,0.08)',
    borderColor: 'rgba(0,255,178,0.28)',
    borderTopColor: 'rgba(0,245,255,0.22)',
    borderBottomColor: 'rgba(0,255,178,0.22)',
    shadowColor: 'rgba(0,255,178,0.5)',
  },
  checkBox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 1.5, borderColor: 'rgba(162,155,254,0.30)',
    backgroundColor: 'rgba(162,155,254,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  goalName: {
    fontSize: 15, fontWeight: '600', color: COLORS.text,
  },
  goalNameDone: {
    color: COLORS.success,
    textDecorationLine: 'line-through',
    textDecorationColor: 'rgba(0,255,178,0.35)',
  },
});
