import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path, Defs, LinearGradient, Stop, Circle as SvgCircle,
  Line, G, Text as SvgText,
} from 'react-native-svg';
import dayjs from '../../lib/dayjs';

const SCREEN_W = Dimensions.get('window').width;
const CARD_MX = 16;
const CHART_W = SCREEN_W - CARD_MX * 2 - 40;
const CHART_H = 160;
const CHART_PAD = { top: 16, right: 8, bottom: 28, left: 32 };

// ─── Types ──────────────────────────────────────────────────

export interface GoalStat {
  goalId: string;
  name: string;
  frequency: 'daily' | 'weekly_count';
  targetCount: number | null;
  startDate: string | null;
  done: number;
  pass: number;
  fail: number;
  rate: number;
}

export interface WeekData {
  label: string;
  range: string;
  rate: number;
  doneCount: number;
  passCount: number;
}

export interface WeeklyPaceGoal {
  goalId: string;
  name: string;
  frequency: 'daily' | 'weekly_count';
  target: number;
  done: number;
  rate: number;
}

// ─── Helpers ────────────────────────────────────────────────

export const dayjsMax = (a: dayjs.Dayjs, b: dayjs.Dayjs) => a.isAfter(b) ? a : b;
export const dayjsMin = (a: dayjs.Dayjs, b: dayjs.Dayjs) => a.isBefore(b) ? a : b;
export const isPassCheckin = (c: any) => c.status === 'pass' || (c.memo && c.memo.startsWith('[패스]'));
export const isDoneCheckin = (c: any) => !isPassCheckin(c);

// ─── SVG Area Chart ─────────────────────────────────────────

export function AreaChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map(d => d.value), 100);
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
  const areaPath = linePath
    + ` L ${pts[pts.length - 1].x} ${CHART_PAD.top + plotH}`
    + ` L ${pts[0].x} ${CHART_PAD.top + plotH} Z`;

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
      {gridValues.filter(v => v <= maxVal).map(v => {
        const y = CHART_PAD.top + plotH - (v / maxVal) * plotH;
        return (
          <G key={v}>
            <Line x1={CHART_PAD.left} y1={y} x2={CHART_W - CHART_PAD.right} y2={y}
              stroke="rgba(0,0,0,0.06)" strokeWidth={1} strokeDasharray="4,4" />
            <SvgText x={CHART_PAD.left - 6} y={y + 4} fontSize={9}
              fill="rgba(26,26,26,0.30)" textAnchor="end">{v}%</SvgText>
          </G>
        );
      })}
      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path d={linePath} fill="none" stroke="#FF6B3D" strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <G key={i}>
          <SvgCircle cx={p.x} cy={p.y} r={4.5} fill="#FFF" stroke="#FF6B3D" strokeWidth={2.5} />
          <SvgText x={p.x} y={CHART_PAD.top + plotH + 16} fontSize={10}
            fill="rgba(26,26,26,0.50)" textAnchor="middle" fontWeight="600">
            {data[i].label}
          </SvgText>
          <SvgText x={p.x} y={p.y - 10} fontSize={10}
            fill="#FF6B3D" textAnchor="middle" fontWeight="700">
            {Math.round(data[i].value)}%
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ─── Mountain Background SVG ────────────────────────────────

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
      <Path d={`M0 ${height} L${width * .12} ${height * .3} L${width * .28} ${height * .55} L${width * .42} ${height * .2} L${width * .58} ${height * .45} L${width * .73} ${height * .15} L${width * .88} ${height * .4} L${width} ${height * .25} L${width} ${height} Z`} fill="url(#mt2)" />
      <Path d={`M0 ${height} L${width * .08} ${height * .5} L${width * .22} ${height * .65} L${width * .38} ${height * .32} L${width * .52} ${height * .58} L${width * .68} ${height * .28} L${width * .82} ${height * .52} L${width} ${height * .42} L${width} ${height} Z`} fill="url(#mt1)" />
    </Svg>
  );
}

// ─── Progress Bar ───────────────────────────────────────────

export function ProgressBar({ rate, height = 8, color = '#FF6B3D', maxRate = 100 }: { rate: number; height?: number; color?: string; maxRate?: number }) {
  const pct = Math.min(rate / maxRate * 100, 100);
  return (
    <View style={{ height, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: height / 2, flex: 1, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

// ─── Calendar-style week ranges for a given month ───────────

export function getCalendarWeekRanges(yearMonth: string) {
  const ms = dayjs(`${yearMonth}-01`);
  const monthEnd = ms.endOf('month');
  let firstMon = ms;
  while (firstMon.day() !== 1) firstMon = firstMon.add(1, 'day');

  const ranges: { s: dayjs.Dayjs; e: dayjs.Dayjs }[] = [];
  ranges.push({ s: ms, e: firstMon.add(6, 'day') });
  let cursor = firstMon.add(1, 'week');
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'day')) {
    ranges.push({ s: cursor, e: cursor.add(6, 'day') });
    cursor = cursor.add(1, 'week');
  }
  return { ranges, monthEnd };
}

// ─── Trend Insight Message ──────────────────────────────────

export function getTrendInsight(trendData: WeekData[]): string {
  if (trendData.length < 2) return '아직 첫 주예요! 좋은 시작이에요.';
  const first = trendData[0].rate;
  const last = trendData[trendData.length - 1].rate;
  const diff = last - first;
  if (diff > 5) return `첫 주보다 달성률이 ${diff}% 올랐어요! 페이스가 좋습니다.`;
  if (diff < -5) return '살짝 쉬어가는 주가 있었네요. 다시 힘내봐요!';
  return '꾸준한 페이스를 유지하고 있어요!';
}
