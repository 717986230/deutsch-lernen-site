// 浏览器体检的会员桩：2026-11-11 起短文/连载/对话/餐厅/搭配/词缀只经 /api/pro/content 发给会员，
// 本地起的 http.server 没有后端，这些版块在体检里会一律变成「会员内容」解锁面板。
// 这里用 Playwright 的 route 把 /api/me 答成有效会员、/api/pro/content 直接回 data/*.json，
// 让体检照旧能看到真实渲染。锁本身的正确性由 verify-pro（真 worker）和 verify-lock（非会员面板）盯着。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PRO_FILES = { READINGS: 'readings', EN_READINGS: 'en_readings', SERIES: 'series', EN_SERIES: 'en_series',
  DIALOGUES: 'dialogs', EN_DIALOGUES: 'en_dialogs', RD_GLOSS: 'read_gloss', RESTO: 'restaurant', KOLLOC: 'kolloc', AFFIX: 'affix' };

/** 在 page.goto 之前调用。pro=false 时 /api/me 答非会员、内容接口 403，用来测解锁面板。 */
export async function stubPro(page, { pro = true } = {}) {
  const until = pro ? Date.now() + 365 * 86400000 : 0;
  await page.route('**/api/me', (r) => r.fulfill({ json: { user: { id: 1, username: 't1', nickname: '体检号', avatar: '🦊', av_bg: '#58cc02', badges: '', frame: '', pro_until: until }, profiles: [], rank: 1, followers: 0, following: 0 } }));
  await page.route('**/api/pro/content?*', (r) => {
    if (!pro) return r.fulfill({ status: 403, json: { err: '会员专享，开通后可用', pro: 0 } });
    const keys = (new URL(r.request().url()).searchParams.get('k') || '').split(',');
    const data = {};
    for (const k of keys) { if (!PRO_FILES[k]) return r.fulfill({ status: 404, json: { err: '内容不存在' } }); data[k] = JSON.parse(readFileSync(join(ROOT, 'data', PRO_FILES[k] + '.json'), 'utf8')); }
    return r.fulfill({ json: { data } });
  });
}
