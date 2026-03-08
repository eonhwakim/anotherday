import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, Dimensions, Image,
} from 'react-native';
import Svg, {
  Path, Circle, G, Defs, LinearGradient, Stop, Line, RadialGradient,
} from 'react-native-svg';
import type { MemberProgress } from '../../types/domain';
import { COLORS, SEASON_THEMES } from '../../constants/defaults';
import dayjs from '../../lib/dayjs';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTAINER_WIDTH = SCREEN_WIDTH;
const SVG_W = 350;
const SVG_H = 380;
const CONTAINER_HEIGHT = 380;

const TRAIL_POINTS = [
  { x: 280, y: 340 }, { x: 220, y: 300 }, { x: 150, y: 260 },
  { x: 100, y: 200 }, { x: 160, y: 150 }, { x: 220, y: 120 },
  { x: 180, y: 80 }, { x: 175, y: 40 },
] as const;

const TRAIL_INPUT_RANGE = TRAIL_POINTS.map((_, i) => i / (TRAIL_POINTS.length - 1));

const AVATAR_COLORS = [
  COLORS.holoCyan, COLORS.holoMint, COLORS.holoPink, COLORS.holoLavender,
  COLORS.success, COLORS.accent, '#B0B8C8', '#8890A0',
];

type Theme = (typeof SEASON_THEMES)[keyof typeof SEASON_THEMES];

function getSeasonTheme(): Theme {
  const month = dayjs().month() + 1;
  if (month >= 3 && month <= 5) return SEASON_THEMES.spring;
  if (month >= 6 && month <= 8) return SEASON_THEMES.summer;
  if (month >= 9 && month <= 11) return SEASON_THEMES.autumn;
  return SEASON_THEMES.winter;
}

