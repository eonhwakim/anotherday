import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
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
    if (total === 0) return '목표\n추가+';
    if (progress === 0) return '오늘도\n화이팅!';
    if (progress === 1) return '완벽\n최고!';
    return '잘하고\n있어요!';
  };

  // ── 애니메이션 ──
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      // 초기화
      scaleAnim.setValue(0);
      translateYAnim.setValue(0);
      rotateAnim.setValue(0);

      setTimeout(() => {
        Animated.sequence([
          // 1단계: 화면 중앙으로 거대하게 튀어나옴 (Pop to Center)
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1, // interpolate로 2.5배 매핑
              duration: 500,
              easing: Easing.out(Easing.elastic(1.5)),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: 1, // interpolate로 화면 중앙 이동
              duration: 500,
              easing: Easing.out(Easing.exp),
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: 1, // 삐딱하게 회전
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          // 2단계: 잠시 멈춤 (주목!)
          Animated.delay(800),
          // 3단계: 제자리로 쏙 들어감 (Back to Home)
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 0, // 원래 크기(interpolate 0 -> scale 1)
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(translateYAnim, {
              toValue: 0,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(rotateAnim, {
              toValue: 0,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
          ]),
        ]).start(({ finished }) => {
          if (finished && onAnimationFinish) {
            onAnimationFinish();
          }
        });
      }, 200);
    }
  }, [isFocused, progress, total]);

  // 애니메이션 값 보간
  const scale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.9], // 평소 0.9배 (잘 보이게) -> 튀어나올 때 2.2배
  });
  
  const translateY = translateYAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -250], // 위로 250px 이동 (화면 중앙 느낌)
  });

  const translateX = translateYAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100], // 중앙 정렬을 위해 살짝 왼쪽으로
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-12deg'], // 12도 기울기
  });

  // 투명도 보간 (0일때는 Matte만 보임, 1일때는 Shiny가 보임)
  const shinyOpacity = scaleAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1], // 조금만 움직여도 바로 반짝이게
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>TODAY'S MISSION</Text>
        
        {/* 애니메이션 적용된 응원 문구 */}
        <Animated.View
          style={[
            styles.encouragementWrapper,
            {
              transform: [
                { translateX },
                { translateY },
                { scale },
                { rotate }
              ],
              zIndex: 100,
            }
          ]}
        >
          {/* 1. 기본 상태: 무광/탁한 느낌 (Matte) */}
          <MatteWaxSeal text={getEncouragement()} />
          
          {/* 2. 애니메이션 상태: 유광/금색 느낌 (Shiny Overlay) */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: shinyOpacity }]}>
            <ShinyWaxSeal text={getEncouragement()} />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.listContainer}>
        {goals.length === 0 ? (
          <Text style={styles.emptyText}>비어있음</Text>
        ) : (
          goals.map((goal) => {
            const isCompleted = checkins.some((c) => c.goal_id === goal.id);
            return (
              <View key={goal.id} style={styles.goalItem}>
                {/* 3D 버튼 느낌의 체크박스 */}
                <View style={[styles.checkBoxOuter, isCompleted && styles.checkBoxOuterCompleted]}>
                  <View style={[styles.checkBoxInner, isCompleted && styles.checkBoxInnerCompleted]}>
                    {isCompleted && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </View>
                
                <Text style={[styles.goalName, isCompleted && styles.goalNameCompleted]}>
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

// ─── 유광(Shiny) 실링 왁스 (애니메이션 중) ───
function ShinyWaxSeal({ text }: { text: string }) {
  return (
    <View style={styles.waxContainer}>
      <Svg width="120" height="120" viewBox="0 0 120 120" style={styles.waxSvg}>
        <Defs>
          <RadialGradient
            id="goldGrad"
            cx="30%"
            cy="30%"
            rx="80%"
            ry="80%"
            fx="25%"
            fy="25%"
          >
            <Stop offset="0%" stopColor="#FFF59D" stopOpacity="1" />
            <Stop offset="40%" stopColor="#FBC02D" stopOpacity="1" />
            <Stop offset="80%" stopColor="#F57F17" stopOpacity="1" />
            <Stop offset="100%" stopColor="#E65100" stopOpacity="1" />
          </RadialGradient>
          
          <RadialGradient
            id="innerShadow"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
          >
            <Stop offset="70%" stopColor="#FBC02D" stopOpacity="0" />
            <Stop offset="100%" stopColor="#E65100" stopOpacity="0.4" />
          </RadialGradient>
        </Defs>
        
        {/* 왁스 몸통 */}
        <Path
          d="M60 10 
             C75 8, 88 15, 98 25 
             C108 35, 115 50, 110 70 
             C105 90, 90 105, 70 110 
             C50 115, 30 108, 18 95 
             C5 80, 2 60, 12 40 
             C22 20, 40 12, 60 10 Z"
          fill="url(#goldGrad)"
          stroke="#E65100"
          strokeWidth="1"
        />
        
        {/* 테두리 디테일 */}
        <Path
          d="M60 15 
             Q70 14, 80 20 Q90 28, 94 40 
             Q98 55, 92 70 Q86 85, 75 90 
             Q60 96, 45 92 Q30 86, 24 70 
             Q18 55, 24 40 Q30 25, 45 18 
             Q52 14, 60 15 Z"
          fill="none"
          stroke="#FFF176"
          strokeWidth="2"
          opacity="0.4"
        />

        {/* 내부 원형 테두리 */}
        <Circle
          cx="60"
          cy="60"
          r="38"
          fill="none"
          stroke="#E65100"
          strokeWidth="2"
          strokeOpacity="0.3"
        />
        <Circle
          cx="60"
          cy="60"
          r="38"
          fill="url(#innerShadow)"
        />
        
        {/* 하이라이트 (광택) */}
        <Path
          d="M40 30 Q50 25 65 28"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />
        <Circle cx="35" cy="45" r="2" fill="#FFFFFF" opacity="0.8" />
      </Svg>
      
      <View style={styles.waxTextContainer}>
        <Text style={styles.waxText}>{text}</Text>
      </View>
    </View>
  );
}

// ─── 무광(Matte) 실링 왁스 (평상시) ───
function MatteWaxSeal({ text }: { text: string }) {
  return (
    <View style={styles.waxContainer}>
      <Svg width="120" height="120" viewBox="0 0 120 120" style={styles.waxSvg}>
        <Defs>
          {/* 탁하고 무광 느낌의 그라데이션 - 요청하신 #e2d1c3 톤 적용 */}
          <RadialGradient
            id="matteGrad"
            cx="30%"
            cy="30%"
            rx="80%"
            ry="80%"
            fx="25%"
            fy="25%"
          >
            <Stop offset="0%" stopColor="#F2E6DE" stopOpacity="1" />
            <Stop offset="100%" stopColor="#C9B2A6" stopOpacity="1" />
          </RadialGradient>
        </Defs>
        
        {/* 왁스 몸통 */}
        <Path
          d="M60 10 
             C75 8, 88 15, 98 25 
             C108 35, 115 50, 110 70 
             C105 90, 90 105, 70 110 
             C50 115, 30 108, 18 95 
             C5 80, 2 60, 12 40 
             C22 20, 40 12, 60 10 Z"
          fill="url(#matteGrad)"
          stroke="#A1887F" // 부드러운 브라운 스트로크
          strokeWidth="1"
        />
        
        {/* 내부 원형 테두리 (음각만 표현, 광택 없음) */}
        <Circle
          cx="60"
          cy="60"
          r="38"
          fill="none"
          stroke="#8D6E63"
          strokeWidth="1.5"
          strokeOpacity="0.2"
        />
        
        {/* 아주 약한 하이라이트 (무광이지만 입체감은 유지) */}
        <Path
          d="M40 30 Q50 25 65 28"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.3"
        />
      </Svg>
      
      <View style={styles.waxTextContainer}>
        <Text style={[
          styles.waxText, 
          { 
            color: '#5D4037', // 텍스트는 가독성을 위해 진한 브라운 유지하되 조금 더 부드럽게
            textShadowColor: 'rgba(255,255,255,0.4)', // 음각 효과
            textShadowOffset: { width: 0, height: 1 } 
          }
        ]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    height: 30, // 애니메이션 공간 확보
  },
  title: {
    fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.8)', 
    letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 1,
  },
  encouragementWrapper: {
    position: 'relative',
  },
  // 왁스 스타일
  waxContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    // 전체 그림자
    shadowColor: '#E65100',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  waxSvg: {
    position: 'absolute',
  },
  waxTextContainer: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  waxText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#BF360C', // 진한 오렌지 브라운 (금색 위 음각 느낌)
    textAlign: 'center',
    textTransform: 'uppercase',
    // 음각 효과 (밝은 그림자를 아래로, 어두운 그림자를 위로)
    textShadowColor: 'rgba(255,255,255,0.6)', 
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Bold' : 'serif',
    lineHeight: 19,
  },
  listContainer: { gap: 12 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' },
  goalItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  // 3D Checkbox
  checkBoxOuter: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: '#89B0D9',
    paddingBottom: 4,
  },
  checkBoxOuterCompleted: {
    backgroundColor: '#58B163',
    paddingBottom: 0,
    marginTop: 4,
  },
  checkBoxInner: {
    width: '100%', height: '100%', borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxInnerCompleted: {
    backgroundColor: COLORS.success,
  },
  
  goalName: {
    fontSize: 16, fontWeight: '700', color: '#333',
    textShadowColor: 'rgba(255,255,255,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0,
  },
  goalNameCompleted: {
    color: 'rgba(0,0,0,0.4)', textDecorationLine: 'line-through',
  },
});
