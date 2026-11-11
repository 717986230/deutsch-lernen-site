// 会员内容锁体检（2026-11-11 起「免费只留语句」）：
//   ① 构建产物里没有短文/连载/对话/餐厅/搭配/词缀的正文（锁在后端，不是前端藏起来）
//   ② 非会员进这六个版块看到解锁面板，页面不报错；语句、拼写、测验照常
//   ③ 会员进去拿到真实内容；403 时面板回到解锁提示（本地改状态绕不过）
//   ④ 会员打开过的内容落进 CacheStorage(pro-data)，退出登录即清掉
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';
import { stubPro, PRO_FILES } from './_pro-stub.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8753;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const ok = (m) => console.log('  ✓ ' + m);

// ① 产物不含会员正文：每份数据抽第一条正文句子去 index.html 里找
const built = readFileSync(join(ROOT, 'index.html'), 'utf8');
const probe = {
  READINGS: (d) => d[0].paras[0][0], SERIES: (d) => d[0].paras[0][0], DIALOGUES: (d) => JSON.stringify(d[0]).match(/"([^"]{12,})"/)[1],
  RESTO: (d) => d.units[0].phrases[0].de, KOLLOC: (d) => d.verbs[0].items[0].ex[0], AFFIX: (d) => d.roots[0].story[0],
  EN_READINGS: (d) => d[0].paras[0][0], EN_SERIES: (d) => d[0].paras[0][0],
};
for (const [k, pick] of Object.entries(probe)) {
  const d = JSON.parse(readFileSync(join(ROOT, 'data', PRO_FILES[k] + '.json'), 'utf8'));
  let s; try { s = pick(d); } catch (e) { bad(`${k} 取样失败：${e.message}`); continue; }
  if (built.includes(s)) bad(`index.html 里仍有 ${k} 的正文：「${s.slice(0, 30)}」`);
}
for (const k of Object.keys(PRO_FILES)) if (!built.includes(`'${k}'`) && !built.includes(`"${k}"`)) bad(`index.html 没有 ${k} 的空壳 getter`);
if (!fail) ok('构建产物不含六个会员版块的正文，只有空壳 getter');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.dat': 'application/octet-stream', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));
const env = await getChromium();
if (!env) { skipNoBrowser('会员内容锁体检'); srv.close(); process.exit(0); }
const browser = await env.chromium.launch(env.launch);

const LOCKED = 'reading series dialog resto kolloc affix'.split(' ');
async function open(pro) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await stubPro(page, { pro });
  await page.addInitScript(() => { try { localStorage.setItem('acct_token', 't1'); localStorage.setItem('annSeen', '["*"]'); } catch (e) {} });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window._DEC, null, { timeout: 25000 }).catch(() => bad('词库没到货'));
  return { ctx, page, errs };
}
const state = (page, id) => page.evaluate((id) => {
  const sec = document.getElementById(id);
  const panel = sec.querySelector('.lock-panel');
  return { active: sec.classList.contains('active'), locked: sec.classList.contains('sec-locked'),
    panel: panel ? panel.textContent.trim().slice(0, 40) : '', nopro: document.documentElement.classList.contains('nopro'),
    cards: sec.querySelectorAll('.card, .rs-row, .kc-item, .af-root, .dlg-turn, .dialog-card').length,
    text: sec.innerText.length };
}, id);

// ② 非会员
{
  const { ctx, page, errs } = await open(false);
  for (const id of LOCKED) {
    await page.evaluate((id) => showSection(id), id);
    await page.waitForTimeout(400);
    const st = await state(page, id);
    if (!st.active || !st.locked || !st.panel.includes('会员内容')) bad(`非会员进 ${id} 没看到解锁面板：${JSON.stringify(st)}`);
  }
  const home = await page.evaluate(() => { showSection('home'); return getComputedStyle(document.querySelector('.hg-tile[href="#resto"] span'), '::after').content; });
  if (!home.includes('🔒')) bad(`非会员首页入口没有锁标：${home}`);
  const free = await page.evaluate(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    showSection('phrases'); await w(900);
    const ph = document.querySelectorAll('#phraseContent .card').length;
    showSection('quiz'); startQuiz('phrase'); await w(300);
    const qz = document.querySelectorAll('#mainQuizArea .quiz-opt').length;
    return { ph, qz };
  });
  if (free.ph < 10 || free.qz < 2) bad(`非会员的语句/测验也被锁了：${JSON.stringify(free)}`);
  // 本地硬改会员状态也拿不到内容：接口 403 → 面板回到解锁提示
  await page.evaluate(() => { _pro.until = Date.now() + 864e5; showSection('reading'); });
  await page.waitForTimeout(600);
  const forced = await state(page, 'reading');
  if (!forced.locked || !forced.panel.includes('会员内容') || forced.cards) bad(`本地改会员状态后拿到了内容：${JSON.stringify(forced)}`);
  if (errs.length) bad(`非会员流程 JS 报错：${errs.slice(0, 3).join(' | ')}`);
  if (!fail) ok('非会员：六个版块都是解锁面板，语句/测验照常，本地改状态绕不过（403 → 面板）');
  await ctx.close();
}
// ③④ 会员
{
  const { ctx, page, errs } = await open(true);
  const got = {};
  for (const id of LOCKED) {
    await page.evaluate((id) => showSection(id), id);
    await page.waitForFunction((id) => !document.getElementById(id).classList.contains('sec-locked'), id, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    got[id] = await state(page, id);
    if (got[id].locked || got[id].text < 200) bad(`会员进 ${id} 没拿到内容：${JSON.stringify(got[id])}`);
  }
  const en = await page.evaluate(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    setLang('en'); await w(300);
    for (let i = 0; i < 100 && !window._ENC; i++) await w(200);
    showSection('reading'); await w(800);
    return { locked: document.getElementById('reading').classList.contains('sec-locked'), n: document.querySelectorAll('#readList .card').length };
  });
  if (en.locked || en.n < 3) bad(`会员英语短文没到：${JSON.stringify(en)}`);
  await page.evaluate(() => setLang('de'));
  const cache = await page.evaluate(async () => { const c = await caches.open('pro-data'); return (await c.keys()).map((r) => new URL(r.url).pathname); });
  if (!cache.includes('/pro-data/READINGS') || !cache.includes('/pro-data/AFFIX')) bad(`会员内容没落进 pro-data 缓存：${cache.join(',')}`);
  await page.evaluate(() => acctLogout());
  await page.waitForTimeout(400);
  const after = await page.evaluate(async () => ({ keys: (await (await caches.open('pro-data')).keys()).length, lkd: Object.keys(window._LKD).length }));
  if (after.keys || after.lkd) bad(`退出登录后会员内容还留在本机：${JSON.stringify(after)}`);
  if (errs.length) bad(`会员流程 JS 报错：${errs.slice(0, 3).join(' | ')}`);
  if (!fail) ok(`会员：六个版块拿到内容（文字 ${LOCKED.map((k) => got[k].text).join('/')}），英语短文 ${en.n} 篇，缓存落盘、退出即清`);
  await ctx.close();
}

await browser.close(); srv.close();
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 会员内容锁：产物无正文 · 非会员面板 · 会员取内容 · 缓存随登录状态');