function buildSmoothTrailPath(): string {
  const pts = TRAIL_POINTS;
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${midX} ${midY}`;
  }
  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
}

const MY_HIGHLIGHT_COLOR = '#FFD93D';

export default function MountainProgress({ members, currentUserId, startAnimation, isNight, timePeriod = 'NIGHT' }: { members: MemberProgress[]; currentUserId?: string; startAnimation?: boolean; isNight?: boolean; timePeriod?: 'DAY' | 'SUNSET' | 'NIGHT' }) {
  const theme = getSeasonTheme();
  const [containerWidth, setContainerWidth] = useState(CONTAINER_WIDTH);

  return (
    <View style={styles.sceneContainer}>
      <View
        style={styles.sceneInner}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <MountainScene theme={theme} isNight={isNight} timePeriod={timePeriod} />
        {[...Array(10)].map((_, i) => (
          <GeometricParticle key={`p-${i}`} emoji={theme.particle} index={i} />
        ))}
        {members.map((member, idx) => {
          const isMe = currentUserId != null && member.userId === currentUserId;
          const color = isMe ? MY_HIGHLIGHT_COLOR : AVATAR_COLORS[idx % AVATAR_COLORS.length];
          return (
            <ClimbingCharacter
              key={member.userId}
              member={member}
              index={idx}
              totalMembers={members.length}
              containerWidth={containerWidth}
              avatarColor={color}
              startAnimation={startAnimation}
            />
          );
        })}
      </View>
    </View>
  );
}

function MountainScene({ theme, timePeriod = 'NIGHT' }: { theme: Theme; isNight?: boolean; timePeriod?: string }) {
  const trailPath = useMemo(() => buildSmoothTrailPath(), []);
  const isDay = timePeriod === 'DAY';
  const isSunset = timePeriod === 'SUNSET';

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
      <Defs>
        {/* ── 낮 산 그라디언트들 ── */}
        {isDay && (
          <>
            {/* 원경 (가장 먼 산) — 밝은 하늘빛 */}
            <LinearGradient id="dayFar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#B8D8F0" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#D0E8F8" stopOpacity="0.25" />
            </LinearGradient>
            {/* 중경 산 — 부드러운 청록빛 */}
            <LinearGradient id="dayMid" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#A0C8E0" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#B8D8EC" stopOpacity="0.35" />
            </LinearGradient>
            {/* 근경 언덕 — 밝은 하늘 톤 */}
            <LinearGradient id="dayNear" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#88B8D8" stopOpacity="0.55" />
              <Stop offset="60%" stopColor="#A0C8E4" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#B0D4EC" stopOpacity="0.40" />
            </LinearGradient>
            {/* 메인 산 — 선명한 하늘빛 */}
            <LinearGradient id="dayMain" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.mountainLight} stopOpacity="0.75" />
              <Stop offset="40%" stopColor={COLORS.mountainDarker} stopOpacity="0.65" />
              <Stop offset="70%" stopColor={COLORS.mountainDark} stopOpacity="0.55" />
              <Stop offset="100%" stopColor="#B0D8F0" stopOpacity="0.40" />
            </LinearGradient>
            {/* 구름 그라디언트 */}
            
            <LinearGradient id="cloudGrad1" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <Stop offset="50%" stopColor="#F8FBFF" stopOpacity="0.75" />
              <Stop offset="100%" stopColor="#E8F4FF" stopOpacity="0.55" />
            </LinearGradient>
            <LinearGradient id="cloudGrad2" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.70" />
              <Stop offset="50%" stopColor="#F5F9FF" stopOpacity="0.60" />
              <Stop offset="100%" stopColor="#E5F0FF" stopOpacity="0.45" />
            </LinearGradient>
            <LinearGradient id="cloudGrad3" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.60" />
              <Stop offset="60%" stopColor="#F0F6FF" stopOpacity="0.50" />
              <Stop offset="100%" stopColor="#E0ECFF" stopOpacity="0.35" />
            </LinearGradient>
            {/* 구름 그림자 */}
            <LinearGradient id="cloudShadow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#D0E8F8" stopOpacity="0.20" />
              <Stop offset="100%" stopColor="#C0D8E8" stopOpacity="0.60" />
            </LinearGradient>
            
          </>
        )}
        {/* ── 석양 산 그라디언트들 ── */}
        {isSunset && (
          <>
            {/* 원경 산 — 밤과 같은 색상 */}
            <LinearGradient id="sunsetFar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.holoLavender} stopOpacity="0.10" />
              <Stop offset="100%" stopColor='#282828' stopOpacity="0.13" />
            </LinearGradient>
            {/* 중경 산 — 밤과 같은 색상 */}
            <LinearGradient id="sunsetMid" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.holoCyan} stopOpacity="0.08" />
              <Stop offset="100%" stopColor='#282828' stopOpacity="0.02" />
            </LinearGradient>
            {/* 근경 언덕 — 밤과 같은 색상 */}
            <LinearGradient id="sunsetNear" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.holoCyan} stopOpacity="0.08" />
              <Stop offset="100%" stopColor={COLORS.holoCyan} stopOpacity="0.02" />
            </LinearGradient>
            {/* 메인 산 — 밤과 같은 색상 */}
            <LinearGradient id="sunsetMain" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.mountainLight} stopOpacity="0.60" />
              <Stop offset="40%" stopColor={COLORS.mountain} stopOpacity="0.55" />
              <Stop offset="60%" stopColor={COLORS.mountainDark} stopOpacity="0.55" />
              <Stop offset="100%" stopColor='#FFE0B0' stopOpacity="0.40" />
            </LinearGradient>
            {/* 노을 안개 */}
            <LinearGradient id="sunsetHaze" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="30%" stopColor="#FFE0F0" stopOpacity="0.20" />
              <Stop offset="70%" stopColor="#FFD0E8" stopOpacity="0.30" />
              <Stop offset="100%" stopColor="#FFC0E0" stopOpacity="0.35" />
            </LinearGradient>
            {/* 구름 핑크빛 */}
            <LinearGradient id="sunsetCloudGrad1" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFE0F0" stopOpacity="0.70" />
              <Stop offset="50%" stopColor="#FFD0E8" stopOpacity="0.60" />
              <Stop offset="100%" stopColor="#FFC0E0" stopOpacity="0.45" />
            </LinearGradient>
            <LinearGradient id="sunsetCloudGrad2" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFD0E8" stopOpacity="0.60" />
              <Stop offset="50%" stopColor="#FFC0E0" stopOpacity="0.50" />
              <Stop offset="100%" stopColor="#FFB0D8" stopOpacity="0.40" />
            </LinearGradient>
            {/* 구름 플레어 — 노을빛 */}
            <RadialGradient id="sunsetCloudFlare" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0%" stopColor="#FFE0F0" stopOpacity="0.50" />
              <Stop offset="50%" stopColor="#FFD0E8" stopOpacity="0.30" />
              <Stop offset="100%" stopColor="#FFC0E0" stopOpacity="0" />
            </RadialGradient>
            {/* 태양 그라디언트 — 따뜻한 오렌지*/}
            <RadialGradient id="sunsetSunCore" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0%" stopColor="#FFE0B0" stopOpacity="0.90" />
              <Stop offset="40%" stopColor="#FFC890" stopOpacity="0.80" />
              <Stop offset="80%" stopColor="#FFB070" stopOpacity="0.70" />
              <Stop offset="100%" stopColor="#FF9850" stopOpacity="0.60" />
            </RadialGradient>
            <RadialGradient id="sunsetSunGlow1" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0%" stopColor="#FFE8D0" stopOpacity="0.60" />
              <Stop offset="50%" stopColor="#FFD8B8" stopOpacity="0.40" />
              <Stop offset="100%" stopColor="#FFC8A0" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="sunsetSunGlow2" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0%" stopColor="#FFE0C0" stopOpacity="0.45" />
              <Stop offset="40%" stopColor="#FFD0B0" stopOpacity="0.30" />
              <Stop offset="100%" stopColor="#FFC0A0" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="sunsetSunGlow3" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0%" stopColor="#FFD8B8" stopOpacity="0.35" />
              <Stop offset="30%" stopColor="#FFC8A8" stopOpacity="0.20" />
              <Stop offset="100%" stopColor="#FFB898" stopOpacity="0" />
            </RadialGradient> 
          </>
        )}
        {/* ── 밤 그라디언트 (기존) ── */}
        <LinearGradient id="farMountGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={COLORS.holoLavender} stopOpacity="0.10" />
          <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.03" />
        </LinearGradient>
        <LinearGradient id="midStructGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={COLORS.holoCyan} stopOpacity="0.08" />
          <Stop offset="100%" stopColor={COLORS.holoCyan} stopOpacity="0.02" />
        </LinearGradient>
        <LinearGradient id="mainMountGrad" x1="0" y1="0" x2="0" y2="1">
          {/* <Stop offset="0%" stopColor={theme.accent} stopOpacity="0.20" />
          <Stop offset="50%" stopColor={COLORS.primary} stopOpacity="0.10" />
          <Stop offset="100%" stopColor={COLORS.surface} stopOpacity="0.20" /> */}
          <Stop offset="0%" stopColor={COLORS.mountain} stopOpacity="0.55" />
          <Stop offset="40%" stopColor={COLORS.mountainDark} stopOpacity="0.55" />
          <Stop offset="60%" stopColor={COLORS.mountainDarker} stopOpacity="0.55" />
          <Stop offset="100%" stopColor={COLORS.ground} stopOpacity="0.40" />
        </LinearGradient> 
        {/* 홀로그래픽 트레일 */}
        <LinearGradient id="trailHolo" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0%" stopColor={COLORS.holoLavender} stopOpacity="0.85" />
          <Stop offset="35%" stopColor={COLORS.holoCyan} stopOpacity="0.60" />
          <Stop offset="65%" stopColor={COLORS.holoMint1} stopOpacity="0.55" />
          <Stop offset="100%" stopColor={COLORS.holoPink} stopOpacity="0.55" />
        </LinearGradient>
      
      </Defs>

      {isDay ? (
        <>
          <G transform="translate(280, 95)">
            
            {/* 작은 플레어 점들 */}
            <G opacity="0.40">
              <Circle cx="0" cy="-75" r="2" fill="#FFFEF7" />
              <Circle cx="0" cy="75" r="2" fill="#FFFEF7" />
              <Circle cx="-75" cy="0" r="2" fill="#FFFEF7" />
              <Circle cx="75" cy="0" r="2" fill="#FFFEF7" />
            </G>
          </G>

          {/* Layer 1 — 원경 산맥 (가장 멀리, 하늘빛에 묻힌 연한 색) */}
          <Path
            d="M 0 280 Q 30 250 60 255 Q 90 230 120 245 Q 145 220 170 230 Q 200 210 230 225 Q 260 205 290 220 Q 320 210 350 230 V 380 H 0 Z"
            fill="url(#dayFar)"
          />
          {/* Layer 2 — 원경 산맥 우측 */}
          <Path
            d="M 180 270 Q 210 240 240 250 Q 270 225 300 235 Q 330 215 355 228 Q 380 220 400 240 V 380 H 180 Z"
            fill="url(#dayFar)" opacity={0.6}
          />

          {/* 구름 레이어 1 — 원경 상단 (더 부드러운 형태) */}
          <G opacity={0.45}>
            {/* 플레어 효과 */}
            <Circle cx="60" cy="238" r="25" fill="url(#cloudFlare)" />
            {/* 구름 그림자 */}
            <Path
              d="M 12 247 Q 18 246 25 247 Q 40 246 55 247 Q 70 246 85 247 Q 100 246 112 248 Q 112 250 100 251 Q 85 252 70 251 Q 55 252 40 251 Q 25 252 12 250 Z"
              fill="url(#cloudShadow)"
            />
            {/* 구름 본체 */}
            <Path
              d="M 10 238 C 10 234 14 231 20 232 C 26 230 32 230 38 232 C 44 230 52 230 60 232 C 68 230 76 231 82 233 C 88 231 94 231 100 233 C 106 232 110 235 112 239 C 113 243 111 247 106 248 C 100 249 94 249 88 247 C 82 249 76 249 70 247 C 64 249 58 249 52 247 C 46 249 40 249 34 247 C 28 249 22 249 16 247 C 12 246 9 243 10 238 Z"
              fill="url(#cloudGrad1)"
            />
          </G>
          <G opacity={0.42}>
            {/* 플레어 효과 */}
            <Circle cx="285" cy="253" r="30" fill="url(#cloudFlare)" />
            {/* 구름 그림자 */}
            <Path
              d="M 222 264 Q 240 263 258 264 Q 276 263 294 264 Q 312 263 330 264 Q 345 263 348 266 Q 345 268 330 269 Q 312 270 294 269 Q 276 270 258 269 Q 240 270 222 268 Z"
              fill="url(#cloudShadow)"
            />
            {/* 구름 본체 */}
            <Path
              d="M 220 253 C 220 249 225 246 232 247 C 240 245 248 245 256 247 C 264 245 274 245 284 247 C 294 245 304 246 312 248 C 320 246 328 246 336 248 C 342 247 347 250 348 254 C 349 258 346 262 340 263 C 332 264 324 264 316 262 C 308 264 300 264 292 262 C 284 264 276 264 268 262 C 260 264 252 264 244 262 C 236 264 228 264 224 262 C 221 261 219 258 220 253 Z"
              fill="url(#cloudGrad2)"
            />
          </G>

          {/* Layer 3 — 중경 산 (중간 거리, 부드러운 청록빛) */}
          <Path
            d="M -20 340 Q 10 290 40 300 Q 65 270 95 285 Q 120 255 145 268 Q 170 260 180 280 Q 195 265 210 280 V 380 H -20 Z"
            fill="url(#dayMid)"
          />
          <Path
            d="M 200 330 Q 230 285 260 295 Q 290 265 320 278 Q 350 255 375 270 Q 395 260 420 280 V 380 H 200 Z"
            fill="url(#dayMid)" opacity={0.75}
          />

          {/* 구름 레이어 2 — 중경 */}
          <G opacity={0.92}>
            {/* 플레어 효과 */}
            <Circle cx="125" cy="287" r="28" fill="url(#cloudFlare)" />
            <Path
              d="M 62 297 Q 80 296 98 297 Q 116 296 134 297 Q 152 296 170 297 Q 184 296 188 299 Q 184 301 170 302 Q 152 303 134 302 Q 116 303 98 302 Q 80 303 62 301 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 60 287 C 60 283 66 280 74 281 C 82 279 90 279 98 281 C 106 279 116 279 126 281 C 136 279 146 280 154 282 C 162 280 170 280 178 282 C 184 281 188 284 189 288 C 190 292 187 296 181 297 C 173 298 165 298 157 296 C 149 298 141 298 133 296 C 125 298 117 298 109 296 C 101 298 93 298 85 296 C 77 298 69 298 65 296 C 62 295 59 292 60 287 Z"
              fill="url(#cloudGrad1)"
            />
          </G>
          <G opacity={0.88}>
            {/* 플레어 효과 */}
            <Circle cx="260" cy="304" r="32" fill="url(#cloudFlare)" />
            <Path
              d="M 192 314 Q 210 313 228 314 Q 246 313 264 314 Q 282 313 300 314 Q 318 313 328 316 Q 318 318 300 319 Q 282 320 264 319 Q 246 320 228 319 Q 210 320 192 318 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 190 304 C 190 300 196 297 204 298 C 212 296 222 296 232 298 C 242 296 252 296 262 298 C 272 296 282 297 290 299 C 298 297 306 297 314 299 C 322 298 327 301 328 305 C 329 309 326 313 320 314 C 312 315 304 315 296 313 C 288 315 280 315 272 313 C 264 315 256 315 248 313 C 240 315 232 315 224 313 C 216 315 208 315 200 313 C 194 312 189 309 190 304 Z"
              fill="url(#cloudGrad2)"
            />
          </G>
          <G opacity={0.85}>
            {/* 플레어 효과 */}
            <Circle cx="55" cy="315" r="22" fill="url(#cloudFlare)" />
            <Path
              d="M 17 324 Q 28 323 39 324 Q 50 323 61 324 Q 72 323 82 324 Q 90 323 93 325 Q 90 327 82 328 Q 72 329 61 328 Q 50 329 39 328 Q 28 329 17 327 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 15 315 C 15 312 19 310 25 311 C 31 309 37 309 43 311 C 49 309 56 309 63 311 C 70 309 77 310 83 312 C 88 311 92 313 93 316 C 94 319 91 322 86 323 C 80 324 74 324 68 322 C 62 324 56 324 50 322 C 44 324 38 324 32 322 C 26 324 20 324 17 322 C 15 321 14 319 15 315 Z"
              fill="url(#cloudGrad3)"
            />
          </G>

          {/* Layer 4 — 근경 언덕 (밝은 하늘 톤) */}
          <Path
            d="M -10 370 Q 10 340 30 345 Q 55 330 75 338 Q 95 325 115 332 Q 130 328 140 340 V 380 H -10 Z"
            fill="url(#dayNear)"
          />
          <Path
            d="M 240 365 Q 260 338 285 342 Q 305 328 325 335 Q 345 325 365 332 Q 385 330 410 345 V 380 H 240 Z"
            fill="url(#dayNear)"
          />

          {/* 메인 산 */}
          <Path d="M -20 400 L 60 340 L 100 280 L 130 220 L 150 140 L 165 80 L 175 40 L 185 80 L 200 140 L 220 220 L 250 280 L 290 340 L 370 400 Z" fill="url(#dayMain)" />

          {/* 산 능선 하이라이트 (밝은 하늘빛) */}
          <Path d="M175 40 L165 80 L150 140 L130 220 L100 280 L60 340" stroke="#A0D0F0" strokeWidth="1" opacity="0.30" fill="none" />
          <Path d="M175 40 L185 80 L200 140 L220 220 L250 280 L290 340" stroke="#88C0E8" strokeWidth="0.8" opacity="0.25" fill="none" />

          {/* 구름 레이어 3 — 근경 */}
          <G opacity={0.34}>
            {/* 플레어 효과 */}
            <Circle cx="180" cy="333" r="35" fill="url(#cloudFlare)" />
            <Path
              d="M 127 342 Q 145 341 163 342 Q 181 341 199 342 Q 217 341 234 343 Q 234 345 217 346 Q 199 347 181 346 Q 163 347 145 346 Q 127 347 127 345 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 125 333 C 125 329 131 326 139 327 C 147 325 157 325 167 327 C 177 325 187 325 197 327 C 207 325 217 326 225 328 C 231 327 236 330 237 334 C 238 338 235 341 229 342 C 221 343 213 343 205 341 C 197 343 189 343 181 341 C 173 343 165 343 157 341 C 149 343 141 343 135 341 C 130 340 126 337 125 333 Z"
              fill="url(#cloudGrad1)"
            />
          </G>
          <G opacity={0.41}>
            {/* 플레어 효과 */}
            <Circle cx="303" cy="343" r="33" fill="url(#cloudFlare)" />
            <Path
              d="M 262 352 Q 278 351 294 352 Q 310 351 326 352 Q 342 351 348 354 Q 342 356 326 357 Q 310 358 294 357 Q 278 358 262 356 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 260 343 C 260 339 266 336 274 337 C 282 335 292 335 302 337 C 312 335 322 335 332 337 C 340 336 345 339 346 343 C 347 347 344 350 338 351 C 330 352 322 352 314 350 C 306 352 298 352 290 350 C 282 352 274 352 268 350 C 263 349 259 346 260 343 Z"
              fill="url(#cloudGrad2)"
            />
          </G>

          {/* 작은 구름들 — 더 부드러운 형태 */}
          <G opacity={0.45}>
            {/* 플레어 효과 */}
            <Circle cx="158" cy="205" r="18" fill="url(#cloudFlare)" />
            <Path
              d="M 142 211 Q 150 210 158 211 Q 166 210 173 212 Q 173 213 166 214 Q 158 215 150 214 Q 142 215 142 213 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 140 205 C 140 203 143 201 148 202 C 153 200 158 200 163 202 C 168 200 172 202 174 205 C 175 207 173 209 169 210 C 164 211 159 211 154 209 C 149 211 144 211 142 209 C 140 208 139 207 140 205 Z"
              fill="url(#cloudGrad3)"
            />
          </G>
          <G opacity={0.42}>
            {/* 플레어 효과 */}
            <Circle cx="300" cy="220" r="20" fill="url(#cloudFlare)" />
            <Path
              d="M 282 226 Q 292 225 302 226 Q 312 225 320 227 Q 320 228 312 229 Q 302 230 292 229 Q 282 230 282 228 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 280 220 C 280 218 283 216 288 217 C 293 215 300 215 307 217 C 314 215 319 217 321 220 C 322 222 320 224 316 225 C 311 226 306 226 301 224 C 296 226 291 226 286 224 C 283 223 279 222 280 220 Z"
              fill="url(#cloudGrad3)"
            />
          </G>
          <G opacity={0.82}>
            {/* 플레어 효과 */}
            <Circle cx="62" cy="275" r="16" fill="url(#cloudFlare)" />
            <Path
              d="M 47 281 Q 54 280 61 281 Q 68 280 75 281 Q 78 281 78 282 Q 75 283 68 284 Q 61 285 54 284 Q 47 285 47 283 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 45 275 C 45 273 48 271 52 272 C 57 270 62 270 67 272 C 72 270 76 272 78 275 C 79 277 77 279 73 280 C 68 281 63 281 58 279 C 53 281 48 281 47 279 C 45 278 44 277 45 275 Z"
              fill="url(#cloudGrad3)"
            />
          </G>

          {/* 추가 작은 구름들 */}
          <G opacity={0.38}>
            {/* 플레어 효과 */}
            <Circle cx="93" cy="182" r="14" fill="url(#cloudFlare)" />
            <Path
              d="M 82 187 Q 88 186 94 187 Q 100 186 105 188 Q 105 189 100 190 Q 94 191 88 190 Q 82 191 82 189 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 80 182 C 80 180 82 179 86 180 C 90 178 94 178 98 180 C 102 178 105 180 106 182 C 107 184 105 186 101 187 C 97 188 93 188 89 186 C 85 188 82 187 81 186 C 80 185 79 184 80 182 Z"
              fill="url(#cloudGrad3)"
            />
          </G>
          <G opacity={0.35}>
            {/* 플레어 효과 */}
            <Circle cx="344" cy="157" r="15" fill="url(#cloudFlare)" />
            <Path
              d="M 332 162 Q 338 161 344 162 Q 350 161 355 163 Q 355 164 350 165 Q 344 166 338 165 Q 332 166 332 164 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 330 157 C 330 155 332 154 336 155 C 340 153 345 153 350 155 C 354 153 357 155 358 158 C 359 160 357 162 353 163 C 349 164 345 164 341 162 C 337 164 333 163 331 162 C 330 161 329 160 330 157 Z"
              fill="url(#cloudGrad3)"
            />
          </G>
          <G opacity={0.40}>
            {/* 플레어 효과 */}
            <Circle cx="218" cy="183" r="16" fill="url(#cloudFlare)" />
            <Path
              d="M 202 188 Q 210 187 218 188 Q 226 187 233 189 Q 233 190 226 191 Q 218 192 210 191 Q 202 192 202 190 Z"
              fill="url(#cloudShadow)"
            />
            <Path
              d="M 200 183 C 200 181 203 179 208 180 C 213 178 220 178 227 180 C 233 178 237 181 238 184 C 239 186 236 188 231 189 C 226 190 221 190 216 188 C 211 190 206 189 203 188 C 201 187 199 186 200 183 Z"
              fill="url(#cloudGrad3)"
            />
          </G>

          {/* 새 실루엣 추가 */}
          <Path d="M 80 150 Q 75 148 70 150 M 90 150 Q 95 148 100 150" stroke="#88B8D8" strokeWidth="1.5" opacity={0.40} fill="none" strokeLinecap="round" />
          <Path d="M 250 180 Q 245 178 240 180 M 260 180 Q 265 178 270 180" stroke="#70A8C8" strokeWidth="1.5" opacity={0.35} fill="none" strokeLinecap="round" />
          <Path d="M 180 120 Q 175 118 170 120 M 190 120 Q 195 118 200 120" stroke="#98C8E0" strokeWidth="1.2" opacity={0.30} fill="none" strokeLinecap="round" />
          <Path d="M 310 135 Q 305 133 300 135 M 320 135 Q 325 133 330 135" stroke="#A0D0E8" strokeWidth="1.2" opacity={0.28} fill="none" strokeLinecap="round" />
        </>
      ) : isSunset ? (
        <>
          {/* ── SUNSET: 핑크빛 노을이 지는 산 레이어 ── */}
          <G transform="translate(280, 95)">
            {/* 작은 플레어 점들 */}
            <G opacity="0.45">
              <Circle cx="0" cy="-80" r="2.5" fill="#FFE8D0" />
              <Circle cx="0" cy="80" r="2.5" fill="#FFE8D0" />
              <Circle cx="-80" cy="0" r="2.5" fill="#FFE8D0" />
              <Circle cx="80" cy="0" r="2.5" fill="#FFE8D0" />
            </G>
          </G>

          {/* Layer 1 — 원경 산맥 (핑크빛에 물든) */}
          <Path
            d="M 0 280 Q 30 250 60 255 Q 90 230 120 245 Q 145 220 170 230 Q 200 210 230 225 Q 260 205 290 220 Q 320 210 350 230 V 380 H 0 Z"
            fill="url(#sunsetFar)"
          />
          <Path
            d="M 180 270 Q 210 240 240 250 Q 270 225 300 235 Q 330 215 355 228 Q 380 220 400 240 V 380 H 180 Z"
            fill="url(#sunsetFar)" opacity={0.7}
          />

          {/* 노을 안개 레이어 1 */}
          <Path
            d="M 0 265 Q 100 255 200 260 Q 300 252 400 265 V 310 Q 300 300 200 305 Q 100 298 0 310 Z"
            fill="#FFE0F0" opacity={0.40}
          />

          {/* 구름 레이어 1 — 노을에 물든 구름 */}
          <G opacity={0.50}>
            <Circle cx="60" cy="238" r="25" fill="url(#sunsetCloudFlare)" />
            <Path
              d="M 12 247 Q 18 246 25 247 Q 40 246 55 247 Q 70 246 85 247 Q 100 246 112 248 Q 112 250 100 251 Q 85 252 70 251 Q 55 252 40 251 Q 25 252 12 250 Z"
              fill="#FFB0D0"
              opacity={0.30}
            />
            <Path
              d="M 10 238 C 10 234 14 231 20 232 C 26 230 32 230 38 232 C 44 230 52 230 60 232 C 68 230 76 231 82 233 C 88 231 94 231 100 233 C 106 232 110 235 112 239 C 113 243 111 247 106 248 C 100 249 94 249 88 247 C 82 249 76 249 70 247 C 64 249 58 249 52 247 C 46 249 40 249 34 247 C 28 249 22 249 16 247 C 12 246 9 243 10 238 Z"
              fill="url(#sunsetCloudGrad1)"
            />
          </G>
          <G opacity={0.48}>
            <Circle cx="285" cy="253" r="30" fill="url(#sunsetCloudFlare)" />
            <Path
              d="M 222 264 Q 240 263 258 264 Q 276 263 294 264 Q 312 263 330 264 Q 345 263 348 266 Q 345 268 330 269 Q 312 270 294 269 Q 276 270 258 269 Q 240 270 222 268 Z"
              fill="#FFB0D0"
              opacity={0.30}
            />
            <Path
              d="M 220 253 C 220 249 225 246 232 247 C 240 245 248 245 256 247 C 264 245 274 245 284 247 C 294 245 304 246 312 248 C 320 246 328 246 336 248 C 342 247 347 250 348 254 C 349 258 346 262 340 263 C 332 264 324 264 316 262 C 308 264 300 264 292 262 C 284 264 276 264 268 262 C 260 264 252 264 244 262 C 236 264 228 264 224 262 C 221 261 219 258 220 253 Z"
              fill="url(#sunsetCloudGrad2)"
            />
          </G>

          {/* Layer 3 — 중경 산 (따뜻한 핑크) */}
          <Path
            d="M -20 340 Q 10 290 40 300 Q 65 270 95 285 Q 120 255 145 268 Q 170 260 180 280 Q 195 265 210 280 V 380 H -20 Z"
            fill="url(#sunsetMid)"
          />
          <Path
            d="M 200 330 Q 230 285 260 295 Q 290 265 320 278 Q 350 255 375 270 Q 395 260 420 280 V 380 H 200 Z"
            fill="url(#sunsetMid)" opacity={0.80}
          />

          {/* 노을 안개 레이어 2 */}
          <Path
            d="M 0 305 Q 100 295 200 300 Q 300 292 400 305 V 340 Q 300 332 200 338 Q 100 330 0 340 Z"
            fill="#FFD0E8" opacity={0.35}
          />

          {/* Layer 4 — 근경 언덕 (진한 핑크) */}
          <Path
            d="M -10 370 Q 10 340 30 345 Q 55 330 75 338 Q 95 325 115 332 Q 130 328 140 340 V 380 H -10 Z"
            fill="url(#sunsetNear)"
          />
          <Path
            d="M 240 365 Q 260 338 285 342 Q 305 328 325 335 Q 345 325 365 332 Q 385 330 410 345 V 380 H 240 Z"
            fill="url(#sunsetNear)"
          />

          {/* 메인 산 */}
          <Path d="M -20 400 L 60 340 L 100 280 L 130 220 L 150 140 L 165 80 L 175 40 L 185 80 L 200 140 L 220 220 L 250 280 L 290 340 L 370 400 Z" fill="url(#sunsetMain)" />

          {/* 산 능선 하이라이트 (핑크 노을빛) */}
          <Path d="M175 40 L165 80 L150 140 L130 220 L100 280 L60 340" stroke="#FFB8D8" strokeWidth="1" opacity="0.35" fill="none" />
          <Path d="M175 40 L185 80 L200 140 L220 220 L 250 280 L290 340" stroke="#FFA8C8" strokeWidth="0.8" opacity="0.30" fill="none" />

          {/* 구름 레이어 3 — 근경 */}
          <G opacity={0.52}>
            <Circle cx="180" cy="333" r="35" fill="url(#sunsetCloudFlare)" />
            <Path
              d="M 127 342 Q 145 341 163 342 Q 181 341 199 342 Q 217 341 234 343 Q 234 345 217 346 Q 199 347 181 346 Q 163 347 145 346 Q 127 347 127 345 Z"
              fill="#FFB0D0"
              opacity={0.30}
            />
            <Path
              d="M 125 333 C 125 329 131 326 139 327 C 147 325 157 325 167 327 C 177 325 187 325 197 327 C 207 325 217 326 225 328 C 231 327 236 330 237 334 C 238 338 235 341 229 342 C 221 343 213 343 205 341 C 197 343 189 343 181 341 C 173 343 165 343 157 341 C 149 343 141 343 135 341 C 130 340 126 337 125 333 Z"
              fill="url(#sunsetCloudGrad1)"
            />
          </G>

          {/* 새 실루엣 — 노을 속 */}
          <Path d="M 80 150 Q 75 148 70 150 M 90 150 Q 95 148 100 150" stroke="#FFB8D8" strokeWidth="1.5" opacity={0.45} fill="none" strokeLinecap="round" />
          <Path d="M 250 180 Q 245 178 240 180 M 260 180 Q 265 178 270 180" stroke="#FFA8C8" strokeWidth="1.5" opacity={0.40} fill="none" strokeLinecap="round" />
          <Path d="M 180 120 Q 175 118 170 120 M 190 120 Q 195 118 200 120" stroke="#FFC8E0" strokeWidth="1.2" opacity={0.35} fill="none" strokeLinecap="round" />
          <Path d="M 310 135 Q 305 133 300 135 M 320 135 Q 325 133 330 135" stroke="#FFD0E8" strokeWidth="1.2" opacity={0.32} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* ── NIGHT (기존) ── */}
          {/* 원경 산맥 */}
          <Path d="M 0 320 L 40 260 L 80 290 L 120 240 L 160 270 L 200 220 L 240 260 L 280 230 L 320 260 L 360 280 L 400 320 V 400 H 0 Z" fill="url(#farMountGrad)" />
          {/* 중경 삼각형 */}
          <G transform="translate(-10, 265)">
            <Path d="M20 0 L0 80 L40 80 Z" fill="url(#midStructGrad)" />
            <Path d="M60 15 L40 80 L80 80 Z" fill="url(#midStructGrad)" />
            <Path d="M95 5 L75 80 L115 80 Z" fill="url(#midStructGrad)" />
          </G>
          <G transform="translate(260, 270)">
            <Path d="M25 0 L5 80 L45 80 Z" fill="url(#midStructGrad)" />
            <Path d="M55 15 L35 80 L75 80 Z" fill="url(#midStructGrad)" />
          </G>
          {/* 메인 산 */}
          <Path d="M -20 400 L 60 340 L 100 280 L 130 220 L 150 140 L 165 80 L 175 40 L 185 80 L 200 140 L 220 220 L 250 280 L 290 340 L 370 400 Z" fill="url(#mainMountGrad)" />
          {/* 산 와이어프레임 */}
          <Path d="M175 40 L130 220" stroke={theme.accent} strokeWidth="0.5" opacity="0.12" />
          <Path d="M175 40 L220 220" stroke={theme.accent} strokeWidth="0.5" opacity="0.12" />
          <Path d="M130 220 L60 340" stroke={COLORS.holoLavender} strokeWidth="0.3" opacity="0.08" />
          <Path d="M220 220 L290 340" stroke={COLORS.holoLavender} strokeWidth="0.3" opacity="0.08" />
          <Path d="M150 140 L200 140" stroke={theme.accent} strokeWidth="0.3" opacity="0.10" />
        </>
      )}

      {/* 홀로그래픽 글로우 트레일 가운데 라인(공통) */}
      <Path d={trailPath} stroke="url(#trailHolo)" strokeWidth={12} strokeLinecap="round" fill="none" />
      <Path d={trailPath} stroke={COLORS.holoMint} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.35} />
      <Path d={trailPath} stroke={COLORS.holoLavender1} strokeWidth={0.8} strokeDasharray="3 8" strokeLinecap="round" fill="none" opacity="0.22" />
        

      {/* 정상 비콘 */}
      <G transform="translate(168, 5) scale(0.4)">
        <Line x1="20" y1="70" x2="20" y2="0" stroke={COLORS.secondaryDark} strokeWidth="3" opacity="0.7" />
        <Circle cx="20" cy="0" r="14" fill={COLORS.secondary} opacity="0.15" />
        <Circle cx="20" cy="0" r="6" fill={COLORS.secondary} opacity="0.5"/>
        <Circle cx="20" cy="0" r="18" fill="none" stroke={COLORS.secondary} strokeWidth="1" opacity="0.2" />
      </G>
    </Svg>
  );
}

function GeometricParticle({ emoji, index }: any) {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(fall, { toValue: 1, duration: 6000 + index * 1500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2500, easing: Easing.sin, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 2500, easing: Easing.sin, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: `${20 + index * 30}%`, top: -20,
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, 380] }) },
        { translateX: sway.interpolate({ inputRange: [-1, 1], outputRange: [-15, 15] }) },
      ],
    }}>
      <Text style={{ fontSize: 10, opacity: 0.3, color: COLORS.holoLavender }}>{emoji}</Text>
    </Animated.View>
  );
}

function ClimbingCharacter({ member, index, totalMembers, containerWidth, avatarColor, startAnimation }: any) {
  const effective = member.totalGoals - (member.passGoals ?? 0);
  const progress = Math.min(1, Math.max(0, effective > 0 ? (member.doneGoals ?? 0) / effective : ((member.passGoals ?? 0) > 0 ? 1 : 0)));
  const spreadOffset = totalMembers > 1 ? ((index / (totalMembers - 1)) * 2 - 1) * 20 : 0;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const displayPercent = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  // startAnimation이 true가 되면 0% → 목표 퍼센트까지 클라이밍 시작
  useEffect(() => {
    if (startAnimation && !hasStarted.current) {
      hasStarted.current = true;
      // 멤버별로 약간의 딜레이를 줘서 순차적으로 올라가는 느낌
      const delay = index * 100;
      setTimeout(() => {
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 1200 + progress * 1500, // 높이 올라갈수록 더 오래 걸림
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
        Animated.timing(displayPercent, {
          toValue: progress * 100,
          duration: 1200 + progress * 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, delay);
    }
  }, [startAnimation, progress]);

  // startAnimation이 false가 되면 (탭 이동 등으로 포커스 아웃됐다가 다시 돌아올 때)
  // 상태를 리셋하여 0%부터 다시 시작하도록 함
  useEffect(() => {
    if (!startAnimation) {
      hasStarted.current = false;
      progressAnim.setValue(0);
      displayPercent.setValue(0);
      bounceAnim.setValue(0);
    }
  }, [startAnimation]);

  // 데이터가 변경될 때 (이미 애니메이션 시작 후 리프레시)
  useEffect(() => {
    if (hasStarted.current) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      Animated.timing(displayPercent, {
        toValue: progress * 100,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  // 통통 바운스 (클라이밍 시작 후에만)
  useEffect(() => {
    if (startAnimation) {
      const delay = index * 200 + 400;
      const timeout = setTimeout(() => {
        Animated.loop(Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -4, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ])).start();
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [startAnimation]);

  const animatedLeft = progressAnim.interpolate({ inputRange: TRAIL_INPUT_RANGE, outputRange: TRAIL_POINTS.map(pt => (pt.x / SVG_W) * containerWidth + spreadOffset) });
  const animatedTop = progressAnim.interpolate({ inputRange: TRAIL_INPUT_RANGE, outputRange: TRAIL_POINTS.map(pt => (pt.y / SVG_H) * CONTAINER_HEIGHT) });

  return (
    <Animated.View style={[styles.characterWrapper, { left: animatedLeft, top: Animated.add(animatedTop, bounceAnim) }]}>
      <View style={[styles.bubble, { borderColor: COLORS.holoLavender1 }]}>
        <PercentLabel value={displayPercent} color={COLORS.sky} />
      </View>
      <View style={[styles.bubbleTail, { borderTopColor: avatarColor + '50' }]} />
      <View style={[styles.avatarGlow, { shadowColor: avatarColor }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColor + '20', borderColor: avatarColor }]}>
          {member.profileImageUrl ? (
            <Image source={{ uri: member.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: avatarColor }]}>{member.nickname?.[0]}</Text>
          )}
        </View>
      </View>
      <View style={[styles.shadow, { backgroundColor: avatarColor + '15' }]} />
      <View style={styles.nicknameBadge}>
        <Text style={styles.nicknameText} numberOfLines={1}>{member.nickname ?? ''}</Text>
      </View>
    </Animated.View>
  );
}

/** 퍼센트 숫자가 올라가는 라벨 */
function PercentLabel({ value, color }: { value: Animated.Value; color: string }) {
  const [display, setDisplay] = useState('0%');

  useEffect(() => {
    const id = value.addListener(({ value: v }) => {
      setDisplay(`${Math.floor(v)}%`);
    });
    return () => value.removeListener(id);
  }, [value]);

  return <Text style={[styles.bubbleText, { color, textAlign: 'center' }]}>{display}</Text>;
}

const styles = StyleSheet.create({
  sceneContainer: { width: '100%', height: CONTAINER_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  sceneInner: { width: '100%', height: '100%' },
  characterWrapper: { position: 'absolute', alignItems: 'center', marginLeft: -20, marginTop: -40, zIndex: 20 },
  bubble: { backgroundColor: 'rgba(5,5,16,0.75)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, marginBottom: 0 },
  bubbleText: { fontSize: 10, fontWeight: '700', color: COLORS.text, flexShrink: 0 },
  bubbleTail: { width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 4, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginBottom: 2 },
  avatarGlow: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10, elevation: 8, zIndex: 2, borderRadius: 18 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, overflow: 'hidden' },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  avatarText: { fontWeight: '800', fontSize: 14 },
  shadow: { width: 28, height: 6, borderRadius: 14, marginTop: -3, zIndex: 1 },
  nicknameBadge: { 
    backgroundColor: 'rgba(5,5,16,0.70)', 
    paddingHorizontal: 6, 
    paddingVertical: 1, 
    borderRadius: 4, 
    marginTop: 1,
    maxWidth: 60,
  },
  nicknameText: { 
    fontSize: 8, 
    fontWeight: '700', 
    color: 'rgba(255,255,255,0.80)', 
    textAlign: 'center',
  },
});
