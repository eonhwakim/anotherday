import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Easing, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/design/tokens';
interface FloatingCameraButtonProps {
  onPress: () => void;
}

export default function FloatingCameraButton({ onPress }: FloatingCameraButtonProps) {
  // 애니메이션 값들
  const scaleAnim1 = useRef(new Animated.Value(1)).current;
  const scaleAnim2 = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 첫 번째 겹 (크게 숨쉬는 듯한 애니메이션)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim1, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim1, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 두 번째 겹 (조금 다르게 숨쉬는 애니메이션)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim2, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim2, {
          toValue: 0.95,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 전체 회전 애니메이션 (천천히 돌아서 물방울 모양이 변하는 것처럼 보임)
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [scaleAnim1, scaleAnim2, rotateAnim]);

  // 툴팁 둥둥 떠다니는 애니메이션
  const tooltipFloatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tooltipFloatAnim, {
          toValue: -6,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tooltipFloatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [tooltipFloatAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
        <Animated.View style={[styles.animationWrapper, { transform: [{ rotate: spin }] }]}>
          {/* 가장 바깥쪽 옅은 겹 (무지개빛 느낌을 위해 색상 분리) */}
          <Animated.View
            style={[styles.blob, styles.blob1, { transform: [{ scale: scaleAnim1 }] }]}
          />
          {/* 중간 겹 */}
          <Animated.View
            style={[styles.blob, styles.blob2, { transform: [{ scale: scaleAnim2 }] }]}
          />
          {/* 흰색 겹 추가 (가장 안쪽 진한 겹 바로 뒤) */}
          <View style={[styles.blob, styles.blobWhite]} />
          {/* 가장 안쪽 겹 (투명한 유리구슬 느낌) */}
          <View style={[styles.blob, styles.blob3]} />
        </Animated.View>

        {/* 3D 입체감을 위한 고정된 빛 반사(하이라이트) 효과 */}
        {/* <View style={styles.glassHighlight} />
        <View style={styles.glassHighlightBottom} /> */}

        {/* 카메라 아이콘 */}
        <View style={styles.iconContainer}>
          <Ionicons name="camera" size={38} color={colors.white} style={styles.iconShadow} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    right: 16,
    bottom: 148,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  container: {
    width: 76, // 구슬 크기 축소 (100 -> 76)
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    // 전체가 떠있는 듯한 메인 그림자
    shadowColor: colors.lavender,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  animationWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    width: 68, // 90 -> 68
    height: 68,
  },
  // 무지개빛 비눗방울 효과를 위해 각 겹의 색상을 다르게 설정
  blob1: {
    backgroundColor: colors.softCoral,
    opacity: 0.4,
    borderRadius: 45,
    borderTopLeftRadius: 55,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 50,
    borderBottomLeftRadius: 35,
    width: 72, // 96 -> 72
    height: 72,
  },
  blob2: {
    backgroundColor: colors.white,
    opacity: 0.5,
    borderRadius: 45,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 50,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 55,
    width: 66, // 88 -> 66
    height: 66,
    transform: [{ rotate: '45deg' }],
  },
  blobWhite: {
    backgroundColor: colors.softYellow,
    opacity: 0.3,
    borderRadius: 45,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 55,
    borderBottomLeftRadius: 35,
    width: 63, // 84 -> 63
    height: 63,
    transform: [{ rotate: '-20deg' }],
  },
  blob3: {
    backgroundColor: colors.primary, // 반투명한 흰색 유리구슬
    opacity: 0.9,
    borderRadius: 45,
    width: 64, //크기
    height: 64,
    borderWidth: 1,
    borderColor: colors.softRed,
    shadowColor: colors.softOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 6,
  },
  glassHighlight: {
    position: 'absolute',
    top: 16, // 22 -> 16
    left: 21, // 28 -> 21
    width: 15, // 20 -> 15
    height: 6, // 8 -> 6
    borderRadius: 10,
    backgroundColor: colors.white90,
    transform: [{ rotate: '-25deg' }],
    zIndex: 5,
  },
  glassHighlightBottom: {
    position: 'absolute',
    bottom: 16, // 22 -> 16
    right: 21, // 28 -> 21
    width: 22, // 30 -> 22
    height: 4, // 6 -> 4
    borderRadius: 10,
    backgroundColor: colors.white40,
    transform: [{ rotate: '-25deg' }],
    zIndex: 5,
  },
  iconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  iconShadow: {
    textShadowColor: colors.black20,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});
