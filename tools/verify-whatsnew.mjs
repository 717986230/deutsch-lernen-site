// 上新引导（data/whatsnew.json → 底部「上新了」提示条 + 列表 + 圈出入口的引导）体检。
//
// 数据：id 唯一、日期 YYYY-MM-DD 且新的在前、字段齐全、sec 是真实版块。
// 浏览器：
//   ① 新用户（首访）不弹 —— 所有功能对他都是新的，进站先看一屏「上新」是打扰；
//   ② 老用户（本机首访早于条目日期）看到提示条，点开列表后记为已看，刷新不再出现；
//   ③ 每一条「带我去」都能在目标版块里找到入口并圈出来 —— 防止改了首页结构、选择器悄悄失效；
//   ④ 全程 pageerror 为 0。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

// ── 数据 ──
const WN = JSON.parse(readFileSync(join(ROOT, 'data/whatsnew.json'), 'utf8'));
const src = readFileSync(join(ROOT, 'src.html'), 'utf8');
const secIds = (/var SEC_IDS='([^']+)'/.exec(src) || [, ''])[1].split(' ');
const ids = new Set();
let prev = '9999-99-99';
for (const e of WN) {
  for (const k of ['id', 'date', 'icon', 'title', 'desc', 'sec', 'spot', 'tip']) if (!e[k] || typeof e[k] !== 'string') bad(`${e.id || '?'}：缺字段 ${k}`);
  if (ids.has(e.id)) bad(`id 重复：${e.id}`); ids.add(e.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) bad(`${e.id}：date 必须是 YYYY-MM-DD`);
  if (e.date > prev) bad(`${e.id}：要按日期从新到旧排（新条目加在最前面）`);
  prev = e.date;
  if (!secIds.includes(e.sec)) bad(`${e.id}：sec「${e.sec}」不是站内版块`);
  if (e.lang && e.lang !== 'de') bad(`${e.id}：lang 只能是 "de" 或不写`);
}

// ── 浏览器 ──
const PORT = 8752;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.dat': 'application/octet-stream' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));
const env = await getChromium();
if (!env) { skipNoBrowser('上新引导'); srv.close(); process.exit(fail ? 1 : 0); }
const browser = await env.chromium.launch(env.launch);
const errs = [];

async function open(vid) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await page.addInitScript((v) => {
    if (sessionStorage.getItem('_seeded')) return;
    sessionStorage.setItem('_seeded', '1');
    localStorage.setItem('acct_token', 't1');
    if (v) localStorage.setItem('_vid', v);
  }, vid);
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window._DEC, null, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1700);
  return { ctx, page };
}

// ① 新用户
{
  const { ctx, page } = await open(null);
  if (await page.$('.wn-bar')) bad('新用户首访就弹了「上新了」提示条');
  await ctx.close();
}
// ② 老用户：本机首访在 2026-01-01
const oldVid = new Date('2026-01-01T00:00:00Z').getTime().toString(36) + 'abcdef';
{
  const { ctx, page } = await open(oldVid);
  const bar = await page.$('.wn-bar');
  if (!bar) bad('老用户没看到「上新了」提示条');
  else {
    const t = await bar.textContent();
    if (!t.includes(`上新了 ${WN.length} 项`)) bad(`提示条文字不对：${t}`);
    await page.click('.wn-bar-main');
    await page.waitForTimeout(300);
    const n = await page.$$eval('.wn-item.new', (a) => a.length);
    if (n !== WN.length) bad(`列表里「新」条目 ${n} 个，应为 ${WN.length}`);
    // ③ 一步步带我看：每一条都要找到入口
    await page.click('.wn-tour');
    for (let i = 0; i < WN.length; i++) {
      await page.waitForTimeout(900);
      const st = await page.evaluate(() => ({ id: _wn.tour && _wn.tour.e.id, el: !!(_wn.tour && _wn.tour.el),
        ring: (() => { const r = document.querySelector('.wn-ring'); return r && getComputedStyle(r).display !== 'none'; })() }));
      if (st.id !== WN[i].id) { bad(`引导第 ${i + 1} 步应为 ${WN[i].id}，实际 ${st.id}`); break; }
      if (!st.el || !st.ring) bad(`${WN[i].id}：在 #${WN[i].sec} 里找不到入口「${WN[i].spot}」`);
      if (i < WN.length - 1) await page.click('.wn-tip-ok');
    }
    await page.click('.wn-tip-ok');
    if (await page.$('.wn-ring')) bad('点「知道了」后引导没收起');
    // 点圈里的入口能直接进去（第一条）
    await page.evaluate(() => wnGo(0));
    await page.waitForTimeout(900);
    const box = await page.evaluate(() => { const r = _wn.tour.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(600);
    if (await page.$('.wn-ring')) bad('点圈出的入口后引导没收起');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1700);
    if (await page.$('.wn-bar')) bad('看过之后刷新，提示条又出现了');
    const dot = await page.evaluate(() => { showSection('me'); const d = document.getElementById('wnDot'); return d && d.style.display !== 'none'; });
    if (dot) bad('看过之后「我的 → 新功能介绍」还亮着红点');
  }
  await ctx.close();
}
// × 关闭也算看过
{
  const { ctx, page } = await open(oldVid);
  if (await page.$('.wn-bar')) {
    await page.click('.wn-bar-x');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1700);
    if (await page.$('.wn-bar')) bad('点 × 之后刷新，提示条又出现了');
  }
  await ctx.close();
}
for (const e of new Set(errs)) bad('页面抛错：' + e);
await browser.close(); srv.close();
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log(`OK 上新引导：${WN.length} 条，新用户不弹、老用户能看到并逐条找到入口`);
