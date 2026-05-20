import React, { memo, type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shadows } from '@/design/recipes';

const METAL_COLORS = {
  silverBright: '#FFFFFF',
  silverLight: '#EBF4FA', // #9ECCF0의 아주 연한 톤
  silverDim: '#e2ebf0', // #9ECCF0의 약간 톤 다운된 연한 톤 //D2E8F7
  silver: '#DFEFF9', // #9ECCF0의 기본 연한 톤
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
  /** true면 양옆 테두리(border/padding)와 둥근 모서리를 제거하여 화면 꽉 차게 표시 */
  wide?: boolean;
  /** true면 테두리(border 또는 프레임 패딩)를 완전히 제거 */
  noBorder?: boolean;
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
  wide = false,
  noBorder = false,
}: BaseCardProps) {
  if (glassOnly) {
    return (
      <View
        style={[
          styles.glassOnlyOuter,
          wide && styles.wideGlass,
          noBorder && styles.noBorderGlass,
          style,
        ]}
      >
        <View style={[padded && styles.contentPad, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.shadowWrap, wide && styles.wideShadowWrap, style]}>
      <LinearGradient
        colors={[
          METAL_COLORS.silverBright,
          METAL_COLORS.silverLight,
          METAL_COLORS.silverBright,
          METAL_COLORS.silverDim,
        ]}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.frameGradient,
          wide && styles.wideFrameGradient,
          noBorder && styles.noBorderFrame,
        ]}
      >
        <View style={[styles.innerPlate, wide && styles.wideInnerPlate]}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.66)',
              'rgba(238,247,255,0.36)',
              'rgba(255,247,231,0.18)',
              'rgba(255,255,255,0.42)',
            ]}
            locations={[0, 0.38, 0.72, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.92, y: 1 }}
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
    borderRadius: R_OUT,
    overflow: 'hidden',
  },
  frameGradient: {
    borderRadius: R_OUT,
    padding: FRAME_PAD,
    flex: 1, // 카드가 부모 높이를 채우도록 flex: 1 추가
  },
  innerPlate: {
    flex: 1, // 내부 판도 부모 높이를 채우도록 flex: 1 추가
    borderRadius: R_IN,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.46)',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 18,
    borderTopLeftRadius: R_IN,
    borderTopRightRadius: R_IN,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  bottomBloom: {
    position: 'absolute',
    right: -18,
    bottom: -10,
    width: 120,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(214, 236, 255, 0.2)',
  },
  contentLayer: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
  },
  contentPad: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  glassOnlyOuter: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.46)',
    borderRadius: R_OUT,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.84)',
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
  wideShadowWrap: {
    borderRadius: 0,
  },
  wideFrameGradient: {
    borderRadius: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  wideInnerPlate: {
    borderRadius: 0,
  },
  wideGlass: {
    borderRadius: 0,
    borderWidth: 0, // 상하좌우 모든 테두리 완전 제거
  },
  noBorderGlass: {
    borderWidth: 0,
  },
  noBorderFrame: {
    padding: 0,
  },
});

export default memo(BaseCard);
