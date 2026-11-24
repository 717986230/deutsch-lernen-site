// 朗读接力体检：用 _tts-stub 的「假 Chromium 朗读引擎」（cancel 异步派发 interrupted）跑四个竞态场景。
//   1) 对话 A 播放中直接点对话 B 的「播放全部」→ B 要继续播（以前被 A 的回调停掉）
//   2) 对话连读中点某句 🔊 → 只读这一句，连读停（以前点完接着往下读）
//   3) 短文循环朗读中点单句 → 同上
//   4) 词句「循环朗读」停了马上再开 → 每句不该读两遍（以前两条接力并行）
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';
import { stubPro } from './_pro-stub.mjs';
import { stubTTS } from './_tts-stub.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8746;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));
const env = await getChromium();
if (!env) { skipNoBrowser('朗读接力'); srv.close(); process.exit(0); }
const browser = await env.chromium.launch(env.launch);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await stubPro(page); await stubTTS(page);
const errs = []; page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
await page.addInitScript(() => {
  localStorage.setItem('acct_token', 't1'); localStorage.setItem('annSeen', '["*"]'); localStorage.setItem('wnSeen', '["*"]');
  const real = window.fetch;
  window.fetch = function (u) {
    const s = String(u); const j = (x) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
    if (s.indexOf('/api/pro/content') >= 0) return real.apply(this, arguments);
    if (s.indexOf('/api/me') >= 0) return j({ user: { username: 'u1', nickname: 'U', avatar: '🦊', av_bg: '#58cc02', pro_until: Date.now() + 864e7 }, rank: 1, followers: 0, following: 0 });
    if (s.indexOf('/api/') >= 0) return j({ rev: 1, document: {}, list: [], total: 0, badges: [] });
    return real.apply(this, arguments);
  };
});
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._DEC, null, { timeout: 25000 });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const log = () => page.evaluate(() => window.__ttsLog.map((x) => x.t));
const clr = () => page.evaluate(() => { window.__ttsLog.length = 0; });

await page.evaluate(() => showSection('dialog')); await W(800);
await page.evaluate(() => dialogPlay(0)); await W(300); await page.evaluate(() => dialogPlay(1)); await W(1200);
if (await page.evaluate(() => _dlgPlaying) !== 1) bad('对话 A→B：B 被停掉了');
await page.evaluate(() => dialogStop());

await page.evaluate(() => dialogPlay(0)); await W(300); await clr();
await page.evaluate(() => speakDE('Hallo Welt')); await W(1200);
let l = await log(); if (l.join('|') !== 'Hallo Welt') bad('对话连读中点单句，之后又接着读：' + l.join(' | '));

await page.evaluate(() => showSection('reading')); await W(800);
await page.evaluate(() => toggleLoopAll()); await W(400); await clr();
await page.evaluate(() => speakDE('Guten Tag')); await W(1200);
l = await log(); if (l.join('|') !== 'Guten Tag') bad('短文循环中点单句，之后又接着读：' + l.join(' | '));

await page.evaluate(() => showSection('phrases')); await W(800); await clr();
await page.evaluate(() => { _spk.repeat = 1; _spk.zh = false; toggleAutoPlay(); }); await W(150);
await page.evaluate(() => { toggleAutoPlay(); toggleAutoPlay(); }); await clr(); await W(2500);
await page.evaluate(() => stopAutoPlay());
l = await log(); for (let i = 1; i < l.length; i++) if (l[i] === l[i - 1]) { bad('循环朗读重开后同一句读了两遍：' + l[i]); break; }

if (errs.length) bad('pageerror：' + errs.join(' / '));
await browser.close(); srv.close();
if (fail) process.exit(1);
console.log('OK 朗读接力：对话切换不互停、单句打断连读不被接管、循环朗读重开不重复');
