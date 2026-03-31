import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle as SvgCircle,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';

const SCREEN_W = Dimensions.get('window').width;
const CARD_MX = 16;
const CHART_W = SCREEN_W - CARD_MX * 2 - 40;
const CHART_H = 160;
const CHART_PAD = { top: 16, right: 8, bottom: 28, left: 32 };

export function AreaChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 100);
  const plotW = CHART_W - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

  const pts = data.map((d, i) => ({
    x: CHART_PAD.left + (i / (data.length - 1)) * plotW,
    y: CHART_PAD.top + plotH - (d.value / maxVal) * plotH,
  }));

  let linePath = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = (pts[i].x + pts[i + 1].x) / 2;
    linePath += ` C ${cpX} ${pts[i].y} ${cpX} ${pts[i + 1].y} ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  const areaPath =
    linePath +
    ` L ${pts[pts.length - 1].x} ${CHART_PAD.top + plotH}` +
    ` L ${pts[0].x} ${CHART_PAD.top + plotH} Z`;

  const gridValues = [0, 50, 100];
  if (maxVal > 100) gridValues.push(Math.round(maxVal / 50) * 50);

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FF6B3D" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#FF6B3D" stopOpacity="0.03" />
        </LinearGradient>
      </Defs>
      {gridValues
        .filter((v) => v <= maxVal)
        .map((v) => {
          const y = CHART_PAD.top + plotH - (v / maxVal) * plotH;
          return (
            <G key={v}>
              <Line
                x1={CHART_PAD.left}
                y1={y}
                x2={CHART_W - CHART_PAD.right}
                y2={y}
                stroke="rgba(0,0,0,0.06)"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={CHART_PAD.left - 6}
                y={y + 4}
                fontSize={9}
                fill="rgba(26,26,26,0.30)"
                textAnchor="end"
              >
                {v}%
              </SvgText>
            </G>
          );
        })}
      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path
        d={linePath}
        fill="none"
        stroke="#FF6B3D"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <G key={i}>
          <SvgCircle cx={p.x} cy={p.y} r={4.5} fill="#FFF" stroke="#FF6B3D" strokeWidth={2.5} />
          <SvgText
            x={p.x}
            y={CHART_PAD.top + plotH + 16}
            fontSize={10}
            fill="rgba(26,26,26,0.50)"
            textAnchor="middle"
            fontWeight="600"
          >
            {data[i].label}
          </SvgText>
          <SvgText
            x={p.x}
            y={p.y - 10}
            fontSize={10}
            fill="#FF6B3D"
            textAnchor="middle"
            fontWeight="700"
          >
            {Math.round(data[i].value)}%
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

export function MountainBg({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="mt1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FF6B3D" stopOpacity="0.10" />
          <Stop offset="100%" stopColor="#FF6B3D" stopOpacity="0.02" />
        </LinearGradient>
        <LinearGradient id="mt2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FF6B3D" stopOpacity="0.06" />
          <Stop offset="100%" stopColor="#FF6B3D" stopOpacity="0.01" />
        </LinearGradient>
      </Defs>
      <Path
        d={`M0 ${height} L${width * 0.12} ${height * 0.3} L${width * 0.28} ${height * 0.55} L${width * 0.42} ${height * 0.2} L${width * 0.58} ${height * 0.45} L${width * 0.73} ${height * 0.15} L${width * 0.88} ${height * 0.4} L${width} ${height * 0.25} L${width} ${height} Z`}
        fill="url(#mt2)"
      />
      <Path
        d={`M0 ${height} L${width * 0.08} ${height * 0.5} L${width * 0.22} ${height * 0.65} L${width * 0.38} ${height * 0.32} L${width * 0.52} ${height * 0.58} L${width * 0.68} ${height * 0.28} L${width * 0.82} ${height * 0.52} L${width} ${height * 0.42} L${width} ${height} Z`}
        fill="url(#mt1)"
      />
    </Svg>
  );
}

export function ProgressBar({
  rate,
  height = 8,
  color = '#FF6B3D',
}: {
  rate: number;
  height?: number;
  color?: string;
}) {
  const pct = Math.min(Math.max(0, rate), 100);

  return (
    <View
      style={{
        height,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: height / 2,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
