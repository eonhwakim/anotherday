import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientScreenProps {
  children: React.ReactNode;
  useImageBg?: boolean;
}

export default function GradientScreen({ children, useImageBg }: GradientScreenProps) {
  return (
    <View style={styles.container}>
      {useImageBg ? (
        <Image
          source={require('../../../assets/bg-15.png')}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EBE7DF' }]}>
          {/* 상단 밝은 영역 */}
          <View style={[styles.blob, styles.blobTop]} />

          {/* 중앙 베이지색 대각선 영역 */}
          <View style={[styles.blob, styles.blobMiddle]} />

          {/* 하단 짙은 베이지 영역 (부드러운 곡선 + 그라데이션) */}
          <LinearGradient
            colors={['rgba(220, 212, 194, 0)', '#DCD4C2']}
            style={[styles.blob, styles.blobBottomGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBE7DF',
  },
  blob: {
    position: 'absolute',
  },
  blobTop: {
    top: -340,
    left: -100,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: '#F2EFEA',
    // 가로로 길게 늘리고 살짝 회전시켜서 완벽한 원형이 아닌 부드럽고 완만한 곡선(타원형)으로 만듦
    transform: [{ scaleX: 1.6 }, { rotate: '-8deg' }],
  },
  blobMiddle: {
    top: 400, //낮을수록 위에위치
    left: -150,
    width: 800,
    height: 600,
    borderRadius: 300, // 원형으로 만들어서 곡선 효과 부여
    backgroundColor: '#E2DCCC',
    // 가로로 길게 늘려서 완만한 타원형 곡선으로 만듦
    transform: [{ scaleX: 1.5 }, { rotate: '-20deg' }],
  },
  blobBottomGradient: {
    bottom: -150,
    left: -100,
    width: 600,
    height: 500,
    borderRadius: 300,
    // 완만하고 부드러운 곡선(타원형)으로 만들기
    transform: [{ scaleX: 1.8 }, { rotate: '20deg' }],
  },
});
