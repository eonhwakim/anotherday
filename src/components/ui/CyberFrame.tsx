import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Line, Path } from 'react-native-svg';

// 은빛 메탈릭 팔레트
const METAL = {
  silver:      '#B8BCC6',
  silverLight: '#D8DAE2',
  silverBright:'#ECEEF4',
  silverDim:   '#7E8290',
  silverFrost: '#A0A4B0',
} as const;

interface CyberFrameProps {
  children: React.ReactNode;
  style?: any;
  contentStyle?: any;
  /**
   * If true, renders without SVG background and borders,
   * relying only on the wrapper's styles.
   */
  glassOnly?: boolean;
}

export default function CyberFrame({ children, style, contentStyle, glassOnly = false }: CyberFrameProps) {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const C = 20;
  const R = 8;
  const SW = 1.8;

  return (
    <View
      style={[glassOnly ? cyberStyles.glassWrapper : cyberStyles.wrapper, style]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setSize({ w, h });
      }}
    >
      {!glassOnly && size.w > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            {/* 글래스 배경 — 흰 배경용 반투명도 */}
            <LinearGradient id="metalBg" x1="0" y1="0" x2="0.8" y2="1">
              <Stop offset="0%"   stopColor={METAL.silverBright} stopOpacity="0.15" />
              <Stop offset="40%"  stopColor={METAL.silverLight}  stopOpacity="0.10" />
              <Stop offset="70%"  stopColor={METAL.silverDim}    stopOpacity="0.08" />
              <Stop offset="100%" stopColor={METAL.silverBright} stopOpacity="0.12" />
            </LinearGradient>
            {/* 보더 */}
            <LinearGradient id="metalBorder" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor={METAL.silverBright} stopOpacity="0.90" />
              <Stop offset="35%"  stopColor={METAL.silverDim}    stopOpacity="0.45" />
              <Stop offset="65%"  stopColor={METAL.silverLight}  stopOpacity="0.60" />
              <Stop offset="100%" stopColor={METAL.silverBright} stopOpacity="0.88" />
            </LinearGradient>
          </Defs>

          {/* 글래스 배경 */}
          <Rect
            x={1} y={1}
            width={size.w - 2} height={size.h - 2}
            rx={R} ry={R}
            fill="url(#metalBg)"
            stroke="url(#metalBorder)"
            strokeWidth={1.2}
          />

          {/* ── 코너 브라켓 (좌상) ── */}
          <Line x1={1} y1={R + C} x2={1} y2={R} stroke="url(#cTL)" strokeWidth={SW} />
          <Path d={`M 1 ${R} Q 1 1 ${R} 1`} stroke="url(#cTL)" strokeWidth={SW} fill="none" />
          <Line x1={R} y1={1} x2={R + C} y2={1} stroke="url(#cTL)" strokeWidth={SW} />
          {/* ── 코너 브라켓 (우상) ── */}
          <Line x1={size.w - R - C} y1={1} x2={size.w - R} y2={1} stroke="url(#cTR)" strokeWidth={SW} />
          <Path d={`M ${size.w - R} 1 Q ${size.w - 1} 1 ${size.w - 1} ${R}`} stroke="url(#cTR)" strokeWidth={SW} fill="none" />
          <Line x1={size.w - 1} y1={R} x2={size.w - 1} y2={R + C} stroke="url(#cTR)" strokeWidth={SW} />
          {/* ── 코너 브라켓 (좌하) ── */}
          <Line x1={1} y1={size.h - R - C} x2={1} y2={size.h - R} stroke="url(#cBL)" strokeWidth={SW} />
          <Path d={`M 1 ${size.h - R} Q 1 ${size.h - 1} ${R} ${size.h - 1}`} stroke="url(#cBL)" strokeWidth={SW} fill="none" />
          <Line x1={R} y1={size.h - 1} x2={R + C} y2={size.h - 1} stroke="url(#cBL)" strokeWidth={SW} />
          {/* ── 코너 브라켓 (우하) ── */}
          <Line x1={size.w - R - C} y1={size.h - 1} x2={size.w - R} y2={size.h - 1} stroke="url(#cBR)" strokeWidth={SW} />
          <Path d={`M ${size.w - R} ${size.h - 1} Q ${size.w - 1} ${size.h - 1} ${size.w - 1} ${size.h - R}`} stroke="url(#cBR)" strokeWidth={SW} fill="none" />
          <Line x1={size.w - 1} y1={size.h - R - C} x2={size.w - 1} y2={size.h - R} stroke="url(#cBR)" strokeWidth={SW} />

        </Svg>
      )}

      <View style={[!glassOnly ? cyberStyles.content : null, contentStyle]}>
        {children}
      </View>
    </View>
  );
}


const cyberStyles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.65)', // 흰 배경에서 조금 더 불투명하게 조정
    shadowColor: METAL.silverLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  glassWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)', // 반투명 배경
    borderRadius: 24, // 둥근 모서리 조금 더 범용적인 크기로 변경
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)', // 밝은 흰색 테두리로 유리 반사 느낌
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
});
