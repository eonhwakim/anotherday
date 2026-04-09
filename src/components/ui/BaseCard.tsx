import React, { memo, type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shadows } from '@/design/recipes';

/** CyberFrame과 동일한 은빛 팔레트 (SVG 없이 그라데이션·뷰로만 표현) */
const METAL = {
  silver: '#B8BCC6',
  silverLight: '#D8DAE2',
  silverBright: '#ECEEF4',
  silverDim: '#7E8290',
} as const;

const METAL_COLORS = {
  silverBright: '#FFF6F1',
  silverLight: '#FFD9C8',
  silverDim: '#FFD9C8',
  silver: '#FFF6F1',
} as const;

const FRAME_PAD = 1.2;
const R_OUT = 24;
const R_IN = Math.max(0, R_OUT - FRAME_PAD);

export interface BaseCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** true면 메탈 프레임·코너 없이 가벼운 글래스 박스만 (CyberFrame glassOnly 대응) */
  glassOnly?: boolean;
  /** false면 내부 패딩 제거 (CyberFrame content와 동일한 기본 패딩은 true) */
  padded?: boolean;
  cornerBrackets?: boolean;
}

function CornerBrackets() {
  return (
    <>
      <View pointerEvents="none" style={[styles.bracket, styles.bracketTL]} />
      <View pointerEvents="none" style={[styles.bracket, styles.bracketTR]} />
      <View pointerEvents="none" style={[styles.bracket, styles.bracketBL]} />
      <View pointerEvents="none" style={[styles.bracket, styles.bracketBR]} />
    </>
  );
}

function BaseCard({
  children,
  style,
  contentStyle,
  glassOnly = false,
  padded = true,
  cornerBrackets = false,
}: BaseCardProps) {
  if (glassOnly) {
    return (
      <View style={[styles.glassOnlyOuter, style]}>
        <View style={[padded && styles.contentPad, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.shadowWrap, style]}>
      <LinearGradient
        colors={[
          METAL_COLORS.silverBright,
          METAL_COLORS.silverLight,
          METAL.silverBright,
          METAL_COLORS.silverDim,
        ]}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.frameGradient}
      >
        <View style={styles.innerPlate}>
          <LinearGradient
            colors={['#FFF6F1', '#FFE9DF', '#FFE9DF', '#FFF6F1']}
            locations={[0, 0.5, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.topSheen} />
          {cornerBrackets && <CornerBrackets />}
          <View style={[padded && styles.contentPad, styles.contentLayer, contentStyle]}>
            {children}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    alignSelf: 'stretch',
    marginTop: 8,
    borderRadius: R_OUT,
    overflow: 'hidden',
    backgroundColor: METAL.silverLight,
    shadowColor: METAL.silverLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  frameGradient: {
    borderRadius: R_OUT,
    padding: FRAME_PAD,
  },
  innerPlate: {
    borderRadius: R_IN,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    borderTopLeftRadius: R_IN,
    borderTopRightRadius: R_IN,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  contentLayer: {
    position: 'relative',
    zIndex: 1,
  },
  contentPad: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  glassOnlyOuter: {
    alignSelf: 'stretch',
    // backgroundColor: 'rgba(255, 255, 255, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: R_OUT,
    borderWidth: 1.5,
    // borderColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    ...shadows.glass,
  },
  bracket: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: 'rgba(236,238,244,0.88)',
    zIndex: 0,
  },
  bracketTL: {
    top: 5,
    left: 5,
    borderTopWidth: 1.8,
    borderLeftWidth: 1.8,
    borderTopLeftRadius: 18,
  },
  bracketTR: {
    top: 5,
    right: 5,
    borderTopWidth: 1.8,
    borderRightWidth: 1.8,
    borderTopRightRadius: 18,
  },
  bracketBL: {
    bottom: 5,
    left: 5,
    borderBottomWidth: 1.8,
    borderLeftWidth: 1.8,
    borderBottomLeftRadius: 18,
  },
  bracketBR: {
    bottom: 5,
    right: 5,
    borderBottomWidth: 1.8,
    borderRightWidth: 1.8,
    borderBottomRightRadius: 18,
  },
});

export default memo(BaseCard);
