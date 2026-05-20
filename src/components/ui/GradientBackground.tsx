import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../design/tokens';
import { spacing } from '../../design/recipes';
interface YellowRoomBackgroundProps {
  children?: React.ReactNode;
  curve?: boolean;
  padded?: boolean;
}

export default function GradientBackground({
  children,
  curve = false,
  padded = true,
}: YellowRoomBackgroundProps) {
  return (
    <View style={[styles.container, padded && styles.padded]}>
      {/* 기본 배경 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      <>
        {!curve && (
          <LinearGradient
            colors={[colors.bgSoft, colors.background]}
            style={styles.topHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}

        {curve && (
          <LinearGradient
            colors={[colors.bgSoft, colors.background]}
            style={[styles.blobTop]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
      </>

      {/* 자식 컴포넌트(콘텐츠) 렌더링 */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  padded: {
    paddingHorizontal: spacing[5],
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  blobTop: {
    position: 'absolute',
    top: -300,
    left: -150,
    width: 700,
    height: 480,
    borderRadius: 350,
    // 크기를 넉넉하게 키우고 위로 올려서, 회전했을 때 상단 모서리에 빈 공간(흰색)이 보이지 않게 덮어줍니다.
    transform: [{ scaleX: 1.4 }, { rotate: '-12deg' }],
  },
});
