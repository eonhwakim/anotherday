#!/usr/bin/env node
/**
 * 릴리즈 후 Supabase app_config의 버전을 갱신합니다.
 * - 기본: app.json의 version으로 latest_version 갱신 (권장 업데이트)
 * - --force: min_version도 같이 갱신 (강제 업데이트)
 *
 * 사전 준비: 프로젝트 루트에 .env.local 생성 후
 *   SUPABASE_URL=https://...supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...        # Settings → API → service_role 키
 *
 * 실행:
 *   npm run release:notify              # 권장 업데이트
 *   npm run release:notify -- --force   # 강제 업데이트
 *   npm run release:notify -- --yes     # 확인 프롬프트 스킵
 */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const force = args.includes('--force');
const skipConfirm = args.includes('--yes');

const appConfig = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const version = appConfig.expo.version;

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('[notify-release] 환경변수 누락: SUPABASE_URL / SUPABASE_SERVICE_KEY');
  console.error('  → 프로젝트 루트의 .env.local을 확인하세요.');
  console.error('  → service_role 키는 Supabase Dashboard > Settings > API에서 복사하세요.');
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: current, error: fetchError } = await sb
  .from('app_config')
  .select('platform, min_version, latest_version')
  .order('platform');

if (fetchError) {
  console.error('[notify-release] 현재 상태 조회 실패:', fetchError.message);
  process.exit(1);
}

console.log('\n=== 현재 app_config ===');
for (const row of current ?? []) {
  console.log(`  ${row.platform.padEnd(8)} min: ${row.min_version}, latest: ${row.latest_version}`);
}

console.log('\n=== 적용할 변경 ===');
console.log(`  app.json의 version: ${version}`);
if (force) {
  console.log(`  → min_version + latest_version 모두 ${version}로 갱신 (강제 업데이트)`);
} else {
  console.log(`  → latest_version만 ${version}로 갱신 (권장 업데이트)`);
}

if (!skipConfirm) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question('\n진행하시겠습니까? (y/N) ');
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('취소되었습니다.');
    process.exit(0);
  }
}

const update = force
  ? { min_version: version, latest_version: version, updated_at: new Date().toISOString() }
  : { latest_version: version, updated_at: new Date().toISOString() };

const { error: updateError } = await sb
  .from('app_config')
  .update(update)
  .in('platform', ['ios', 'android']);

if (updateError) {
  console.error('[notify-release] 업데이트 실패:', updateError.message);
  process.exit(1);
}

console.log(`\n[OK] ${version}로 갱신 완료${force ? ' (강제 업데이트)' : ' (권장 업데이트)'}`);
