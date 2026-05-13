import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Easing, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';

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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.animationWrapper, { transform: [{ rotate: spin }] }]}>
        {/* 가장 바깥쪽 옅은 겹 */}
        <Animated.View
          style={[styles.blob, styles.blob1, { transform: [{ scale: scaleAnim1 }] }]}
        />
        {/* 중간 겹 */}
        <Animated.View
          style={[styles.blob, styles.blob2, { transform: [{ scale: scaleAnim2 }] }]}
        />
        {/* 흰색 겹 추가 (가장 안쪽 진한 겹 바로 뒤) */}
        <View style={[styles.blob, styles.blobWhite]} />
        {/* 가장 안쪽 진한 겹 */}
        <View style={[styles.blob, styles.blob3]} />
      </Animated.View>

      {/* 3D 입체감을 위한 고정된 빛 반사(하이라이트) 효과 */}
      <View style={styles.glassHighlight} />

      {/* 아이콘은 회전하지 않도록 바깥에 둠 */}
      <View style={styles.iconContainer}>
        <Ionicons name="camera" size={32} color="#FFFFFF" style={styles.iconShadow} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 148,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    // 전체가 떠있는 듯한 메인 그림자 (주조색 활용)
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  animationWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    width: 70,
    height: 70,
    backgroundColor: colors.primary,
  },
  // 여러 겹의 유기적인 모양을 만들기 위해 border-radius를 불규칙하게 설정
  blob1: {
    opacity: 0.3,
    borderRadius: 35,
    borderTopLeftRadius: 45,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 25,
    width: 76,
    height: 76,
  },
  blob2: {
    opacity: 0.5,
    borderRadius: 35,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 45,
    width: 68,
    height: 68,
    transform: [{ rotate: '45deg' }],
  },
  blobWhite: {
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
    borderRadius: 35,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 45,
    borderBottomLeftRadius: 25,
    width: 64,
    height: 64,
    transform: [{ rotate: '-20deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  blob3: {
    opacity: 0.9,
    borderRadius: 35,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderBottomRightRadius: 35,
    borderBottomLeftRadius: 35,
    width: 56,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 18,
    left: 22,
    width: 16,
    height: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ rotate: '-25deg' }],
    zIndex: 5,
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  iconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
});
